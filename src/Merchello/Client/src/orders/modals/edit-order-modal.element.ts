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
  EditInvoiceDto,
  EditLineItemDto,
  AddCustomItemDto,
  LineItemDiscountDto,
  TaxGroupDto,
  RemoveLineItemDto,
  OrderShippingUpdateDto,
  PreviewEditResultDto,
} from "@orders/types/order.types.js";
import { DiscountValueType } from "@orders/types/order.types.js";
import type { EditOrderModalData, EditOrderModalValue } from "./edit-order-modal.token.js";
import { MERCHELLO_ADD_CUSTOM_ITEM_MODAL } from "./add-custom-item-modal.token.js";
import { MERCHELLO_ADD_DISCOUNT_MODAL } from "./add-discount-modal.token.js";
import { MERCHELLO_PRODUCT_PICKER_MODAL } from "@shared/product-picker/product-picker-modal.token.js";

// Import shared components
import "@shared/components/product-image.element.js";
import { formatNumber } from "@shared/utils/formatting.js";

interface EditableLineItem extends LineItemForEditDto {
  isRemoved: boolean;
  returnToStock: boolean; // For removals and quantity decreases
  newQuantity: number;
  discount: LineItemDiscountDto | null;
  /** Track if this item originally had a discount (for detecting removals) */
  hadOriginalDiscount: boolean;
  calculatedTotal: number;
}

interface EditableOrder extends OrderForEditDto {
  newShippingCost: number;
}

interface PendingCustomItem extends AddCustomItemDto {
  tempId: string;
}

interface PendingOrderDiscount {
  type: DiscountValueType;
  value: number;
  reason: string | null;
  isVisibleToCustomer: boolean;
  tempId: string;
}

interface PendingProduct {
  tempId: string;
  productId: string;
  productRootId: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  imageUrl: string | null;
  warehouseId: string;
  warehouseName: string;
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
  @state() private _pendingProducts: PendingProduct[] = [];

  // Tax groups for custom items
  @state() private _taxGroups: TaxGroupDto[] = [];

  // Shipping and tax removal state
  @state() private _removedShippingOrders: Set<string> = new Set();
  @state() private _taxRemoved: boolean = false;

  // Order-level discounts (coupons, etc.)
  @state() private _removedOrderDiscounts: Set<string> = new Set();
  @state() private _pendingOrderDiscounts: PendingOrderDiscount[] = [];

  // Preview state - Single source of truth from backend
  @state() private _previewResult: PreviewEditResultDto | null = null;
  @state() private _previewLoading: boolean = false; // Used for UI loading indicator
  private _previewDebounceTimer: ReturnType<typeof setTimeout> | undefined;

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

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadInvoice();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // Clean up debounce timer to prevent memory leaks
    if (this._previewDebounceTimer) {
      clearTimeout(this._previewDebounceTimer);
      this._previewDebounceTimer = undefined;
    }
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

      // Initialize editable line items, loading any existing discounts
      this._lineItems = this._invoice.orders.flatMap((order) =>
        order.lineItems.map((li) => {
          // Convert backend DiscountLineItemDto to frontend LineItemDiscountDto
          const hasExistingDiscount = li.discounts.length > 0;
          const existingDiscount = hasExistingDiscount
            ? {
                type: li.discounts[0].type,
                value: li.discounts[0].value,
                reason: li.discounts[0].reason,
                isVisibleToCustomer: li.discounts[0].isVisibleToCustomer,
              }
            : null;

          return {
            ...li,
            isRemoved: false,
            returnToStock: true, // Default: return to stock
            newQuantity: li.quantity,
            discount: existingDiscount,
            hadOriginalDiscount: hasExistingDiscount,
            calculatedTotal: this._getOptimisticLineItemTotal(li.amount, li.quantity, existingDiscount),
          };
        })
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
          calculatedTotal: this._getOptimisticLineItemTotal(li.amount, newQty, li.discount),
        };
      }
      return li;
    });
    this._refreshPreview();
  }

  private _removeLineItem(lineItemId: string): void {
    this._lineItems = this._lineItems.map((li) => {
      if (li.id === lineItemId) {
        return { ...li, isRemoved: true, returnToStock: true };
      }
      return li;
    });
    this._refreshPreview();
  }

  private _restoreLineItem(lineItemId: string): void {
    this._lineItems = this._lineItems.map((li) => {
      if (li.id === lineItemId) {
        return { ...li, isRemoved: false };
      }
      return li;
    });
    this._refreshPreview();
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
    this._refreshPreview();
  }

  private _removeShipping(orderId: string): void {
    this._removedShippingOrders = new Set([...this._removedShippingOrders, orderId]);
    this._orders = this._orders.map((order) => {
      if (order.id === orderId) {
        return { ...order, newShippingCost: 0 };
      }
      return order;
    });
    this._refreshPreview();
  }

  private _restoreShipping(orderId: string): void {
    const newSet = new Set(this._removedShippingOrders);
    newSet.delete(orderId);
    this._removedShippingOrders = newSet;
    // Restore original shipping cost
    const originalOrder = this._invoice?.orders.find(o => o.id === orderId);
    if (originalOrder) {
      this._orders = this._orders.map((order) => {
        if (order.id === orderId) {
          return { ...order, newShippingCost: originalOrder.shippingCost };
        }
        return order;
      });
    }
    this._refreshPreview();
  }

  private _removeTax(): void {
    this._taxRemoved = true;
    this._refreshPreview();
  }

  private _restoreTax(): void {
    this._taxRemoved = false;
    this._refreshPreview();
  }

  private _removeOrderDiscount(discountId: string): void {
    this._removedOrderDiscounts = new Set([...this._removedOrderDiscounts, discountId]);
    this._refreshPreview();
  }

  private async _openLineItemDiscountModal(lineItemId: string): Promise<void> {
    if (!this.#modalManager || !this._invoice) return;

    const lineItem = this._lineItems.find((li) => li.id === lineItemId);
    if (!lineItem) return;

    const modal = this.#modalManager.open(this, MERCHELLO_ADD_DISCOUNT_MODAL, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        isOrderDiscount: false,
        lineItemName: lineItem.name ?? undefined,
        lineItemPrice: lineItem.amount,
        lineItemQuantity: lineItem.newQuantity,
        existingDiscount: lineItem.discount ?? undefined,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.discount) {
      this._lineItems = this._lineItems.map((li) => {
        if (li.id === lineItemId) {
          return {
            ...li,
            discount: result.discount!,
            calculatedTotal: this._getOptimisticLineItemTotal(li.amount, li.newQuantity, result.discount!),
          };
        }
        return li;
      });
      this._refreshPreview();
    }
  }

  private async _openAddDiscountModal(): Promise<void> {
    if (!this.#modalManager || !this._invoice) return;

    const modal = this.#modalManager.open(this, MERCHELLO_ADD_DISCOUNT_MODAL, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        isOrderDiscount: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.discount) {
      this._pendingOrderDiscounts = [
        ...this._pendingOrderDiscounts,
        {
          type: result.discount.type,
          value: result.discount.value,
          reason: result.discount.reason,
          isVisibleToCustomer: result.discount.isVisibleToCustomer,
          tempId: `discount-${Date.now()}`,
        },
      ];
      this._refreshPreview();
    }
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
    this._refreshPreview();
  }

  /**
   * Calculate line item total for OPTIMISTIC UI display only.
   * The authoritative value comes from the backend via _refreshPreview().
   * This is replaced by PreviewEditResultDto.lineItems[].calculatedTotal when available.
   */
  private _getOptimisticLineItemTotal(amount: number, quantity: number, discount: LineItemDiscountDto | null): number {
    const baseTotal = amount * quantity;
    if (!discount || discount.value <= 0) return baseTotal;

    if (discount.type === DiscountValueType.FixedAmount) {
      return Math.max(0, baseTotal - discount.value * quantity);
    } else {
      return baseTotal * (1 - discount.value / 100);
    }
  }

  /**
   * Calculate the discounted unit price for display.
   */
  private _getDiscountedUnitPrice(lineItem: EditableLineItem): number {
    if (!lineItem.discount || lineItem.discount.value <= 0) {
      return lineItem.amount;
    }

    if (lineItem.discount.type === DiscountValueType.FixedAmount) {
      return Math.max(0, lineItem.amount - lineItem.discount.value);
    } else {
      return lineItem.amount * (1 - lineItem.discount.value / 100);
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
      this._refreshPreview();
    }
  }

  private _removeCustomItem(tempId: string): void {
    this._customItems = this._customItems.filter((item) => item.tempId !== tempId);
    this._refreshPreview();
  }

  private async _openProductPickerModal(): Promise<void> {
    if (!this.#modalManager || !this._invoice) return;

    // Get existing product IDs to exclude from picker
    const existingProductIds = this._lineItems
      .filter((li) => li.productId && !li.isRemoved)
      .map((li) => li.productId!);

    // Also exclude pending products
    const pendingProductIds = this._pendingProducts.map((p) => p.productId);

    const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_PICKER_MODAL, {
      data: {
        config: {
          currencySymbol: this._invoice.currencySymbol,
          shippingAddress: this._invoice.shippingCountryCode
            ? {
                countryCode: this._invoice.shippingCountryCode,
                stateCode: this._invoice.shippingRegion ?? undefined,
              }
            : null,
          excludeProductIds: [...existingProductIds, ...pendingProductIds],
        },
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selections?.length) {
      // Add selected products to pending products
      const newProducts: PendingProduct[] = result.selections.map((selection) => ({
        tempId: `product-${Date.now()}-${selection.productId}`,
        productId: selection.productId,
        productRootId: selection.productRootId,
        name: selection.name,
        sku: selection.sku,
        price: selection.price,
        quantity: 1, // Always add as qty 1
        imageUrl: selection.imageUrl,
        warehouseId: selection.warehouseId,
        warehouseName: selection.warehouseName,
      }));

      this._pendingProducts = [...this._pendingProducts, ...newProducts];
      this._refreshPreview();
    }
  }

  private _removePendingProduct(tempId: string): void {
    this._pendingProducts = this._pendingProducts.filter((p) => p.tempId !== tempId);
    this._refreshPreview();
  }

  private _updatePendingProductQuantity(tempId: string, quantity: number): void {
    this._pendingProducts = this._pendingProducts.map((p) =>
      p.tempId === tempId ? { ...p, quantity: Math.max(1, quantity) } : p
    );
    this._refreshPreview();
  }

  private _removePendingOrderDiscount(tempId: string): void {
    this._pendingOrderDiscounts = this._pendingOrderDiscounts.filter((d) => d.tempId !== tempId);
    this._refreshPreview();
  }

  private _hasChanges(): boolean {
    if (!this._invoice) return false;

    // Check for removed items
    if (this._lineItems.some((li) => li.isRemoved)) return true;

    // Check for quantity changes
    if (this._lineItems.some((li) => li.newQuantity !== li.quantity)) return true;

    // Check for new discounts (item didn't have one but now does)
    if (this._lineItems.some((li) => !li.hadOriginalDiscount && li.discount !== null)) return true;

    // Check for removed discounts (item had one but now doesn't)
    if (this._lineItems.some((li) => li.hadOriginalDiscount && li.discount === null)) return true;

    // Check for modified discounts (item had one and still has one, but values changed)
    if (this._lineItems.some((li) => {
      if (!li.hadOriginalDiscount || li.discount === null || li.discounts.length === 0) return false;
      const original = li.discounts[0];
      return li.discount.type !== original.type ||
             li.discount.value !== original.value ||
             li.discount.isVisibleToCustomer !== original.isVisibleToCustomer;
    })) return true;

    // Check for custom items
    if (this._customItems.length > 0) return true;

    // Check for pending products
    if (this._pendingProducts.length > 0) return true;

    // Check for shipping changes per order
    if (this._orders.some((o) => o.newShippingCost !== o.shippingCost)) return true;

    // Check for tax removal
    if (this._taxRemoved) return true;

    // Check for removed order-level discounts
    if (this._removedOrderDiscounts.size > 0) return true;

    // Check for pending order discounts
    if (this._pendingOrderDiscounts.length > 0) return true;

    return false;
  }

  // ============================================
  // Preview API - Single Source of Truth
  // ============================================

  /**
   * Build the request object for preview/edit operations
   */
  private _buildPreviewRequest(): EditInvoiceDto {
    // Build line item updates (quantity and discount changes)
    const lineItemUpdates: EditLineItemDto[] = this._lineItems
      .filter((li) => !li.isRemoved && (li.newQuantity !== li.quantity || li.discount !== null))
      .map((li): EditLineItemDto => ({
        id: li.id,
        quantity: li.newQuantity !== li.quantity ? li.newQuantity : null,
        shouldReturnToStock: li.returnToStock,
        discount: li.discount,
      }));

    // Build removed items with return-to-stock flag
    const removedLineItems: RemoveLineItemDto[] = this._lineItems
      .filter((li) => li.isRemoved)
      .map((li): RemoveLineItemDto => ({
        id: li.id,
        shouldReturnToStock: li.returnToStock,
      }));

    // Build per-order shipping updates
    const orderShippingUpdates: OrderShippingUpdateDto[] = this._orders
      .filter((o) => o.newShippingCost !== o.shippingCost)
      .map((o): OrderShippingUpdateDto => ({
        orderId: o.id,
        shippingCost: o.newShippingCost,
      }));

    return {
      lineItems: lineItemUpdates,
      removedLineItems: removedLineItems,
      removedOrderDiscounts: Array.from(this._removedOrderDiscounts),
      customItems: this._customItems.map((item) => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        taxGroupId: item.taxGroupId,
        isPhysicalProduct: item.isPhysicalProduct,
      })),
      orderDiscounts: this._pendingOrderDiscounts.map((d) => ({
        type: d.type,
        value: d.value,
        reason: d.reason,
        isVisibleToCustomer: d.isVisibleToCustomer,
      })),
      orderShippingUpdates: orderShippingUpdates,
      editReason: this._editReason || null,
      shouldRemoveTax: this._taxRemoved,
    };
  }

  /**
   * Refresh the preview from the backend (debounced).
   * This is the ONLY place calculations happen - single source of truth.
   */
  private _refreshPreview(): void {
    if (!this._invoice) return;

    // Clear existing debounce timer
    if (this._previewDebounceTimer) {
      clearTimeout(this._previewDebounceTimer);
    }

    // Debounce API calls (300ms delay)
    this._previewDebounceTimer = setTimeout(async () => {
      this._previewLoading = true;

      const request = this._buildPreviewRequest();
      const { data, error } = await MerchelloApi.previewInvoiceEdit(this._invoice!.id, request);

      this._previewLoading = false;

      if (error) {
        console.error("Preview calculation failed:", error);
        // Keep showing old preview on error
        return;
      }

      if (data) {
        this._previewResult = data;
        // Update line item calculated totals from preview
        this._updateLineItemTotalsFromPreview(data);
      }
    }, 300);
  }

  /**
   * Update line item calculated totals from preview result
   */
  private _updateLineItemTotalsFromPreview(preview: PreviewEditResultDto): void {
    for (const lineItemPreview of preview.lineItems) {
      const lineItem = this._lineItems.find(li => li.id === lineItemPreview.id);
      if (lineItem) {
        lineItem.calculatedTotal = lineItemPreview.calculatedTotal;
      }
    }
    // Trigger re-render
    this._lineItems = [...this._lineItems];
  }

  // Getters for calculated values - use preview result or fall back to original invoice values
  private get _subtotalBeforeDiscounts(): number {
    return this._previewResult?.subTotal ?? this._invoice?.subTotal ?? 0;
  }

  private get _discountTotal(): number {
    return this._previewResult?.discountTotal ?? this._invoice?.discountTotal ?? 0;
  }

  private get _adjustedSubtotal(): number {
    return this._previewResult?.adjustedSubTotal ?? this._invoice?.adjustedSubTotal ?? 0;
  }

  // Note: Shipping is displayed per-order inline, not as a total summary line
  // If needed, use: this._previewResult?.shippingTotal ?? this._invoice?.shippingTotal ?? 0

  private get _newTax(): number {
    return this._previewResult?.tax ?? this._invoice?.tax ?? 0;
  }

  private get _newTotal(): number {
    return this._previewResult?.total ?? this._invoice?.total ?? 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._invoice || !this._hasChanges()) return;

    this._isSaving = true;
    this._errorMessage = null;

    // Reuse the same request builder used for preview
    const request = this._buildPreviewRequest();
    const { data, error } = await MerchelloApi.editInvoice(this._invoice.id, request);

    this._isSaving = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    if (data?.isSuccessful) {
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

      this.value = { isSaved: true };
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
    const qtyDecreased = lineItem.newQuantity < lineItem.quantity;
    const qtyIncreased = lineItem.newQuantity > lineItem.quantity;
    const qtyIncrease = lineItem.newQuantity - lineItem.quantity;

    // Check if stock is insufficient for quantity increase
    const hasInsufficientStock = qtyIncreased &&
      lineItem.isStockTracked &&
      lineItem.availableStock !== null &&
      lineItem.availableStock < qtyIncrease;

    // Block adding new discount if item had original discount but it was removed
    // (user can only remove original discounts, not replace them with new ones)
    const canModifyDiscount = !lineItem.hadOriginalDiscount || hasDiscount;

    return html`
      <div class="line-item ${hasInsufficientStock ? 'has-error' : ''}">
        <div class="line-item-product">
          <div class="line-item-image">
            <merchello-product-image
              media-key=${lineItem.imageUrl || nothing}
              size="medium"
              alt=${lineItem.name || ""}>
            </merchello-product-image>
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
        </div>

        <div class="line-item-price">
          <div class="price-display">
            ${hasDiscount ? html`
              <span class="original-price">${currencySymbol}${formatNumber(lineItem.amount, 2)}</span>
              <span class="discounted-price">${currencySymbol}${formatNumber(this._getDiscountedUnitPrice(lineItem), 2)}</span>
            ` : html`
              <span class="price">${currencySymbol}${formatNumber(lineItem.amount, 2)}</span>
            `}
            ${canModifyDiscount ? html`
              <button
                class="discount-trigger ${hasDiscount ? 'active' : ''}"
                @click=${() => this._openLineItemDiscountModal(lineItem.id)}
                title="${hasDiscount ? 'Edit discount' : 'Add discount'}"
              >
                <uui-icon name="${hasDiscount ? 'icon-sale' : 'icon-add'}"></uui-icon>
              </button>
            ` : nothing}
          </div>
          ${hasDiscount ? html`
            <div class="discount-text">
              <span>-${lineItem.discount!.type === DiscountValueType.Percentage
                ? `${lineItem.discount!.value}%`
                : `${currencySymbol}${formatNumber(lineItem.discount!.value, 2)}`} off</span>
              <button class="remove-discount-btn" @click=${() => this._removeDiscount(lineItem.id)} title="Remove discount">×</button>
            </div>
          ` : nothing}
        </div>

        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${lineItem.newQuantity.toString()}
            @input=${(e: Event) =>
              this._updateQuantity(lineItem.id, parseInt((e.target as HTMLInputElement).value) || 1)}
            min="1"
          ></uui-input>
        </div>

        <div class="line-item-total">
          ${currencySymbol}${formatNumber(lineItem.calculatedTotal, 2)}
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
      ${qtyDecreased && lineItem.productId && lineItem.isStockTracked ? html`
        <div class="return-to-stock-row">
          <uui-checkbox
            .checked=${lineItem.returnToStock}
            @change=${() => this._toggleReturnToStock(lineItem.id)}
          >
            Return ${lineItem.quantity - lineItem.newQuantity} to stock
          </uui-checkbox>
        </div>
      ` : nothing}
    `;
  }

  private _renderRemovedItem(lineItem: EditableLineItem) {
    const currencySymbol = this._invoice?.currencySymbol ?? "£";

    return html`
      <div class="removed-item">
        <div class="removed-item-info">
          <span class="removed-item-name">${lineItem.name}</span>
          <span class="removed-item-qty">× ${lineItem.quantity}</span>
          <span class="removed-item-price">${currencySymbol}${formatNumber(lineItem.amount * lineItem.quantity, 2)}</span>
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

  private _renderOrderDiscounts() {
    if (!this._invoice) return nothing;

    // Filter out removed discounts
    const activeDiscounts = this._invoice.orderDiscounts.filter(
      (d) => !this._removedOrderDiscounts.has(d.id)
    );

    const hasPendingDiscounts = this._pendingOrderDiscounts.length > 0;
    const hasActiveDiscounts = activeDiscounts.length > 0;

    if (!hasActiveDiscounts && !hasPendingDiscounts) return nothing;

    const currencySymbol = this._invoice.currencySymbol;

    return html`
      <div class="order-discounts-section">
        <h4>Order Discounts</h4>
        ${activeDiscounts.map(
          (discount) => html`
            <div class="order-discount-row">
              <div class="discount-info">
                <span class="discount-name">${discount.name || discount.reason || "Discount"}</span>
                <span class="discount-value">
                  ${discount.type === DiscountValueType.Percentage
                    ? `${discount.value}%`
                    : `${currencySymbol}${formatNumber(discount.value, 2)}`}
                </span>
              </div>
              <div class="discount-amount-cell">
                <span class="discount-amount">-${currencySymbol}${formatNumber(discount.amount, 2)}</span>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removeOrderDiscount(discount.id)}
                  title="Remove discount"
                >
                  <uui-icon name="icon-delete"></uui-icon>
                </uui-button>
              </div>
            </div>
          `
        )}
        ${this._pendingOrderDiscounts.map(
          (discount) => html`
            <div class="order-discount-row pending">
              <div class="discount-info">
                <span class="discount-name">${discount.reason || "New Discount"}</span>
                <span class="discount-value">
                  ${discount.type === DiscountValueType.Percentage
                    ? `${discount.value}%`
                    : `${currencySymbol}${formatNumber(discount.value, 2)}`}
                </span>
                <span class="pending-badge">New</span>
              </div>
              <div class="discount-amount-cell">
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removePendingOrderDiscount(discount.tempId)}
                  title="Remove discount"
                >
                  <uui-icon name="icon-delete"></uui-icon>
                </uui-button>
              </div>
            </div>
          `
        )}
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
        <div class="line-item-product">
          <div class="line-item-image">
            <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${item.name}</div>
            <div class="line-item-sku">${item.sku ?? 'Custom item'} · ${taxInfo}</div>
          </div>
        </div>

        <div class="line-item-price">
          ${currencySymbol}${formatNumber(item.price, 2)}
        </div>

        <div class="line-item-quantity">
          ${item.quantity}
        </div>

        <div class="line-item-total">
          ${currencySymbol}${formatNumber(item.price * item.quantity, 2)}
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

  private _renderPendingProduct(product: PendingProduct) {
    const currencySymbol = this._invoice?.currencySymbol ?? "£";

    return html`
      <div class="line-item pending-product">
        <div class="line-item-product">
          <div class="line-item-image">
            <merchello-product-image
              media-key=${product.imageUrl || nothing}
              size="medium"
              alt=${product.name || ""}>
            </merchello-product-image>
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${product.name}</div>
            <div class="line-item-sku">${product.sku ?? "No SKU"}</div>
            <div class="warehouse-info">
              <uui-icon name="icon-home"></uui-icon>
              ${product.warehouseName || "Default warehouse"}
            </div>
          </div>
        </div>

        <div class="line-item-price">
          ${currencySymbol}${formatNumber(product.price, 2)}
        </div>

        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${product.quantity.toString()}
            @input=${(e: Event) =>
              this._updatePendingProductQuantity(product.tempId, parseInt((e.target as HTMLInputElement).value) || 1)}
            min="1"
          ></uui-input>
        </div>

        <div class="line-item-total">
          ${currencySymbol}${formatNumber(product.price * product.quantity, 2)}
        </div>

        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removePendingProduct(product.tempId)}
            title="Remove product"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }

  override render() {
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
    // Use backend-calculated preview values (single source of truth)
    const subtotalBeforeDiscounts = this._subtotalBeforeDiscounts;
    const discountTotal = this._discountTotal;
    const adjustedSubtotal = this._adjustedSubtotal;
    // Note: shippingTotal available via this._shippingTotal if needed for total display
    const newTax = this._newTax;
    const newTotal = this._newTotal;
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

          <!-- Pending Products Section (if any) -->
          ${this._pendingProducts.length > 0 ? html`
            <div class="items-section pending-products-section">
              <div class="section-header">
                <h4>Products to Add</h4>
              </div>
              <div class="items-header">
                <div class="header-cell product">Product</div>
                <div class="header-cell price">Price</div>
                <div class="header-cell quantity">Quantity</div>
                <div class="header-cell total">Total</div>
                <div class="header-cell actions"></div>
              </div>
              <div class="items-list">
                ${this._pendingProducts.map((product) => this._renderPendingProduct(product))}
              </div>
            </div>
          ` : nothing}

          <!-- Add Items Actions -->
          <div class="add-items-section">
            <uui-button look="secondary" @click=${this._openProductPickerModal}>
              <uui-icon name="icon-add"></uui-icon>
              Add product
            </uui-button>
            <uui-button look="secondary" @click=${this._openAddCustomItemModal}>
              <uui-icon name="icon-add"></uui-icon>
              Add custom item
            </uui-button>
            <uui-button look="secondary" @click=${this._openAddDiscountModal}>
              <uui-icon name="icon-add"></uui-icon>
              Add discount
            </uui-button>
          </div>

          <!-- Removed Items Section -->
          ${removedItems.length > 0 ? html`
            <div class="removed-items-section">
              <h4>Removed Items</h4>
              ${removedItems.map((li) => this._renderRemovedItem(li))}
            </div>
          ` : nothing}

          <!-- Order Discounts Section (coupons, etc.) -->
          ${this._renderOrderDiscounts()}

          <!-- Payment Summary -->
          <div class="payment-section">
            <h3>Order Summary</h3>

            <div class="payment-row">
              <span>Subtotal</span>
              <span>${currencySymbol}${formatNumber(subtotalBeforeDiscounts, 2)} ${currencyCode}</span>
            </div>

            ${hasDiscounts ? html`
              <div class="payment-row discount">
                <span>Discounts</span>
                <span class="discount-amount">-${currencySymbol}${formatNumber(discountTotal, 2)} ${currencyCode}</span>
              </div>
              <div class="payment-row adjusted">
                <span>Adjusted Subtotal</span>
                <span>${currencySymbol}${formatNumber(adjustedSubtotal, 2)} ${currencyCode}</span>
              </div>
            ` : nothing}

            <!-- Shipping per order with edit/remove -->
            ${this._orders.map((order, index) => html`
              <div class="payment-row shipping-row ${this._removedShippingOrders.has(order.id) ? 'removed' : ''}">
                <span>${order.shippingMethodName ?? 'Shipping'}${this._orders.length > 1 ? ` (Order ${index + 1})` : ''}</span>
                <div class="summary-edit-controls">
                  ${this._removedShippingOrders.has(order.id) ? html`
                    <span class="removed-label">Removed</span>
                    <uui-button compact look="secondary" @click=${() => this._restoreShipping(order.id)}>Undo</uui-button>
                  ` : html`
                    <div class="summary-input">
                      <span class="prefix">${currencySymbol}</span>
                      <uui-input
                        type="number"
                        .value=${order.newShippingCost.toString()}
                        @input=${(e: Event) => this._updateOrderShipping(order.id, parseFloat((e.target as HTMLInputElement).value) || 0)}
                        min="0"
                        step="0.01"
                      ></uui-input>
                    </div>
                    <uui-button compact look="secondary" @click=${() => this._removeShipping(order.id)} title="Remove shipping">
                      <uui-icon name="icon-delete"></uui-icon>
                    </uui-button>
                  `}
                </div>
              </div>
            `)}

            <!-- Tax with remove option -->
            <div class="payment-row tax-row ${this._taxRemoved ? 'removed' : ''}">
              <span>Tax</span>
              <div class="summary-edit-controls">
                ${this._taxRemoved ? html`
                  <span class="removed-label">Removed (VAT exemption)</span>
                  <uui-button compact look="secondary" @click=${() => this._restoreTax()}>Undo</uui-button>
                ` : html`
                  <span>${currencySymbol}${formatNumber(newTax, 2)} ${currencyCode}</span>
                  <uui-button compact look="secondary" @click=${() => this._removeTax()} title="Remove tax (VAT exemption)">
                    <uui-icon name="icon-delete"></uui-icon>
                  </uui-button>
                `}
              </div>
            </div>

            <div class="payment-row total ${this._previewLoading ? 'loading' : ''}">
              <span>Total</span>
              <span>${currencySymbol}${formatNumber(newTotal, 2)} ${currencyCode}</span>
            </div>

            <p class="tax-note">${this._previewLoading ? 'Calculating...' : 'Totals calculated by server'}</p>
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
    const orderLineItems = this._lineItems.filter((li) => li.orderId === order.id && !li.isRemoved);

    return html`
      <div class="items-section order-section">
        <div class="section-header">
          <h4>Order: ${order.shippingMethodName ?? 'Standard'}</h4>
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
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
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
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .fulfillment-badge.partial {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .fulfillment-badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
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
      grid-template-columns: minmax(200px, 2fr) 140px 100px 100px 48px;
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
      grid-template-columns: minmax(200px, 2fr) 140px 100px 100px 48px;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      align-items: center;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .line-item:last-child {
      border-bottom: none;
    }

    .line-item-product {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      min-width: 0;
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

    .price-display {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
    }

    .price {
      font-weight: 500;
    }

    .original-price {
      text-decoration: line-through;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .discounted-price {
      font-weight: 600;
      color: var(--uui-color-current);
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

    .discount-text {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
      margin-top: 4px;
      font-size: 0.8125rem;
      color: var(--uui-color-positive);
    }

    .discount-text span {
      font-weight: 500;
    }

    .remove-discount-btn {
      background: none;
      border: none;
      color: var(--uui-color-positive);
      cursor: pointer;
      font-size: 1.125rem;
      line-height: 1;
      padding: 0;
      opacity: 0.7;
      transition: opacity 0.15s;
    }

    .remove-discount-btn:hover {
      opacity: 1;
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

    /* Return to Stock Row - separate row below line item */
    .return-to-stock-row {
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      padding-left: calc(var(--uui-size-space-4) + 40px + var(--uui-size-space-3)); /* Align with product details */
      background: var(--uui-color-surface-alt);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .return-to-stock-row uui-checkbox {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
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

    /* Pending Products Section */
    .pending-products-section {
      border-color: var(--uui-color-current);
    }

    .pending-products-section .section-header {
      background: rgba(var(--uui-color-current-rgb), 0.1);
    }

    .pending-products-section .section-header h4 {
      color: var(--uui-color-current);
    }

    .placeholder-image.product {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .warehouse-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: 2px;
    }

    .warehouse-info uui-icon {
      font-size: 0.75rem;
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

    /* Summary edit controls for shipping and tax */
    .summary-edit-controls {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .summary-input {
      display: flex;
      align-items: center;
    }

    .summary-input .prefix {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-right: none;
      padding: 0 var(--uui-size-space-2);
      height: 32px;
      display: flex;
      align-items: center;
      border-radius: var(--uui-border-radius) 0 0 var(--uui-border-radius);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .summary-input uui-input {
      width: 80px;
    }

    .payment-row.removed {
      color: var(--uui-color-text-alt);
    }

    .payment-row.removed span:first-child {
      text-decoration: line-through;
    }

    .removed-label {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      font-style: italic;
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

    /* Order Discounts Section */
    .order-discounts-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .order-discounts-section h4 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-positive);
    }

    .order-discount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .order-discount-row:last-child {
      border-bottom: none;
    }

    .order-discount-row .discount-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .order-discount-row .discount-name {
      font-weight: 500;
    }

    .order-discount-row .discount-value {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .order-discount-row .discount-amount-cell {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .order-discount-row .discount-amount {
      font-weight: 500;
      color: var(--uui-color-positive);
    }

    .order-discount-row.pending {
      background: rgba(var(--uui-color-positive-rgb), 0.05);
      margin: 0 calc(-1 * var(--uui-size-space-4));
      padding-left: var(--uui-size-space-4);
      padding-right: var(--uui-size-space-4);
    }

    .pending-badge {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--uui-color-positive-emphasis);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
    }
  `;
}

export default MerchelloEditOrderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-edit-order-modal": MerchelloEditOrderModalElement;
  }
}
