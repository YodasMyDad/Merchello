import { html as r, nothing as d, css as D, state as c, customElement as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as C, UmbModalBaseElement as R, UMB_MODAL_MANAGER_CONTEXT as I } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as M } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-DuHTSXU5.js";
import { D as h } from "./order.types-B45a7FtJ.js";
import { M as P } from "./add-custom-item-modal.token-DNefsEG_.js";
const y = new C("Merchello.AddDiscount.Modal", {
  modal: {
    type: "dialog",
    size: "small"
  }
});
var L = Object.defineProperty, A = Object.getOwnPropertyDescriptor, $ = (e) => {
  throw TypeError(e);
}, u = (e, i, o, t) => {
  for (var s = t > 1 ? void 0 : t ? A(i, o) : i, l = e.length - 1, p; l >= 0; l--)
    (p = e[l]) && (s = (t ? p(i, o, s) : p(s)) || s);
  return t && s && L(i, o, s), s;
}, k = (e, i, o) => i.has(e) || $("Cannot " + o), v = (e, i, o) => (k(e, i, "read from private field"), i.get(e)), x = (e, i, o) => i.has(e) ? $("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, o), w = (e, i, o, t) => (k(e, i, "write to private field"), i.set(e, o), o), m, g;
let n = class extends R {
  constructor() {
    super(), this._invoice = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._editReason = "", this._orders = [], this._lineItems = [], this._customItems = [], this._taxGroups = [], this._removedShippingOrders = /* @__PURE__ */ new Set(), this._taxRemoved = !1, this._removedOrderDiscounts = /* @__PURE__ */ new Set(), this._pendingOrderDiscounts = [], this._previewResult = null, this._previewLoading = !1, x(this, m), x(this, g), this.consumeContext(I, (e) => {
      w(this, m, e);
    }), this.consumeContext(M, (e) => {
      w(this, g, e);
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
      f.getInvoiceForEdit(this.data.invoiceId),
      f.getTaxGroups()
    ]);
    if (e.error) {
      this._errorMessage = e.error.message, this._isLoading = !1;
      return;
    }
    this._invoice = e.data ?? null, this._taxGroups = i.data ?? [], this._invoice && (this._orders = this._invoice.orders.map((o) => ({
      ...o,
      newShippingCost: o.shippingCost
    })), this._lineItems = this._invoice.orders.flatMap(
      (o) => o.lineItems.map((t) => {
        const s = t.discounts.length > 0, l = s ? {
          type: t.discounts[0].type,
          value: t.discounts[0].value,
          reason: t.discounts[0].reason,
          visibleToCustomer: t.discounts[0].visibleToCustomer
        } : null;
        return {
          ...t,
          isRemoved: !1,
          returnToStock: !0,
          // Default: return to stock
          newQuantity: t.quantity,
          discount: l,
          hadOriginalDiscount: s,
          calculatedTotal: this._getOptimisticLineItemTotal(t.amount, t.quantity, l)
        };
      })
    )), this._isLoading = !1;
  }
  _updateQuantity(e, i) {
    this._lineItems = this._lineItems.map((o) => {
      if (o.id === e) {
        const t = Math.max(1, i);
        return {
          ...o,
          newQuantity: t,
          calculatedTotal: this._getOptimisticLineItemTotal(o.amount, t, o.discount)
        };
      }
      return o;
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
    this._orders = this._orders.map((o) => o.id === e ? { ...o, newShippingCost: Math.max(0, i) } : o), this._refreshPreview();
  }
  _removeShipping(e) {
    this._removedShippingOrders = /* @__PURE__ */ new Set([...this._removedShippingOrders, e]), this._orders = this._orders.map((i) => i.id === e ? { ...i, newShippingCost: 0 } : i), this._refreshPreview();
  }
  _restoreShipping(e) {
    const i = new Set(this._removedShippingOrders);
    i.delete(e), this._removedShippingOrders = i;
    const o = this._invoice?.orders.find((t) => t.id === e);
    o && (this._orders = this._orders.map((t) => t.id === e ? { ...t, newShippingCost: o.shippingCost } : t)), this._refreshPreview();
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
  async _openLineItemDiscountModal(e) {
    if (!v(this, m) || !this._invoice) return;
    const i = this._lineItems.find((s) => s.id === e);
    if (!i) return;
    const t = await v(this, m).open(this, y, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        isOrderDiscount: !1,
        lineItemName: i.name ?? void 0,
        lineItemPrice: i.amount,
        lineItemQuantity: i.newQuantity,
        existingDiscount: i.discount ?? void 0
      }
    }).onSubmit().catch(() => {
    });
    t?.discount && (this._lineItems = this._lineItems.map((s) => s.id === e ? {
      ...s,
      discount: t.discount,
      calculatedTotal: this._getOptimisticLineItemTotal(s.amount, s.newQuantity, t.discount)
    } : s), this._refreshPreview());
  }
  async _openAddDiscountModal() {
    if (!v(this, m) || !this._invoice) return;
    const i = await v(this, m).open(this, y, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        isOrderDiscount: !0
      }
    }).onSubmit().catch(() => {
    });
    i?.discount && (this._pendingOrderDiscounts = [
      ...this._pendingOrderDiscounts,
      {
        type: i.discount.type,
        value: i.discount.value,
        reason: i.discount.reason,
        visibleToCustomer: i.discount.visibleToCustomer,
        tempId: `discount-${Date.now()}`
      }
    ], this._refreshPreview());
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
  _getOptimisticLineItemTotal(e, i, o) {
    const t = e * i;
    return !o || o.value <= 0 ? t : o.type === h.Amount ? Math.max(0, t - o.value * i) : t * (1 - o.value / 100);
  }
  /**
   * Calculate the discounted unit price for display.
   */
  _getDiscountedUnitPrice(e) {
    return !e.discount || e.discount.value <= 0 ? e.amount : e.discount.type === h.Amount ? Math.max(0, e.amount - e.discount.value) : e.amount * (1 - e.discount.value / 100);
  }
  async _openAddCustomItemModal() {
    if (!v(this, m) || !this._invoice) return;
    const i = await v(this, m).open(this, P, {
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
  _removePendingOrderDiscount(e) {
    this._pendingOrderDiscounts = this._pendingOrderDiscounts.filter((i) => i.tempId !== e), this._refreshPreview();
  }
  _hasChanges() {
    return this._invoice ? !!(this._lineItems.some((e) => e.isRemoved) || this._lineItems.some((e) => e.newQuantity !== e.quantity) || this._lineItems.some((e) => !e.hadOriginalDiscount && e.discount !== null) || this._lineItems.some((e) => e.hadOriginalDiscount && e.discount === null) || this._lineItems.some((e) => {
      if (!e.hadOriginalDiscount || e.discount === null || e.discounts.length === 0) return !1;
      const i = e.discounts[0];
      return e.discount.type !== i.type || e.discount.value !== i.value || e.discount.visibleToCustomer !== i.visibleToCustomer;
    }) || this._customItems.length > 0 || this._orders.some((e) => e.newShippingCost !== e.shippingCost) || this._taxRemoved || this._removedOrderDiscounts.size > 0 || this._pendingOrderDiscounts.length > 0) : !1;
  }
  // ============================================
  // Preview API - Single Source of Truth
  // ============================================
  /**
   * Build the request object for preview/edit operations
   */
  _buildPreviewRequest() {
    const e = this._lineItems.filter((t) => !t.isRemoved && (t.newQuantity !== t.quantity || t.discount !== null)).map((t) => ({
      id: t.id,
      quantity: t.newQuantity !== t.quantity ? t.newQuantity : null,
      returnToStock: t.returnToStock,
      discount: t.discount
    })), i = this._lineItems.filter((t) => t.isRemoved).map((t) => ({
      id: t.id,
      returnToStock: t.returnToStock
    })), o = this._orders.filter((t) => t.newShippingCost !== t.shippingCost).map((t) => ({
      orderId: t.id,
      shippingCost: t.newShippingCost
    }));
    return {
      lineItems: e,
      removedLineItems: i,
      removedOrderDiscounts: Array.from(this._removedOrderDiscounts),
      customItems: this._customItems.map((t) => ({
        name: t.name,
        sku: t.sku,
        price: t.price,
        quantity: t.quantity,
        taxGroupId: t.taxGroupId,
        isPhysicalProduct: t.isPhysicalProduct
      })),
      orderDiscounts: this._pendingOrderDiscounts.map((t) => ({
        type: t.type,
        value: t.value,
        reason: t.reason,
        visibleToCustomer: t.visibleToCustomer
      })),
      orderShippingUpdates: o,
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
      const e = this._buildPreviewRequest(), { data: i, error: o } = await f.previewInvoiceEdit(this._invoice.id, e);
      if (this._previewLoading = !1, o) {
        console.error("Preview calculation failed:", o);
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
      const o = this._lineItems.find((t) => t.id === i.id);
      o && (o.calculatedTotal = i.calculatedTotal);
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
    const e = this._buildPreviewRequest(), { data: i, error: o } = await f.editInvoice(this._invoice.id, e);
    if (this._isSaving = !1, o) {
      this._errorMessage = o.message;
      return;
    }
    if (i?.success) {
      if (i.warnings && i.warnings.length > 0)
        for (const t of i.warnings)
          v(this, g)?.peek("warning", {
            data: {
              headline: "Stock Warning",
              message: t
            }
          });
      v(this, g)?.peek("positive", {
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
    return r`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading order...</span>
      </div>
    `;
  }
  _renderError() {
    return r`
      <div class="error-state">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" @click=${this._loadInvoice}>Retry</uui-button>
      </div>
    `;
  }
  _renderCannotEdit() {
    return r`
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
    const i = this._invoice?.currencySymbol ?? "£", o = e.discount !== null, t = e.newQuantity < e.quantity, s = e.newQuantity > e.quantity, l = e.newQuantity - e.quantity, p = s && e.isStockTracked && e.availableStock !== null && e.availableStock < l, b = !e.hadOriginalDiscount || o;
    return r`
      <div class="line-item ${p ? "has-error" : ""}">
        <div class="line-item-product">
          <div class="line-item-image">
            ${e.imageUrl ? r`<img src=${e.imageUrl} alt=${e.name ?? ""} />` : r`<div class="placeholder-image"><uui-icon name="icon-picture"></uui-icon></div>`}
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            ${e.sku ? r`<div class="line-item-sku">${e.sku}</div>` : d}
            ${e.isStockTracked && e.availableStock !== null ? r`
              <div class="stock-info ${p ? "error" : ""}">
                ${p ? r`<uui-icon name="icon-alert"></uui-icon> Only ${e.availableStock} available` : r`${e.availableStock} in stock`}
              </div>
            ` : d}
          </div>
        </div>

        <div class="line-item-price">
          <div class="price-display">
            ${o ? r`
              <span class="original-price">${i}${e.amount.toFixed(2)}</span>
              <span class="discounted-price">${i}${this._getDiscountedUnitPrice(e).toFixed(2)}</span>
            ` : r`
              <span class="price">${i}${e.amount.toFixed(2)}</span>
            `}
            ${b ? r`
              <button
                class="discount-trigger ${o ? "active" : ""}"
                @click=${() => this._openLineItemDiscountModal(e.id)}
                title="${o ? "Edit discount" : "Add discount"}"
              >
                <uui-icon name="${o ? "icon-sale" : "icon-add"}"></uui-icon>
              </button>
            ` : d}
          </div>
          ${o ? r`
            <div class="discount-text">
              <span>-${e.discount.type === h.Percentage ? `${e.discount.value}%` : `${i}${e.discount.value.toFixed(2)}`} off</span>
              <button class="remove-discount-btn" @click=${() => this._removeDiscount(e.id)} title="Remove discount">×</button>
            </div>
          ` : d}
        </div>

        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${e.newQuantity.toString()}
            @input=${(_) => this._updateQuantity(e.id, parseInt(_.target.value) || 1)}
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
      ${t && e.productId && e.isStockTracked ? r`
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
    return r`
      <div class="removed-item">
        <div class="removed-item-info">
          <span class="removed-item-name">${e.name}</span>
          <span class="removed-item-qty">× ${e.quantity}</span>
          <span class="removed-item-price">${i}${(e.amount * e.quantity).toFixed(2)}</span>
        </div>
        <div class="removed-item-options">
          ${e.productId && e.isStockTracked ? r`
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
      (s) => !this._removedOrderDiscounts.has(s.id)
    ), i = this._pendingOrderDiscounts.length > 0;
    if (!(e.length > 0) && !i) return d;
    const t = this._invoice.currencySymbol;
    return r`
      <div class="order-discounts-section">
        <h4>Order Discounts</h4>
        ${e.map(
      (s) => r`
            <div class="order-discount-row">
              <div class="discount-info">
                <span class="discount-name">${s.name || s.reason || "Discount"}</span>
                <span class="discount-value">
                  ${s.type === h.Percentage ? `${s.value}%` : `${t}${s.value.toFixed(2)}`}
                </span>
              </div>
              <div class="discount-amount-cell">
                <span class="discount-amount">-${t}${s.amount.toFixed(2)}</span>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removeOrderDiscount(s.id)}
                  title="Remove discount"
                >
                  <uui-icon name="icon-delete"></uui-icon>
                </uui-button>
              </div>
            </div>
          `
    )}
        ${this._pendingOrderDiscounts.map(
      (s) => r`
            <div class="order-discount-row pending">
              <div class="discount-info">
                <span class="discount-name">${s.reason || "New Discount"}</span>
                <span class="discount-value">
                  ${s.type === h.Percentage ? `${s.value}%` : `${t}${s.value.toFixed(2)}`}
                </span>
                <span class="pending-badge">New</span>
              </div>
              <div class="discount-amount-cell">
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removePendingOrderDiscount(s.tempId)}
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
  _renderCustomItem(e) {
    const i = this._invoice?.currencySymbol ?? "£", o = e.taxGroupId ? this._taxGroups.find((s) => s.id === e.taxGroupId) : null, t = o ? `${o.name} (${o.taxPercentage}%)` : "Not taxable";
    return r`
      <div class="line-item custom-item">
        <div class="line-item-product">
          <div class="line-item-image">
            <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            <div class="line-item-sku">${e.sku ?? "Custom item"} · ${t}</div>
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
      return r`<umb-body-layout headline="Edit Order">${this._renderLoading()}</umb-body-layout>`;
    if (this._errorMessage && !this._invoice)
      return r`<umb-body-layout headline="Edit Order">${this._renderError()}</umb-body-layout>`;
    if (!this._invoice?.canEdit)
      return r`<umb-body-layout headline="Edit Order">${this._renderCannotEdit()}</umb-body-layout>`;
    const e = this._invoice.currencySymbol, i = this._invoice.currencyCode, o = this._subtotalBeforeDiscounts, t = this._discountTotal, s = this._adjustedSubtotal, l = this._newTax, p = this._newTotal, b = this._hasChanges(), _ = this._lineItems.filter((a) => a.isRemoved), S = t > 0;
    return r`
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
          ${this._orders.map((a) => this._renderOrderSection(a))}

          <!-- Custom Items Section (if any) -->
          ${this._customItems.length > 0 ? r`
            <div class="items-section custom-items-section">
              <div class="section-header">
                <h4>Custom Items (New Order)</h4>
              </div>
              <div class="items-list">
                ${this._customItems.map((a) => this._renderCustomItem(a))}
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
            <uui-button look="secondary" @click=${this._openAddDiscountModal}>
              <uui-icon name="icon-add"></uui-icon>
              Add discount
            </uui-button>
          </div>

          <!-- Removed Items Section -->
          ${_.length > 0 ? r`
            <div class="removed-items-section">
              <h4>Removed Items</h4>
              ${_.map((a) => this._renderRemovedItem(a))}
            </div>
          ` : d}

          <!-- Order Discounts Section (coupons, etc.) -->
          ${this._renderOrderDiscounts()}

          <!-- Payment Summary -->
          <div class="payment-section">
            <h3>Order Summary</h3>

            <div class="payment-row">
              <span>Subtotal</span>
              <span>${e}${o.toFixed(2)} ${i}</span>
            </div>

            ${S ? r`
              <div class="payment-row discount">
                <span>Discounts</span>
                <span class="discount-amount">-${e}${t.toFixed(2)} ${i}</span>
              </div>
              <div class="payment-row adjusted">
                <span>Adjusted Subtotal</span>
                <span>${e}${s.toFixed(2)} ${i}</span>
              </div>
            ` : d}

            <!-- Shipping per order with edit/remove -->
            ${this._orders.map((a, T) => r`
              <div class="payment-row shipping-row ${this._removedShippingOrders.has(a.id) ? "removed" : ""}">
                <span>${a.shippingMethodName ?? "Shipping"}${this._orders.length > 1 ? ` (Order ${T + 1})` : ""}</span>
                <div class="summary-edit-controls">
                  ${this._removedShippingOrders.has(a.id) ? r`
                    <span class="removed-label">Removed</span>
                    <uui-button compact look="secondary" @click=${() => this._restoreShipping(a.id)}>Undo</uui-button>
                  ` : r`
                    <div class="summary-input">
                      <span class="prefix">${e}</span>
                      <uui-input
                        type="number"
                        .value=${a.newShippingCost.toString()}
                        @input=${(z) => this._updateOrderShipping(a.id, parseFloat(z.target.value) || 0)}
                        min="0"
                        step="0.01"
                      ></uui-input>
                    </div>
                    <uui-button compact look="secondary" @click=${() => this._removeShipping(a.id)} title="Remove shipping">
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
                ${this._taxRemoved ? r`
                  <span class="removed-label">Removed (VAT exemption)</span>
                  <uui-button compact look="secondary" @click=${() => this._restoreTax()}>Undo</uui-button>
                ` : r`
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
              @input=${(a) => this._editReason = a.target.value}
              placeholder="Add a reason for this edit..."
            ></uui-textarea>
            <p class="reason-note">Only visible to staff</p>
          </div>

          ${this._errorMessage ? r`
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
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : "Update order"}
          </uui-button>
        </div>

      </umb-body-layout>
    `;
  }
  _renderOrderSection(e) {
    const i = this._lineItems.filter((o) => o.orderId === e.id && !o.isRemoved);
    return r`
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
          ${i.map((o) => this._renderLineItem(o))}
        </div>
      </div>
    `;
  }
};
m = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
n.styles = D`
    :host {
      display: block;
      height: 100%;
    }

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
], n.prototype, "_taxGroups", 2);
u([
  c()
], n.prototype, "_removedShippingOrders", 2);
u([
  c()
], n.prototype, "_taxRemoved", 2);
u([
  c()
], n.prototype, "_removedOrderDiscounts", 2);
u([
  c()
], n.prototype, "_pendingOrderDiscounts", 2);
u([
  c()
], n.prototype, "_previewResult", 2);
u([
  c()
], n.prototype, "_previewLoading", 2);
n = u([
  O("merchello-edit-order-modal")
], n);
const G = n;
export {
  n as MerchelloEditOrderModalElement,
  G as default
};
//# sourceMappingURL=edit-order-modal.element-DvychRte.js.map
