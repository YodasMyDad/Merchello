import { LitElement as D, html as r, nothing as c, css as O, state as l, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as I } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as R } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as P, UMB_MODAL_MANAGER_CONTEXT as T, UMB_CONFIRM_MODAL as y } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as k } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-NdGX4WPd.js";
import { M as A } from "./supplier-modal.token-CWeQ_zlc.js";
import { M } from "./product-picker-modal.token-BfbHsSHl.js";
import { I as E, J as L, K as $ } from "./navigation-CvTcY6zJ.js";
import { b as F } from "./badge.styles-C7D4rnJo.js";
import { a as z } from "./formatting-DU6_gkL3.js";
import { b as W } from "./store-settings-DgxY_Kcz.js";
import "./product-table.element-CbT5QgDh.js";
import "./pagination.element-sDi4Myhy.js";
const N = new P("Merchello.ServiceRegion.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), U = new P("Merchello.ShippingOption.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var G = Object.defineProperty, H = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, u = (e, t, a, d) => {
  for (var s = d > 1 ? void 0 : d ? H(t, a) : t, b = e.length - 1, w; b >= 0; b--)
    (w = e[b]) && (s = (d ? w(t, a, s) : w(s)) || s);
  return d && s && G(t, a, s), s;
}, S = (e, t, a) => t.has(e) || C("Cannot " + a), i = (e, t, a) => (S(e, t, "read from private field"), t.get(e)), f = (e, t, a) => t.has(e) ? C("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), _ = (e, t, a, d) => (S(e, t, "write to private field"), t.set(e, a), a), v, p, m, h, n;
function B() {
  return {
    name: null,
    email: null,
    phone: null,
    company: null,
    addressOne: null,
    addressTwo: null,
    townCity: null,
    countyState: null,
    postalCode: null,
    country: null,
    countryCode: null
  };
}
let o = class extends I(D) {
  constructor() {
    super(), this._warehouse = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, this._suppliers = [], this._countries = [], this._shippingOptions = [], this._fulfilmentProviderOptions = [], this._isDeletingRegion = null, this._isDeletingOption = null, this._warehouseProducts = [], this._productsPage = 1, this._productsTotalPages = 0, this._productsTotalItems = 0, this._productsSearch = "", this._selectedProductIds = [], this._isLoadingProducts = !1, this._isRemovingProducts = !1, this._productsLoaded = !1, f(this, v, null), f(this, p), f(this, m), f(this, h), f(this, n, !1), this.consumeContext(R, (e) => {
      _(this, p, e), i(this, p) && this.observe(i(this, p).warehouse, (t) => {
        this._warehouse = t ?? null, t && (this._formData = { ...t }), this._isLoading = !t;
      }, "_warehouse");
    }), this.consumeContext(T, (e) => {
      _(this, m, e);
    }), this.consumeContext(k, (e) => {
      _(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), _(this, n, !0), this._createRoutes(), this._loadSuppliers(), this._loadCountries(), this._loadFulfilmentProviders();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, n, !1), i(this, v) && (clearTimeout(i(this, v)), _(this, v, null));
  }
  // Tab routing
  _createRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/general", component: e },
      { path: "tab/regions", component: e },
      { path: "tab/options", component: e },
      { path: "tab/products", component: e },
      { path: "", redirectTo: "tab/general" }
    ];
  }
  _getActiveTab() {
    return this._activePath.includes("tab/regions") ? "regions" : this._activePath.includes("tab/options") ? "options" : this._activePath.includes("tab/products") ? "products" : "general";
  }
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "", this._getActiveTab() === "options" && this._shippingOptions.length === 0 && this._loadShippingOptions(), this._getActiveTab() === "products" && !this._productsLoaded && this._loadWarehouseProducts();
  }
  async _loadSuppliers() {
    const { data: e } = await g.getSuppliers();
    i(this, n) && e && (this._suppliers = e);
  }
  async _loadCountries() {
    const { data: e } = await g.getLocalityCountries();
    i(this, n) && e && (this._countries = e);
  }
  async _loadFulfilmentProviders() {
    const { data: e } = await g.getFulfilmentProviderOptions();
    i(this, n) && e && (this._fulfilmentProviderOptions = e);
  }
  async _loadShippingOptions() {
    if (!this._warehouse?.id) return;
    const { data: e } = await g.getShippingOptions();
    i(this, n) && e && (this._shippingOptions = e.filter((t) => t.warehouseId === this._warehouse?.id));
  }
  _handleInputChange(e, t) {
    this._formData = { ...this._formData, [e]: t };
  }
  _handleAddressChange(e, t) {
    const a = this._formData.address ?? B();
    this._formData = {
      ...this._formData,
      address: {
        ...a,
        [e]: t
      }
    };
  }
  // uui-select options
  _getSupplierOptions() {
    return [
      { name: "None", value: "", selected: !this._formData.supplierId },
      ...this._suppliers.map((e) => ({
        name: e.name + (e.code ? ` (${e.code})` : ""),
        value: e.id,
        selected: e.id === this._formData.supplierId
      })),
      { name: "+ Create Supplier...", value: "__create__", selected: !1 }
    ];
  }
  _getCountryOptions() {
    return [
      { name: "Select country...", value: "", selected: !this._formData.address?.countryCode },
      ...this._countries.map((e) => ({
        name: e.name,
        value: e.code,
        selected: e.code === this._formData.address?.countryCode
      }))
    ];
  }
  _getFulfilmentProviderOptions() {
    return [
      { name: "None (use supplier default)", value: "", selected: !this._formData.fulfilmentProviderConfigurationId },
      ...this._fulfilmentProviderOptions.filter((e) => e.isEnabled).map((e) => ({
        name: e.displayName,
        value: e.configurationId,
        selected: e.configurationId === this._formData.fulfilmentProviderConfigurationId
      }))
    ];
  }
  _handleFulfilmentProviderChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, fulfilmentProviderConfigurationId: t.value || void 0 };
  }
  _handleSupplierChange(e) {
    const a = e.target.value;
    a === "__create__" ? (this._openCreateSupplierModal(), this.requestUpdate()) : this._formData = { ...this._formData, supplierId: a || void 0 };
  }
  _handleCountryChange(e) {
    const t = e.target;
    this._handleAddressChange("countryCode", t.value);
  }
  async _openCreateSupplierModal() {
    if (!i(this, m)) return;
    const t = await i(this, m).open(this, A, {
      data: {}
    }).onSubmit().catch(() => {
    });
    i(this, n) && t?.isCreated && t.supplier && (this._suppliers = [...this._suppliers, t.supplier], this._formData = { ...this._formData, supplierId: t.supplier.id });
  }
  async _handleSave() {
    this._isSaving = !0, this._errorMessage = null;
    const e = i(this, p)?.isNew ?? !0;
    try {
      if (e) {
        const { data: t, error: a } = await g.createWarehouse({
          name: this._formData.name || "",
          code: this._formData.code,
          supplierId: this._formData.supplierId,
          fulfilmentProviderConfigurationId: this._formData.fulfilmentProviderConfigurationId,
          address: this._formData.address
        });
        if (!i(this, n)) return;
        if (a) {
          this._errorMessage = a.message, i(this, h)?.peek("danger", {
            data: { headline: "Failed to create", message: a.message || "Could not create warehouse" }
          });
          return;
        }
        t && (i(this, p)?.updateWarehouse(t), E(t.id), i(this, h)?.peek("positive", {
          data: { headline: "Warehouse created", message: "The warehouse has been created successfully" }
        }));
      } else {
        const { data: t, error: a } = await g.updateWarehouse(this._warehouse.id, {
          name: this._formData.name,
          code: this._formData.code,
          supplierId: this._formData.supplierId,
          shouldClearSupplierId: !this._formData.supplierId && !!this._warehouse?.supplierId,
          fulfilmentProviderConfigurationId: this._formData.fulfilmentProviderConfigurationId,
          shouldClearFulfilmentProviderId: !this._formData.fulfilmentProviderConfigurationId && !!this._warehouse?.fulfilmentProviderConfigurationId,
          address: this._formData.address
        });
        if (!i(this, n)) return;
        if (a) {
          this._errorMessage = a.message, i(this, h)?.peek("danger", {
            data: { headline: "Failed to save", message: a.message || "Could not save changes" }
          });
          return;
        }
        t && (i(this, p)?.updateWarehouse(t), i(this, h)?.peek("positive", {
          data: { headline: "Changes saved", message: "The warehouse has been updated successfully" }
        }));
      }
    } finally {
      i(this, n) && (this._isSaving = !1);
    }
  }
  async _handleDelete() {
    if (!this._warehouse?.id) return;
    const e = i(this, m)?.open(this, y, {
      data: {
        headline: "Delete Warehouse",
        content: `Delete warehouse "${this._warehouse.name || "Unnamed"}". This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await e?.onSubmit();
    } catch {
      return;
    }
    if (!i(this, n)) return;
    const { error: t } = await g.deleteWarehouse(this._warehouse.id);
    if (i(this, n)) {
      if (t) {
        this._errorMessage = `Failed to delete warehouse: ${t.message}`, i(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: t.message || "Could not delete warehouse" }
        });
        return;
      }
      i(this, h)?.peek("positive", {
        data: { headline: "Warehouse deleted", message: "The warehouse has been deleted successfully" }
      }), L();
    }
  }
  // Service Region handlers
  async _openServiceRegionModal(e) {
    if (!i(this, m) || !this._warehouse?.id) return;
    const a = await i(this, m).open(this, N, {
      data: {
        warehouseId: this._warehouse.id,
        region: e,
        existingRegions: this._warehouse.serviceRegions
      }
    }).onSubmit().catch(() => {
    });
    i(this, n) && a?.isSaved && i(this, p)?.reload();
  }
  async _handleDeleteRegion(e, t) {
    if (e.stopPropagation(), !this._warehouse?.id) return;
    const a = t.regionDisplay || `${t.regionCode || ""} ${t.countryCode}`.trim(), d = i(this, m)?.open(this, y, {
      data: {
        headline: "Remove Service Region",
        content: `Remove service region "${a}" from this warehouse.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    });
    try {
      await d?.onSubmit();
    } catch {
      return;
    }
    if (!i(this, n)) return;
    this._isDeletingRegion = t.id;
    const { error: s } = await g.deleteServiceRegion(this._warehouse.id, t.id);
    if (i(this, n)) {
      if (this._isDeletingRegion = null, s) {
        this._errorMessage = `Failed to delete region: ${s.message}`, i(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: s.message || "Could not delete region" }
        });
        return;
      }
      i(this, h)?.peek("positive", {
        data: { headline: "Region deleted", message: "The service region has been removed" }
      }), i(this, p)?.reload();
    }
  }
  // Shipping Option handlers
  async _openShippingOptionModal(e) {
    if (!i(this, m) || !this._warehouse?.id) return;
    const a = await i(this, m).open(this, U, {
      data: {
        optionId: e?.id,
        warehouseId: this._warehouse.id
      }
    }).onSubmit().catch(() => {
    });
    i(this, n) && a?.isSaved && (this._loadShippingOptions(), i(this, p)?.reload());
  }
  async _handleDeleteOption(e, t) {
    e.stopPropagation();
    const a = i(this, m)?.open(this, y, {
      data: {
        headline: "Delete Shipping Option",
        content: `Delete shipping option "${t.name}". This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await a?.onSubmit();
    } catch {
      return;
    }
    if (!i(this, n)) return;
    this._isDeletingOption = t.id;
    const { error: d } = await g.deleteShippingOption(t.id);
    if (i(this, n)) {
      if (this._isDeletingOption = null, d) {
        this._errorMessage = `Failed to delete option: ${d.message}`, i(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: d.message || "Could not delete shipping option" }
        });
        return;
      }
      i(this, h)?.peek("positive", {
        data: { headline: "Option deleted", message: "The shipping option has been removed" }
      }), this._loadShippingOptions(), i(this, p)?.reload();
    }
  }
  // Products tab handlers
  async _loadWarehouseProducts() {
    if (!this._warehouse?.id) return;
    this._isLoadingProducts = !0;
    const { data: e, error: t } = await g.getWarehouseProducts(
      this._warehouse.id,
      this._productsPage,
      20,
      this._productsSearch || void 0
    );
    if (i(this, n)) {
      if (this._isLoadingProducts = !1, this._productsLoaded = !0, t) {
        i(this, h)?.peek("danger", {
          data: { headline: "Failed to load products", message: t.message }
        });
        return;
      }
      e && (this._warehouseProducts = e.items, this._productsTotalPages = e.totalPages, this._productsTotalItems = e.totalItems);
    }
  }
  _handleProductsSearchInput(e) {
    const t = e.target.value;
    i(this, v) && clearTimeout(i(this, v)), _(this, v, setTimeout(() => {
      this._productsSearch = t, this._productsPage = 1, this._loadWarehouseProducts();
    }, 300));
  }
  _handleProductsPageChange(e) {
    this._productsPage = e.detail.page, this._loadWarehouseProducts();
  }
  _handleProductSelectionChange(e) {
    this._selectedProductIds = e.detail.selectedIds;
  }
  async _handleAddProducts() {
    if (!i(this, m) || !this._warehouse?.id) return;
    const e = this._warehouseProducts.map((d) => d.productRootId), a = await i(this, m).open(this, M, {
      data: {
        config: {
          currencySymbol: W(),
          propertyEditorMode: !0,
          showAddons: !1,
          selectRoots: !0,
          // Select product roots directly, not variants
          excludeProductIds: e
        }
      }
    }).onSubmit().catch(() => {
    });
    if (i(this, n) && a?.selections?.length) {
      const d = [...new Set(a.selections.map((b) => b.productRootId))], { error: s } = await g.addProductsToWarehouse(this._warehouse.id, d);
      if (!i(this, n)) return;
      if (s) {
        i(this, h)?.peek("danger", {
          data: { headline: "Failed to add products", message: s.message }
        });
        return;
      }
      i(this, h)?.peek("positive", {
        data: { headline: "Products added", message: `${d.length} product(s) added to warehouse` }
      }), this._selectedProductIds = [], this._loadWarehouseProducts();
    }
  }
  async _handleRemoveSelectedProducts() {
    if (!this._warehouse?.id || this._selectedProductIds.length === 0) return;
    const e = i(this, m)?.open(this, y, {
      data: {
        headline: "Remove Products",
        content: `Remove ${this._selectedProductIds.length} product(s) from this warehouse. Stock records for these products at this warehouse will also be removed.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    });
    try {
      await e?.onSubmit();
    } catch {
      return;
    }
    if (!i(this, n)) return;
    this._isRemovingProducts = !0;
    const { error: t } = await g.removeProductsFromWarehouse(
      this._warehouse.id,
      this._selectedProductIds
    );
    if (i(this, n)) {
      if (this._isRemovingProducts = !1, t) {
        i(this, h)?.peek("danger", {
          data: { headline: "Failed to remove products", message: t.message }
        });
        return;
      }
      i(this, h)?.peek("positive", {
        data: { headline: "Products removed", message: `${this._selectedProductIds.length} product(s) removed from warehouse` }
      }), this._selectedProductIds = [], this._loadWarehouseProducts();
    }
  }
  _mapToProductTableFormat() {
    return this._warehouseProducts;
  }
  // Validation helpers
  _isFieldEmpty(e) {
    return !e || e.trim() === "";
  }
  // Render methods
  _renderLoadingState() {
    return r`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderGeneralTab() {
    const e = this._isFieldEmpty(this._formData.address?.addressOne), t = this._isFieldEmpty(this._formData.address?.townCity), a = this._isFieldEmpty(this._formData.address?.postalCode), d = this._isFieldEmpty(this._formData.address?.countryCode);
    return r`
      <div class="tab-content">
        <!-- Basic Info Section -->
        <uui-box headline="Basic Information">
          <div class="property-grid">
            <div class="property-grid-item">
              <umb-property-layout
                label="Code"
                description="Optional internal code for warehouse operations."
                orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  maxlength="100"
                  .value=${this._formData.code || ""}
                  @input=${(s) => this._handleInputChange("code", s.target.value)}
                  placeholder="MAIN-01"
                  label="Warehouse code">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout
                label="Supplier"
                description="Optional supplier linked to this warehouse."
                orientation="vertical">
                <uui-select
                  slot="editor"
                  label="Supplier"
                  .options=${this._getSupplierOptions()}
                  @change=${this._handleSupplierChange}>
                </uui-select>
              </umb-property-layout>
            </div>

            <div class="property-grid-item full-width">
              <umb-property-layout
                label="Fulfilment Provider Override"
                description="Optional override of the supplier default fulfilment provider."
                orientation="vertical">
                <uui-select
                  slot="editor"
                  label="Fulfilment provider"
                  .options=${this._getFulfilmentProviderOptions()}
                  @change=${this._handleFulfilmentProviderChange}>
                </uui-select>
              </umb-property-layout>
            </div>
          </div>
        </uui-box>

        <!-- Address Section -->
        <uui-box headline="Shipping Origin Address">
          <p class="section-hint">This address is used as the origin for shipping calculations.</p>
          <div class="property-grid">
            <div class="property-grid-item">
              <umb-property-layout label="Contact Name" orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  .value=${this._formData.address?.name || ""}
                  @input=${(s) => this._handleAddressChange("name", s.target.value)}
                  label="Contact name">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout label="Company" orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  .value=${this._formData.address?.company || ""}
                  @input=${(s) => this._handleAddressChange("company", s.target.value)}
                  label="Company name">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item full-width">
              <umb-property-layout
                label="Address Line 1"
                ?mandatory=${!0}
                ?invalid=${e}
                orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  .value=${this._formData.address?.addressOne || ""}
                  @input=${(s) => this._handleAddressChange("addressOne", s.target.value)}
                  label="Address line 1">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item full-width">
              <umb-property-layout label="Address Line 2" orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  .value=${this._formData.address?.addressTwo || ""}
                  @input=${(s) => this._handleAddressChange("addressTwo", s.target.value)}
                  label="Address line 2">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout
                label="Town/City"
                ?mandatory=${!0}
                ?invalid=${t}
                orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  .value=${this._formData.address?.townCity || ""}
                  @input=${(s) => this._handleAddressChange("townCity", s.target.value)}
                  label="Town or city">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout label="County/State" orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  .value=${this._formData.address?.countyState || ""}
                  @input=${(s) => this._handleAddressChange("countyState", s.target.value)}
                  label="County or state">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout
                label="Postal Code"
                ?mandatory=${!0}
                ?invalid=${a}
                orientation="vertical">
                <uui-input
                  slot="editor"
                  type="text"
                  .value=${this._formData.address?.postalCode || ""}
                  @input=${(s) => this._handleAddressChange("postalCode", s.target.value)}
                  label="Postal code">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout
                label="Country"
                ?mandatory=${!0}
                ?invalid=${d}
                orientation="vertical">
                <uui-select
                  slot="editor"
                  label="Country"
                  .options=${this._getCountryOptions()}
                  @change=${this._handleCountryChange}>
                </uui-select>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout label="Email" orientation="vertical">
                <uui-input
                  slot="editor"
                  type="email"
                  .value=${this._formData.address?.email || ""}
                  @input=${(s) => this._handleAddressChange("email", s.target.value)}
                  label="Email">
                </uui-input>
              </umb-property-layout>
            </div>

            <div class="property-grid-item">
              <umb-property-layout label="Phone" orientation="vertical">
                <uui-input
                  slot="editor"
                  type="tel"
                  .value=${this._formData.address?.phone || ""}
                  @input=${(s) => this._handleAddressChange("phone", s.target.value)}
                  label="Phone">
                </uui-input>
              </umb-property-layout>
            </div>
          </div>
        </uui-box>

        ${this._renderValidationSummary()}
      </div>
    `;
  }
  _renderValidationSummary() {
    const e = [];
    return this._isFieldEmpty(this._formData.name) && e.push("Warehouse name is required"), this._isFieldEmpty(this._formData.address?.addressOne) && e.push("Address line 1 is required"), this._isFieldEmpty(this._formData.address?.townCity) && e.push("Town/City is required"), this._isFieldEmpty(this._formData.address?.postalCode) && e.push("Postal code is required"), this._isFieldEmpty(this._formData.address?.countryCode) && e.push("Country is required"), e.length === 0 ? c : r`
      <div class="validation-summary">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Please complete the following:</strong>
          <ul>
            ${e.map((t) => r`<li>${t}</li>`)}
          </ul>
        </div>
      </div>
    `;
  }
  _renderRegionsTab() {
    const e = this._warehouse?.serviceRegions ?? [], t = i(this, p)?.isNew ?? !0;
    return r`
      <div class="tab-content">
        ${t ? r`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding service regions.</span>
              </div>
            ` : c}

        ${!t && e.length === 0 ? r`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>This warehouse has no service regions and won't ship anywhere. Add regions to define where this warehouse can fulfill orders.</span>
              </div>
            ` : c}

        <div class="section-header">
          <h3>Service Regions</h3>
          <uui-button
            look="primary"
            color="positive"
            label="Add Region"
            ?disabled=${t}
            @click=${() => this._openServiceRegionModal()}>
            Add Region
          </uui-button>
        </div>

        ${e.length > 0 ? r`
              <div class="table-container">
                <uui-table class="data-table">
                  <uui-table-head>
                    <uui-table-head-cell>Region</uui-table-head-cell>
                    <uui-table-head-cell>Mode</uui-table-head-cell>
                    <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                  </uui-table-head>
                  ${e.map((a) => this._renderRegionRow(a))}
                </uui-table>
              </div>
            ` : t ? c : r`
                <div class="empty-state">
                  <uui-icon name="icon-globe"></uui-icon>
                  <p>No service regions configured</p>
                </div>
              `}
      </div>
    `;
  }
  _renderRegionRow(e) {
    const t = this._isDeletingRegion === e.id;
    return r`
      <uui-table-row class="${e.isExcluded ? "excluded-row" : ""}">
        <uui-table-cell>${e.regionDisplay || `${e.regionCode || ""} ${e.countryCode}`}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${e.isExcluded ? "badge-danger" : "badge-positive"}">
            ${e.isExcluded ? "Exclude" : "Include"}
          </span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            look="secondary"
            compact
            label="Edit"
            @click=${() => this._openServiceRegionModal(e)}>
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-button
            look="primary"
            color="danger"
            compact
            label="Delete"
            ?disabled=${t}
            @click=${(a) => this._handleDeleteRegion(a, e)}>
            <uui-icon name="${t ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderOptionsTab() {
    const e = i(this, p)?.isNew ?? !0, t = this._shippingOptions.some((a) => a.usesLiveRates);
    return r`
      <div class="tab-content">
        ${e ? r`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding shipping options.</span>
              </div>
            ` : c}

        ${!e && this._shippingOptions.length === 0 ? r`
              <div class="info-banner info">
                <uui-icon name="icon-info"></uui-icon>
                <div>
                  <strong>Configure Shipping Methods</strong>
                  <p>Add shipping options to enable delivery for products from this warehouse. You can:</p>
                  <ul>
                    <li><strong>Flat Rate</strong> - Set manual prices per destination</li>
                    <li><strong>FedEx/UPS</strong> - Get live rates from carrier APIs (requires provider setup in Settings)</li>
                  </ul>
                </div>
              </div>
            ` : c}

        <!-- Help text for existing options -->
        ${!e && this._shippingOptions.length > 0 ? r`
              <p class="section-description">
                These shipping methods are available for products shipped from this warehouse.
                ${t ? "Live rate options fetch real-time prices from the carrier's API." : "Add more options or configure external providers for live rates."}
              </p>
            ` : c}

        <div class="section-header">
          <h3>Shipping Options</h3>
          <uui-button
            look="primary"
            color="positive"
            label="Add Shipping Option"
            ?disabled=${e}
            @click=${() => this._openShippingOptionModal()}>
            Add Shipping Option
          </uui-button>
        </div>

        ${this._shippingOptions.length > 0 ? r`
              <div class="table-container">
                <uui-table class="data-table">
                  <uui-table-head>
                    <uui-table-head-cell>Provider</uui-table-head-cell>
                    <uui-table-head-cell>Name</uui-table-head-cell>
                    <uui-table-head-cell>Delivery Time</uui-table-head-cell>
                    <uui-table-head-cell>Cost</uui-table-head-cell>
                    <uui-table-head-cell>Status</uui-table-head-cell>
                    <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                  </uui-table-head>
                  ${this._shippingOptions.map((a) => this._renderOptionRow(a))}
                </uui-table>
              </div>
            ` : e ? c : r`
                <div class="empty-state">
                  <uui-icon name="icon-truck"></uui-icon>
                  <p>No shipping options configured</p>
                </div>
              `}
      </div>
    `;
  }
  _renderOptionRow(e) {
    const t = this._isDeletingOption === e.id, a = e.usesLiveRates, d = e.isNextDay ? "Next Day" : e.daysFrom === e.daysTo ? `${e.daysFrom} days` : `${e.daysFrom}-${e.daysTo} days`;
    let s;
    return a ? s = "Live Rates" : e.fixedCost != null ? s = z(e.fixedCost) : e.costCount > 0 ? s = `${e.costCount} location(s)` : s = "-", r`
      <uui-table-row class="clickable" @click=${() => this._openShippingOptionModal(e)}>
        <uui-table-cell>
          <span class="badge ${a ? "badge-live" : "badge-default"}">
            ${e.providerDisplayName || e.providerKey || "Flat Rate"}
          </span>
          ${e.serviceType ? r`<span class="service-type">${e.serviceType}</span>` : c}
        </uui-table-cell>
        <uui-table-cell>
          <span class="option-name">${e.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${d}</uui-table-cell>
        <uui-table-cell>${s}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${e.isEnabled ? "badge-positive" : "badge-default"}">
            ${e.isEnabled ? "Enabled" : "Disabled"}
          </span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell" @click=${(b) => b.stopPropagation()}>
          <uui-button
            look="secondary"
            compact
            label="Edit"
            @click=${() => this._openShippingOptionModal(e)}>
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-button
            look="primary"
            color="danger"
            compact
            label="Delete"
            ?disabled=${t}
            @click=${(b) => this._handleDeleteOption(b, e)}>
            <uui-icon name="${t ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderProductsTab() {
    const e = i(this, p)?.isNew ?? !0, t = this._mapToProductTableFormat(), a = this._selectedProductIds.length > 0;
    return r`
      <div class="tab-content">
        ${e ? r`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding products.</span>
              </div>
            ` : c}

        <div class="section-header">
          <h3>Products (${this._productsTotalItems})</h3>
          <div class="header-actions">
            ${a ? r`
                  <uui-button
                    look="primary"
                    color="danger"
                    label="Remove Selected"
                    ?disabled=${e || this._isRemovingProducts}
                    @click=${this._handleRemoveSelectedProducts}>
                    ${this._isRemovingProducts ? "Removing..." : `Remove (${this._selectedProductIds.length})`}
                  </uui-button>
                ` : c}
            <uui-button
              look="primary"
              color="positive"
              label="Add Products"
              ?disabled=${e}
              @click=${this._handleAddProducts}>
              Add Products
            </uui-button>
          </div>
        </div>

        ${e ? c : r`
              <div class="search-bar">
                <uui-input
                  type="search"
                  placeholder="Search products..."
                  .value=${this._productsSearch}
                  @input=${this._handleProductsSearchInput}
                  label="Search products">
                  <uui-icon name="icon-search" slot="prepend"></uui-icon>
                </uui-input>
              </div>
            `}

        ${this._isLoadingProducts ? r`<div class="loading"><uui-loader></uui-loader></div>` : t.length > 0 ? r`
                <merchello-product-table
                  .products=${t}
                  .columns=${["rootName", "sku", "price", "variants"]}
                  .selectable=${!0}
                  .selectedIds=${this._selectedProductIds}
                  .clickable=${!0}
                  @selection-change=${this._handleProductSelectionChange}>
                </merchello-product-table>

                ${this._productsTotalPages > 1 ? r`
                      <merchello-pagination
                        .currentPage=${this._productsPage}
                        .totalPages=${this._productsTotalPages}
                        @page-change=${this._handleProductsPageChange}>
                      </merchello-pagination>
                    ` : c}
              ` : e ? c : r`
                  <div class="empty-state">
                    <uui-icon name="icon-product"></uui-icon>
                    <p>No products assigned to this warehouse</p>
                    <uui-button
                      look="primary"
                      label="Add Products"
                      @click=${this._handleAddProducts}>
                      Add Products
                    </uui-button>
                  </div>
                `}
      </div>
    `;
  }
  _renderTabContent() {
    switch (this._getActiveTab()) {
      case "general":
        return this._renderGeneralTab();
      case "regions":
        return this._renderRegionsTab();
      case "options":
        return this._renderOptionsTab();
      case "products":
        return this._renderProductsTab();
      default:
        return this._renderGeneralTab();
    }
  }
  render() {
    if (this._isLoading)
      return this._renderLoadingState();
    const e = i(this, p)?.isNew ?? !0;
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${$()} label="Back to Warehouses" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with warehouse info -->
        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            type="text"
            maxlength="250"
            .value=${this._formData.name || ""}
            @input=${(t) => this._handleInputChange("name", t.target.value)}
            placeholder="Warehouse name"
            label="Warehouse name">
          </uui-input>
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          <!-- Error banner -->
          ${this._errorMessage ? r`
                <div class="error-banner" slot="header">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : c}

          <!-- Tabs in header slot -->
          <uui-tab-group slot="header">
            <uui-tab
              label="General"
              href="${this._routerPath}/tab/general"
              ?active=${this._getActiveTab() === "general"}>
              General
            </uui-tab>
            <uui-tab
              label="Service Regions"
              href="${this._routerPath}/tab/regions"
              ?active=${this._getActiveTab() === "regions"}>
              <span class="tab-label">
                Service Regions${(this._warehouse?.serviceRegions.length ?? 0) === 0 ? r`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : c}
                <span class="tab-count">(${this._warehouse?.serviceRegions.length ?? 0})</span>
              </span>
            </uui-tab>
            <uui-tab
              label="Shipping Options"
              href="${this._routerPath}/tab/options"
              ?active=${this._getActiveTab() === "options"}>
              <span class="tab-label">
                Shipping Options${(this._warehouse?.shippingOptionCount ?? 0) === 0 ? r`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : c}
                <span class="tab-count">(${this._warehouse?.shippingOptionCount ?? 0})</span>
              </span>
            </uui-tab>
            <uui-tab
              label="Products"
              href="${this._routerPath}/tab/products"
              ?active=${this._getActiveTab() === "products"}>
              Products
            </uui-tab>
          </uui-tab-group>

          <!-- Hidden router slot for URL tracking -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <!-- Tab content -->
          <div class="tab-content">
            ${this._renderTabContent()}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          <uui-breadcrumbs>
            <uui-breadcrumb-item href=${$()}>Warehouses</uui-breadcrumb-item>
            <uui-breadcrumb-item>${this._formData.name || "New Warehouse"}</uui-breadcrumb-item>
          </uui-breadcrumbs>

          ${e ? c : r`
                <uui-button
                  slot="actions"
                  look="secondary"
                  color="danger"
                  label="Delete"
                  @click=${this._handleDelete}>
                  Delete
                </uui-button>
              `}
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label="Save"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
o.styles = [
  F,
  O`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      /* Header styling */
      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      #header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex: 1;
        padding: var(--uui-size-space-4) 0;
      }

      #header umb-icon {
        font-size: 24px;
        color: var(--uui-color-text-alt);
      }

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      /* Error banner */
      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin: var(--uui-size-space-3);
      }

      /* Tab styling */
      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      umb-router-slot {
        display: none;
      }

      /* Breadcrumbs */
      uui-breadcrumbs {
        font-size: 0.875rem;
      }

      .tab-label {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        white-space: nowrap;
      }

      .tab-warning {
        color: var(--uui-color-warning);
      }

      .tab-count {
        color: var(--uui-color-text-alt);
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      uui-box {
        margin-bottom: var(--uui-size-space-4);
      }

      .section-hint {
        margin: 0 0 var(--uui-size-space-4) 0;
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .property-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--uui-size-space-4);
      }

      .property-grid-item {
        min-width: 0;
      }

      .property-grid-item.full-width {
        grid-column: 1 / -1;
      }

      .property-grid-item umb-property-layout {
        padding: 0;
      }

      .property-grid-item uui-input,
      .property-grid-item uui-select {
        width: 100%;
      }

      .validation-summary {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
        border-radius: var(--uui-border-radius);
      }

      .validation-summary uui-icon {
        flex-shrink: 0;
      }

      .validation-summary ul {
        margin: var(--uui-size-space-2) 0 0;
        padding-left: var(--uui-size-space-4);
      }

      .validation-summary li {
        font-size: 0.875rem;
      }

      .info-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: flex-start;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        font-size: 0.875rem;
      }

      .info-banner.warning {
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
        border-color: var(--uui-color-warning);
      }

      .info-banner.info {
        background: linear-gradient(
          135deg,
          var(--uui-color-surface-alt) 0%,
          var(--uui-color-surface) 100%
        );
        border-left: 4px solid var(--uui-color-interactive);
      }

      .info-banner.info strong {
        display: block;
        margin-bottom: var(--uui-size-space-2);
        color: var(--uui-color-text);
      }

      .info-banner.info p {
        margin: 0 0 var(--uui-size-space-2);
        color: var(--uui-color-text-alt);
      }

      .info-banner.info ul {
        margin: 0;
        padding-left: var(--uui-size-space-4);
      }

      .info-banner.info li {
        margin-bottom: var(--uui-size-space-1);
      }

      .section-description {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0 0 var(--uui-size-space-4);
      }

      .badge-live {
        background: var(--uui-color-positive-standalone);
        color: white;
      }

      .badge-default {
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        color: var(--uui-color-text);
      }

      .service-type {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
        display: block;
        margin-top: var(--uui-size-space-1);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .section-header h3 {
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: var(--uui-size-space-2);
        align-items: center;
      }

      .search-bar {
        margin-bottom: var(--uui-size-space-4);
      }

      .search-bar uui-input {
        width: min(100%, 360px);
      }

      .search-bar uui-icon[slot="prepend"] {
        margin-left: 2px;
      }

      .table-container {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .data-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      uui-table-row.excluded-row {
        background: rgba(var(--uui-color-danger-rgb, 220, 53, 69), 0.05);
      }

      .option-name {
        font-weight: 500;
      }

      .actions-header {
        width: 120px;
        text-align: right;
      }

      .actions-cell {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-4);
        text-align: center;
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 3rem;
        margin-bottom: var(--uui-size-space-4);
        opacity: 0.5;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      @media (max-width: 768px) {
        .property-grid {
          grid-template-columns: 1fr;
        }

        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--uui-size-space-2);
        }

        .search-bar uui-input {
          width: 100%;
        }
      }
    `
];
u([
  l()
], o.prototype, "_warehouse", 2);
u([
  l()
], o.prototype, "_isLoading", 2);
u([
  l()
], o.prototype, "_isSaving", 2);
u([
  l()
], o.prototype, "_errorMessage", 2);
u([
  l()
], o.prototype, "_routes", 2);
u([
  l()
], o.prototype, "_routerPath", 2);
u([
  l()
], o.prototype, "_activePath", 2);
u([
  l()
], o.prototype, "_formData", 2);
u([
  l()
], o.prototype, "_suppliers", 2);
u([
  l()
], o.prototype, "_countries", 2);
u([
  l()
], o.prototype, "_shippingOptions", 2);
u([
  l()
], o.prototype, "_fulfilmentProviderOptions", 2);
u([
  l()
], o.prototype, "_isDeletingRegion", 2);
u([
  l()
], o.prototype, "_isDeletingOption", 2);
u([
  l()
], o.prototype, "_warehouseProducts", 2);
u([
  l()
], o.prototype, "_productsPage", 2);
u([
  l()
], o.prototype, "_productsTotalPages", 2);
u([
  l()
], o.prototype, "_productsTotalItems", 2);
u([
  l()
], o.prototype, "_productsSearch", 2);
u([
  l()
], o.prototype, "_selectedProductIds", 2);
u([
  l()
], o.prototype, "_isLoadingProducts", 2);
u([
  l()
], o.prototype, "_isRemovingProducts", 2);
u([
  l()
], o.prototype, "_productsLoaded", 2);
o = u([
  x("merchello-warehouse-detail")
], o);
const re = o;
export {
  o as MerchelloWarehouseDetailElement,
  re as default
};
//# sourceMappingURL=warehouse-detail.element-wPEM3J7P.js.map
