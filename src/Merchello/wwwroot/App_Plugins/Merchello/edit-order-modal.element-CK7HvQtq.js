import { html as s, nothing as d, css as z, state as u, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as I, UmbModalBaseElement as R, UMB_MODAL_MANAGER_CONTEXT as O } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as D } from "@umbraco-cms/backoffice/notification";
import { M as _ } from "./merchello-api-CzSx3Q3Y.js";
import { D as v } from "./order.types-DjkMLpgj.js";
const P = new I("Merchello.AddCustomItem.Modal", {
  modal: {
    type: "dialog",
    size: "small"
  }
});
var L = Object.defineProperty, M = Object.getOwnPropertyDescriptor, w = (e) => {
  throw TypeError(e);
}, n = (e, i, t, o) => {
  for (var a = o > 1 ? void 0 : o ? M(i, t) : i, l = e.length - 1, p; l >= 0; l--)
    (p = e[l]) && (a = (o ? p(i, t, a) : p(a)) || a);
  return o && a && L(i, t, a), a;
}, $ = (e, i, t) => i.has(e) || w("Cannot " + t), f = (e, i, t) => ($(e, i, "read from private field"), i.get(e)), y = (e, i, t) => i.has(e) ? w("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), x = (e, i, t, o) => ($(e, i, "write to private field"), i.set(e, t), t), h, g;
let r = class extends R {
  constructor() {
    super(), this._invoice = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._editReason = "", this._orders = [], this._lineItems = [], this._customItems = [], this._discountPopoverLineItemId = null, this._discountType = v.Amount, this._discountValue = 0, this._discountReason = "", this._discountVisibleToCustomer = !1, this._popoverPosition = { top: 0, left: 0 }, this._taxGroups = [], this._removedShippingOrders = /* @__PURE__ */ new Set(), this._taxRemoved = !1, this._removedOrderDiscounts = /* @__PURE__ */ new Set(), this._previewResult = null, this._previewLoading = !1, y(this, h), y(this, g), this.consumeContext(O, (e) => {
      x(this, h, e);
    }), this.consumeContext(D, (e) => {
      x(this, g, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadInvoice();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._previewDebounceTimer && (clearTimeout(this._previewDebounceTimer), this._previewDebounceTimer = void 0);
  }
  async _loadInvoice() {
    this._isLoading = !0, this._errorMessage = null;
    const [e, i] = await Promise.all([
      _.getInvoiceForEdit(this.data.invoiceId),
      _.getTaxGroups()
    ]);
    if (e.error) {
      this._errorMessage = e.error.message, this._isLoading = !1;
      return;
    }
    this._invoice = e.data ?? null, this._taxGroups = i.data ?? [], this._invoice && (this._orders = this._invoice.orders.map((t) => ({
      ...t,
      newShippingCost: t.shippingCost
    })), this._lineItems = this._invoice.orders.flatMap(
      (t) => t.lineItems.map((o) => {
        const a = o.discounts.length > 0, l = a ? {
          type: o.discounts[0].type,
          value: o.discounts[0].value,
          reason: o.discounts[0].reason,
          visibleToCustomer: o.discounts[0].visibleToCustomer
        } : null;
        return {
          ...o,
          isRemoved: !1,
          returnToStock: !0,
          // Default: return to stock
          newQuantity: o.quantity,
          discount: l,
          hadOriginalDiscount: a,
          calculatedTotal: this._getOptimisticLineItemTotal(o.amount, o.quantity, l)
        };
      })
    )), this._isLoading = !1;
  }
  _updateQuantity(e, i) {
    this._lineItems = this._lineItems.map((t) => {
      if (t.id === e) {
        const o = Math.max(1, i);
        return {
          ...t,
          newQuantity: o,
          calculatedTotal: this._getOptimisticLineItemTotal(t.amount, o, t.discount)
        };
      }
      return t;
    }), this._refreshPreview();
  }
  _removeLineItem(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? { ...i, isRemoved: !0, returnToStock: !0 } : i), this._refreshPreview();
  }
  _restoreLineItem(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? { ...i, isRemoved: !1 } : i), this._refreshPreview();
  }
  _toggleReturnToStock(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? { ...i, returnToStock: !i.returnToStock } : i);
  }
  _updateOrderShipping(e, i) {
    this._orders = this._orders.map((t) => t.id === e ? { ...t, newShippingCost: Math.max(0, i) } : t), this._refreshPreview();
  }
  _removeShipping(e) {
    this._removedShippingOrders = /* @__PURE__ */ new Set([...this._removedShippingOrders, e]), this._orders = this._orders.map((i) => i.id === e ? { ...i, newShippingCost: 0 } : i), this._refreshPreview();
  }
  _restoreShipping(e) {
    const i = new Set(this._removedShippingOrders);
    i.delete(e), this._removedShippingOrders = i;
    const t = this._invoice?.orders.find((o) => o.id === e);
    t && (this._orders = this._orders.map((o) => o.id === e ? { ...o, newShippingCost: t.shippingCost } : o)), this._refreshPreview();
  }
  _removeTax() {
    this._taxRemoved = !0, this._refreshPreview();
  }
  _restoreTax() {
    this._taxRemoved = !1, this._refreshPreview();
  }
  _removeOrderDiscount(e) {
    this._removedOrderDiscounts = /* @__PURE__ */ new Set([...this._removedOrderDiscounts, e]), this._refreshPreview();
  }
  _openDiscountPopover(e, i) {
    const o = i.currentTarget.getBoundingClientRect();
    this._popoverPosition = {
      top: o.bottom + 4,
      left: o.right - 280
      // 280 is min-width of popover
    };
    const a = this._lineItems.find((l) => l.id === e);
    a?.discount ? (this._discountType = a.discount.type, this._discountValue = a.discount.value, this._discountReason = a.discount.reason ?? "", this._discountVisibleToCustomer = a.discount.visibleToCustomer) : (this._discountType = v.Amount, this._discountValue = 0, this._discountReason = "", this._discountVisibleToCustomer = !1), this._discountPopoverLineItemId = e;
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
      calculatedTotal: this._getOptimisticLineItemTotal(i.amount, i.newQuantity, e)
    } : i), this._closeDiscountPopover(), this._refreshPreview();
  }
  _removeDiscount(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? {
      ...i,
      discount: null,
      calculatedTotal: i.amount * i.newQuantity
    } : i), this._refreshPreview();
  }
  /**
   * Calculate line item total for OPTIMISTIC UI display only.
   * The authoritative value comes from the backend via _refreshPreview().
   * This is replaced by PreviewEditResultDto.lineItems[].calculatedTotal when available.
   */
  _getOptimisticLineItemTotal(e, i, t) {
    const o = e * i;
    return !t || t.value <= 0 ? o : t.type === v.Amount ? Math.max(0, o - t.value * i) : o * (1 - t.value / 100);
  }
  async _openAddCustomItemModal() {
    if (!f(this, h) || !this._invoice) return;
    const i = await f(this, h).open(this, P, {
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
    ], this._refreshPreview());
  }
  _removeCustomItem(e) {
    this._customItems = this._customItems.filter((i) => i.tempId !== e), this._refreshPreview();
  }
  _hasChanges() {
    return this._invoice ? !!(this._lineItems.some((e) => e.isRemoved) || this._lineItems.some((e) => e.newQuantity !== e.quantity) || this._lineItems.some((e) => !e.hadOriginalDiscount && e.discount !== null) || this._lineItems.some((e) => e.hadOriginalDiscount && e.discount === null) || this._lineItems.some((e) => {
      if (!e.hadOriginalDiscount || e.discount === null || e.discounts.length === 0) return !1;
      const i = e.discounts[0];
      return e.discount.type !== i.type || e.discount.value !== i.value || e.discount.visibleToCustomer !== i.visibleToCustomer;
    }) || this._customItems.length > 0 || this._orders.some((e) => e.newShippingCost !== e.shippingCost) || this._taxRemoved || this._removedOrderDiscounts.size > 0) : !1;
  }
  // ============================================
  // Preview API - Single Source of Truth
  // ============================================
  /**
   * Build the request object for preview/edit operations
   */
  _buildPreviewRequest() {
    const e = this._lineItems.filter((o) => !o.isRemoved && (o.newQuantity !== o.quantity || o.discount !== null)).map((o) => ({
      id: o.id,
      quantity: o.newQuantity !== o.quantity ? o.newQuantity : null,
      returnToStock: o.returnToStock,
      discount: o.discount
    })), i = this._lineItems.filter((o) => o.isRemoved).map((o) => ({
      id: o.id,
      returnToStock: o.returnToStock
    })), t = this._orders.filter((o) => o.newShippingCost !== o.shippingCost).map((o) => ({
      orderId: o.id,
      shippingCost: o.newShippingCost
    }));
    return {
      lineItems: e,
      removedLineItems: i,
      removedOrderDiscounts: Array.from(this._removedOrderDiscounts),
      customItems: this._customItems.map((o) => ({
        name: o.name,
        sku: o.sku,
        price: o.price,
        quantity: o.quantity,
        taxGroupId: o.taxGroupId,
        isPhysicalProduct: o.isPhysicalProduct
      })),
      orderShippingUpdates: t,
      editReason: this._editReason || null,
      removeTax: this._taxRemoved
    };
  }
  /**
   * Refresh the preview from the backend (debounced).
   * This is the ONLY place calculations happen - single source of truth.
   */
  _refreshPreview() {
    this._invoice && (this._previewDebounceTimer && clearTimeout(this._previewDebounceTimer), this._previewDebounceTimer = setTimeout(async () => {
      this._previewLoading = !0;
      const e = this._buildPreviewRequest(), { data: i, error: t } = await _.previewInvoiceEdit(this._invoice.id, e);
      if (this._previewLoading = !1, t) {
        console.error("Preview calculation failed:", t);
        return;
      }
      i && (this._previewResult = i, this._updateLineItemTotalsFromPreview(i));
    }, 300));
  }
  /**
   * Update line item calculated totals from preview result
   */
  _updateLineItemTotalsFromPreview(e) {
    for (const i of e.lineItems) {
      const t = this._lineItems.find((o) => o.id === i.id);
      t && (t.calculatedTotal = i.calculatedTotal);
    }
    this._lineItems = [...this._lineItems];
  }
  // Getters for calculated values - use preview result or fall back to original invoice values
  get _subtotalBeforeDiscounts() {
    return this._previewResult?.subTotal ?? this._invoice?.subTotal ?? 0;
  }
  get _discountTotal() {
    return this._previewResult?.discountTotal ?? this._invoice?.discountTotal ?? 0;
  }
  get _adjustedSubtotal() {
    return this._previewResult?.adjustedSubTotal ?? this._invoice?.adjustedSubTotal ?? 0;
  }
  // Note: Shipping is displayed per-order inline, not as a total summary line
  // If needed, use: this._previewResult?.shippingTotal ?? this._invoice?.shippingTotal ?? 0
  get _newTax() {
    return this._previewResult?.tax ?? this._invoice?.tax ?? 0;
  }
  get _newTotal() {
    return this._previewResult?.total ?? this._invoice?.total ?? 0;
  }
  async _handleSave() {
    if (!this._invoice || !this._hasChanges()) return;
    this._isSaving = !0, this._errorMessage = null;
    const e = this._buildPreviewRequest(), { data: i, error: t } = await _.editInvoice(this._invoice.id, e);
    if (this._isSaving = !1, t) {
      this._errorMessage = t.message;
      return;
    }
    if (i?.success) {
      if (i.warnings && i.warnings.length > 0)
        for (const o of i.warnings)
          f(this, g)?.peek("warning", {
            data: {
              headline: "Stock Warning",
              message: o
            }
          });
      f(this, g)?.peek("positive", {
        data: {
          headline: "Order Updated",
          message: "The order has been successfully updated."
        }
      }), this.value = { saved: !0 }, this.modalContext?.submit();
    } else
      this._errorMessage = i?.errorMessage ?? "Failed to save changes";
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderLoading() {
    return s`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading order...</span>
      </div>
    `;
  }
  _renderError() {
    return s`
      <div class="error-state">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" @click=${this._loadInvoice}>Retry</uui-button>
      </div>
    `;
  }
  _renderCannotEdit() {
    return s`
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
    const i = this._invoice?.currencySymbol ?? "£", t = e.discount !== null, o = e.newQuantity < e.quantity, a = e.newQuantity > e.quantity, l = e.newQuantity - e.quantity, p = a && e.isStockTracked && e.availableStock !== null && e.availableStock < l, b = !e.hadOriginalDiscount || t;
    return s`
      <div class="line-item ${p ? "has-error" : ""}">
        <div class="line-item-product">
          <div class="line-item-image">
            ${e.imageUrl ? s`<img src=${e.imageUrl} alt=${e.name ?? ""} />` : s`<div class="placeholder-image"><uui-icon name="icon-picture"></uui-icon></div>`}
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            ${e.sku ? s`<div class="line-item-sku">${e.sku}</div>` : d}
            ${e.isStockTracked && e.availableStock !== null ? s`
              <div class="stock-info ${p ? "error" : ""}">
                ${p ? s`<uui-icon name="icon-alert"></uui-icon> Only ${e.availableStock} available` : s`${e.availableStock} in stock`}
              </div>
            ` : d}
          </div>
        </div>

        <div class="line-item-price">
          <div class="price-wrapper">
            <span class="price ${t ? "has-discount" : ""}">${i}${e.amount.toFixed(2)}</span>
            ${b ? s`
              <button
                class="discount-trigger ${t ? "active" : ""}"
                @click=${(m) => this._openDiscountPopover(e.id, m)}
                title="${t ? "Edit discount" : "Add discount"}"
              >
                <uui-icon name="${t ? "icon-sale" : "icon-add"}"></uui-icon>
              </button>
            ` : d}
          </div>
          ${t ? s`
            <div class="discount-badge">
              -${e.discount.type === v.Percentage ? `${e.discount.value}%` : `${i}${e.discount.value.toFixed(2)}`}
              <button class="remove-discount" @click=${() => this._removeDiscount(e.id)}>×</button>
            </div>
          ` : d}
        </div>

        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${e.newQuantity.toString()}
            @input=${(m) => this._updateQuantity(e.id, parseInt(m.target.value) || 1)}
            min="1"
          ></uui-input>
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
      ${o && e.productId && e.isStockTracked ? s`
        <div class="return-to-stock-row">
          <uui-checkbox
            .checked=${e.returnToStock}
            @change=${() => this._toggleReturnToStock(e.id)}
          >
            Return ${e.quantity - e.newQuantity} to stock
          </uui-checkbox>
        </div>
      ` : d}
    `;
  }
  _renderRemovedItem(e) {
    const i = this._invoice?.currencySymbol ?? "£";
    return s`
      <div class="removed-item">
        <div class="removed-item-info">
          <span class="removed-item-name">${e.name}</span>
          <span class="removed-item-qty">× ${e.quantity}</span>
          <span class="removed-item-price">${i}${(e.amount * e.quantity).toFixed(2)}</span>
        </div>
        <div class="removed-item-options">
          ${e.productId && e.isStockTracked ? s`
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
  _renderOrderDiscounts() {
    if (!this._invoice) return d;
    const e = this._invoice.orderDiscounts.filter(
      (t) => !this._removedOrderDiscounts.has(t.id)
    );
    if (e.length === 0) return d;
    const i = this._invoice.currencySymbol;
    return s`
      <div class="order-discounts-section">
        <h4>Order Discounts</h4>
        ${e.map(
      (t) => s`
            <div class="order-discount-row">
              <div class="discount-info">
                <span class="discount-name">${t.name || t.reason || "Discount"}</span>
                <span class="discount-value">
                  ${t.type === v.Percentage ? `${t.value}%` : `${i}${t.value.toFixed(2)}`}
                </span>
              </div>
              <div class="discount-amount-cell">
                <span class="discount-amount">-${i}${t.amount.toFixed(2)}</span>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removeOrderDiscount(t.id)}
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
  _renderDiscountPopover() {
    const e = this._invoice?.currencySymbol ?? "£", i = `top: ${this._popoverPosition.top}px; left: ${this._popoverPosition.left}px;`;
    return s`
      <div class="discount-popover-backdrop" @click=${this._closeDiscountPopover}></div>
      <div class="discount-popover" style=${i}>
        <div class="popover-header">
          <span>Discount type</span>
        </div>

        <select
          class="discount-type-select"
          .value=${this._discountType.toString()}
          @change=${(t) => this._discountType = parseInt(t.target.value)}
        >
          <option value="0">Fixed amount</option>
          <option value="1">Percentage</option>
        </select>

        <div class="popover-row">
          <label>Value ${this._discountType === v.Percentage ? "(%)" : "(per unit)"}</label>
          <div class="input-with-affix">
            ${this._discountType === v.Amount ? s`<span class="prefix">${e}</span>` : d}
            <uui-input
              type="number"
              .value=${this._discountValue.toString()}
              @input=${(t) => this._discountValue = parseFloat(t.target.value) || 0}
              min="0"
              step="0.01"
            ></uui-input>
            ${this._discountType === v.Percentage ? s`<span class="suffix">%</span>` : d}
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
    const i = this._invoice?.currencySymbol ?? "£", t = e.taxGroupId ? this._taxGroups.find((a) => a.id === e.taxGroupId) : null, o = t ? `${t.name} (${t.taxPercentage}%)` : "Not taxable";
    return s`
      <div class="line-item custom-item">
        <div class="line-item-product">
          <div class="line-item-image">
            <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            <div class="line-item-sku">${e.sku ?? "Custom item"} · ${o}</div>
          </div>
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
      return s`<umb-body-layout headline="Edit Order">${this._renderLoading()}</umb-body-layout>`;
    if (this._errorMessage && !this._invoice)
      return s`<umb-body-layout headline="Edit Order">${this._renderError()}</umb-body-layout>`;
    if (!this._invoice?.canEdit)
      return s`<umb-body-layout headline="Edit Order">${this._renderCannotEdit()}</umb-body-layout>`;
    const e = this._invoice.currencySymbol, i = this._invoice.currencyCode, t = this._subtotalBeforeDiscounts, o = this._discountTotal, a = this._adjustedSubtotal, l = this._newTax, p = this._newTotal, b = this._hasChanges(), m = this._lineItems.filter((c) => c.isRemoved), k = o > 0;
    return s`
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
          ${this._orders.map((c) => this._renderOrderSection(c))}

          <!-- Custom Items Section (if any) -->
          ${this._customItems.length > 0 ? s`
            <div class="items-section custom-items-section">
              <div class="section-header">
                <h4>Custom Items (New Order)</h4>
              </div>
              <div class="items-list">
                ${this._customItems.map((c) => this._renderCustomItem(c))}
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
          ${m.length > 0 ? s`
            <div class="removed-items-section">
              <h4>Removed Items</h4>
              ${m.map((c) => this._renderRemovedItem(c))}
            </div>
          ` : d}

          <!-- Order Discounts Section (coupons, etc.) -->
          ${this._renderOrderDiscounts()}

          <!-- Payment Summary -->
          <div class="payment-section">
            <h3>Order Summary</h3>

            <div class="payment-row">
              <span>Subtotal</span>
              <span>${e}${t.toFixed(2)} ${i}</span>
            </div>

            ${k ? s`
              <div class="payment-row discount">
                <span>Discounts</span>
                <span class="discount-amount">-${e}${o.toFixed(2)} ${i}</span>
              </div>
              <div class="payment-row adjusted">
                <span>Adjusted Subtotal</span>
                <span>${e}${a.toFixed(2)} ${i}</span>
              </div>
            ` : d}

            <!-- Shipping per order with edit/remove -->
            ${this._orders.map((c, S) => s`
              <div class="payment-row shipping-row ${this._removedShippingOrders.has(c.id) ? "removed" : ""}">
                <span>${c.shippingMethodName ?? "Shipping"}${this._orders.length > 1 ? ` (Order ${S + 1})` : ""}</span>
                <div class="summary-edit-controls">
                  ${this._removedShippingOrders.has(c.id) ? s`
                    <span class="removed-label">Removed</span>
                    <uui-button compact look="secondary" @click=${() => this._restoreShipping(c.id)}>Undo</uui-button>
                  ` : s`
                    <div class="summary-input">
                      <span class="prefix">${e}</span>
                      <uui-input
                        type="number"
                        .value=${c.newShippingCost.toString()}
                        @input=${(T) => this._updateOrderShipping(c.id, parseFloat(T.target.value) || 0)}
                        min="0"
                        step="0.01"
                      ></uui-input>
                    </div>
                    <uui-button compact look="secondary" @click=${() => this._removeShipping(c.id)} title="Remove shipping">
                      <uui-icon name="icon-delete"></uui-icon>
                    </uui-button>
                  `}
                </div>
              </div>
            `)}

            <!-- Tax with remove option -->
            <div class="payment-row tax-row ${this._taxRemoved ? "removed" : ""}">
              <span>Tax</span>
              <div class="summary-edit-controls">
                ${this._taxRemoved ? s`
                  <span class="removed-label">Removed (VAT exemption)</span>
                  <uui-button compact look="secondary" @click=${() => this._restoreTax()}>Undo</uui-button>
                ` : s`
                  <span>${e}${l.toFixed(2)} ${i}</span>
                  <uui-button compact look="secondary" @click=${() => this._removeTax()} title="Remove tax (VAT exemption)">
                    <uui-icon name="icon-delete"></uui-icon>
                  </uui-button>
                `}
              </div>
            </div>

            <div class="payment-row total ${this._previewLoading ? "loading" : ""}">
              <span>Total</span>
              <span>${e}${p.toFixed(2)} ${i}</span>
            </div>

            <p class="tax-note">${this._previewLoading ? "Calculating..." : "Totals calculated by server"}</p>
          </div>

          <!-- Reason for Edit -->
          <div class="reason-section">
            <h3>Reason for edit</h3>
            <uui-textarea
              .value=${this._editReason}
              @input=${(c) => this._editReason = c.target.value}
              placeholder="Add a reason for this edit..."
            ></uui-textarea>
            <p class="reason-note">Only visible to staff</p>
          </div>

          ${this._errorMessage ? s`
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
            ?disabled=${this._isSaving || !b}
          >
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : "Update order"}
          </uui-button>
        </div>

        <!-- Discount Popover (rendered at top level to avoid overflow clipping) -->
        ${this._discountPopoverLineItemId ? this._renderDiscountPopover() : d}
      </umb-body-layout>
    `;
  }
  _renderOrderSection(e) {
    const i = this._lineItems.filter((t) => t.orderId === e.id && !t.isRemoved);
    return s`
      <div class="items-section order-section">
        <div class="section-header">
          <h4>Order: ${e.shippingMethodName ?? "Standard"}</h4>
        </div>

        <div class="items-header">
          <div class="header-cell product">Product</div>
          <div class="header-cell price">Price</div>
          <div class="header-cell quantity">Quantity</div>
          <div class="header-cell total">Total</div>
          <div class="header-cell actions"></div>
        </div>

        <div class="items-list">
          ${i.map((t) => this._renderLineItem(t))}
        </div>
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
r.styles = z`
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

    .discount-popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
    }

    .discount-popover {
      position: fixed;
      z-index: 10000;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: var(--uui-size-space-4);
      min-width: 280px;
      max-width: 320px;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .popover-header {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .discount-type-select {
      width: 100%;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      font-size: 0.875rem;
      color: var(--uui-color-text);
      cursor: pointer;
    }

    .discount-type-select:focus {
      outline: none;
      border-color: var(--uui-color-interactive);
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
  `;
n([
  u()
], r.prototype, "_invoice", 2);
n([
  u()
], r.prototype, "_isLoading", 2);
n([
  u()
], r.prototype, "_isSaving", 2);
n([
  u()
], r.prototype, "_errorMessage", 2);
n([
  u()
], r.prototype, "_editReason", 2);
n([
  u()
], r.prototype, "_orders", 2);
n([
  u()
], r.prototype, "_lineItems", 2);
n([
  u()
], r.prototype, "_customItems", 2);
n([
  u()
], r.prototype, "_discountPopoverLineItemId", 2);
n([
  u()
], r.prototype, "_discountType", 2);
n([
  u()
], r.prototype, "_discountValue", 2);
n([
  u()
], r.prototype, "_discountReason", 2);
n([
  u()
], r.prototype, "_discountVisibleToCustomer", 2);
n([
  u()
], r.prototype, "_popoverPosition", 2);
n([
  u()
], r.prototype, "_taxGroups", 2);
n([
  u()
], r.prototype, "_removedShippingOrders", 2);
n([
  u()
], r.prototype, "_taxRemoved", 2);
n([
  u()
], r.prototype, "_removedOrderDiscounts", 2);
n([
  u()
], r.prototype, "_previewResult", 2);
n([
  u()
], r.prototype, "_previewLoading", 2);
r = n([
  C("merchello-edit-order-modal")
], r);
const V = r;
export {
  r as MerchelloEditOrderModalElement,
  V as default
};
//# sourceMappingURL=edit-order-modal.element-CK7HvQtq.js.map
