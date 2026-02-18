import { html as s, nothing as u, css as w, state as d, customElement as P } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as A } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as S } from "@umbraco-cms/backoffice/sorter";
import { c as m } from "./formatting-CZRy3TEt.js";
import { m as k } from "./modal-layout.styles-BZ74iMMY.js";
import { M as g } from "./merchello-api-COnU_HX2.js";
var T = Object.defineProperty, I = Object.getOwnPropertyDescriptor, $ = (e) => {
  throw TypeError(e);
}, n = (e, t, i, o) => {
  for (var r = o > 1 ? void 0 : o ? I(t, i) : t, c = e.length - 1, p; c >= 0; c--)
    (p = e[c]) && (r = (o ? p(t, i, r) : p(r)) || r);
  return o && r && T(t, i, r), r;
}, O = (e, t, i) => t.has(e) || $("Cannot " + i), z = (e, t, i) => (O(e, t, "read from private field"), i ? i.call(e) : t.get(e)), C = (e, t, i) => t.has(e) ? $("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), b;
const f = "__no-shipping__", x = "No Shipping", y = 2, E = 250;
let a = class extends A {
  constructor() {
    super(...arguments), this._name = "", this._sku = "", this._price = 0, this._cost = 0, this._quantity = 1, this._selectedTaxGroupId = null, this._isPhysicalProduct = !0, this._addons = [], this._errors = {}, this._taxPreview = null, this._isLoadingTaxPreview = !1, this._taxPreviewDebounceTimer = null, this._productAutocompleteResults = [], this._isSearchingProducts = !1, this._showProductAutocomplete = !1, this._autocompleteField = "name", this._selectedAutocompleteProduct = null, this._productSearchDebounceTimer = null, this._productAutocompleteHideTimer = null, this._addonSortSequence = 0, C(this, b, new S(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-addon-id") ?? "",
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.AddCustomItem.Addons.Sorter",
      itemSelector: ".addon-row",
      containerSelector: ".addons-list",
      handleSelector: ".addon-drag-handle",
      placeholderClass: "--umb-sorter-placeholder",
      onChange: ({ model: e }) => this._handleAddonSort(e)
    })), this._step = "details", this._warehouses = [], this._isLoadingWarehouses = !1, this._selectedWarehouseId = null, this._shippingOptions = [], this._isLoadingShippingOptions = !1, this._selectedShippingOptionId = null, this._shippingError = null;
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
      const { data: e, error: t } = await g.getWarehousesList();
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
      const { data: t, error: i } = await g.getShippingOptionsForWarehouse(
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
      const { data: r, error: c } = await g.searchOrderProducts(o, 8), p = (t === "name" ? this._name : this._sku).trim();
      if (this._autocompleteField !== t || p !== o) {
        this._isSearchingProducts = !1;
        return;
      }
      if (this._isSearchingProducts = !1, c) {
        this._productAutocompleteResults = [], this._showProductAutocomplete = !1;
        return;
      }
      this._productAutocompleteResults = r ?? [], this._showProductAutocomplete = !0;
    }, E);
  }
  _applyAutocompleteProduct(e) {
    const t = this._getAutocompleteProductDisplayName(e);
    this._selectedAutocompleteProduct = e, this._name = t || this._name, this._sku = e.sku ?? this._sku, this._price = e.price, this._cost = e.cost, this._selectedTaxGroupId = e.taxGroupId ?? null, this._isPhysicalProduct = e.isPhysicalProduct, this._productAutocompleteResults = [], this._showProductAutocomplete = !1, this._clearFieldError("name"), this._clearFieldError("sku"), this._refreshTaxPreview();
  }
  _getAutocompleteProductDisplayName(e) {
    const t = (e.rootName ?? "").trim(), i = (e.name ?? "").trim();
    return t && i && t.toLowerCase() !== i.toLowerCase() ? `${t} - ${i}` : t || i;
  }
  _createAddonRow() {
    return this._addonSortSequence += 1, {
      id: `addon-${this._addonSortSequence}`,
      key: "",
      value: "",
      priceAdjustment: 0,
      costAdjustment: 0,
      skuSuffix: ""
    };
  }
  _setAddons(e, t = {}) {
    this._addons = e, (t.syncSorter ?? !0) && z(this, b).setModel(e), t.refreshTaxPreview === !0 && this._refreshTaxPreview();
  }
  _reindexAddonErrors(e, t) {
    const i = new Map(t.map((r, c) => [r, c])), o = {};
    for (const [r, c] of Object.entries(this._errors)) {
      if (!r.startsWith("addon-key-") && !r.startsWith("addon-value-")) {
        o[r] = c;
        continue;
      }
      const p = r.split("-"), v = Number.parseInt(p[2], 10);
      if (!Number.isFinite(v))
        continue;
      const h = e[v];
      if (!h)
        continue;
      const l = i.get(h);
      l !== void 0 && (o[`${p[0]}-${p[1]}-${l}`] = c);
    }
    this._errors = o;
  }
  _handleAddonSort(e) {
    const t = this._addons.map((o) => o.id), i = e.map((o) => o.id);
    this._setAddons(e, { syncSorter: !1 }), this._reindexAddonErrors(t, i);
  }
  _addAddonRow() {
    this._setAddons([...this._addons, this._createAddonRow()]);
  }
  _removeAddonRow(e) {
    const t = this._addons.map((r) => r.id), i = this._addons.filter((r, c) => c !== e), o = i.map((r) => r.id);
    this._setAddons(i, { refreshTaxPreview: !0 }), this._reindexAddonErrors(t, o);
  }
  _updateAddonStringField(e, t, i) {
    this._setAddons(this._addons.map(
      (o, r) => r === e ? { ...o, [t]: i } : o
    )), (t === "key" || t === "value") && this._clearFieldError(`addon-${t}-${e}`);
  }
  _updateAddonNumberField(e, t, i) {
    const o = parseFloat(i), r = Number.isFinite(o) ? o : 0;
    this._setAddons(this._addons.map(
      (c, p) => p === e ? { ...c, [t]: r } : c
    ), { refreshTaxPreview: t === "priceAdjustment" });
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
        shippingOptionName: this._isPhysicalProduct ? i ? x : t?.name ?? void 0 : void 0
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
        const { data: e, error: t } = await g.previewCustomItemTax({
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
      return u;
    if ((e === "name" ? this._name : this._sku).trim().length < y)
      return u;
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
            @mousedown=${(r) => {
      r.preventDefault(), this._applyAutocompleteProduct(o);
    }}
          >
            <span class="autocomplete-option-name">${this._getAutocompleteProductDisplayName(o)}</span>
            <span class="autocomplete-option-meta">
              ${o.sku || "No SKU"} | ${i}${m(o.price, 2)}
            </span>
          </button>
        `)}
      </div>
    `;
  }
  _renderDetailsStep() {
    const e = this.data?.currencySymbol ?? "£", t = this._getAddonsTotalPerUnit(), i = t * this._quantity, o = this._taxPreview !== null, r = this._taxPreview?.taxRate, c = this._taxPreview?.subtotal, p = this._taxPreview?.taxAmount, v = this._taxPreview?.total;
    return s`
      <div class="form-row-group identity-fields">
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
          ${this._errors.name ? s`<span class="error">${this._errors.name}</span>` : u}
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
          ${this._errors.sku ? s`<span class="error">${this._errors.sku}</span>` : u}
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
      ` : u}

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
          ${this._errors.price ? s`<span class="error">${this._errors.price}</span>` : u}
        </div>

        <div class="form-row">
          <label for="item-cost">Cost</label>
          <div class="input-with-prefix">
            <span class="prefix">${e}</span>
            <uui-input
              id="item-cost"
              type="number"
              .value=${this._cost.toString()}
              @input=${(h) => this._cost = parseFloat(h.target.value) || 0}
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
        ${this._errors.quantity ? s`<span class="error">${this._errors.quantity}</span>` : u}
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
            ${o && p !== void 0 && r !== void 0 ? `Tax: ${e}${m(p, 2)} at ${r}%` : s`<span class="calculating">Calculating tax...</span>`}
          </span>
        ` : u}
      </div>

      <div class="addons-section">
        <div class="addons-header">
          <h4>Add-ons</h4>
          <uui-button look="secondary" compact @click=${this._addAddonRow}>
            <uui-icon name="icon-add"></uui-icon>
            Add add-on
          </uui-button>
        </div>

        <!-- Always render container for sorter -->
        <div class="addons-list">
          ${this._addons.length === 0 ? s`
            <div class="addons-empty">
              Add key/value rows such as "Drawers: Left side", with optional price, cost, and SKU suffix.
            </div>
          ` : this._addons.map((h, l) => s`
            <div class="addon-row" data-addon-id=${h.id}>
              <div class="addon-fields-top">
                <div class="form-row">
                  <label for=${`addon-key-${l}`}>Key</label>
                  <uui-input
                    id=${`addon-key-${l}`}
                    .value=${h.key}
                    @input=${(_) => this._updateAddonStringField(l, "key", _.target.value)}
                    placeholder="e.g. Drawers"
                  ></uui-input>
                  ${this._errors[`addon-key-${l}`] ? s`<span class="error">${this._errors[`addon-key-${l}`]}</span>` : u}
                </div>

                <div class="form-row">
                  <label for=${`addon-value-${l}`}>Value</label>
                  <uui-input
                    id=${`addon-value-${l}`}
                    .value=${h.value}
                    @input=${(_) => this._updateAddonStringField(l, "value", _.target.value)}
                    placeholder="e.g. Left side"
                  ></uui-input>
                  ${this._errors[`addon-value-${l}`] ? s`<span class="error">${this._errors[`addon-value-${l}`]}</span>` : u}
                </div>

                <div class="addon-row-actions">
                  <button
                    type="button"
                    class="addon-drag-handle"
                    title="Reorder add-on"
                    aria-label="Reorder add-on"
                  >
                    <uui-icon name="icon-navigation"></uui-icon>
                  </button>
                  <uui-button
                    compact
                    look="secondary"
                    color="danger"
                    @click=${() => this._removeAddonRow(l)}
                    title="Remove add-on"
                  >
                    <uui-icon name="icon-delete"></uui-icon>
                  </uui-button>
                </div>
              </div>

              <div class="addon-fields-bottom">
                <div class="form-row">
                  <label for=${`addon-price-${l}`}>Price adjustment</label>
                  <div class="input-with-prefix">
                    <span class="prefix">${e}</span>
                    <uui-input
                      id=${`addon-price-${l}`}
                      type="number"
                      .value=${h.priceAdjustment.toString()}
                      @input=${(_) => this._updateAddonNumberField(l, "priceAdjustment", _.target.value)}
                      step="0.01"
                    ></uui-input>
                  </div>
                </div>

                <div class="form-row">
                  <label for=${`addon-cost-${l}`}>Cost adjustment</label>
                  <div class="input-with-prefix">
                    <span class="prefix">${e}</span>
                    <uui-input
                      id=${`addon-cost-${l}`}
                      type="number"
                      .value=${h.costAdjustment.toString()}
                      @input=${(_) => this._updateAddonNumberField(l, "costAdjustment", _.target.value)}
                      step="0.01"
                    ></uui-input>
                  </div>
                </div>

                <div class="form-row">
                  <label for=${`addon-sku-${l}`}>SKU suffix</label>
                  <uui-input
                    id=${`addon-sku-${l}`}
                    .value=${h.skuSuffix}
                    @input=${(_) => this._updateAddonStringField(l, "skuSuffix", _.target.value)}
                    placeholder="e.g. DRAWER-L"
                  ></uui-input>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div class="form-row checkbox-row">
        <uui-checkbox
          label="Physical product"
          .checked=${this._isPhysicalProduct}
          @change=${(h) => this._isPhysicalProduct = h.target.checked}
        >
          Item is a physical product
        </uui-checkbox>
        ${this._isPhysicalProduct ? s`
          <span class="checkbox-hint">Physical products require warehouse and shipping selection</span>
        ` : u}
      </div>

      ${this._price > 0 || t > 0 ? s`
        <div class="summary ${this._isLoadingTaxPreview || !o ? "loading" : ""}">
          ${t > 0 ? s`
            <div class="summary-row">
              <span>Add-ons (${e}${m(t, 2)} per unit)</span>
              <span>+${e}${m(i, 2)}</span>
            </div>
          ` : u}
          <div class="summary-row">
            <span>Subtotal</span>
            <span>
              ${o && c !== void 0 ? `${e}${m(c, 2)}` : s`<span class="calculating">...</span>`}
            </span>
          </div>
          ${this._selectedTaxGroupId ? s`
            <div class="summary-row">
              <span>Tax${o && r !== void 0 ? ` (${r}%)` : ""}</span>
              <span>
                ${o && p !== void 0 ? `${e}${m(p, 2)}` : s`<span class="calculating">...</span>`}
              </span>
            </div>
          ` : u}
          <div class="summary-row total">
            <span>Total</span>
            <span>
              ${o && v !== void 0 ? `${e}${m(v, 2)}` : s`<span class="calculating">...</span>`}
            </span>
          </div>
        </div>
      ` : u}
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
            <span>${e}${m(this._price, 2)} x ${this._quantity}</span>
            ${i > 0 ? s`<span>Add-ons +${e}${m(i, 2)} each</span>` : u}
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
              ${this._selectedShippingOptionId ? this._renderSelectedShippingDetails() : u}
            `}
          </div>
        ` : u}

        ${this._shippingError ? s`
          <div class="shipping-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._shippingError}</span>
          </div>
        ` : u}
      </div>
    `;
  }
  _renderSelectedShippingDetails() {
    if (this._selectedShippingOptionId === f) return u;
    const e = this._shippingOptions.find((i) => i.id === this._selectedShippingOptionId);
    if (!e) return u;
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
            <span>${e.isEstimate ? "Est. " : ""}${t}${m(e.estimatedCost, 2)}</span>
          </div>
        ` : u}
        ${e.isNextDay ? s`
          <div class="shipping-detail-row next-day">
            <uui-icon name="icon-bolt"></uui-icon>
            <span>Next day delivery</span>
          </div>
        ` : u}
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
        name: t.estimatedCost !== null && t.estimatedCost !== void 0 ? `${t.name} (${e}${m(t.estimatedCost, 2)})` : t.name,
        value: t.id,
        selected: this._selectedShippingOptionId === t.id
      })),
      {
        name: x,
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
        ` : u}
        ${i ? s`
          <uui-button
            label="Add item"
            look="primary"
            @click=${this._handleAdd}
            ?disabled=${this._step === "shipping" && (!this._selectedWarehouseId || !this._selectedShippingOptionId)}
          >
            Add item
          </uui-button>
        ` : u}
      </div>
    `;
  }
};
b = /* @__PURE__ */ new WeakMap();
a.styles = [
  k,
  w`
    .identity-fields {
      grid-template-columns: 1fr;
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

    .addons-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
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
    }

    .addon-row.--umb-sorter-placeholder,
    .addon-row[drag-placeholder] {
      visibility: hidden;
      position: relative;
    }

    .addon-row.--umb-sorter-placeholder::after,
    .addon-row[drag-placeholder]::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: rgba(var(--uui-color-current-rgb), 0.08);
    }

    .addon-fields-top {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
      gap: var(--uui-size-space-3);
      align-items: end;
    }

    .addon-row-actions {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
      padding-bottom: 2px;
    }

    .addon-drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text-alt);
      cursor: grab;
      padding: 0;
    }

    .addon-drag-handle:hover {
      color: var(--uui-color-text);
      border-color: var(--uui-color-border-emphasis);
    }

    .addon-drag-handle:active {
      cursor: grabbing;
    }

    .addon-fields-bottom {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
      .addon-fields-top,
      .addon-fields-bottom {
        grid-template-columns: 1fr;
      }

      .addons-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .addon-row-actions {
        justify-content: flex-start;
      }

      .item-summary-details {
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }
    }
  `
];
n([
  d()
], a.prototype, "_name", 2);
n([
  d()
], a.prototype, "_sku", 2);
n([
  d()
], a.prototype, "_price", 2);
n([
  d()
], a.prototype, "_cost", 2);
n([
  d()
], a.prototype, "_quantity", 2);
n([
  d()
], a.prototype, "_selectedTaxGroupId", 2);
n([
  d()
], a.prototype, "_isPhysicalProduct", 2);
n([
  d()
], a.prototype, "_addons", 2);
n([
  d()
], a.prototype, "_errors", 2);
n([
  d()
], a.prototype, "_taxPreview", 2);
n([
  d()
], a.prototype, "_isLoadingTaxPreview", 2);
n([
  d()
], a.prototype, "_productAutocompleteResults", 2);
n([
  d()
], a.prototype, "_isSearchingProducts", 2);
n([
  d()
], a.prototype, "_showProductAutocomplete", 2);
n([
  d()
], a.prototype, "_autocompleteField", 2);
n([
  d()
], a.prototype, "_selectedAutocompleteProduct", 2);
n([
  d()
], a.prototype, "_step", 2);
n([
  d()
], a.prototype, "_warehouses", 2);
n([
  d()
], a.prototype, "_isLoadingWarehouses", 2);
n([
  d()
], a.prototype, "_selectedWarehouseId", 2);
n([
  d()
], a.prototype, "_shippingOptions", 2);
n([
  d()
], a.prototype, "_isLoadingShippingOptions", 2);
n([
  d()
], a.prototype, "_selectedShippingOptionId", 2);
n([
  d()
], a.prototype, "_shippingError", 2);
a = n([
  P("merchello-add-custom-item-modal")
], a);
const R = a;
export {
  a as MerchelloAddCustomItemModalElement,
  R as default
};
//# sourceMappingURL=add-custom-item-modal.element-kRWmQIOs.js.map
