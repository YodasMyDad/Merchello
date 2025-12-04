import { html as a, nothing as d, css as T, state as c, customElement as I } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as z, UmbModalBaseElement as C, UMB_MODAL_MANAGER_CONTEXT as R } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as M } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-eSCXsudl.js";
import { D as m } from "./order.types-DjkMLpgj.js";
const D = new z("Merchello.AddCustomItem.Modal", {
  modal: {
    type: "dialog",
    size: "small"
  }
});
var L = Object.defineProperty, P = Object.getOwnPropertyDescriptor, w = (e) => {
  throw TypeError(e);
}, u = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? P(i, t) : i, l = e.length - 1, s; l >= 0; l--)
    (s = e[l]) && (r = (o ? s(i, t, r) : s(r)) || r);
  return o && r && L(i, t, r), r;
}, k = (e, i, t) => i.has(e) || w("Cannot " + t), f = (e, i, t) => (k(e, i, "read from private field"), i.get(e)), x = (e, i, t) => i.has(e) ? w("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), $ = (e, i, t, o) => (k(e, i, "write to private field"), i.set(e, t), t), h, g;
let n = class extends C {
  constructor() {
    super(), this._invoice = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._editReason = "", this._orders = [], this._lineItems = [], this._customItems = [], this._discountPopoverLineItemId = null, this._discountType = m.Amount, this._discountValue = 0, this._discountReason = "", this._discountVisibleToCustomer = !1, this._taxGroups = [], x(this, h), x(this, g), this.consumeContext(R, (e) => {
      $(this, h, e);
    }), this.consumeContext(M, (e) => {
      $(this, g, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadInvoice();
  }
  async _loadInvoice() {
    this._isLoading = !0, this._errorMessage = null;
    const [e, i] = await Promise.all([
      b.getInvoiceForEdit(this.data.invoiceId),
      b.getTaxGroups()
    ]);
    if (e.error) {
      this._errorMessage = e.error.message, this._isLoading = !1;
      return;
    }
    this._invoice = e.data ?? null, this._taxGroups = i.data ?? [], this._invoice && (this._orders = this._invoice.orders.map((t) => ({
      ...t,
      newShippingCost: t.shippingCost
    })), this._lineItems = this._invoice.orders.flatMap(
      (t) => t.lineItems.map((o) => ({
        ...o,
        isRemoved: !1,
        returnToStock: !0,
        // Default: return to stock
        newQuantity: o.quantity,
        discount: null,
        calculatedTotal: o.amount * o.quantity
      }))
    )), this._isLoading = !1;
  }
  _updateQuantity(e, i) {
    this._lineItems = this._lineItems.map((t) => {
      if (t.id === e) {
        const o = Math.max(1, i);
        return {
          ...t,
          newQuantity: o,
          calculatedTotal: this._calculateLineItemTotal(t.amount, o, t.discount)
        };
      }
      return t;
    });
  }
  _removeLineItem(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? { ...i, isRemoved: !0, returnToStock: !0 } : i);
  }
  _restoreLineItem(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? { ...i, isRemoved: !1 } : i);
  }
  _toggleReturnToStock(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? { ...i, returnToStock: !i.returnToStock } : i);
  }
  _updateOrderShipping(e, i) {
    this._orders = this._orders.map((t) => t.id === e ? { ...t, newShippingCost: Math.max(0, i) } : t);
  }
  _openDiscountPopover(e) {
    const i = this._lineItems.find((t) => t.id === e);
    i?.discount ? (this._discountType = i.discount.type, this._discountValue = i.discount.value, this._discountReason = i.discount.reason ?? "", this._discountVisibleToCustomer = i.discount.visibleToCustomer) : (this._discountType = m.Amount, this._discountValue = 0, this._discountReason = "", this._discountVisibleToCustomer = !1), this._discountPopoverLineItemId = e;
  }
  _closeDiscountPopover() {
    this._discountPopoverLineItemId = null;
  }
  _applyDiscount() {
    if (!this._discountPopoverLineItemId || this._discountValue <= 0) {
      this._closeDiscountPopover();
      return;
    }
    const e = {
      type: this._discountType,
      value: this._discountValue,
      reason: this._discountReason || null,
      visibleToCustomer: this._discountVisibleToCustomer
    };
    this._lineItems = this._lineItems.map((i) => i.id === this._discountPopoverLineItemId ? {
      ...i,
      discount: e,
      calculatedTotal: this._calculateLineItemTotal(i.amount, i.newQuantity, e)
    } : i), this._closeDiscountPopover();
  }
  _removeDiscount(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? {
      ...i,
      discount: null,
      calculatedTotal: i.amount * i.newQuantity
    } : i);
  }
  _calculateLineItemTotal(e, i, t) {
    const o = e * i;
    return !t || t.value <= 0 ? o : t.type === m.Amount ? Math.max(0, o - t.value * i) : o * (1 - t.value / 100);
  }
  async _openAddCustomItemModal() {
    if (!f(this, h) || !this._invoice) return;
    const i = await f(this, h).open(this, D, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        taxGroups: this._taxGroups
      }
    }).onSubmit().catch(() => {
    });
    i?.item && (this._customItems = [
      ...this._customItems,
      {
        ...i.item,
        tempId: `custom-${Date.now()}`
      }
    ]);
  }
  _removeCustomItem(e) {
    this._customItems = this._customItems.filter((i) => i.tempId !== e);
  }
  _hasChanges() {
    return this._invoice ? !!(this._lineItems.some((e) => e.isRemoved) || this._lineItems.some((e) => e.newQuantity !== e.quantity) || this._lineItems.some((e) => e.discount !== null) || this._customItems.length > 0 || this._orders.some((e) => e.newShippingCost !== e.shippingCost)) : !1;
  }
  _calculateSubtotalBeforeDiscounts() {
    const e = this._lineItems.filter((t) => !t.isRemoved).reduce((t, o) => t + o.amount * o.newQuantity, 0), i = this._customItems.reduce(
      (t, o) => t + o.price * o.quantity,
      0
    );
    return e + i;
  }
  _calculateDiscountTotal() {
    return this._lineItems.filter((e) => !e.isRemoved && e.discount !== null).reduce((e, i) => {
      const t = i.discount;
      return t.type === m.Amount ? e + t.value * i.newQuantity : e + i.amount * i.newQuantity * (t.value / 100);
    }, 0);
  }
  _calculateAdjustedSubtotal() {
    return this._calculateSubtotalBeforeDiscounts() - this._calculateDiscountTotal();
  }
  _calculateShippingTotal() {
    return this._orders.reduce((e, i) => e + i.newShippingCost, 0);
  }
  _calculateNewTax() {
    if (!this._invoice) return 0;
    const e = this._lineItems.filter((t) => !t.isRemoved && t.isTaxable).reduce((t, o) => {
      const r = this._calculateLineItemTotal(o.amount, o.newQuantity, o.discount);
      return t + r * (o.taxRate / 100);
    }, 0), i = this._customItems.filter((t) => t.taxGroupId !== null).reduce((t, o) => {
      const l = this._taxGroups.find((s) => s.id === o.taxGroupId)?.taxPercentage ?? 0;
      return t + o.price * o.quantity * (l / 100);
    }, 0);
    return e + i;
  }
  _calculateNewTotal() {
    return this._calculateAdjustedSubtotal() + this._calculateNewTax() + this._calculateShippingTotal();
  }
  async _handleSave() {
    if (!this._invoice || !this._hasChanges()) return;
    this._isSaving = !0, this._errorMessage = null;
    const e = this._lineItems.filter((s) => !s.isRemoved && (s.newQuantity !== s.quantity || s.discount !== null)).map((s) => ({
      id: s.id,
      quantity: s.newQuantity !== s.quantity ? s.newQuantity : null,
      returnToStock: s.returnToStock,
      discount: s.discount
    })), i = this._lineItems.filter((s) => s.isRemoved).map((s) => ({
      id: s.id,
      returnToStock: s.returnToStock
    })), t = this._orders.filter((s) => s.newShippingCost !== s.shippingCost).map((s) => ({
      orderId: s.id,
      shippingCost: s.newShippingCost
    })), o = {
      lineItems: e,
      removedLineItems: i,
      customItems: this._customItems.map((s) => ({
        name: s.name,
        price: s.price,
        quantity: s.quantity,
        taxGroupId: s.taxGroupId,
        isPhysicalProduct: s.isPhysicalProduct
      })),
      orderShippingUpdates: t,
      editReason: this._editReason || null
    }, { data: r, error: l } = await b.editInvoice(this._invoice.id, o);
    if (this._isSaving = !1, l) {
      this._errorMessage = l.message;
      return;
    }
    if (r?.success) {
      if (r.warnings && r.warnings.length > 0)
        for (const s of r.warnings)
          f(this, g)?.peek("warning", {
            data: {
              headline: "Stock Warning",
              message: s
            }
          });
      f(this, g)?.peek("positive", {
        data: {
          headline: "Order Updated",
          message: "The order has been successfully updated."
        }
      }), this.value = { saved: !0 }, this.modalContext?.submit();
    } else
      this._errorMessage = r?.errorMessage ?? "Failed to save changes";
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderLoading() {
    return a`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading order...</span>
      </div>
    `;
  }
  _renderError() {
    return a`
      <div class="error-state">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" @click=${this._loadInvoice}>Retry</uui-button>
      </div>
    `;
  }
  _renderCannotEdit() {
    return a`
      <div class="cannot-edit">
        <uui-icon name="icon-lock"></uui-icon>
        <h3>Cannot Edit This Order</h3>
        <p>${this._invoice?.cannotEditReason ?? "This order cannot be edited."}</p>
        <uui-button look="secondary" @click=${this._handleCancel}>Close</uui-button>
      </div>
    `;
  }
  _renderLineItem(e) {
    if (e.isRemoved) return d;
    const i = this._invoice?.currencySymbol ?? "£", t = e.discount !== null, o = this._discountPopoverLineItemId === e.id, r = e.newQuantity < e.quantity, l = e.newQuantity > e.quantity, s = e.newQuantity - e.quantity, v = l && e.isStockTracked && e.availableStock !== null && e.availableStock < s;
    return a`
      <div class="line-item ${v ? "has-error" : ""}">
        <div class="line-item-image">
          ${e.imageUrl ? a`<img src=${e.imageUrl} alt=${e.name ?? ""} />` : a`<div class="placeholder-image"><uui-icon name="icon-picture"></uui-icon></div>`}
        </div>

        <div class="line-item-details">
          <div class="line-item-name">${e.name}</div>
          ${e.sku ? a`<div class="line-item-sku">${e.sku}</div>` : d}
          ${e.isStockTracked && e.availableStock !== null ? a`
            <div class="stock-info ${v ? "error" : ""}">
              ${v ? a`<uui-icon name="icon-alert"></uui-icon> Only ${e.availableStock} available` : a`${e.availableStock} in stock`}
            </div>
          ` : d}
        </div>

        <div class="line-item-price">
          <div class="price-wrapper">
            <span class="price ${t ? "has-discount" : ""}">${i}${e.amount.toFixed(2)}</span>
            <button
              class="discount-trigger ${t ? "active" : ""}"
              @click=${() => this._openDiscountPopover(e.id)}
              title="${t ? "Edit discount" : "Add discount"}"
            >
              <uui-icon name="${t ? "icon-sale" : "icon-add"}"></uui-icon>
            </button>
          </div>
          ${t ? a`
            <div class="discount-badge">
              -${e.discount.type === m.Percentage ? `${e.discount.value}%` : `${i}${e.discount.value.toFixed(2)}`}
              <button class="remove-discount" @click=${() => this._removeDiscount(e.id)}>×</button>
            </div>
          ` : d}

          ${o ? this._renderDiscountPopover(e) : d}
        </div>

        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${e.newQuantity.toString()}
            @input=${(_) => this._updateQuantity(e.id, parseInt(_.target.value) || 1)}
            min="1"
          ></uui-input>
          ${r && e.productId && e.isStockTracked ? a`
            <div class="return-to-stock-toggle">
              <uui-checkbox
                .checked=${e.returnToStock}
                @change=${() => this._toggleReturnToStock(e.id)}
              >
                Return ${e.quantity - e.newQuantity} to stock
              </uui-checkbox>
            </div>
          ` : d}
        </div>

        <div class="line-item-total">
          ${i}${e.calculatedTotal.toFixed(2)}
        </div>

        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removeLineItem(e.id)}
            title="Remove item"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderRemovedItem(e) {
    const i = this._invoice?.currencySymbol ?? "£";
    return a`
      <div class="removed-item">
        <div class="removed-item-info">
          <span class="removed-item-name">${e.name}</span>
          <span class="removed-item-qty">× ${e.quantity}</span>
          <span class="removed-item-price">${i}${(e.amount * e.quantity).toFixed(2)}</span>
        </div>
        <div class="removed-item-options">
          ${e.productId && e.isStockTracked ? a`
            <uui-checkbox
              .checked=${e.returnToStock}
              @change=${() => this._toggleReturnToStock(e.id)}
            >
              Return to stock
            </uui-checkbox>
          ` : d}
          <uui-button look="secondary" compact @click=${() => this._restoreLineItem(e.id)}>
            Undo
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderDiscountPopover(e) {
    const i = this._invoice?.currencySymbol ?? "£";
    return a`
      <div class="discount-popover">
        <div class="popover-header">
          <span>Discount type</span>
        </div>

        <uui-select
          .value=${this._discountType.toString()}
          @change=${(t) => this._discountType = parseInt(t.target.value)}
        >
          <option value="0">Amount</option>
          <option value="1">Percentage</option>
        </uui-select>

        <div class="popover-row">
          <label>Value ${this._discountType === m.Percentage ? "(%)" : "(per unit)"}</label>
          <div class="input-with-affix">
            ${this._discountType === m.Amount ? a`<span class="prefix">${i}</span>` : d}
            <uui-input
              type="number"
              .value=${this._discountValue.toString()}
              @input=${(t) => this._discountValue = parseFloat(t.target.value) || 0}
              min="0"
              step="0.01"
            ></uui-input>
            ${this._discountType === m.Percentage ? a`<span class="suffix">%</span>` : d}
          </div>
        </div>

        <div class="popover-row">
          <label>Reason for discount</label>
          <uui-input
            .value=${this._discountReason}
            @input=${(t) => this._discountReason = t.target.value}
            placeholder="Optional"
          ></uui-input>
        </div>

        <div class="popover-row checkbox">
          <uui-checkbox
            .checked=${this._discountVisibleToCustomer}
            @change=${(t) => this._discountVisibleToCustomer = t.target.checked}
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
  _renderCustomItem(e) {
    const i = this._invoice?.currencySymbol ?? "£", t = e.taxGroupId ? this._taxGroups.find((r) => r.id === e.taxGroupId) : null, o = t ? `${t.name} (${t.taxPercentage}%)` : "Not taxable";
    return a`
      <div class="line-item custom-item">
        <div class="line-item-image">
          <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
        </div>

        <div class="line-item-details">
          <div class="line-item-name">${e.name}</div>
          <div class="line-item-sku">Custom item · ${o}</div>
        </div>

        <div class="line-item-price">
          ${i}${e.price.toFixed(2)}
        </div>

        <div class="line-item-quantity">
          ${e.quantity}
        </div>

        <div class="line-item-total">
          ${i}${(e.price * e.quantity).toFixed(2)}
        </div>

        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removeCustomItem(e.tempId)}
            title="Remove item"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return a`<umb-body-layout headline="Edit Order">${this._renderLoading()}</umb-body-layout>`;
    if (this._errorMessage && !this._invoice)
      return a`<umb-body-layout headline="Edit Order">${this._renderError()}</umb-body-layout>`;
    if (!this._invoice?.canEdit)
      return a`<umb-body-layout headline="Edit Order">${this._renderCannotEdit()}</umb-body-layout>`;
    const e = this._invoice.currencySymbol, i = this._invoice.currencyCode, t = this._calculateSubtotalBeforeDiscounts(), o = this._calculateDiscountTotal(), r = this._calculateAdjustedSubtotal(), l = this._calculateShippingTotal(), s = this._calculateNewTax(), v = this._calculateNewTotal(), _ = this._hasChanges(), y = this._lineItems.filter((p) => p.isRemoved), S = o > 0;
    return a`
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
          ${this._orders.map((p) => this._renderOrderSection(p))}

          <!-- Custom Items Section (if any) -->
          ${this._customItems.length > 0 ? a`
            <div class="items-section custom-items-section">
              <div class="section-header">
                <h4>Custom Items (New Order)</h4>
              </div>
              <div class="items-list">
                ${this._customItems.map((p) => this._renderCustomItem(p))}
              </div>
            </div>
          ` : d}

          <!-- Add Items Actions -->
          <div class="add-items-section">
            <uui-button look="secondary" @click=${() => {
    }} disabled>
              <uui-icon name="icon-add"></uui-icon>
              Add product
            </uui-button>
            <uui-button look="secondary" @click=${this._openAddCustomItemModal}>
              <uui-icon name="icon-add"></uui-icon>
              Add custom item
            </uui-button>
          </div>

          <!-- Removed Items Section -->
          ${y.length > 0 ? a`
            <div class="removed-items-section">
              <h4>Removed Items</h4>
              ${y.map((p) => this._renderRemovedItem(p))}
            </div>
          ` : d}

          <!-- Payment Summary -->
          <div class="payment-section">
            <h3>Order Summary</h3>

            <div class="payment-row">
              <span>Subtotal</span>
              <span>${e}${t.toFixed(2)} ${i}</span>
            </div>

            ${S ? a`
              <div class="payment-row discount">
                <span>Discounts</span>
                <span class="discount-amount">-${e}${o.toFixed(2)} ${i}</span>
              </div>
              <div class="payment-row adjusted">
                <span>Adjusted Subtotal</span>
                <span>${e}${r.toFixed(2)} ${i}</span>
              </div>
            ` : d}

            <div class="payment-row">
              <span>Shipping</span>
              <span>${e}${l.toFixed(2)} ${i}</span>
            </div>

            <div class="payment-row">
              <span>Tax</span>
              <span>${e}${s.toFixed(2)} ${i}</span>
            </div>

            <div class="payment-row total">
              <span>Total</span>
              <span>${e}${v.toFixed(2)} ${i}</span>
            </div>

            <p class="tax-note">Taxes are estimated until you update the order</p>
          </div>

          <!-- Reason for Edit -->
          <div class="reason-section">
            <h3>Reason for edit</h3>
            <uui-textarea
              .value=${this._editReason}
              @input=${(p) => this._editReason = p.target.value}
              placeholder="Add a reason for this edit..."
            ></uui-textarea>
            <p class="reason-note">Only visible to staff</p>
          </div>

          ${this._errorMessage ? a`
            <div class="error-message">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : d}
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
            ?disabled=${this._isSaving || !_}
          >
            ${this._isSaving ? a`<uui-loader-circle></uui-loader-circle>` : "Update order"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderOrderSection(e) {
    const i = this._invoice?.currencySymbol ?? "£", t = this._lineItems.filter((o) => o.orderId === e.id && !o.isRemoved);
    return a`
      <div class="items-section order-section">
        <div class="section-header">
          <h4>Order: ${e.shippingMethodName ?? "Standard"}</h4>
          <div class="order-shipping">
            <span class="shipping-label">Shipping:</span>
            <div class="shipping-cost-input">
              <span class="prefix">${i}</span>
              <uui-input
                type="number"
                .value=${e.newShippingCost.toString()}
                @input=${(o) => this._updateOrderShipping(e.id, parseFloat(o.target.value) || 0)}
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
          ${t.map((o) => this._renderLineItem(o))}
        </div>
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
n.styles = T`
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
u([
  c()
], n.prototype, "_invoice", 2);
u([
  c()
], n.prototype, "_isLoading", 2);
u([
  c()
], n.prototype, "_isSaving", 2);
u([
  c()
], n.prototype, "_errorMessage", 2);
u([
  c()
], n.prototype, "_editReason", 2);
u([
  c()
], n.prototype, "_orders", 2);
u([
  c()
], n.prototype, "_lineItems", 2);
u([
  c()
], n.prototype, "_customItems", 2);
u([
  c()
], n.prototype, "_discountPopoverLineItemId", 2);
u([
  c()
], n.prototype, "_discountType", 2);
u([
  c()
], n.prototype, "_discountValue", 2);
u([
  c()
], n.prototype, "_discountReason", 2);
u([
  c()
], n.prototype, "_discountVisibleToCustomer", 2);
u([
  c()
], n.prototype, "_taxGroups", 2);
n = u([
  I("merchello-edit-order-modal")
], n);
const G = n;
export {
  n as MerchelloEditOrderModalElement,
  G as default
};
//# sourceMappingURL=edit-order-modal.element-DWxd_gBS.js.map
