import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  InvoiceForEditDto,
  LineItemForEditDto,
  OrderForEditDto,
  EditInvoiceRequestDto,
  EditLineItemDto,
  AddCustomItemDto,
  LineItemDiscountDto,
  TaxGroupDto,
  RemoveLineItemDto,
  OrderShippingUpdateDto,
} from "@orders/types/order.types.js";
import { DiscountType } from "@orders/types/order.types.js";
import type { EditOrderModalData, EditOrderModalValue } from "./edit-order-modal.token.js";
import { MERCHELLO_ADD_CUSTOM_ITEM_MODAL } from "./add-custom-item-modal.token.js";

interface EditableLineItem extends LineItemForEditDto {
  isRemoved: boolean;
  returnToStock: boolean; // For removals and quantity decreases
  newQuantity: number;
  discount: LineItemDiscountDto | null;
  calculatedTotal: number;
}

interface EditableOrder extends OrderForEditDto {
  newShippingCost: number;
}

interface PendingCustomItem extends AddCustomItemDto {
  tempId: string;
}

@customElement("merchello-edit-order-modal")
export class MerchelloEditOrderModalElement extends UmbModalBaseElement<
  EditOrderModalData,
  EditOrderModalValue
> {
  @state() private _invoice: InvoiceForEditDto | null = null;
  @state() private _isLoading: boolean = true;
  @state() private _isSaving: boolean = false;
  @state() private _errorMessage: string | null = null;
  @state() private _editReason: string = "";

  // Editable state - grouped by order
  @state() private _orders: EditableOrder[] = [];
  @state() private _lineItems: EditableLineItem[] = [];
  @state() private _customItems: PendingCustomItem[] = [];

  // Discount popover state
  @state() private _discountPopoverLineItemId: string | null = null;
  @state() private _discountType: DiscountType = DiscountType.Amount;
  @state() private _discountValue: number = 0;
  @state() private _discountReason: string = "";
  @state() private _discountVisibleToCustomer: boolean = false;

  // Tax groups for custom items
  @state() private _taxGroups: TaxGroupDto[] = [];

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._loadInvoice();
  }

  private async _loadInvoice(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    // Fetch invoice and tax groups in parallel
    const [invoiceResult, taxGroupsResult] = await Promise.all([
      MerchelloApi.getInvoiceForEdit(this.data!.invoiceId),
      MerchelloApi.getTaxGroups(),
    ]);

    if (invoiceResult.error) {
      this._errorMessage = invoiceResult.error.message;
      this._isLoading = false;
      return;
    }

    this._invoice = invoiceResult.data ?? null;
    this._taxGroups = taxGroupsResult.data ?? [];

    if (this._invoice) {
      // Initialize editable orders with shipping
      this._orders = this._invoice.orders.map((order) => ({
        ...order,
        newShippingCost: order.shippingCost,
      }));

      // Initialize editable line items
      this._lineItems = this._invoice.orders.flatMap((order) =>
        order.lineItems.map((li) => ({
          ...li,
          isRemoved: false,
          returnToStock: true, // Default: return to stock
          newQuantity: li.quantity,
          discount: null,
          calculatedTotal: li.amount * li.quantity,
        }))
      );
    }

    this._isLoading = false;
  }

  private _updateQuantity(lineItemId: string, quantity: number): void {
    this._lineItems = this._lineItems.map((li) => {
      if (li.id === lineItemId) {
        const newQty = Math.max(1, quantity);
        return {
          ...li,
          newQuantity: newQty,
          calculatedTotal: this._calculateLineItemTotal(li.amount, newQty, li.discount),
        };
      }
      return li;
    });
  }

  private _removeLineItem(lineItemId: string): void {
    this._lineItems = this._lineItems.map((li) => {
      if (li.id === lineItemId) {
        return { ...li, isRemoved: true, returnToStock: true };
      }
      return li;
    });
  }

  private _restoreLineItem(lineItemId: string): void {
    this._lineItems = this._lineItems.map((li) => {
      if (li.id === lineItemId) {
        return { ...li, isRemoved: false };
      }
      return li;
    });
  }

  private _toggleReturnToStock(lineItemId: string): void {
    this._lineItems = this._lineItems.map((li) => {
      if (li.id === lineItemId) {
        return { ...li, returnToStock: !li.returnToStock };
      }
      return li;
    });
  }

  private _updateOrderShipping(orderId: string, cost: number): void {
    this._orders = this._orders.map((order) => {
      if (order.id === orderId) {
        return { ...order, newShippingCost: Math.max(0, cost) };
      }
      return order;
    });
  }

  private _openDiscountPopover(lineItemId: string): void {
    const lineItem = this._lineItems.find((li) => li.id === lineItemId);
    if (lineItem?.discount) {
      this._discountType = lineItem.discount.type;
      this._discountValue = lineItem.discount.value;
      this._discountReason = lineItem.discount.reason ?? "";
      this._discountVisibleToCustomer = lineItem.discount.visibleToCustomer;
    } else {
      this._discountType = DiscountType.Amount;
      this._discountValue = 0;
      this._discountReason = "";
      this._discountVisibleToCustomer = false;
    }
    this._discountPopoverLineItemId = lineItemId;
  }

  private _closeDiscountPopover(): void {
    this._discountPopoverLineItemId = null;
  }

  private _applyDiscount(): void {
    if (!this._discountPopoverLineItemId || this._discountValue <= 0) {
      this._closeDiscountPopover();
      return;
    }

    const discount: LineItemDiscountDto = {
      type: this._discountType,
      value: this._discountValue,
      reason: this._discountReason || null,
      visibleToCustomer: this._discountVisibleToCustomer,
    };

    this._lineItems = this._lineItems.map((li) => {
      if (li.id === this._discountPopoverLineItemId) {
        return {
          ...li,
          discount,
          calculatedTotal: this._calculateLineItemTotal(li.amount, li.newQuantity, discount),
        };
      }
      return li;
    });

    this._closeDiscountPopover();
  }

  private _removeDiscount(lineItemId: string): void {
    this._lineItems = this._lineItems.map((li) => {
      if (li.id === lineItemId) {
        return {
          ...li,
          discount: null,
          calculatedTotal: li.amount * li.newQuantity,
        };
      }
      return li;
    });
  }

  private _calculateLineItemTotal(amount: number, quantity: number, discount: LineItemDiscountDto | null): number {
    const baseTotal = amount * quantity;
    if (!discount || discount.value <= 0) return baseTotal;

    if (discount.type === DiscountType.Amount) {
      return Math.max(0, baseTotal - discount.value * quantity);
    } else {
      return baseTotal * (1 - discount.value / 100);
    }
  }

  private async _openAddCustomItemModal(): Promise<void> {
    if (!this.#modalManager || !this._invoice) return;

    const modal = this.#modalManager.open(this, MERCHELLO_ADD_CUSTOM_ITEM_MODAL, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        taxGroups: this._taxGroups,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.item) {
      this._customItems = [
        ...this._customItems,
        {
          ...result.item,
          tempId: `custom-${Date.now()}`,
        },
      ];
    }
  }

  private _removeCustomItem(tempId: string): void {
    this._customItems = this._customItems.filter((item) => item.tempId !== tempId);
  }

  private _hasChanges(): boolean {
    if (!this._invoice) return false;

    // Check for removed items
    if (this._lineItems.some((li) => li.isRemoved)) return true;

    // Check for quantity changes
    if (this._lineItems.some((li) => li.newQuantity !== li.quantity)) return true;

    // Check for discounts
    if (this._lineItems.some((li) => li.discount !== null)) return true;

    // Check for custom items
    if (this._customItems.length > 0) return true;

    // Check for shipping changes per order
    if (this._orders.some((o) => o.newShippingCost !== o.shippingCost)) return true;

    return false;
  }

  private _calculateSubtotalBeforeDiscounts(): number {
    // Products and custom items before any discounts
    const lineItemsTotal = this._lineItems
      .filter((li) => !li.isRemoved)
      .reduce((sum, li) => sum + li.amount * li.newQuantity, 0);

    const customItemsTotal = this._customItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return lineItemsTotal + customItemsTotal;
  }

  private _calculateDiscountTotal(): number {
    return this._lineItems
      .filter((li) => !li.isRemoved && li.discount !== null)
      .reduce((sum, li) => {
        const discount = li.discount!;
        if (discount.type === DiscountType.Amount) {
          return sum + discount.value * li.newQuantity;
        } else {
          return sum + (li.amount * li.newQuantity) * (discount.value / 100);
        }
      }, 0);
  }

  private _calculateAdjustedSubtotal(): number {
    return this._calculateSubtotalBeforeDiscounts() - this._calculateDiscountTotal();
  }

  private _calculateShippingTotal(): number {
    return this._orders.reduce((sum, order) => sum + order.newShippingCost, 0);
  }

  private _calculateNewTax(): number {
    if (!this._invoice) return 0;

    // Calculate tax based on taxable line items (using their stored tax rates)
    // Note: Discounts reduce the taxable amount
    const lineItemsTax = this._lineItems
      .filter((li) => !li.isRemoved && li.isTaxable)
      .reduce((sum, li) => {
        const itemTotal = this._calculateLineItemTotal(li.amount, li.newQuantity, li.discount);
        return sum + itemTotal * (li.taxRate / 100);
      }, 0);

    // For custom items, use the tax rate from their selected tax group
    const customItemsTax = this._customItems
      .filter((item) => item.taxGroupId !== null)
      .reduce((sum, item) => {
        const taxGroup = this._taxGroups.find(tg => tg.id === item.taxGroupId);
        const taxRate = taxGroup?.taxPercentage ?? 0;
        return sum + item.price * item.quantity * (taxRate / 100);
      }, 0);

    return lineItemsTax + customItemsTax;
  }

  private _calculateNewTotal(): number {
    return this._calculateAdjustedSubtotal() + this._calculateNewTax() + this._calculateShippingTotal();
  }

  private async _handleSave(): Promise<void> {
    if (!this._invoice || !this._hasChanges()) return;

    this._isSaving = true;
    this._errorMessage = null;

    // Build line item updates (quantity and discount changes)
    const lineItemUpdates: EditLineItemDto[] = this._lineItems
      .filter((li) => !li.isRemoved && (li.newQuantity !== li.quantity || li.discount !== null))
      .map((li): EditLineItemDto => ({
        id: li.id,
        quantity: li.newQuantity !== li.quantity ? li.newQuantity : null,
        returnToStock: li.returnToStock,
        discount: li.discount,
      }));

    // Build removed items with return-to-stock flag
    const removedLineItems: RemoveLineItemDto[] = this._lineItems
      .filter((li) => li.isRemoved)
      .map((li): RemoveLineItemDto => ({
        id: li.id,
        returnToStock: li.returnToStock,
      }));

    // Build per-order shipping updates
    const orderShippingUpdates: OrderShippingUpdateDto[] = this._orders
      .filter((o) => o.newShippingCost !== o.shippingCost)
      .map((o): OrderShippingUpdateDto => ({
        orderId: o.id,
        shippingCost: o.newShippingCost,
      }));

    const request: EditInvoiceRequestDto = {
      lineItems: lineItemUpdates,
      removedLineItems: removedLineItems,
      customItems: this._customItems.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        taxGroupId: item.taxGroupId,
        isPhysicalProduct: item.isPhysicalProduct,
      })),
      orderShippingUpdates: orderShippingUpdates,
      editReason: this._editReason || null,
    };

    const { data, error } = await MerchelloApi.editInvoice(this._invoice.id, request);

    this._isSaving = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    if (data?.success) {
      // Show any warnings about stock issues etc.
      if (data.warnings && data.warnings.length > 0) {
        for (const warning of data.warnings) {
          this.#notificationContext?.peek("warning", {
            data: {
              headline: "Stock Warning",
              message: warning,
            },
          });
        }
      }

      // Show success notification
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Order Updated",
          message: "The order has been successfully updated.",
        },
      });

      this.value = { saved: true };
      this.modalContext?.submit();
    } else {
      this._errorMessage = data?.errorMessage ?? "Failed to save changes";
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderLoading() {
    return html`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading order...</span>
      </div>
    `;
  }

  private _renderError() {
    return html`
      <div class="error-state">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" @click=${this._loadInvoice}>Retry</uui-button>
      </div>
    `;
  }

  private _renderCannotEdit() {
    return html`
      <div class="cannot-edit">
        <uui-icon name="icon-lock"></uui-icon>
        <h3>Cannot Edit This Order</h3>
        <p>${this._invoice?.cannotEditReason ?? "This order cannot be edited."}</p>
        <uui-button look="secondary" @click=${this._handleCancel}>Close</uui-button>
      </div>
    `;
  }

  private _renderLineItem(lineItem: EditableLineItem) {
    if (lineItem.isRemoved) return nothing;

    const currencySymbol = this._invoice?.currencySymbol ?? "£";
    const hasDiscount = lineItem.discount !== null;
    const showDiscountPopover = this._discountPopoverLineItemId === lineItem.id;
    const qtyDecreased = lineItem.newQuantity < lineItem.quantity;
    const qtyIncreased = lineItem.newQuantity > lineItem.quantity;
    const qtyIncrease = lineItem.newQuantity - lineItem.quantity;

    // Check if stock is insufficient for quantity increase
    const hasInsufficientStock = qtyIncreased &&
      lineItem.isStockTracked &&
      lineItem.availableStock !== null &&
      lineItem.availableStock < qtyIncrease;

    return html`
      <div class="line-item ${hasInsufficientStock ? 'has-error' : ''}">
        <div class="line-item-image">
          ${lineItem.imageUrl
            ? html`<img src=${lineItem.imageUrl} alt=${lineItem.name ?? ""} />`
            : html`<div class="placeholder-image"><uui-icon name="icon-picture"></uui-icon></div>`}
        </div>

        <div class="line-item-details">
          <div class="line-item-name">${lineItem.name}</div>
          ${lineItem.sku ? html`<div class="line-item-sku">${lineItem.sku}</div>` : nothing}
          ${lineItem.isStockTracked && lineItem.availableStock !== null ? html`
            <div class="stock-info ${hasInsufficientStock ? 'error' : ''}">
              ${hasInsufficientStock
                ? html`<uui-icon name="icon-alert"></uui-icon> Only ${lineItem.availableStock} available`
                : html`${lineItem.availableStock} in stock`}
            </div>
          ` : nothing}
        </div>

        <div class="line-item-price">
          <div class="price-wrapper">
            <span class="price ${hasDiscount ? 'has-discount' : ''}">${currencySymbol}${lineItem.amount.toFixed(2)}</span>
            <button
              class="discount-trigger ${hasDiscount ? 'active' : ''}"
              @click=${() => this._openDiscountPopover(lineItem.id)}
              title="${hasDiscount ? 'Edit discount' : 'Add discount'}"
            >
              <uui-icon name="${hasDiscount ? 'icon-sale' : 'icon-add'}"></uui-icon>
            </button>
          </div>
          ${hasDiscount ? html`
            <div class="discount-badge">
              -${lineItem.discount!.type === DiscountType.Percentage
                ? `${lineItem.discount!.value}%`
                : `${currencySymbol}${lineItem.discount!.value.toFixed(2)}`}
              <button class="remove-discount" @click=${() => this._removeDiscount(lineItem.id)}>×</button>
            </div>
          ` : nothing}

          ${showDiscountPopover ? this._renderDiscountPopover(lineItem) : nothing}
        </div>

        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${lineItem.newQuantity.toString()}
            @input=${(e: Event) =>
              this._updateQuantity(lineItem.id, parseInt((e.target as HTMLInputElement).value) || 1)}
            min="1"
          ></uui-input>
          ${qtyDecreased && lineItem.productId && lineItem.isStockTracked ? html`
            <div class="return-to-stock-toggle">
              <uui-checkbox
                .checked=${lineItem.returnToStock}
                @change=${() => this._toggleReturnToStock(lineItem.id)}
              >
                Return ${lineItem.quantity - lineItem.newQuantity} to stock
              </uui-checkbox>
            </div>
          ` : nothing}
        </div>

        <div class="line-item-total">
          ${currencySymbol}${lineItem.calculatedTotal.toFixed(2)}
        </div>

        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removeLineItem(lineItem.id)}
            title="Remove item"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderRemovedItem(lineItem: EditableLineItem) {
    const currencySymbol = this._invoice?.currencySymbol ?? "£";

    return html`
      <div class="removed-item">
        <div class="removed-item-info">
          <span class="removed-item-name">${lineItem.name}</span>
          <span class="removed-item-qty">× ${lineItem.quantity}</span>
          <span class="removed-item-price">${currencySymbol}${(lineItem.amount * lineItem.quantity).toFixed(2)}</span>
        </div>
        <div class="removed-item-options">
          ${lineItem.productId && lineItem.isStockTracked ? html`
            <uui-checkbox
              .checked=${lineItem.returnToStock}
              @change=${() => this._toggleReturnToStock(lineItem.id)}
            >
              Return to stock
            </uui-checkbox>
          ` : nothing}
          <uui-button look="secondary" compact @click=${() => this._restoreLineItem(lineItem.id)}>
            Undo
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderDiscountPopover(_lineItem: EditableLineItem) {
    const currencySymbol = this._invoice?.currencySymbol ?? "£";

    return html`
      <div class="discount-popover">
        <div class="popover-header">
          <span>Discount type</span>
        </div>

        <uui-select
          .value=${this._discountType.toString()}
          @change=${(e: Event) => (this._discountType = parseInt((e.target as HTMLSelectElement).value))}
        >
          <option value="0">Amount</option>
          <option value="1">Percentage</option>
        </uui-select>

        <div class="popover-row">
          <label>Value ${this._discountType === DiscountType.Percentage ? '(%)' : `(per unit)`}</label>
          <div class="input-with-affix">
            ${this._discountType === DiscountType.Amount
              ? html`<span class="prefix">${currencySymbol}</span>`
              : nothing}
            <uui-input
              type="number"
              .value=${this._discountValue.toString()}
              @input=${(e: Event) => (this._discountValue = parseFloat((e.target as HTMLInputElement).value) || 0)}
              min="0"
              step="0.01"
            ></uui-input>
            ${this._discountType === DiscountType.Percentage
              ? html`<span class="suffix">%</span>`
              : nothing}
          </div>
        </div>

        <div class="popover-row">
          <label>Reason for discount</label>
          <uui-input
            .value=${this._discountReason}
            @input=${(e: Event) => (this._discountReason = (e.target as HTMLInputElement).value)}
            placeholder="Optional"
          ></uui-input>
        </div>

        <div class="popover-row checkbox">
          <uui-checkbox
            .checked=${this._discountVisibleToCustomer}
            @change=${(e: Event) => (this._discountVisibleToCustomer = (e.target as HTMLInputElement).checked)}
          >
            Visible to customer
          </uui-checkbox>
        </div>

        <div class="popover-actions">
          <uui-button look="primary" @click=${this._applyDiscount}>Done</uui-button>
        </div>
      </div>
    `;
  }

  private _renderCustomItem(item: PendingCustomItem) {
    const currencySymbol = this._invoice?.currencySymbol ?? "£";

    const taxGroup = item.taxGroupId
      ? this._taxGroups.find(tg => tg.id === item.taxGroupId)
      : null;
    const taxInfo = taxGroup ? `${taxGroup.name} (${taxGroup.taxPercentage}%)` : "Not taxable";

    return html`
      <div class="line-item custom-item">
        <div class="line-item-image">
          <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
        </div>

        <div class="line-item-details">
          <div class="line-item-name">${item.name}</div>
          <div class="line-item-sku">Custom item · ${taxInfo}</div>
        </div>

        <div class="line-item-price">
          ${currencySymbol}${item.price.toFixed(2)}
        </div>

        <div class="line-item-quantity">
          ${item.quantity}
        </div>

        <div class="line-item-total">
          ${currencySymbol}${(item.price * item.quantity).toFixed(2)}
        </div>

        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removeCustomItem(item.tempId)}
            title="Remove item"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }

  render() {
    if (this._isLoading) {
      return html`<umb-body-layout headline="Edit Order">${this._renderLoading()}</umb-body-layout>`;
    }

    if (this._errorMessage && !this._invoice) {
      return html`<umb-body-layout headline="Edit Order">${this._renderError()}</umb-body-layout>`;
    }

    if (!this._invoice?.canEdit) {
      return html`<umb-body-layout headline="Edit Order">${this._renderCannotEdit()}</umb-body-layout>`;
    }

    const currencySymbol = this._invoice.currencySymbol;
    const currencyCode = this._invoice.currencyCode;
    const subtotalBeforeDiscounts = this._calculateSubtotalBeforeDiscounts();
    const discountTotal = this._calculateDiscountTotal();
    const adjustedSubtotal = this._calculateAdjustedSubtotal();
    const shippingTotal = this._calculateShippingTotal();
    const newTax = this._calculateNewTax();
    const newTotal = this._calculateNewTotal();
    const hasChanges = this._hasChanges();
    const removedItems = this._lineItems.filter((li) => li.isRemoved);
    const hasDiscounts = discountTotal > 0;

    return html`
      <umb-body-layout headline="Edit Order">
        <div id="main">
          <!-- Fulfillment Status Badge -->
          <div class="status-section">
            <span class="fulfillment-badge ${this._invoice.fulfillmentStatus.toLowerCase()}">
              <uui-icon name="icon-box"></uui-icon>
              ${this._invoice.fulfillmentStatus}
            </span>
          </div>

          <!-- Orders and Line Items -->
          ${this._orders.map((order) => this._renderOrderSection(order))}

          <!-- Custom Items Section (if any) -->
          ${this._customItems.length > 0 ? html`
            <div class="items-section custom-items-section">
              <div class="section-header">
                <h4>Custom Items (New Order)</h4>
              </div>
              <div class="items-list">
                ${this._customItems.map((item) => this._renderCustomItem(item))}
              </div>
            </div>
          ` : nothing}

          <!-- Add Items Actions -->
          <div class="add-items-section">
            <uui-button look="secondary" @click=${() => {}} disabled>
              <uui-icon name="icon-add"></uui-icon>
              Add product
            </uui-button>
            <uui-button look="secondary" @click=${this._openAddCustomItemModal}>
              <uui-icon name="icon-add"></uui-icon>
              Add custom item
            </uui-button>
          </div>

          <!-- Removed Items Section -->
          ${removedItems.length > 0 ? html`
            <div class="removed-items-section">
              <h4>Removed Items</h4>
              ${removedItems.map((li) => this._renderRemovedItem(li))}
            </div>
          ` : nothing}

          <!-- Payment Summary -->
          <div class="payment-section">
            <h3>Order Summary</h3>

            <div class="payment-row">
              <span>Subtotal</span>
              <span>${currencySymbol}${subtotalBeforeDiscounts.toFixed(2)} ${currencyCode}</span>
            </div>

            ${hasDiscounts ? html`
              <div class="payment-row discount">
                <span>Discounts</span>
                <span class="discount-amount">-${currencySymbol}${discountTotal.toFixed(2)} ${currencyCode}</span>
              </div>
              <div class="payment-row adjusted">
                <span>Adjusted Subtotal</span>
                <span>${currencySymbol}${adjustedSubtotal.toFixed(2)} ${currencyCode}</span>
              </div>
            ` : nothing}

            <div class="payment-row">
              <span>Shipping</span>
              <span>${currencySymbol}${shippingTotal.toFixed(2)} ${currencyCode}</span>
            </div>

            <div class="payment-row">
              <span>Tax</span>
              <span>${currencySymbol}${newTax.toFixed(2)} ${currencyCode}</span>
            </div>

            <div class="payment-row total">
              <span>Total</span>
              <span>${currencySymbol}${newTotal.toFixed(2)} ${currencyCode}</span>
            </div>

            <p class="tax-note">Taxes are estimated until you update the order</p>
          </div>

          <!-- Reason for Edit -->
          <div class="reason-section">
            <h3>Reason for edit</h3>
            <uui-textarea
              .value=${this._editReason}
              @input=${(e: Event) => (this._editReason = (e.target as HTMLTextAreaElement).value)}
              placeholder="Add a reason for this edit..."
            ></uui-textarea>
            <p class="reason-note">Only visible to staff</p>
          </div>

          ${this._errorMessage ? html`
            <div class="error-message">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : nothing}
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Update order"
            look="primary"
            @click=${this._handleSave}
            ?disabled=${this._isSaving || !hasChanges}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : "Update order"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderOrderSection(order: EditableOrder) {
    const currencySymbol = this._invoice?.currencySymbol ?? "£";
    const orderLineItems = this._lineItems.filter((li) => li.orderId === order.id && !li.isRemoved);

    return html`
      <div class="items-section order-section">
        <div class="section-header">
          <h4>Order: ${order.shippingMethodName ?? 'Standard'}</h4>
          <div class="order-shipping">
            <span class="shipping-label">Shipping:</span>
            <div class="shipping-cost-input">
              <span class="prefix">${currencySymbol}</span>
              <uui-input
                type="number"
                .value=${order.newShippingCost.toString()}
                @input=${(e: Event) =>
                  this._updateOrderShipping(order.id, parseFloat((e.target as HTMLInputElement).value) || 0)}
                min="0"
                step="0.01"
              ></uui-input>
            </div>
          </div>
        </div>

        <div class="items-header">
          <div class="header-cell product">Product</div>
          <div class="header-cell price">Price</div>
          <div class="header-cell quantity">Quantity</div>
          <div class="header-cell total">Total</div>
          <div class="header-cell actions"></div>
        </div>

        <div class="items-list">
          ${orderLineItems.map((li) => this._renderLineItem(li))}
        </div>
      </div>
    `;
  }

  static styles = css`
    #main {
      padding: var(--uui-size-space-5);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      min-width: 700px;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }

    .error-state,
    .cannot-edit {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-3);
      text-align: center;
    }

    .error-state uui-icon,
    .cannot-edit uui-icon {
      font-size: 48px;
      color: var(--uui-color-danger);
    }

    .cannot-edit uui-icon {
      color: var(--uui-color-warning);
    }

    .cannot-edit h3 {
      margin: 0;
    }

    .cannot-edit p {
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    /* Status Section */
    .status-section {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .fulfillment-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .fulfillment-badge.unfulfilled {
      background: #fef3cd;
      color: #856404;
    }

    .fulfillment-badge.partial {
      background: #cce5ff;
      color: #004085;
    }

    .fulfillment-badge.fulfilled {
      background: #d4edda;
      color: #155724;
    }

    /* Items Section */
    .items-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .items-header {
      display: grid;
      grid-template-columns: 2fr 120px 80px 100px 40px;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-bottom: 1px solid var(--uui-color-border);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .header-cell.price,
    .header-cell.quantity,
    .header-cell.total {
      text-align: right;
    }

    .items-list {
      display: flex;
      flex-direction: column;
    }

    .line-item {
      display: grid;
      grid-template-columns: 2fr 120px 80px 100px 40px;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      align-items: center;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .line-item:last-child {
      border-bottom: none;
    }

    .line-item-image {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .line-item-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
    }

    .placeholder-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .placeholder-image.custom {
      background: var(--uui-color-positive-emphasis);
      color: white;
    }

    .line-item-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .line-item-name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .line-item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .line-item-price {
      text-align: right;
      position: relative;
    }

    .price-wrapper {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--uui-size-space-1);
    }

    .price.has-discount {
      text-decoration: line-through;
      color: var(--uui-color-text-alt);
    }

    .discount-trigger {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .line-item:hover .discount-trigger,
    .discount-trigger.active {
      opacity: 1;
    }

    .discount-trigger.active {
      color: var(--uui-color-positive);
    }

    .discount-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--uui-color-positive-emphasis);
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      margin-top: 4px;
    }

    .remove-discount {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
    }

    .discount-popover {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 100;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: var(--uui-size-space-4);
      min-width: 280px;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .popover-header {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .popover-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .popover-row label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .popover-row.checkbox {
      flex-direction: row;
    }

    .input-with-affix {
      display: flex;
      align-items: center;
    }

    .input-with-affix .prefix,
    .input-with-affix .suffix {
      padding: 0 var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      height: 36px;
      display: flex;
      align-items: center;
      color: var(--uui-color-text-alt);
    }

    .input-with-affix .prefix {
      border-right: none;
      border-radius: var(--uui-border-radius) 0 0 var(--uui-border-radius);
    }

    .input-with-affix .suffix {
      border-left: none;
      border-radius: 0 var(--uui-border-radius) var(--uui-border-radius) 0;
    }

    .input-with-affix uui-input {
      flex: 1;
    }

    .popover-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--uui-size-space-2);
    }

    .line-item-quantity {
      text-align: right;
    }

    .line-item-quantity uui-input {
      width: 60px;
      text-align: right;
    }

    .line-item-total {
      text-align: right;
      font-weight: 500;
    }

    .line-item-actions {
      display: flex;
      justify-content: flex-end;
    }

    .items-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    /* Order Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .section-header h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .order-shipping {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .shipping-label {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    /* Stock Info */
    .stock-info {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .stock-info.error {
      color: var(--uui-color-danger);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .line-item.has-error {
      background: rgba(var(--uui-color-danger-rgb), 0.05);
    }

    /* Return to Stock Toggle */
    .return-to-stock-toggle {
      margin-top: var(--uui-size-space-2);
    }

    .return-to-stock-toggle uui-checkbox {
      font-size: 0.75rem;
    }

    /* Removed Items Section */
    .removed-items-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .removed-items-section h4 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-danger);
    }

    .removed-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .removed-item:last-child {
      border-bottom: none;
    }

    .removed-item-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      text-decoration: line-through;
      color: var(--uui-color-text-alt);
    }

    .removed-item-name {
      font-weight: 500;
    }

    .removed-item-options {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    /* Add Items Section */
    .add-items-section {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    /* Custom Items Section */
    .custom-items-section {
      border-color: var(--uui-color-positive);
    }

    .custom-items-section .section-header {
      background: rgba(var(--uui-color-positive-rgb), 0.1);
    }

    .custom-items-section .section-header h4 {
      color: var(--uui-color-positive);
    }

    /* Payment Section */
    .payment-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .payment-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
    }

    .payment-row.total {
      border-top: 1px solid var(--uui-color-border);
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-3);
      font-weight: 600;
    }

    .payment-row.discount {
      color: var(--uui-color-positive);
    }

    .discount-amount {
      color: var(--uui-color-positive);
    }

    .payment-row.adjusted {
      font-weight: 500;
      border-bottom: 1px dashed var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .shipping-cost-input {
      display: flex;
      align-items: center;
    }

    .shipping-cost-input .prefix {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-right: none;
      padding: 0 var(--uui-size-space-2);
      height: 32px;
      display: flex;
      align-items: center;
      border-radius: var(--uui-border-radius) 0 0 var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .shipping-cost-input uui-input {
      width: 80px;
    }

    .tax-note {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin: var(--uui-size-space-2) 0 0 0;
    }

    /* Reason Section */
    .reason-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .reason-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .reason-section uui-textarea {
      width: 100%;
    }

    .reason-note {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin: var(--uui-size-space-1) 0 0 0;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloEditOrderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-edit-order-modal": MerchelloEditOrderModalElement;
  }
}
