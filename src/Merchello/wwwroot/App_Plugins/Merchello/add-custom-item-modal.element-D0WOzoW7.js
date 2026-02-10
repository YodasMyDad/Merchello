import { html as s, nothing as l, css as $, state as d, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as A } from "@umbraco-cms/backoffice/modal";
import { c as _ } from "./formatting-DPh4-DfL.js";
import { M as v } from "./merchello-api-DFeoGYDY.js";
var x = Object.defineProperty, P = Object.getOwnPropertyDescriptor, n = (e, t, i, o) => {
  for (var u = o > 1 ? void 0 : o ? P(t, i) : t, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (u = (o ? h(t, i, u) : h(u)) || u);
  return o && u && x(t, i, u), u;
};
const f = "__no-shipping__", b = "No Shipping", y = 2, S = 250;
let r = class extends A {
  constructor() {
    super(...arguments), this._name = "", this._sku = "", this._price = 0, this._cost = 0, this._quantity = 1, this._selectedTaxGroupId = null, this._isPhysicalProduct = !0, this._addons = [], this._errors = {}, this._taxPreview = null, this._isLoadingTaxPreview = !1, this._taxPreviewDebounceTimer = null, this._productAutocompleteResults = [], this._isSearchingProducts = !1, this._showProductAutocomplete = !1, this._autocompleteField = "name", this._selectedAutocompleteProduct = null, this._draggedAddonIndex = null, this._productSearchDebounceTimer = null, this._productAutocompleteHideTimer = null, this._step = "details", this._warehouses = [], this._isLoadingWarehouses = !1, this._selectedWarehouseId = null, this._shippingOptions = [], this._isLoadingShippingOptions = !1, this._selectedShippingOptionId = null, this._shippingError = null;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._taxPreviewDebounceTimer && clearTimeout(this._taxPreviewDebounceTimer), this._productSearchDebounceTimer && clearTimeout(this._productSearchDebounceTimer), this._productAutocompleteHideTimer && clearTimeout(this._productAutocompleteHideTimer);
  }
  /**
   * UX validation only - checks for required fields.
   * Business rule validation (price > 0, quantity >= 1) is handled by backend.
   */
  _validateDetails() {
    const e = {};
    return this._name.trim() || (e.name = "Item name is required"), this._sku.trim() || (e.sku = "SKU is required"), this._addons.forEach((t, i) => {
      (t.key.trim() || t.value.trim() || t.skuSuffix.trim() || t.priceAdjustment !== 0 || t.costAdjustment !== 0) && (t.key.trim() || (e[`addon-key-${i}`] = "Key is required"), t.value.trim() || (e[`addon-value-${i}`] = "Value is required"));
    }), this._errors = e, Object.keys(e).length === 0;
  }
  _validateShipping() {
    return this._selectedWarehouseId ? this._selectedShippingOptionId ? (this._shippingError = null, !0) : (this._shippingError = "Please select a shipping option", !1) : (this._shippingError = "Please select a warehouse", !1);
  }
  async _loadWarehouses() {
    this._isLoadingWarehouses = !0;
    try {
      const { data: e, error: t } = await v.getWarehousesList();
      this._warehouses = t ? [] : e ?? [];
    } catch {
      this._warehouses = [];
    } finally {
      this._isLoadingWarehouses = !1;
    }
  }
  async _loadShippingOptions() {
    if (!this._selectedWarehouseId) return;
    const e = this.data?.shippingDestination;
    if (!e?.countryCode) {
      this._shippingOptions = [], this._selectedShippingOptionId = null, this._shippingError = null;
      return;
    }
    this._isLoadingShippingOptions = !0, this._shippingOptions = [], this._selectedShippingOptionId = null, this._shippingError = null;
    try {
      const { data: t, error: i } = await v.getShippingOptionsForWarehouse(
        this._selectedWarehouseId,
        e.countryCode,
        e.regionCode
      );
      if (i || !t) {
        this._shippingError = "Failed to load shipping options";
        return;
      }
      if (!t.canShipToDestination) {
        this._shippingError = t.message ?? "This warehouse cannot ship to the order destination";
        return;
      }
      this._shippingOptions = t.availableOptions, this._shippingOptions.length === 0 ? this._shippingError = "No shipping options available for this destination" : this._shippingOptions.length === 1 && (this._selectedShippingOptionId = this._shippingOptions[0].id);
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
  async _handleWarehouseChange(e) {
    const t = e.target.value;
    this._selectedWarehouseId = t || null, this._shippingError = null, this._selectedWarehouseId ? await this._loadShippingOptions() : (this._shippingOptions = [], this._selectedShippingOptionId = null);
  }
  _handleShippingOptionChange(e) {
    const t = e.target.value;
    this._selectedShippingOptionId = t || null, this._selectedShippingOptionId && (this._shippingError = null);
  }
  _handleNameInput(e) {
    const t = e.target.value;
    this._name = t, this._selectedAutocompleteProduct = null, this._clearFieldError("name"), this._scheduleProductAutocompleteSearch(t, "name");
  }
  _handleSkuInput(e) {
    const t = e.target.value;
    this._sku = t, this._selectedAutocompleteProduct = null, this._clearFieldError("sku"), this._scheduleProductAutocompleteSearch(t, "sku");
  }
  _handleProductAutocompleteFocus(e) {
    if (this._autocompleteField = e, this._productAutocompleteHideTimer && (clearTimeout(this._productAutocompleteHideTimer), this._productAutocompleteHideTimer = null), this._productAutocompleteResults.length > 0) {
      this._showProductAutocomplete = !0;
      return;
    }
    const t = e === "name" ? this._name : this._sku;
    t.trim().length >= y && this._scheduleProductAutocompleteSearch(t, e);
  }
  _handleProductAutocompleteBlur() {
    this._productAutocompleteHideTimer && clearTimeout(this._productAutocompleteHideTimer), this._productAutocompleteHideTimer = setTimeout(() => {
      this._showProductAutocomplete = !1, this._productAutocompleteHideTimer = null;
    }, 150);
  }
  _scheduleProductAutocompleteSearch(e, t) {
    this._autocompleteField = t, this._productSearchDebounceTimer && clearTimeout(this._productSearchDebounceTimer);
    const i = e.trim();
    if (i.length < y) {
      this._productAutocompleteResults = [], this._showProductAutocomplete = !1, this._isSearchingProducts = !1;
      return;
    }
    this._productSearchDebounceTimer = setTimeout(async () => {
      const o = i;
      this._isSearchingProducts = !0;
      const { data: u, error: p } = await v.searchOrderProducts(o, 8), h = (t === "name" ? this._name : this._sku).trim();
      if (this._autocompleteField !== t || h !== o) {
        this._isSearchingProducts = !1;
        return;
      }
      if (this._isSearchingProducts = !1, p) {
        this._productAutocompleteResults = [], this._showProductAutocomplete = !1;
        return;
      }
      this._productAutocompleteResults = u ?? [], this._showProductAutocomplete = !0;
    }, S);
  }
  _applyAutocompleteProduct(e) {
    const t = this._getAutocompleteProductDisplayName(e);
    this._selectedAutocompleteProduct = e, this._name = t || this._name, this._sku = e.sku ?? this._sku, this._price = e.price, this._cost = e.cost, this._selectedTaxGroupId = e.taxGroupId ?? null, this._isPhysicalProduct = e.isPhysicalProduct, this._productAutocompleteResults = [], this._showProductAutocomplete = !1, this._clearFieldError("name"), this._clearFieldError("sku"), this._refreshTaxPreview();
  }
  _getAutocompleteProductDisplayName(e) {
    const t = (e.rootName ?? "").trim(), i = (e.name ?? "").trim();
    return t && i && t.toLowerCase() !== i.toLowerCase() ? `${t} - ${i}` : t || i;
  }
  _addAddonRow() {
    this._addons = [
      ...this._addons,
      {
        key: "",
        value: "",
        priceAdjustment: 0,
        costAdjustment: 0,
        skuSuffix: ""
      }
    ];
  }
  _moveAddon(e, t) {
    if (e === t || e < 0 || t < 0 || e >= this._addons.length || t >= this._addons.length) return;
    const i = [...this._addons], [o] = i.splice(e, 1);
    i.splice(t, 0, o), this._addons = i;
    const u = {};
    for (const [p, h] of Object.entries(this._errors)) {
      if (!p.startsWith("addon-key-") && !p.startsWith("addon-value-")) {
        u[p] = h;
        continue;
      }
      const g = p.split("-"), c = Number.parseInt(g[2], 10);
      if (!Number.isFinite(c))
        continue;
      let a = c;
      c === e ? a = t : e < t && c > e && c <= t ? a = c - 1 : e > t && c >= t && c < e && (a = c + 1), u[`${g[0]}-${g[1]}-${a}`] = h;
    }
    this._errors = u, this._refreshTaxPreview();
  }
  _moveAddonUp(e) {
    e <= 0 || this._moveAddon(e, e - 1);
  }
  _moveAddonDown(e) {
    e >= this._addons.length - 1 || this._moveAddon(e, e + 1);
  }
  _handleAddonDragStart(e, t) {
    this._draggedAddonIndex = e, t.dataTransfer && (t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("text/plain", e.toString()));
  }
  _handleAddonDragOver(e) {
    e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move");
  }
  _handleAddonDrop(e, t) {
    t.preventDefault();
    const i = this._draggedAddonIndex;
    if (i === null) {
      this._handleAddonDragEnd();
      return;
    }
    this._moveAddon(i, e), this._handleAddonDragEnd();
  }
  _handleAddonDragEnd() {
    this._draggedAddonIndex = null;
  }
  _removeAddonRow(e) {
    this._addons = this._addons.filter((i, o) => o !== e);
    const t = {};
    for (const [i, o] of Object.entries(this._errors)) {
      if (!i.startsWith("addon-key-") && !i.startsWith("addon-value-")) {
        t[i] = o;
        continue;
      }
      const u = i.split("-"), p = Number.parseInt(u[2], 10);
      !Number.isFinite(p) || p === e || (p > e ? t[`${u[0]}-${u[1]}-${p - 1}`] = o : t[i] = o);
    }
    this._errors = t, this._refreshTaxPreview();
  }
  _updateAddonStringField(e, t, i) {
    this._addons = this._addons.map(
      (o, u) => u === e ? { ...o, [t]: i } : o
    ), (t === "key" || t === "value") && this._clearFieldError(`addon-${t}-${e}`);
  }
  _updateAddonNumberField(e, t, i) {
    const o = parseFloat(i), u = Number.isFinite(o) ? o : 0;
    this._addons = this._addons.map(
      (p, h) => h === e ? { ...p, [t]: u } : p
    ), t === "priceAdjustment" && this._refreshTaxPreview();
  }
  _toCustomItemAddons() {
    return this._addons.filter((e) => e.key.trim() && e.value.trim()).map((e) => ({
      key: e.key.trim(),
      value: e.value.trim(),
      priceAdjustment: e.priceAdjustment,
      costAdjustment: e.costAdjustment,
      skuSuffix: e.skuSuffix.trim() ? e.skuSuffix.trim() : null
    }));
  }
  _clearFieldError(e) {
    if (!this._errors[e]) return;
    const t = { ...this._errors };
    delete t[e], this._errors = t;
  }
  _getAddonsTotalPerUnit() {
    return this._toCustomItemAddons().reduce((e, t) => e + t.priceAdjustment, 0);
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
    const e = this._warehouses.find((o) => o.id === this._selectedWarehouseId), t = this._shippingOptions.find((o) => o.id === this._selectedShippingOptionId), i = this._selectedShippingOptionId === f;
    this.value = {
      item: {
        name: this._name.trim(),
        sku: this._sku.trim(),
        price: this._price,
        cost: this._cost,
        quantity: this._quantity,
        taxGroupId: this._selectedTaxGroupId,
        isPhysicalProduct: this._isPhysicalProduct,
        addons: this._toCustomItemAddons(),
        warehouseId: this._isPhysicalProduct ? this._selectedWarehouseId ?? void 0 : void 0,
        warehouseName: this._isPhysicalProduct ? e?.name ?? void 0 : void 0,
        shippingOptionId: this._isPhysicalProduct ? i ? null : this._selectedShippingOptionId ?? void 0 : void 0,
        shippingOptionName: this._isPhysicalProduct ? i ? b : t?.name ?? void 0 : void 0
      }
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleTaxGroupChange(e) {
    const t = e.target.value;
    this._selectedTaxGroupId = t === "" ? null : t, this._refreshTaxPreview();
  }
  _handlePriceInput(e) {
    this._price = parseFloat(e.target.value) || 0, this._refreshTaxPreview();
  }
  _handleQuantityInput(e) {
    this._quantity = parseInt(e.target.value) || 1, this._refreshTaxPreview();
  }
  /**
   * Refresh tax preview from backend with debouncing.
   * This ensures calculations use the centralized backend logic.
   */
  _refreshTaxPreview() {
    this._taxPreviewDebounceTimer && clearTimeout(this._taxPreviewDebounceTimer), this._taxPreviewDebounceTimer = setTimeout(async () => {
      this._isLoadingTaxPreview = !0;
      try {
        const { data: e, error: t } = await v.previewCustomItemTax({
          price: this._price,
          quantity: this._quantity,
          taxGroupId: this._selectedTaxGroupId,
          addonsTotal: this._getAddonsTotalPerUnit()
        });
        t ? this._taxPreview = null : e && (this._taxPreview = {
          subtotal: e.subtotal,
          taxRate: e.taxRate,
          taxAmount: e.taxAmount,
          total: e.total
        });
      } catch {
        this._taxPreview = null;
      } finally {
        this._isLoadingTaxPreview = !1;
      }
    }, 300);
  }
  _getTaxGroupOptions() {
    const e = this.data?.taxGroups ?? [];
    return [
      { name: "Not taxable", value: "", selected: !this._selectedTaxGroupId },
      ...e.map((t) => ({
        name: `${t.name} (${t.taxPercentage}%)`,
        value: t.id,
        selected: this._selectedTaxGroupId === t.id
      }))
    ];
  }
  render() {
    const e = this._step === "details" ? "Add custom item" : "Select shipping";
    return s`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._step === "details" ? this._renderDetailsStep() : this._renderShippingStep()}
        </div>
        ${this._renderActions()}
      </umb-body-layout>
    `;
  }
  _renderProductAutocompleteDropdown(e) {
    if (this._autocompleteField !== e || !this._showProductAutocomplete)
      return l;
    if ((e === "name" ? this._name : this._sku).trim().length < y)
      return l;
    const i = this.data?.currencySymbol ?? "£";
    return s`
      <div class="autocomplete-dropdown" role="listbox">
        ${this._isSearchingProducts ? s`
          <div class="autocomplete-status">
            <uui-loader-circle></uui-loader-circle>
            <span>Searching products...</span>
          </div>
        ` : this._productAutocompleteResults.length === 0 ? s`
          <div class="autocomplete-status">No products found</div>
        ` : this._productAutocompleteResults.map((o) => s`
          <button
            type="button"
            class="autocomplete-option"
            @mousedown=${(u) => {
      u.preventDefault(), this._applyAutocompleteProduct(o);
    }}
          >
            <span class="autocomplete-option-name">${this._getAutocompleteProductDisplayName(o)}</span>
            <span class="autocomplete-option-meta">
              ${o.sku || "No SKU"} | ${i}${_(o.price, 2)}
            </span>
          </button>
        `)}
      </div>
    `;
  }
  _renderDetailsStep() {
    const e = this.data?.currencySymbol ?? "£", t = this._getAddonsTotalPerUnit(), i = t * this._quantity, o = this._taxPreview !== null, u = this._taxPreview?.taxRate, p = this._taxPreview?.subtotal, h = this._taxPreview?.taxAmount, g = this._taxPreview?.total;
    return s`
      <div class="form-row-group">
        <div class="form-row autocomplete-group">
          <label for="item-name">Item name</label>
          <div class="autocomplete-field">
            <uui-input
              id="item-name"
              .value=${this._name}
              @input=${this._handleNameInput}
              @focus=${() => this._handleProductAutocompleteFocus("name")}
              @blur=${this._handleProductAutocompleteBlur}
              placeholder="Enter item name"
              autocomplete="off"
            ></uui-input>
            ${this._renderProductAutocompleteDropdown("name")}
          </div>
          ${this._errors.name ? s`<span class="error">${this._errors.name}</span>` : l}
        </div>

        <div class="form-row autocomplete-group">
          <label for="item-sku">SKU</label>
          <div class="autocomplete-field">
            <uui-input
              id="item-sku"
              .value=${this._sku}
              @input=${this._handleSkuInput}
              @focus=${() => this._handleProductAutocompleteFocus("sku")}
              @blur=${this._handleProductAutocompleteBlur}
              placeholder="Enter SKU"
              autocomplete="off"
            ></uui-input>
            ${this._renderProductAutocompleteDropdown("sku")}
          </div>
          ${this._errors.sku ? s`<span class="error">${this._errors.sku}</span>` : l}
        </div>
      </div>

      ${this._selectedAutocompleteProduct ? s`
        <div class="selected-product-chip">
          <uui-icon name="icon-check"></uui-icon>
          <span>
            Based on existing product:
            <strong>${this._getAutocompleteProductDisplayName(this._selectedAutocompleteProduct)}</strong>
            ${this._selectedAutocompleteProduct.sku ? ` (${this._selectedAutocompleteProduct.sku})` : ""}
          </span>
          <uui-button
            compact
            look="secondary"
            @click=${() => this._selectedAutocompleteProduct = null}
            title="Clear product selection"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      ` : l}

      <div class="form-row-group">
        <div class="form-row">
          <label for="item-price">Price</label>
          <div class="input-with-prefix">
            <span class="prefix">${e}</span>
            <uui-input
              id="item-price"
              type="number"
              .value=${this._price.toString()}
              @input=${this._handlePriceInput}
              step="0.01"
              min="0"
            ></uui-input>
          </div>
          ${this._errors.price ? s`<span class="error">${this._errors.price}</span>` : l}
        </div>

        <div class="form-row">
          <label for="item-cost">Cost</label>
          <div class="input-with-prefix">
            <span class="prefix">${e}</span>
            <uui-input
              id="item-cost"
              type="number"
              .value=${this._cost.toString()}
              @input=${(c) => this._cost = parseFloat(c.target.value) || 0}
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
        ${this._errors.quantity ? s`<span class="error">${this._errors.quantity}</span>` : l}
      </div>

      <div class="form-row">
        <label for="tax-group">Tax</label>
        <uui-select
          id="tax-group"
          .options=${this._getTaxGroupOptions()}
          @change=${this._handleTaxGroupChange}
        ></uui-select>
        ${this._selectedTaxGroupId && (this._price > 0 || t > 0) ? s`
          <span class="tax-info">
            ${o && h !== void 0 && u !== void 0 ? `Tax: ${e}${_(h, 2)} at ${u}%` : s`<span class="calculating">Calculating tax...</span>`}
          </span>
        ` : l}
      </div>

      <div class="addons-section">
        <div class="addons-header">
          <h4>Add-ons</h4>
          <uui-button look="secondary" compact @click=${this._addAddonRow}>
            <uui-icon name="icon-add"></uui-icon>
            Add add-on
          </uui-button>
        </div>

        ${this._addons.length === 0 ? s`
          <div class="addons-empty">
            Add key/value rows such as "Drawers: Left side", with optional price, cost, and SKU suffix.
          </div>
        ` : this._addons.map((c, a) => s`
          <div
            class="addon-row ${this._draggedAddonIndex === a ? "dragging" : ""}"
            draggable="true"
            @dragstart=${(m) => this._handleAddonDragStart(a, m)}
            @dragover=${this._handleAddonDragOver}
            @drop=${(m) => this._handleAddonDrop(a, m)}
            @dragend=${this._handleAddonDragEnd}
          >
            <div class="addon-fields-top">
              <div class="form-row">
                <label for=${`addon-key-${a}`}>Key</label>
                <uui-input
                  id=${`addon-key-${a}`}
                  .value=${c.key}
                  @input=${(m) => this._updateAddonStringField(a, "key", m.target.value)}
                  placeholder="e.g. Drawers"
                ></uui-input>
                ${this._errors[`addon-key-${a}`] ? s`<span class="error">${this._errors[`addon-key-${a}`]}</span>` : l}
              </div>

              <div class="form-row">
                <label for=${`addon-value-${a}`}>Value</label>
                <uui-input
                  id=${`addon-value-${a}`}
                  .value=${c.value}
                  @input=${(m) => this._updateAddonStringField(a, "value", m.target.value)}
                  placeholder="e.g. Left side"
                ></uui-input>
                ${this._errors[`addon-value-${a}`] ? s`<span class="error">${this._errors[`addon-value-${a}`]}</span>` : l}
              </div>

              <div class="addon-remove">
                <uui-button
                  compact
                  look="secondary"
                  @click=${() => this._moveAddonUp(a)}
                  ?disabled=${a === 0}
                  title="Move add-on up"
                >
                  Up
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  @click=${() => this._moveAddonDown(a)}
                  ?disabled=${a === this._addons.length - 1}
                  title="Move add-on down"
                >
                  Down
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._removeAddonRow(a)}
                  title="Remove add-on"
                >
                  <uui-icon name="icon-delete"></uui-icon>
                </uui-button>
              </div>
            </div>

            <div class="addon-fields-bottom">
              <div class="form-row">
                <label for=${`addon-price-${a}`}>Price adjustment</label>
                <div class="input-with-prefix">
                  <span class="prefix">${e}</span>
                  <uui-input
                    id=${`addon-price-${a}`}
                    type="number"
                    .value=${c.priceAdjustment.toString()}
                    @input=${(m) => this._updateAddonNumberField(a, "priceAdjustment", m.target.value)}
                    step="0.01"
                  ></uui-input>
                </div>
              </div>

              <div class="form-row">
                <label for=${`addon-cost-${a}`}>Cost adjustment</label>
                <div class="input-with-prefix">
                  <span class="prefix">${e}</span>
                  <uui-input
                    id=${`addon-cost-${a}`}
                    type="number"
                    .value=${c.costAdjustment.toString()}
                    @input=${(m) => this._updateAddonNumberField(a, "costAdjustment", m.target.value)}
                    step="0.01"
                  ></uui-input>
                </div>
              </div>

              <div class="form-row">
                <label for=${`addon-sku-${a}`}>SKU suffix</label>
                <uui-input
                  id=${`addon-sku-${a}`}
                  .value=${c.skuSuffix}
                  @input=${(m) => this._updateAddonStringField(a, "skuSuffix", m.target.value)}
                  placeholder="e.g. DRAWER-L"
                ></uui-input>
              </div>
            </div>
          </div>
        `)}
      </div>

      <div class="form-row checkbox-row">
        <uui-checkbox
          label="Physical product"
          .checked=${this._isPhysicalProduct}
          @change=${(c) => this._isPhysicalProduct = c.target.checked}
        >
          Item is a physical product
        </uui-checkbox>
        ${this._isPhysicalProduct ? s`
          <span class="checkbox-hint">Physical products require warehouse and shipping selection</span>
        ` : l}
      </div>

      ${this._price > 0 || t > 0 ? s`
        <div class="summary ${this._isLoadingTaxPreview || !o ? "loading" : ""}">
          ${t > 0 ? s`
            <div class="summary-row">
              <span>Add-ons (${e}${_(t, 2)} per unit)</span>
              <span>+${e}${_(i, 2)}</span>
            </div>
          ` : l}
          <div class="summary-row">
            <span>Subtotal</span>
            <span>
              ${o && p !== void 0 ? `${e}${_(p, 2)}` : s`<span class="calculating">...</span>`}
            </span>
          </div>
          ${this._selectedTaxGroupId ? s`
            <div class="summary-row">
              <span>Tax${o && u !== void 0 ? ` (${u}%)` : ""}</span>
              <span>
                ${o && h !== void 0 ? `${e}${_(h, 2)}` : s`<span class="calculating">...</span>`}
              </span>
            </div>
          ` : l}
          <div class="summary-row total">
            <span>Total</span>
            <span>
              ${o && g !== void 0 ? `${e}${_(g, 2)}` : s`<span class="calculating">...</span>`}
            </span>
          </div>
        </div>
      ` : l}
    `;
  }
  _renderShippingStep() {
    const e = this.data?.currencySymbol ?? "£", t = this.data?.shippingDestination, i = this._getAddonsTotalPerUnit();
    return s`
      <div class="shipping-step">
        <div class="item-summary">
          <div class="item-summary-name">${this._name}</div>
          <div class="item-summary-details">
            <span>${this._sku}</span>
            <span>${e}${_(this._price, 2)} x ${this._quantity}</span>
            ${i > 0 ? s`<span>Add-ons +${e}${_(i, 2)} each</span>` : l}
          </div>
        </div>

        ${t ? s`
          <div class="destination-info">
            <uui-icon name="icon-navigation"></uui-icon>
            <span>Shipping to: ${t.regionCode ? `${t.regionCode}, ` : ""}${t.countryCode}</span>
          </div>
        ` : s`
          <div class="shipping-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>No shipping destination configured for this order</span>
          </div>
        `}

        <div class="form-row">
          <label for="warehouse">Warehouse</label>
          ${this._isLoadingWarehouses ? s`
            <div class="loading-indicator">
              <uui-loader-circle></uui-loader-circle>
              <span>Loading warehouses...</span>
            </div>
          ` : s`
            <uui-select
              id="warehouse"
              .options=${this._getWarehouseOptions()}
              @change=${this._handleWarehouseChange}
            ></uui-select>
          `}
        </div>

        ${this._selectedWarehouseId ? s`
          <div class="form-row">
            <label for="shipping-option">Shipping option</label>
            ${this._isLoadingShippingOptions ? s`
              <div class="loading-indicator">
                <uui-loader-circle></uui-loader-circle>
                <span>Loading shipping options...</span>
              </div>
            ` : s`
              <uui-select
                id="shipping-option"
                .options=${this._getShippingOptionOptions()}
                @change=${this._handleShippingOptionChange}
              ></uui-select>
              ${this._selectedShippingOptionId ? this._renderSelectedShippingDetails() : l}
            `}
          </div>
        ` : l}

        ${this._shippingError ? s`
          <div class="shipping-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._shippingError}</span>
          </div>
        ` : l}
      </div>
    `;
  }
  _renderSelectedShippingDetails() {
    if (this._selectedShippingOptionId === f) return l;
    const e = this._shippingOptions.find((i) => i.id === this._selectedShippingOptionId);
    if (!e) return l;
    const t = this.data?.currencySymbol ?? "£";
    return s`
      <div class="shipping-details">
        <div class="shipping-detail-row">
          <uui-icon name="icon-timer"></uui-icon>
          <span>${e.deliveryTimeDescription}</span>
        </div>
        ${e.estimatedCost !== null && e.estimatedCost !== void 0 ? s`
          <div class="shipping-detail-row">
            <uui-icon name="icon-coins"></uui-icon>
            <span>${e.isEstimate ? "Est. " : ""}${t}${_(e.estimatedCost, 2)}</span>
          </div>
        ` : l}
        ${e.isNextDay ? s`
          <div class="shipping-detail-row next-day">
            <uui-icon name="icon-bolt"></uui-icon>
            <span>Next day delivery</span>
          </div>
        ` : l}
      </div>
    `;
  }
  _getWarehouseOptions() {
    return [
      { name: "Select a warehouse...", value: "", selected: !this._selectedWarehouseId },
      ...this._warehouses.map((e) => ({
        name: e.name ?? e.code ?? "Unnamed",
        value: e.id,
        selected: this._selectedWarehouseId === e.id
      }))
    ];
  }
  _getShippingOptionOptions() {
    const e = this.data?.currencySymbol ?? "£";
    return [
      { name: "Select shipping option...", value: "", selected: !this._selectedShippingOptionId },
      ...this._shippingOptions.map((t) => ({
        name: t.estimatedCost !== null && t.estimatedCost !== void 0 ? `${t.name} (${e}${_(t.estimatedCost, 2)})` : t.name,
        value: t.id,
        selected: this._selectedShippingOptionId === t.id
      })),
      {
        name: b,
        value: f,
        selected: this._selectedShippingOptionId === f
      }
    ];
  }
  _renderActions() {
    const e = this._step === "details", t = e && this._isPhysicalProduct, i = !e || !this._isPhysicalProduct;
    return s`
      <div slot="actions">
        ${!e ? s`
          <uui-button label="Back" look="secondary" @click=${this._handleBackToDetails}>
            Back
          </uui-button>
        ` : s`
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
        `}
        ${t ? s`
          <uui-button label="Continue" look="primary" @click=${this._handleAdd}>
            Continue
          </uui-button>
        ` : l}
        ${i ? s`
          <uui-button
            label="Add item"
            look="primary"
            @click=${this._handleAdd}
            ?disabled=${this._step === "shipping" && (!this._selectedWarehouseId || !this._selectedShippingOptionId)}
          >
            Add item
          </uui-button>
        ` : l}
      </div>
    `;
  }
};
r.styles = $`
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

    .autocomplete-group {
      position: relative;
    }

    .autocomplete-field {
      position: relative;
    }

    .autocomplete-dropdown {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      right: 0;
      z-index: 20;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-2);
      max-height: 240px;
      overflow-y: auto;
    }

    .autocomplete-option {
      display: flex;
      flex-direction: column;
      width: 100%;
      border: 0;
      background: transparent;
      text-align: left;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      cursor: pointer;
      gap: 2px;
    }

    .autocomplete-option:hover {
      background: var(--uui-color-surface-alt);
    }

    .autocomplete-option-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .autocomplete-option-meta {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .autocomplete-status {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      font-size: 0.813rem;
      color: var(--uui-color-text-alt);
    }

    .selected-product-chip {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
      background: rgba(var(--uui-color-positive-rgb), 0.08);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      font-size: 0.813rem;
    }

    .selected-product-chip span {
      flex: 1;
      min-width: 0;
    }

    .addons-section {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .addons-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
    }

    .addons-header h4 {
      margin: 0;
      font-size: 0.875rem;
    }

    .addons-empty {
      font-size: 0.813rem;
      color: var(--uui-color-text-alt);
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .addon-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      cursor: grab;
    }

    .addon-row.dragging {
      opacity: 0.6;
      border-color: var(--uui-color-current);
      background: rgba(var(--uui-color-current-rgb), 0.08);
    }

    .addon-fields-top {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: var(--uui-size-space-3);
      align-items: end;
    }

    .addon-remove {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
      padding-bottom: 2px;
    }

    .addon-fields-bottom {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--uui-size-space-3);
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

    @media (max-width: 900px) {
      .form-row-group {
        grid-template-columns: 1fr;
      }

      .addon-fields-top,
      .addon-fields-bottom {
        grid-template-columns: 1fr;
      }

      .addons-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .addon-remove {
        justify-content: flex-start;
      }

      .item-summary-details {
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }
    }
  `;
n([
  d()
], r.prototype, "_name", 2);
n([
  d()
], r.prototype, "_sku", 2);
n([
  d()
], r.prototype, "_price", 2);
n([
  d()
], r.prototype, "_cost", 2);
n([
  d()
], r.prototype, "_quantity", 2);
n([
  d()
], r.prototype, "_selectedTaxGroupId", 2);
n([
  d()
], r.prototype, "_isPhysicalProduct", 2);
n([
  d()
], r.prototype, "_addons", 2);
n([
  d()
], r.prototype, "_errors", 2);
n([
  d()
], r.prototype, "_taxPreview", 2);
n([
  d()
], r.prototype, "_isLoadingTaxPreview", 2);
n([
  d()
], r.prototype, "_productAutocompleteResults", 2);
n([
  d()
], r.prototype, "_isSearchingProducts", 2);
n([
  d()
], r.prototype, "_showProductAutocomplete", 2);
n([
  d()
], r.prototype, "_autocompleteField", 2);
n([
  d()
], r.prototype, "_selectedAutocompleteProduct", 2);
n([
  d()
], r.prototype, "_draggedAddonIndex", 2);
n([
  d()
], r.prototype, "_step", 2);
n([
  d()
], r.prototype, "_warehouses", 2);
n([
  d()
], r.prototype, "_isLoadingWarehouses", 2);
n([
  d()
], r.prototype, "_selectedWarehouseId", 2);
n([
  d()
], r.prototype, "_shippingOptions", 2);
n([
  d()
], r.prototype, "_isLoadingShippingOptions", 2);
n([
  d()
], r.prototype, "_selectedShippingOptionId", 2);
n([
  d()
], r.prototype, "_shippingError", 2);
r = n([
  w("merchello-add-custom-item-modal")
], r);
const z = r;
export {
  r as MerchelloAddCustomItemModalElement,
  z as default
};
//# sourceMappingURL=add-custom-item-modal.element-D0WOzoW7.js.map
