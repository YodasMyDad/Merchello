import { html as n, nothing as c, css as T, state as p, customElement as z } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as k, UmbModalBaseElement as D, UMB_MODAL_MANAGER_CONTEXT as R } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as M } from "@umbraco-cms/backoffice/notification";
import { M as y } from "./merchello-api-D-qg1PlO.js";
import { c as a, D as b } from "./formatting-DC2_cf8C.js";
import { M as A } from "./product-picker-modal.token-BfbHsSHl.js";
import "./product-image.element-D7HwAIKr.js";
const L = new k("Merchello.AddCustomItem.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
}), w = new k("Merchello.AddDiscount.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
});
var q = Object.defineProperty, E = Object.getOwnPropertyDescriptor, S = (e) => {
  throw TypeError(e);
}, l = (e, i, s, t) => {
  for (var o = t > 1 ? void 0 : t ? E(i, s) : i, r = e.length - 1, g; r >= 0; r--)
    (g = e[r]) && (o = (t ? g(i, s, o) : g(o)) || o);
  return t && o && q(i, s, o), o;
}, I = (e, i, s) => i.has(e) || S("Cannot " + s), h = (e, i, s) => (I(e, i, "read from private field"), i.get(e)), x = (e, i, s) => i.has(e) ? S("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), $ = (e, i, s, t) => (I(e, i, "write to private field"), i.set(e, s), s), v, _;
let d = class extends D {
  constructor() {
    super(), this._invoice = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._editReason = "", this._orders = [], this._lineItems = [], this._customItems = [], this._pendingProducts = [], this._taxGroups = [], this._removedShippingOrders = /* @__PURE__ */ new Set(), this._taxRemoved = !1, this._removedOrderDiscounts = /* @__PURE__ */ new Set(), this._pendingOrderDiscounts = [], this._previewResult = null, this._previewLoading = !1, x(this, v), x(this, _), this.consumeContext(R, (e) => {
      $(this, v, e);
    }), this.consumeContext(M, (e) => {
      $(this, _, e);
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
      y.getInvoiceForEdit(this.data.invoiceId),
      y.getTaxGroups()
    ]);
    if (e.error) {
      this._errorMessage = e.error.message, this._isLoading = !1;
      return;
    }
    this._invoice = e.data ?? null, this._taxGroups = i.data ?? [], this._invoice && (this._orders = this._invoice.orders.map((s) => ({
      ...s,
      newShippingCost: s.shippingCost
    })), this._lineItems = this._invoice.orders.flatMap(
      (s) => s.lineItems.map((t) => {
        const o = t.discounts.length > 0, r = o ? {
          type: t.discounts[0].type,
          value: t.discounts[0].value,
          reason: t.discounts[0].reason,
          isVisibleToCustomer: t.discounts[0].isVisibleToCustomer
        } : null;
        return {
          ...t,
          isRemoved: !1,
          returnToStock: !0,
          // Default: return to stock
          newQuantity: t.quantity,
          discount: r,
          hadOriginalDiscount: o,
          // Initial value - will be populated by preview API
          calculatedTotal: 0
        };
      })
    ), this._refreshPreview()), this._isLoading = !1;
  }
  _updateQuantity(e, i) {
    this._lineItems = this._lineItems.map((s) => s.id === e ? {
      ...s,
      newQuantity: Math.max(1, i)
      // calculatedTotal will be updated by preview API
    } : s), this._refreshPreview();
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
    this._orders = this._orders.map((s) => s.id === e ? { ...s, newShippingCost: Math.max(0, i) } : s), this._refreshPreview();
  }
  _removeShipping(e) {
    this._removedShippingOrders = /* @__PURE__ */ new Set([...this._removedShippingOrders, e]), this._orders = this._orders.map((i) => i.id === e ? { ...i, newShippingCost: 0 } : i), this._refreshPreview();
  }
  _restoreShipping(e) {
    const i = new Set(this._removedShippingOrders);
    i.delete(e), this._removedShippingOrders = i;
    const s = this._invoice?.orders.find((t) => t.id === e);
    s && (this._orders = this._orders.map((t) => t.id === e ? { ...t, newShippingCost: s.shippingCost } : t)), this._refreshPreview();
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
    if (!h(this, v) || !this._invoice) return;
    const i = this._lineItems.find((o) => o.id === e);
    if (!i) return;
    const t = await h(this, v).open(this, w, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        currencyCode: this._invoice.currencyCode,
        isOrderDiscount: !1,
        lineItemName: i.name ?? void 0,
        lineItemPrice: i.amount,
        lineItemQuantity: i.newQuantity,
        existingDiscount: i.discount ?? void 0
      }
    }).onSubmit().catch(() => {
    });
    t?.discount && (this._lineItems = this._lineItems.map((o) => o.id === e ? {
      ...o,
      discount: t.discount
      // calculatedTotal will be updated by preview API
    } : o), this._refreshPreview());
  }
  async _openAddDiscountModal() {
    if (!h(this, v) || !this._invoice) return;
    const i = await h(this, v).open(this, w, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        currencyCode: this._invoice.currencyCode,
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
        isVisibleToCustomer: i.discount.isVisibleToCustomer,
        tempId: `discount-${Date.now()}`
      }
    ], this._refreshPreview());
  }
  _removeDiscount(e) {
    this._lineItems = this._lineItems.map((i) => i.id === e ? {
      ...i,
      discount: null
      // calculatedTotal will be updated by preview API
    } : i), this._refreshPreview();
  }
  /**
   * Get calculated total for a line item from the preview result.
   * Returns null if preview is not yet available (triggers loading state in UI).
   * Backend is the ONLY source of truth for all calculations.
   */
  _getLineItemCalculatedTotal(e) {
    return this._previewResult ? this._previewResult.lineItems.find((s) => s.id === e)?.calculatedTotal ?? null : null;
  }
  /**
   * Get discounted unit price from preview result.
   * Returns null if preview is not yet available (triggers loading state in UI).
   * Backend is the ONLY source of truth for all calculations.
   */
  _getDiscountedUnitPriceFromPreview(e) {
    return this._previewResult ? this._previewResult.lineItems.find((s) => s.id === e)?.discountedUnitPrice ?? null : null;
  }
  async _openAddCustomItemModal() {
    if (!h(this, v) || !this._invoice) return;
    const i = await h(this, v).open(this, L, {
      data: {
        currencySymbol: this._invoice.currencySymbol,
        taxGroups: this._taxGroups,
        shippingDestination: this._invoice.shippingCountryCode ? {
          countryCode: this._invoice.shippingCountryCode,
          stateCode: this._invoice.shippingRegion ?? void 0
        } : null
      }
    }).onSubmit().catch(() => {
    });
    i?.item && (this._customItems = [
      ...this._customItems,
      {
        ...i.item,
        tempId: `custom-${Date.now()}`,
        warehouseId: i.item.warehouseId,
        warehouseName: i.item.warehouseName,
        shippingOptionId: i.item.shippingOptionId,
        shippingOptionName: i.item.shippingOptionName
      }
    ], this._refreshPreview());
  }
  _removeCustomItem(e) {
    this._customItems = this._customItems.filter((i) => i.tempId !== e), this._refreshPreview();
  }
  async _openProductPickerModal() {
    if (!h(this, v) || !this._invoice) return;
    const e = this._lineItems.filter((o) => o.productId && !o.isRemoved).map((o) => o.productId), i = this._pendingProducts.map((o) => o.productId), t = await h(this, v).open(this, A, {
      data: {
        config: {
          currencySymbol: this._invoice.currencySymbol,
          shippingAddress: this._invoice.shippingCountryCode ? {
            countryCode: this._invoice.shippingCountryCode,
            stateCode: this._invoice.shippingRegion ?? void 0
          } : null,
          excludeProductIds: [...e, ...i]
        }
      }
    }).onSubmit().catch(() => {
    });
    if (t?.selections?.length) {
      const o = t.selections.map((r) => ({
        tempId: `product-${Date.now()}-${r.productId}`,
        productId: r.productId,
        productRootId: r.productRootId,
        name: r.name,
        sku: r.sku,
        price: r.price,
        quantity: 1,
        // Always add as qty 1
        imageUrl: r.imageUrl,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouseName,
        shippingOptionId: r.shippingOptionId,
        shippingOptionName: r.shippingOptionName,
        addons: r.selectedAddons ?? []
      }));
      this._pendingProducts = [...this._pendingProducts, ...o], this._refreshPreview();
    }
  }
  _removePendingProduct(e) {
    this._pendingProducts = this._pendingProducts.filter((i) => i.tempId !== e), this._refreshPreview();
  }
  _updatePendingProductQuantity(e, i) {
    this._pendingProducts = this._pendingProducts.map(
      (s) => s.tempId === e ? { ...s, quantity: Math.max(1, i) } : s
    ), this._refreshPreview();
  }
  _removePendingOrderDiscount(e) {
    this._pendingOrderDiscounts = this._pendingOrderDiscounts.filter((i) => i.tempId !== e), this._refreshPreview();
  }
  _hasChanges() {
    return this._invoice ? !!(this._lineItems.some((e) => e.isRemoved) || this._lineItems.some((e) => e.newQuantity !== e.quantity) || this._lineItems.some((e) => !e.hadOriginalDiscount && e.discount !== null) || this._lineItems.some((e) => e.hadOriginalDiscount && e.discount === null) || this._lineItems.some((e) => {
      if (!e.hadOriginalDiscount || e.discount === null || e.discounts.length === 0) return !1;
      const i = e.discounts[0];
      return e.discount.type !== i.type || e.discount.value !== i.value || e.discount.isVisibleToCustomer !== i.isVisibleToCustomer;
    }) || this._customItems.length > 0 || this._pendingProducts.length > 0 || this._orders.some((e) => e.newShippingCost !== e.shippingCost) || this._taxRemoved || this._removedOrderDiscounts.size > 0 || this._pendingOrderDiscounts.length > 0) : !1;
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
      shouldReturnToStock: t.returnToStock,
      discount: t.discount
    })), i = this._lineItems.filter((t) => t.isRemoved).map((t) => ({
      id: t.id,
      shouldReturnToStock: t.returnToStock
    })), s = this._orders.filter((t) => t.newShippingCost !== t.shippingCost).map((t) => ({
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
        cost: t.cost,
        quantity: t.quantity,
        taxGroupId: t.taxGroupId,
        isPhysicalProduct: t.isPhysicalProduct,
        warehouseId: t.warehouseId ?? null,
        shippingOptionId: t.shippingOptionId ?? null
      })),
      productsToAdd: this._pendingProducts.map((t) => ({
        productId: t.productId,
        quantity: t.quantity,
        warehouseId: t.warehouseId,
        shippingOptionId: t.shippingOptionId,
        addons: t.addons.map((o) => ({
          optionId: o.optionId,
          optionValueId: o.valueId,
          name: o.valueName,
          priceAdjustment: o.priceAdjustment,
          costAdjustment: o.costAdjustment ?? 0,
          skuSuffix: o.skuSuffix
        }))
      })),
      orderDiscounts: this._pendingOrderDiscounts.map((t) => ({
        type: t.type,
        value: t.value,
        reason: t.reason,
        isVisibleToCustomer: t.isVisibleToCustomer
      })),
      orderShippingUpdates: s,
      editReason: this._editReason || null,
      shouldRemoveTax: this._taxRemoved
    };
  }
  /**
   * Refresh the preview from the backend (debounced).
   * This is the ONLY place calculations happen - single source of truth.
   */
  _refreshPreview() {
    if (!this._invoice) return;
    const e = this._invoice.id;
    this._previewDebounceTimer && clearTimeout(this._previewDebounceTimer), this._previewDebounceTimer = setTimeout(async () => {
      this._previewLoading = !0;
      const i = this._buildPreviewRequest(), { data: s, error: t } = await y.previewInvoiceEdit(e, i);
      this._previewLoading = !1, !t && s && (this._previewResult = s, this._updateLineItemTotalsFromPreview(s));
    }, 300);
  }
  /**
   * Update line item calculated totals from preview result
   */
  _updateLineItemTotalsFromPreview(e) {
    for (const i of e.lineItems) {
      const s = this._lineItems.find((t) => t.id === i.id);
      s && (s.calculatedTotal = i.calculatedTotal);
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
    const e = this._buildPreviewRequest(), { data: i, error: s } = await y.editInvoice(this._invoice.id, e);
    if (this._isSaving = !1, s) {
      this._errorMessage = s.message;
      return;
    }
    if (i?.isSuccessful) {
      if (i.warnings && i.warnings.length > 0)
        for (const t of i.warnings)
          h(this, _)?.peek("warning", {
            data: {
              headline: "Stock Warning",
              message: t
            }
          });
      h(this, _)?.peek("positive", {
        data: {
          headline: "Order Updated",
          message: "The order has been successfully updated."
        }
      }), this.value = { isSaved: !0 }, this.modalContext?.submit();
    } else
      this._errorMessage = i?.errorMessage ?? "Failed to save changes";
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderLoading() {
    return n`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading order...</span>
      </div>
    `;
  }
  _renderError() {
    return n`
      <div class="error-state">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" @click=${this._loadInvoice}>Retry</uui-button>
      </div>
    `;
  }
  _renderCannotEdit() {
    return n`
      <div class="cannot-edit">
        <uui-icon name="icon-lock"></uui-icon>
        <h3>Cannot Edit This Order</h3>
        <p>${this._invoice?.cannotEditReason ?? "This order cannot be edited."}</p>
        <uui-button look="secondary" @click=${this._handleCancel}>Close</uui-button>
      </div>
    `;
  }
  _renderLineItem(e) {
    if (e.isRemoved) return c;
    const i = this._invoice?.currencySymbol ?? "£", s = e.discount !== null, t = this._previewResult?.lineItems.find((m) => m.id === e.id), o = t?.hasInsufficientStock ?? !1, r = t?.canAddDiscount ?? !0, g = e.newQuantity < e.quantity, f = e.childLineItems ?? [];
    return n`
      <div class="line-item ${o ? "has-error" : ""} ${f.length > 0 ? "has-addons" : ""}">
        <div class="line-item-product">
          <div class="line-item-image">
            <merchello-product-image
              media-key=${e.imageUrl || c}
              size="medium"
              alt=${e.name || ""}>
            </merchello-product-image>
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            ${e.sku ? n`<div class="line-item-sku">${e.sku}</div>` : c}
            ${e.isStockTracked && e.availableStock !== null ? n`
              <div class="stock-info ${o ? "error" : ""}">
                ${o ? n`<uui-icon name="icon-alert"></uui-icon> Only ${e.availableStock} available` : n`${e.availableStock} in stock`}
              </div>
            ` : c}
          </div>
        </div>

        <div class="line-item-price">
          <div class="price-display">
            ${s ? (() => {
      const m = this._getDiscountedUnitPriceFromPreview(e.id);
      return m !== null ? n`
                    <span class="original-price">${i}${a(e.amount, 2)}</span>
                    <span class="discounted-price">${i}${a(m, 2)}</span>
                  ` : n`
                    <span class="original-price">${i}${a(e.amount, 2)}</span>
                    <span class="discounted-price calculating">...</span>
                  `;
    })() : n`
              <span class="price">${i}${a(e.amount, 2)}</span>
            `}
            ${r ? n`
              <button
                class="discount-trigger ${s ? "active" : ""}"
                @click=${() => this._openLineItemDiscountModal(e.id)}
                title="${s ? "Edit discount" : "Add discount"}"
              >
                <uui-icon name="${s ? "icon-sale" : "icon-add"}"></uui-icon>
              </button>
            ` : c}
          </div>
          ${s ? n`
            <div class="discount-text">
              <span>-${e.discount.type === b.Percentage ? `${e.discount.value}%` : `${i}${a(e.discount.value, 2)}`} off</span>
              <button class="remove-discount-btn" @click=${() => this._removeDiscount(e.id)} title="Remove discount">×</button>
            </div>
          ` : c}
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
          ${(() => {
      const m = this._getLineItemCalculatedTotal(e.id);
      return m !== null ? n`${i}${a(m, 2)}` : n`<span class="calculating">...</span>`;
    })()}
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
      ${g && e.productId && e.isStockTracked ? n`
        <div class="return-to-stock-row">
          <uui-checkbox
            .checked=${e.returnToStock}
            @change=${() => this._toggleReturnToStock(e.id)}
          >
            Return ${e.quantity - e.newQuantity} to stock
          </uui-checkbox>
        </div>
      ` : c}
      ${f.map((m) => this._renderAddonLineItem(m, e.newQuantity, i))}
    `;
  }
  _renderAddonLineItem(e, i, s) {
    const t = this._getLineItemCalculatedTotal(e.id);
    return n`
      <div class="line-item child-item addon-item">
        <div class="line-item-product">
          <div class="addon-indicator">
            <span class="addon-connector"></span>
            <span class="addon-badge">Add-on</span>
          </div>
          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            ${e.sku ? n`<div class="line-item-sku">${e.sku}</div>` : c}
          </div>
        </div>

        <div class="line-item-price">
          <span class="addon-price">+${s}${a(e.amount, 2)}</span>
        </div>

        <div class="line-item-quantity addon-quantity">
          ${i}
        </div>

        <div class="line-item-total">
          ${t !== null ? n`+${s}${a(t, 2)}` : n`<span class="calculating">...</span>`}
        </div>

        <div class="line-item-actions">
          <!-- Add-ons follow parent - no direct actions -->
        </div>
      </div>
    `;
  }
  _renderRemovedItem(e) {
    const i = this._invoice?.currencySymbol ?? "£", s = e.calculatedTotal;
    return n`
      <div class="removed-item">
        <div class="removed-item-info">
          <span class="removed-item-name">${e.name}</span>
          <span class="removed-item-qty">× ${e.quantity}</span>
          <span class="removed-item-price">${i}${a(s, 2)}</span>
        </div>
        <div class="removed-item-options">
          ${e.productId && e.isStockTracked ? n`
            <uui-checkbox
              .checked=${e.returnToStock}
              @change=${() => this._toggleReturnToStock(e.id)}
            >
              Return to stock
            </uui-checkbox>
          ` : c}
          <uui-button look="secondary" compact @click=${() => this._restoreLineItem(e.id)}>
            Undo
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderOrderDiscounts() {
    if (!this._invoice) return c;
    const e = this._invoice.orderDiscounts.filter(
      (o) => !this._removedOrderDiscounts.has(o.id)
    ), i = this._pendingOrderDiscounts.length > 0;
    if (!(e.length > 0) && !i) return c;
    const t = this._invoice.currencySymbol;
    return n`
      <div class="order-discounts-section">
        <h4>Order Discounts</h4>
        ${e.map(
      (o) => n`
            <div class="order-discount-row">
              <div class="discount-info">
                <span class="discount-name">${o.name || o.reason || "Discount"}</span>
                <span class="discount-value">
                  ${o.type === b.Percentage ? `${o.value}%` : `${t}${a(o.value, 2)}`}
                </span>
              </div>
              <div class="discount-amount-cell">
                <span class="discount-amount">-${t}${a(o.amount, 2)}</span>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removeOrderDiscount(o.id)}
                  title="Remove discount"
                >
                  <uui-icon name="icon-delete"></uui-icon>
                </uui-button>
              </div>
            </div>
          `
    )}
        ${this._pendingOrderDiscounts.map(
      (o) => n`
            <div class="order-discount-row pending">
              <div class="discount-info">
                <span class="discount-name">${o.reason || "New Discount"}</span>
                <span class="discount-value">
                  ${o.type === b.Percentage ? `${o.value}%` : `${t}${a(o.value, 2)}`}
                </span>
                <span class="pending-badge">New</span>
              </div>
              <div class="discount-amount-cell">
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removePendingOrderDiscount(o.tempId)}
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
    const i = this._invoice?.currencySymbol ?? "£", s = e.taxGroupId ? this._taxGroups.find((o) => o.id === e.taxGroupId) : null, t = s ? `${s.name} (${s.taxPercentage}%)` : "Not taxable";
    return n`
      <div class="line-item custom-item">
        <div class="line-item-product">
          <div class="line-item-image">
            <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            <div class="line-item-sku">${e.sku ?? "Custom item"} · ${t}</div>
            ${e.isPhysicalProduct && e.warehouseName ? n`
              <div class="warehouse-info">
                <uui-icon name="icon-home"></uui-icon>
                ${e.warehouseName}
              </div>
              <div class="shipping-info">
                <uui-icon name="icon-truck"></uui-icon>
                ${e.shippingOptionName || "Standard"}
              </div>
            ` : c}
          </div>
        </div>

        <div class="line-item-price">
          ${i}${a(e.price, 2)}
        </div>

        <div class="line-item-quantity">
          ${e.quantity}
        </div>

        <div class="line-item-total">
          <!-- Pending items: total included in preview summary, no per-line calculation -->
          <span class="pending-total">Included</span>
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
  _renderPendingProduct(e) {
    const i = this._invoice?.currencySymbol ?? "£";
    return n`
      <div class="line-item pending-product">
        <div class="line-item-product">
          <div class="line-item-image">
            <merchello-product-image
              media-key=${e.imageUrl || c}
              size="medium"
              alt=${e.name || ""}>
            </merchello-product-image>
          </div>

          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            <div class="line-item-sku">${e.sku ?? "No SKU"}</div>
            <div class="warehouse-info">
              <uui-icon name="icon-home"></uui-icon>
              ${e.warehouseName || "Default warehouse"}
            </div>
            <div class="shipping-info">
              <uui-icon name="icon-truck"></uui-icon>
              ${e.shippingOptionName || "Standard"}
            </div>
          </div>
        </div>

        <div class="line-item-price">
          ${i}${a(e.price, 2)}
        </div>

        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${e.quantity.toString()}
            @input=${(s) => this._updatePendingProductQuantity(e.tempId, parseInt(s.target.value) || 1)}
            min="1"
          ></uui-input>
        </div>

        <div class="line-item-total">
          <!-- Pending items: total included in preview summary, no per-line calculation -->
          <span class="pending-total">Included</span>
        </div>

        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removePendingProduct(e.tempId)}
            title="Remove product"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
      ${e.addons.map((s) => this._renderPendingAddon(s, e.quantity, i))}
    `;
  }
  /** Render a pending add-on as a child row */
  _renderPendingAddon(e, i, s) {
    return n`
      <div class="line-item child-item addon-item">
        <div class="line-item-product">
          <div class="addon-indicator">
            <span class="addon-connector"></span>
          </div>
          <div class="line-item-details">
            <div class="line-item-name">
              <span class="addon-badge">Add-on</span>
              ${e.optionName}: ${e.valueName}
            </div>
          </div>
        </div>

        <div class="line-item-price">
          +${s}${a(e.priceAdjustment, 2)}
        </div>

        <div class="line-item-quantity">
          ${i}
        </div>

        <div class="line-item-total">
          <!-- Pending items: total included in preview summary -->
          <span class="pending-total">—</span>
        </div>

        <div class="line-item-actions">
          <!-- Add-ons follow parent quantity, no individual actions -->
        </div>
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return n`<umb-body-layout headline="Edit Order">${this._renderLoading()}</umb-body-layout>`;
    if (this._errorMessage && !this._invoice)
      return n`<umb-body-layout headline="Edit Order">${this._renderError()}</umb-body-layout>`;
    if (!this._invoice?.canEdit)
      return n`<umb-body-layout headline="Edit Order">${this._renderCannotEdit()}</umb-body-layout>`;
    const e = this._invoice.currencySymbol, i = this._invoice.currencyCode, s = this._subtotalBeforeDiscounts, t = this._discountTotal, o = this._adjustedSubtotal, r = this._newTax, g = this._newTotal, f = this._hasChanges(), m = this._lineItems.filter((u) => u.isRemoved), P = t > 0;
    return n`
      <umb-body-layout headline="Edit Order">
        <div id="main">
          <!-- Fulfillment Status Badge -->
          <div class="status-section">
            <span class="fulfillment-badge ${this._invoice.fulfillmentStatusCssClass}">
              <uui-icon name="icon-box"></uui-icon>
              ${this._invoice.fulfillmentStatus}
            </span>
          </div>

          <!-- Orders and Line Items -->
          ${this._orders.map((u) => this._renderOrderSection(u))}

          <!-- Custom Items Section (if any) -->
          ${this._customItems.length > 0 ? n`
            <div class="items-section custom-items-section">
              <div class="section-header">
                <h4>Custom Items (New Order)</h4>
              </div>
              <div class="items-list">
                ${this._customItems.map((u) => this._renderCustomItem(u))}
              </div>
            </div>
          ` : c}

          <!-- Pending Products Section (if any) -->
          ${this._pendingProducts.length > 0 ? n`
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
                ${this._pendingProducts.map((u) => this._renderPendingProduct(u))}
              </div>
            </div>
          ` : c}

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
          ${m.length > 0 ? n`
            <div class="removed-items-section">
              <h4>Removed Items</h4>
              ${m.map((u) => this._renderRemovedItem(u))}
            </div>
          ` : c}

          <!-- Order Discounts Section (coupons, etc.) -->
          ${this._renderOrderDiscounts()}

          <!-- Payment Summary -->
          <div class="payment-section">
            <h3>Order Summary</h3>

            <div class="payment-row">
              <span>Subtotal</span>
              <span>${e}${a(s, 2)} ${i}</span>
            </div>

            ${P ? n`
              <div class="payment-row discount">
                <span>Discounts</span>
                <span class="discount-amount">-${e}${a(t, 2)} ${i}</span>
              </div>
              <div class="payment-row adjusted">
                <span>Adjusted Subtotal</span>
                <span>${e}${a(o, 2)} ${i}</span>
              </div>
            ` : c}

            <!-- Shipping per order with edit/remove -->
            ${this._orders.map((u, O) => n`
              <div class="payment-row shipping-row ${this._removedShippingOrders.has(u.id) ? "removed" : ""}">
                <span>${u.shippingMethodName ?? "Shipping"}${this._orders.length > 1 ? ` (Order ${O + 1})` : ""}</span>
                <div class="summary-edit-controls">
                  ${this._removedShippingOrders.has(u.id) ? n`
                    <span class="removed-label">Removed</span>
                    <uui-button compact look="secondary" @click=${() => this._restoreShipping(u.id)}>Undo</uui-button>
                  ` : n`
                    <div class="summary-input">
                      <span class="prefix">${e}</span>
                      <uui-input
                        type="number"
                        .value=${u.newShippingCost.toString()}
                        @input=${(C) => this._updateOrderShipping(u.id, parseFloat(C.target.value) || 0)}
                        min="0"
                        step="0.01"
                      ></uui-input>
                    </div>
                    <uui-button compact look="secondary" @click=${() => this._removeShipping(u.id)} title="Remove shipping">
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
                ${this._taxRemoved ? n`
                  <span class="removed-label">Removed (VAT exemption)</span>
                  <uui-button compact look="secondary" @click=${() => this._restoreTax()}>Undo</uui-button>
                ` : n`
                  <span>${e}${a(r, 2)} ${i}</span>
                  <uui-button compact look="secondary" @click=${() => this._removeTax()} title="Remove tax (VAT exemption)">
                    <uui-icon name="icon-delete"></uui-icon>
                  </uui-button>
                `}
              </div>
            </div>

            <div class="payment-row total ${this._previewLoading ? "loading" : ""}">
              <span>Total</span>
              <span>${e}${a(g, 2)} ${i}</span>
            </div>

            <p class="tax-note">${this._previewLoading ? "Calculating..." : "Totals calculated by server"}</p>
          </div>

          <!-- Reason for Edit -->
          <div class="reason-section">
            <h3>Reason for edit</h3>
            <uui-textarea
              .value=${this._editReason}
              @input=${(u) => this._editReason = u.target.value}
              placeholder="Add a reason for this edit..."
            ></uui-textarea>
            <p class="reason-note">Only visible to staff</p>
          </div>

          ${this._errorMessage ? n`
            <div class="error-message">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : c}
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
            ?disabled=${this._isSaving || !f}
          >
            ${this._isSaving ? n`<uui-loader-circle></uui-loader-circle>` : "Update order"}
          </uui-button>
        </div>

      </umb-body-layout>
    `;
  }
  _renderOrderSection(e) {
    const i = this._lineItems.filter(
      (s) => s.orderId === e.id && !s.isRemoved && !s.isAddon
    );
    return n`
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
          ${i.map((s) => this._renderLineItem(s))}
        </div>
      </div>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
d.styles = T`
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

    .line-item-total .calculating,
    .discounted-price.calculating {
      opacity: 0.6;
      font-style: italic;
      color: var(--uui-color-text-alt);
    }

    .line-item-total .pending-total {
      opacity: 0.6;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
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

    /* Child/Add-on Line Items */
    .line-item.child-item {
      background: var(--uui-color-surface-alt);
      padding-left: calc(var(--uui-size-space-4) + 24px);
      border-left: 2px solid var(--uui-color-positive);
    }

    .line-item.addon-item .line-item-product {
      padding-left: 0;
    }

    .addon-indicator {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .addon-connector {
      display: block;
      width: 12px;
      height: 2px;
      background: var(--uui-color-positive);
    }

    .addon-badge {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--uui-color-positive-emphasis);
      color: white;
      padding: 2px 6px;
      border-radius: var(--uui-border-radius);
    }

    .addon-price {
      color: var(--uui-color-positive);
      font-weight: 500;
    }

    .addon-quantity {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      text-align: center;
    }

    .line-item.child-item .line-item-total {
      color: var(--uui-color-positive);
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

    .warehouse-info,
    .shipping-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: 2px;
    }

    .warehouse-info uui-icon,
    .shipping-info uui-icon {
      font-size: 0.75rem;
    }

    .shipping-info {
      color: var(--uui-color-current);
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
l([
  p()
], d.prototype, "_invoice", 2);
l([
  p()
], d.prototype, "_isLoading", 2);
l([
  p()
], d.prototype, "_isSaving", 2);
l([
  p()
], d.prototype, "_errorMessage", 2);
l([
  p()
], d.prototype, "_editReason", 2);
l([
  p()
], d.prototype, "_orders", 2);
l([
  p()
], d.prototype, "_lineItems", 2);
l([
  p()
], d.prototype, "_customItems", 2);
l([
  p()
], d.prototype, "_pendingProducts", 2);
l([
  p()
], d.prototype, "_taxGroups", 2);
l([
  p()
], d.prototype, "_removedShippingOrders", 2);
l([
  p()
], d.prototype, "_taxRemoved", 2);
l([
  p()
], d.prototype, "_removedOrderDiscounts", 2);
l([
  p()
], d.prototype, "_pendingOrderDiscounts", 2);
l([
  p()
], d.prototype, "_previewResult", 2);
l([
  p()
], d.prototype, "_previewLoading", 2);
d = l([
  z("merchello-edit-order-modal")
], d);
const B = d;
export {
  d as MerchelloEditOrderModalElement,
  B as default
};
//# sourceMappingURL=edit-order-modal.element-BQmazfzy.js.map
