import { html as t, nothing as n, css as _, state as o, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { c as d } from "./formatting-nNQcXJwZ.js";
import { M as c } from "./merchello-api-658q9849.js";
var v = Object.defineProperty, f = Object.getOwnPropertyDescriptor, a = (i, e, r, l) => {
  for (var p = l > 1 ? void 0 : l ? f(e, r) : e, h = i.length - 1, u; h >= 0; h--)
    (u = i[h]) && (p = (l ? u(e, r, p) : u(p)) || p);
  return l && p && v(e, r, p), p;
};
let s = class extends g {
  constructor() {
    super(...arguments), this._name = "", this._sku = "", this._price = 0, this._cost = 0, this._quantity = 1, this._selectedTaxGroupId = null, this._isPhysicalProduct = !0, this._errors = {}, this._taxPreview = null, this._isLoadingTaxPreview = !1, this._taxPreviewDebounceTimer = null, this._step = "details", this._warehouses = [], this._isLoadingWarehouses = !1, this._selectedWarehouseId = null, this._shippingOptions = [], this._isLoadingShippingOptions = !1, this._selectedShippingOptionId = null, this._shippingError = null;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._taxPreviewDebounceTimer && clearTimeout(this._taxPreviewDebounceTimer);
  }
  /**
   * UX validation only - checks for required fields.
   * Business rule validation (price > 0, quantity >= 1) is handled by backend.
   */
  _validateDetails() {
    const i = {};
    return this._name.trim() || (i.name = "Item name is required"), this._sku.trim() || (i.sku = "SKU is required"), this._errors = i, Object.keys(i).length === 0;
  }
  _validateShipping() {
    return this._selectedWarehouseId ? this._selectedShippingOptionId ? (this._shippingError = null, !0) : (this._shippingError = "Please select a shipping option", !1) : (this._shippingError = "Please select a warehouse", !1);
  }
  async _loadWarehouses() {
    this._isLoadingWarehouses = !0;
    try {
      const { data: i, error: e } = await c.getWarehousesList();
      this._warehouses = e ? [] : i ?? [];
    } catch {
      this._warehouses = [];
    } finally {
      this._isLoadingWarehouses = !1;
    }
  }
  async _loadShippingOptions() {
    if (!this._selectedWarehouseId) return;
    const i = this.data?.shippingDestination;
    if (!i?.countryCode) {
      this._shippingError = "No shipping destination configured for this order";
      return;
    }
    this._isLoadingShippingOptions = !0, this._shippingOptions = [], this._selectedShippingOptionId = null, this._shippingError = null;
    try {
      const { data: e, error: r } = await c.getShippingOptionsForWarehouse(
        this._selectedWarehouseId,
        i.countryCode,
        i.stateCode
      );
      if (r || !e) {
        this._shippingError = "Failed to load shipping options";
        return;
      }
      if (!e.canShipToDestination) {
        this._shippingError = e.message ?? "This warehouse cannot ship to the order destination";
        return;
      }
      this._shippingOptions = e.availableOptions, this._shippingOptions.length === 0 ? this._shippingError = "No shipping options available for this destination" : this._shippingOptions.length === 1 && (this._selectedShippingOptionId = this._shippingOptions[0].id);
    } catch {
      this._shippingError = "Failed to load shipping options";
    } finally {
      this._isLoadingShippingOptions = !1;
    }
  }
  async _handleContinueToShipping() {
    this._validateDetails() && (this._warehouses.length === 0 && await this._loadWarehouses(), this._step = "shipping");
  }
  _handleBackToDetails() {
    this._step = "details", this._shippingError = null;
  }
  async _handleWarehouseChange(i) {
    const e = i.target.value;
    this._selectedWarehouseId = e || null, this._shippingError = null, this._selectedWarehouseId ? await this._loadShippingOptions() : (this._shippingOptions = [], this._selectedShippingOptionId = null);
  }
  _handleShippingOptionChange(i) {
    const e = i.target.value;
    this._selectedShippingOptionId = e || null, this._selectedShippingOptionId && (this._shippingError = null);
  }
  _handleAdd() {
    if (!this._isPhysicalProduct) {
      if (!this._validateDetails()) return;
      this._submitItem();
      return;
    }
    if (this._step === "details") {
      this._handleContinueToShipping();
      return;
    }
    this._validateShipping() && this._submitItem();
  }
  _submitItem() {
    const i = this._warehouses.find((r) => r.id === this._selectedWarehouseId), e = this._shippingOptions.find((r) => r.id === this._selectedShippingOptionId);
    this.value = {
      item: {
        name: this._name.trim(),
        sku: this._sku.trim(),
        price: this._price,
        cost: this._cost,
        quantity: this._quantity,
        taxGroupId: this._selectedTaxGroupId,
        isPhysicalProduct: this._isPhysicalProduct,
        warehouseId: this._isPhysicalProduct ? this._selectedWarehouseId ?? void 0 : void 0,
        warehouseName: this._isPhysicalProduct ? i?.name ?? void 0 : void 0,
        shippingOptionId: this._isPhysicalProduct ? this._selectedShippingOptionId ?? void 0 : void 0,
        shippingOptionName: this._isPhysicalProduct ? e?.name ?? void 0 : void 0
      }
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleTaxGroupChange(i) {
    const e = i.target.value;
    this._selectedTaxGroupId = e === "" ? null : e, this._refreshTaxPreview();
  }
  _handlePriceInput(i) {
    this._price = parseFloat(i.target.value) || 0, this._refreshTaxPreview();
  }
  _handleQuantityInput(i) {
    this._quantity = parseInt(i.target.value) || 1, this._refreshTaxPreview();
  }
  /**
   * Refresh tax preview from backend with debouncing.
   * This ensures calculations use the centralized backend logic.
   */
  _refreshTaxPreview() {
    this._taxPreviewDebounceTimer && clearTimeout(this._taxPreviewDebounceTimer), this._taxPreviewDebounceTimer = setTimeout(async () => {
      this._isLoadingTaxPreview = !0;
      try {
        const { data: i, error: e } = await c.previewCustomItemTax({
          price: this._price,
          quantity: this._quantity,
          taxGroupId: this._selectedTaxGroupId
        });
        e ? this._taxPreview = null : i && (this._taxPreview = {
          subtotal: i.subtotal,
          taxRate: i.taxRate,
          taxAmount: i.taxAmount,
          total: i.total
        });
      } catch {
        this._taxPreview = null;
      } finally {
        this._isLoadingTaxPreview = !1;
      }
    }, 300);
  }
  _getTaxGroupOptions() {
    const i = this.data?.taxGroups ?? [];
    return [
      { name: "Not taxable", value: "", selected: !this._selectedTaxGroupId },
      ...i.map((e) => ({
        name: `${e.name} (${e.taxPercentage}%)`,
        value: e.id,
        selected: this._selectedTaxGroupId === e.id
      }))
    ];
  }
  render() {
    const i = this._step === "details" ? "Add custom item" : "Select shipping";
    return t`
      <umb-body-layout headline=${i}>
        <div id="main">
          ${this._step === "details" ? this._renderDetailsStep() : this._renderShippingStep()}
        </div>
        ${this._renderActions()}
      </umb-body-layout>
    `;
  }
  _renderDetailsStep() {
    const i = this.data?.currencySymbol ?? "£", e = this._taxPreview !== null, r = this._taxPreview?.taxRate, l = this._taxPreview?.subtotal, p = this._taxPreview?.taxAmount, h = this._taxPreview?.total;
    return t`
      <div class="form-row-group">
        <div class="form-row">
          <label for="item-name">Item name</label>
          <uui-input
            id="item-name"
            .value=${this._name}
            @input=${(u) => this._name = u.target.value}
            placeholder="Enter item name"
          ></uui-input>
          ${this._errors.name ? t`<span class="error">${this._errors.name}</span>` : n}
        </div>

        <div class="form-row">
          <label for="item-sku">SKU</label>
          <uui-input
            id="item-sku"
            .value=${this._sku}
            @input=${(u) => this._sku = u.target.value}
            placeholder="Enter SKU"
          ></uui-input>
          ${this._errors.sku ? t`<span class="error">${this._errors.sku}</span>` : n}
        </div>
      </div>

      <div class="form-row-group">
        <div class="form-row">
          <label for="item-price">Price</label>
          <div class="input-with-prefix">
            <span class="prefix">${i}</span>
            <uui-input
              id="item-price"
              type="number"
              .value=${this._price.toString()}
              @input=${this._handlePriceInput}
              step="0.01"
              min="0"
            ></uui-input>
          </div>
          ${this._errors.price ? t`<span class="error">${this._errors.price}</span>` : n}
        </div>

        <div class="form-row">
          <label for="item-cost">Cost</label>
          <div class="input-with-prefix">
            <span class="prefix">${i}</span>
            <uui-input
              id="item-cost"
              type="number"
              .value=${this._cost.toString()}
              @input=${(u) => this._cost = parseFloat(u.target.value) || 0}
              step="0.01"
              min="0"
            ></uui-input>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label for="item-quantity">Quantity</label>
        <uui-input
          id="item-quantity"
          type="number"
          .value=${this._quantity.toString()}
          @input=${this._handleQuantityInput}
          min="1"
        ></uui-input>
        ${this._errors.quantity ? t`<span class="error">${this._errors.quantity}</span>` : n}
      </div>

      <div class="form-row">
        <label for="tax-group">Tax</label>
        <uui-select
          id="tax-group"
          .options=${this._getTaxGroupOptions()}
          @change=${this._handleTaxGroupChange}
        ></uui-select>
        ${this._selectedTaxGroupId && this._price > 0 ? t`
          <span class="tax-info">
            ${e && p !== void 0 && r !== void 0 ? `Tax: ${i}${d(p, 2)} at ${r}%` : t`<span class="calculating">Calculating tax...</span>`}
          </span>
        ` : n}
      </div>

      <div class="form-row checkbox-row">
        <uui-checkbox
          .checked=${this._isPhysicalProduct}
          @change=${(u) => this._isPhysicalProduct = u.target.checked}
        >
          Item is a physical product
        </uui-checkbox>
        ${this._isPhysicalProduct ? t`
          <span class="checkbox-hint">Physical products require warehouse and shipping selection</span>
        ` : n}
      </div>

      ${this._price > 0 ? t`
        <div class="summary ${this._isLoadingTaxPreview || !e ? "loading" : ""}">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>
              ${e && l !== void 0 ? `${i}${d(l, 2)}` : t`<span class="calculating">...</span>`}
            </span>
          </div>
          ${this._selectedTaxGroupId ? t`
            <div class="summary-row">
              <span>Tax${e && r !== void 0 ? ` (${r}%)` : ""}</span>
              <span>
                ${e && p !== void 0 ? `${i}${d(p, 2)}` : t`<span class="calculating">...</span>`}
              </span>
            </div>
          ` : n}
          <div class="summary-row total">
            <span>Total</span>
            <span>
              ${e && h !== void 0 ? `${i}${d(h, 2)}` : t`<span class="calculating">...</span>`}
            </span>
          </div>
        </div>
      ` : n}
    `;
  }
  _renderShippingStep() {
    const i = this.data?.currencySymbol ?? "£", e = this.data?.shippingDestination;
    return t`
      <div class="shipping-step">
        <div class="item-summary">
          <div class="item-summary-name">${this._name}</div>
          <div class="item-summary-details">
            <span>${this._sku}</span>
            <span>${i}${d(this._price, 2)} × ${this._quantity}</span>
          </div>
        </div>

        ${e ? t`
          <div class="destination-info">
            <uui-icon name="icon-navigation"></uui-icon>
            <span>Shipping to: ${e.stateCode ? `${e.stateCode}, ` : ""}${e.countryCode}</span>
          </div>
        ` : t`
          <div class="shipping-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>No shipping destination configured for this order</span>
          </div>
        `}

        <div class="form-row">
          <label for="warehouse">Warehouse</label>
          ${this._isLoadingWarehouses ? t`
            <div class="loading-indicator">
              <uui-loader-circle></uui-loader-circle>
              <span>Loading warehouses...</span>
            </div>
          ` : t`
            <uui-select
              id="warehouse"
              .options=${this._getWarehouseOptions()}
              @change=${this._handleWarehouseChange}
            ></uui-select>
          `}
        </div>

        ${this._selectedWarehouseId ? t`
          <div class="form-row">
            <label for="shipping-option">Shipping option</label>
            ${this._isLoadingShippingOptions ? t`
              <div class="loading-indicator">
                <uui-loader-circle></uui-loader-circle>
                <span>Loading shipping options...</span>
              </div>
            ` : this._shippingOptions.length > 0 ? t`
              <uui-select
                id="shipping-option"
                .options=${this._getShippingOptionOptions()}
                @change=${this._handleShippingOptionChange}
              ></uui-select>
              ${this._selectedShippingOptionId ? this._renderSelectedShippingDetails() : n}
            ` : n}
          </div>
        ` : n}

        ${this._shippingError ? t`
          <div class="shipping-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._shippingError}</span>
          </div>
        ` : n}
      </div>
    `;
  }
  _renderSelectedShippingDetails() {
    const i = this._shippingOptions.find((r) => r.id === this._selectedShippingOptionId);
    if (!i) return n;
    const e = this.data?.currencySymbol ?? "£";
    return t`
      <div class="shipping-details">
        <div class="shipping-detail-row">
          <uui-icon name="icon-timer"></uui-icon>
          <span>${i.deliveryTimeDescription}</span>
        </div>
        ${i.estimatedCost !== null && i.estimatedCost !== void 0 ? t`
          <div class="shipping-detail-row">
            <uui-icon name="icon-coins"></uui-icon>
            <span>${i.isEstimate ? "Est. " : ""}${e}${d(i.estimatedCost, 2)}</span>
          </div>
        ` : n}
        ${i.isNextDay ? t`
          <div class="shipping-detail-row next-day">
            <uui-icon name="icon-bolt"></uui-icon>
            <span>Next day delivery</span>
          </div>
        ` : n}
      </div>
    `;
  }
  _getWarehouseOptions() {
    return [
      { name: "Select a warehouse...", value: "", selected: !this._selectedWarehouseId },
      ...this._warehouses.map((i) => ({
        name: i.name ?? i.code ?? "Unnamed",
        value: i.id,
        selected: this._selectedWarehouseId === i.id
      }))
    ];
  }
  _getShippingOptionOptions() {
    const i = this.data?.currencySymbol ?? "£";
    return [
      { name: "Select shipping option...", value: "", selected: !this._selectedShippingOptionId },
      ...this._shippingOptions.map((e) => ({
        name: e.estimatedCost !== null && e.estimatedCost !== void 0 ? `${e.name} (${i}${d(e.estimatedCost, 2)})` : e.name,
        value: e.id,
        selected: this._selectedShippingOptionId === e.id
      }))
    ];
  }
  _renderActions() {
    const i = this._step === "details", e = i && this._isPhysicalProduct, r = !i || !this._isPhysicalProduct;
    return t`
      <div slot="actions">
        ${!i ? t`
          <uui-button label="Back" look="secondary" @click=${this._handleBackToDetails}>
            Back
          </uui-button>
        ` : t`
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
        `}
        ${e ? t`
          <uui-button label="Continue" look="primary" @click=${this._handleAdd}>
            Continue
          </uui-button>
        ` : n}
        ${r ? t`
          <uui-button
            label="Add item"
            look="primary"
            @click=${this._handleAdd}
            ?disabled=${this._step === "shipping" && (!this._selectedWarehouseId || !this._selectedShippingOptionId)}
          >
            Add item
          </uui-button>
        ` : n}
      </div>
    `;
  }
};
s.styles = _`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .form-row-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .input-with-prefix {
      display: flex;
      align-items: center;
    }

    .input-with-prefix .prefix {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-right: none;
      padding: 0 var(--uui-size-space-3);
      height: 36px;
      display: flex;
      align-items: center;
      border-radius: var(--uui-border-radius) 0 0 var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .input-with-prefix uui-input {
      flex: 1;
    }

    .input-with-prefix uui-input::part(input) {
      border-radius: 0 var(--uui-border-radius) var(--uui-border-radius) 0;
    }

    uui-select {
      width: 100%;
    }

    .tax-info {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .checkbox-row {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
    }

    .checkbox-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-left: var(--uui-size-space-6);
      width: 100%;
    }

    .summary {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .summary-row.total {
      font-weight: 600;
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-1);
    }

    .summary.loading {
      opacity: 0.6;
    }

    .calculating {
      font-style: italic;
      color: var(--uui-color-text-alt);
    }

    .error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    /* Shipping step styles */
    .shipping-step {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .item-summary {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .item-summary-name {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: var(--uui-size-space-1);
    }

    .item-summary-details {
      display: flex;
      gap: var(--uui-size-space-4);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .destination-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-default);
      color: var(--uui-color-default-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .destination-info uui-icon {
      font-size: 1rem;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .shipping-error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: white;
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .shipping-error uui-icon {
      font-size: 1rem;
    }

    .shipping-details {
      margin-top: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .shipping-detail-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.813rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-detail-row uui-icon {
      font-size: 0.875rem;
    }

    .shipping-detail-row.next-day {
      color: var(--uui-color-positive);
    }
  `;
a([
  o()
], s.prototype, "_name", 2);
a([
  o()
], s.prototype, "_sku", 2);
a([
  o()
], s.prototype, "_price", 2);
a([
  o()
], s.prototype, "_cost", 2);
a([
  o()
], s.prototype, "_quantity", 2);
a([
  o()
], s.prototype, "_selectedTaxGroupId", 2);
a([
  o()
], s.prototype, "_isPhysicalProduct", 2);
a([
  o()
], s.prototype, "_errors", 2);
a([
  o()
], s.prototype, "_taxPreview", 2);
a([
  o()
], s.prototype, "_isLoadingTaxPreview", 2);
a([
  o()
], s.prototype, "_step", 2);
a([
  o()
], s.prototype, "_warehouses", 2);
a([
  o()
], s.prototype, "_isLoadingWarehouses", 2);
a([
  o()
], s.prototype, "_selectedWarehouseId", 2);
a([
  o()
], s.prototype, "_shippingOptions", 2);
a([
  o()
], s.prototype, "_isLoadingShippingOptions", 2);
a([
  o()
], s.prototype, "_selectedShippingOptionId", 2);
a([
  o()
], s.prototype, "_shippingError", 2);
s = a([
  m("merchello-add-custom-item-modal")
], s);
const $ = s;
export {
  s as MerchelloAddCustomItemModalElement,
  $ as default
};
//# sourceMappingURL=add-custom-item-modal.element-DwwBmcqd.js.map
