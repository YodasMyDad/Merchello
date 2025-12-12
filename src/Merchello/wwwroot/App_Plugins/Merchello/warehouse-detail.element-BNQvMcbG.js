import { LitElement as D, html as s, nothing as c, css as x, state as p, customElement as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as O } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as k } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as w, UMB_MODAL_MANAGER_CONTEXT as T } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as R } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-BSrPLgGs.js";
import { M as A } from "./create-supplier-modal.token-D_m5XdXY.js";
import { f as M, i as E, j as y } from "./navigation-D1KCp5wk.js";
import { b as z } from "./badge.styles-C_lNgH9O.js";
const I = new w("Merchello.ServiceRegion.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), P = new w("Merchello.ShippingOption.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var L = Object.defineProperty, N = Object.getOwnPropertyDescriptor, $ = (e) => {
  throw TypeError(e);
}, u = (e, i, t, n) => {
  for (var d = n > 1 ? void 0 : n ? N(i, t) : i, b = e.length - 1, _; b >= 0; b--)
    (_ = e[b]) && (d = (n ? _(i, t, d) : _(d)) || d);
  return n && d && L(i, t, d), d;
}, C = (e, i, t) => i.has(e) || $("Cannot " + t), a = (e, i, t) => (C(e, i, "read from private field"), i.get(e)), v = (e, i, t) => i.has(e) ? $("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), f = (e, i, t, n) => (C(e, i, "write to private field"), i.set(e, t), t), l, g, h, o;
let r = class extends O(D) {
  constructor() {
    super(), this._warehouse = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, this._suppliers = [], this._countries = [], this._shippingOptions = [], this._isDeletingRegion = null, this._isDeletingOption = null, v(this, l), v(this, g), v(this, h), v(this, o, !1), this.consumeContext(k, (e) => {
      f(this, l, e), a(this, l) && this.observe(a(this, l).warehouse, (i) => {
        this._warehouse = i ?? null, i && (this._formData = { ...i }), this._isLoading = !i;
      });
    }), this.consumeContext(T, (e) => {
      f(this, g, e);
    }), this.consumeContext(R, (e) => {
      f(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), f(this, o, !0), this._createRoutes(), this._loadSuppliers(), this._loadCountries();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, o, !1);
  }
  // Tab routing
  _createRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/general", component: e },
      { path: "tab/regions", component: e },
      { path: "tab/options", component: e },
      { path: "", redirectTo: "tab/general" }
    ];
  }
  _getActiveTab() {
    return this._activePath.includes("tab/regions") ? "regions" : this._activePath.includes("tab/options") ? "options" : "general";
  }
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "", this._getActiveTab() === "options" && this._shippingOptions.length === 0 && this._loadShippingOptions();
  }
  async _loadSuppliers() {
    const { data: e } = await m.getSuppliers();
    a(this, o) && e && (this._suppliers = e);
  }
  async _loadCountries() {
    const { data: e } = await m.getLocalityCountries();
    a(this, o) && e && (this._countries = e);
  }
  async _loadShippingOptions() {
    if (!this._warehouse?.id) return;
    const { data: e } = await m.getShippingOptions();
    a(this, o) && e && (this._shippingOptions = e.filter((i) => i.warehouseId === this._warehouse?.id));
  }
  _handleInputChange(e, i) {
    this._formData = { ...this._formData, [e]: i };
  }
  _handleAddressChange(e, i) {
    this._formData = {
      ...this._formData,
      address: {
        ...this._formData.address,
        [e]: i
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
  _handleSupplierChange(e) {
    const t = e.target.value;
    t === "__create__" ? (this._openCreateSupplierModal(), this.requestUpdate()) : this._formData = { ...this._formData, supplierId: t || void 0 };
  }
  _handleCountryChange(e) {
    const i = e.target;
    this._handleAddressChange("countryCode", i.value);
  }
  async _openCreateSupplierModal() {
    if (!a(this, g)) return;
    const i = await a(this, g).open(this, A, {
      data: {}
    }).onSubmit().catch(() => {
    });
    a(this, o) && i?.supplier && (this._suppliers = [...this._suppliers, i.supplier], this._formData = { ...this._formData, supplierId: i.supplier.id });
  }
  async _handleSave() {
    this._isSaving = !0, this._errorMessage = null;
    const e = a(this, l)?.isNew ?? !0;
    try {
      if (e) {
        const { data: i, error: t } = await m.createWarehouse({
          name: this._formData.name || "",
          code: this._formData.code,
          supplierId: this._formData.supplierId,
          address: this._formData.address
        });
        if (!a(this, o)) return;
        if (t) {
          this._errorMessage = t.message, a(this, h)?.peek("danger", {
            data: { headline: "Failed to create", message: t.message || "Could not create warehouse" }
          });
          return;
        }
        i && (a(this, l)?.updateWarehouse(i), history.replaceState({}, "", M(i.id)), a(this, h)?.peek("positive", {
          data: { headline: "Warehouse created", message: "The warehouse has been created successfully" }
        }));
      } else {
        const { data: i, error: t } = await m.updateWarehouse(this._warehouse.id, {
          name: this._formData.name,
          code: this._formData.code,
          supplierId: this._formData.supplierId,
          clearSupplierId: !this._formData.supplierId && !!this._warehouse?.supplierId,
          address: this._formData.address
        });
        if (!a(this, o)) return;
        if (t) {
          this._errorMessage = t.message, a(this, h)?.peek("danger", {
            data: { headline: "Failed to save", message: t.message || "Could not save changes" }
          });
          return;
        }
        i && (a(this, l)?.updateWarehouse(i), a(this, h)?.peek("positive", {
          data: { headline: "Changes saved", message: "The warehouse has been updated successfully" }
        }));
      }
    } finally {
      a(this, o) && (this._isSaving = !1);
    }
  }
  async _handleDelete() {
    if (!this._warehouse?.id || !confirm(
      `Are you sure you want to delete warehouse "${this._warehouse.name || "Unnamed"}"? This action cannot be undone.`
    )) return;
    const { error: i } = await m.deleteWarehouse(this._warehouse.id);
    if (a(this, o)) {
      if (i) {
        this._errorMessage = `Failed to delete warehouse: ${i.message}`, a(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: i.message || "Could not delete warehouse" }
        });
        return;
      }
      a(this, h)?.peek("positive", {
        data: { headline: "Warehouse deleted", message: "The warehouse has been deleted successfully" }
      }), E();
    }
  }
  // Service Region handlers
  async _openServiceRegionModal(e) {
    if (!a(this, g) || !this._warehouse?.id) return;
    const t = await a(this, g).open(this, I, {
      data: {
        warehouseId: this._warehouse.id,
        region: e,
        existingRegions: this._warehouse.serviceRegions
      }
    }).onSubmit().catch(() => {
    });
    a(this, o) && t?.saved && a(this, l)?.reload();
  }
  async _handleDeleteRegion(e, i) {
    if (e.stopPropagation(), !this._warehouse?.id || !confirm("Are you sure you want to remove this service region?")) return;
    this._isDeletingRegion = i.id;
    const { error: n } = await m.deleteServiceRegion(this._warehouse.id, i.id);
    if (a(this, o)) {
      if (this._isDeletingRegion = null, n) {
        this._errorMessage = `Failed to delete region: ${n.message}`, a(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: n.message || "Could not delete region" }
        });
        return;
      }
      a(this, h)?.peek("positive", {
        data: { headline: "Region deleted", message: "The service region has been removed" }
      }), a(this, l)?.reload();
    }
  }
  // Shipping Option handlers
  async _openShippingOptionModal(e) {
    if (!a(this, g) || !this._warehouse?.id) return;
    const t = await a(this, g).open(this, P, {
      data: {
        optionId: e?.id,
        warehouseId: this._warehouse.id
      }
    }).onSubmit().catch(() => {
    });
    a(this, o) && t?.saved && (this._loadShippingOptions(), a(this, l)?.reload());
  }
  async _handleDeleteOption(e, i) {
    if (e.stopPropagation(), !confirm(`Are you sure you want to delete shipping option "${i.name}"?`)) return;
    this._isDeletingOption = i.id;
    const { error: n } = await m.deleteShippingOption(i.id);
    if (a(this, o)) {
      if (this._isDeletingOption = null, n) {
        this._errorMessage = `Failed to delete option: ${n.message}`, a(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: n.message || "Could not delete shipping option" }
        });
        return;
      }
      a(this, h)?.peek("positive", {
        data: { headline: "Option deleted", message: "The shipping option has been removed" }
      }), this._loadShippingOptions(), a(this, l)?.reload();
    }
  }
  // Validation helpers
  _isFieldEmpty(e) {
    return !e || e.trim() === "";
  }
  _getValidationClass(e, i) {
    return i && this._isFieldEmpty(e) ? "field-warning" : "";
  }
  // Render methods
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderGeneralTab() {
    return s`
      <div class="tab-content">
        <!-- Basic Info Section -->
        <uui-box headline="Basic Information">
          <div class="form-grid">
            <div class="form-field">
              <label>Code</label>
              <uui-input
                type="text"
                .value=${this._formData.code || ""}
                @input=${(e) => this._handleInputChange("code", e.target.value)}
                placeholder="MAIN-01"
                label="Warehouse code">
              </uui-input>
            </div>

            <div class="form-field">
              <label>Supplier</label>
              <uui-select
                label="Supplier"
                .options=${this._getSupplierOptions()}
                @change=${this._handleSupplierChange}>
              </uui-select>
            </div>
          </div>
        </uui-box>

        <!-- Address Section -->
        <uui-box headline="Shipping Origin Address">
          <p class="section-hint">This address is used as the origin for shipping calculations.</p>
          <div class="form-grid">
            <div class="form-field">
              <label>Contact Name</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.name || ""}
                @input=${(e) => this._handleAddressChange("name", e.target.value)}
                label="Contact name">
              </uui-input>
            </div>

            <div class="form-field">
              <label>Company</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.company || ""}
                @input=${(e) => this._handleAddressChange("company", e.target.value)}
                label="Company name">
              </uui-input>
            </div>

            <div class="form-field full-width ${this._getValidationClass(this._formData.address?.addressOne, !0)}">
              <label>Address Line 1 <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.address?.addressOne || ""}
                @input=${(e) => this._handleAddressChange("addressOne", e.target.value)}
                label="Address line 1">
              </uui-input>
            </div>

            <div class="form-field full-width">
              <label>Address Line 2</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.addressTwo || ""}
                @input=${(e) => this._handleAddressChange("addressTwo", e.target.value)}
                label="Address line 2">
              </uui-input>
            </div>

            <div class="form-field ${this._getValidationClass(this._formData.address?.townCity, !0)}">
              <label>Town/City <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.address?.townCity || ""}
                @input=${(e) => this._handleAddressChange("townCity", e.target.value)}
                label="Town or city">
              </uui-input>
            </div>

            <div class="form-field">
              <label>County/State</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.countyState || ""}
                @input=${(e) => this._handleAddressChange("countyState", e.target.value)}
                label="County or state">
              </uui-input>
            </div>

            <div class="form-field ${this._getValidationClass(this._formData.address?.postalCode, !0)}">
              <label>Postal Code <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.address?.postalCode || ""}
                @input=${(e) => this._handleAddressChange("postalCode", e.target.value)}
                label="Postal code">
              </uui-input>
            </div>

            <div class="form-field ${this._getValidationClass(this._formData.address?.countryCode, !0)}">
              <label>Country <span class="required">*</span></label>
              <uui-select
                label="Country"
                .options=${this._getCountryOptions()}
                @change=${this._handleCountryChange}>
              </uui-select>
            </div>

            <div class="form-field">
              <label>Email</label>
              <uui-input
                type="email"
                .value=${this._formData.address?.email || ""}
                @input=${(e) => this._handleAddressChange("email", e.target.value)}
                label="Email">
              </uui-input>
            </div>

            <div class="form-field">
              <label>Phone</label>
              <uui-input
                type="tel"
                .value=${this._formData.address?.phone || ""}
                @input=${(e) => this._handleAddressChange("phone", e.target.value)}
                label="Phone">
              </uui-input>
            </div>
          </div>
        </uui-box>

        ${this._renderValidationSummary()}
      </div>
    `;
  }
  _renderValidationSummary() {
    const e = [];
    return this._isFieldEmpty(this._formData.name) && e.push("Warehouse name is required"), this._isFieldEmpty(this._formData.address?.addressOne) && e.push("Address line 1 is required"), this._isFieldEmpty(this._formData.address?.townCity) && e.push("Town/City is required"), this._isFieldEmpty(this._formData.address?.postalCode) && e.push("Postal code is required"), this._isFieldEmpty(this._formData.address?.countryCode) && e.push("Country is required"), e.length === 0 ? c : s`
      <div class="validation-summary">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Please complete the following:</strong>
          <ul>
            ${e.map((i) => s`<li>${i}</li>`)}
          </ul>
        </div>
      </div>
    `;
  }
  _renderRegionsTab() {
    const e = this._warehouse?.serviceRegions ?? [], i = a(this, l)?.isNew ?? !0;
    return s`
      <div class="tab-content">
        ${i ? s`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding service regions.</span>
              </div>
            ` : c}

        ${!i && e.length === 0 ? s`
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
            ?disabled=${i}
            @click=${() => this._openServiceRegionModal()}>
            Add Region
          </uui-button>
        </div>

        ${e.length > 0 ? s`
              <div class="table-container">
                <uui-table class="data-table">
                  <uui-table-head>
                    <uui-table-head-cell>Region</uui-table-head-cell>
                    <uui-table-head-cell>Mode</uui-table-head-cell>
                    <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                  </uui-table-head>
                  ${e.map((t) => this._renderRegionRow(t))}
                </uui-table>
              </div>
            ` : i ? c : s`
                <div class="empty-state">
                  <uui-icon name="icon-globe"></uui-icon>
                  <p>No service regions configured</p>
                </div>
              `}
      </div>
    `;
  }
  _renderRegionRow(e) {
    const i = this._isDeletingRegion === e.id;
    return s`
      <uui-table-row class="${e.isExcluded ? "excluded-row" : ""}">
        <uui-table-cell>${e.regionDisplay || `${e.stateOrProvinceCode || ""} ${e.countryCode}`}</uui-table-cell>
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
            ?disabled=${i}
            @click=${(t) => this._handleDeleteRegion(t, e)}>
            <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderOptionsTab() {
    const e = a(this, l)?.isNew ?? !0, i = this._shippingOptions.some((t) => t.providerKey !== "flat-rate");
    return s`
      <div class="tab-content">
        ${e ? s`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding shipping options.</span>
              </div>
            ` : c}

        ${!e && this._shippingOptions.length === 0 ? s`
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
        ${!e && this._shippingOptions.length > 0 ? s`
              <p class="section-description">
                These shipping methods are available for products shipped from this warehouse.
                ${i ? "Live rate options fetch real-time prices from the carrier's API." : "Add more options or configure external providers for live rates."}
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

        ${this._shippingOptions.length > 0 ? s`
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
                  ${this._shippingOptions.map((t) => this._renderOptionRow(t))}
                </uui-table>
              </div>
            ` : e ? c : s`
                <div class="empty-state">
                  <uui-icon name="icon-truck"></uui-icon>
                  <p>No shipping options configured</p>
                </div>
              `}
      </div>
    `;
  }
  _renderOptionRow(e) {
    const i = this._isDeletingOption === e.id, t = e.providerKey !== "flat-rate", n = e.isNextDay ? "Next Day" : e.daysFrom === e.daysTo ? `${e.daysFrom} days` : `${e.daysFrom}-${e.daysTo} days`;
    let d;
    return t ? d = "Live Rates" : e.fixedCost != null ? d = `$${e.fixedCost.toFixed(2)}` : e.costCount > 0 ? d = `${e.costCount} location(s)` : d = "—", s`
      <uui-table-row class="clickable" @click=${() => this._openShippingOptionModal(e)}>
        <uui-table-cell>
          <span class="badge ${t ? "badge-live" : "badge-default"}">
            ${e.providerDisplayName || e.providerKey || "Flat Rate"}
          </span>
          ${e.serviceType ? s`<span class="service-type">${e.serviceType}</span>` : c}
        </uui-table-cell>
        <uui-table-cell>
          <span class="option-name">${e.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${n}</uui-table-cell>
        <uui-table-cell>${d}</uui-table-cell>
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
            ?disabled=${i}
            @click=${(b) => this._handleDeleteOption(b, e)}>
            <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
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
      default:
        return this._renderGeneralTab();
    }
  }
  render() {
    if (this._isLoading)
      return this._renderLoadingState();
    const e = a(this, l)?.isNew ?? !0;
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${y()} label="Back to Warehouses" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with warehouse info -->
        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            type="text"
            .value=${this._formData.name || ""}
            @input=${(i) => this._handleInputChange("name", i.target.value)}
            placeholder="Warehouse name"
            label="Warehouse name">
          </uui-input>
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          <!-- Error banner -->
          ${this._errorMessage ? s`
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
                Service Regions${(this._warehouse?.serviceRegions.length ?? 0) === 0 ? s`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : c}
                <span class="tab-count">(${this._warehouse?.serviceRegions.length ?? 0})</span>
              </span>
            </uui-tab>
            <uui-tab
              label="Shipping Options"
              href="${this._routerPath}/tab/options"
              ?active=${this._getActiveTab() === "options"}>
              <span class="tab-label">
                Shipping Options${(this._warehouse?.shippingOptionCount ?? 0) === 0 ? s`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : c}
                <span class="tab-count">(${this._warehouse?.shippingOptionCount ?? 0})</span>
              </span>
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
            <uui-breadcrumb-item href=${y()}>Warehouses</uui-breadcrumb-item>
            <uui-breadcrumb-item>${this._formData.name || "New Warehouse"}</uui-breadcrumb-item>
          </uui-breadcrumbs>

          ${e ? c : s`
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
l = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
r.styles = [
  z,
  x`
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

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--uui-size-space-4);
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .form-field.full-width {
        grid-column: 1 / -1;
      }

      .form-field label {
        font-weight: 500;
        font-size: 0.875rem;
      }

      .form-field .required {
        color: var(--uui-color-danger);
      }

      .form-field.field-warning uui-input,
      .form-field.field-warning uui-select {
        --uui-input-border-color: var(--uui-color-warning);
        background-color: color-mix(in srgb, var(--uui-color-warning) 10%, transparent);
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
        background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
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
        .form-grid {
          grid-template-columns: 1fr;
        }

        .header-content {
          flex-direction: column;
          align-items: flex-start;
        }

        .name-input {
          max-width: 100%;
          width: 100%;
        }

        .footer-left {
          display: none;
        }
      }
    `
];
u([
  p()
], r.prototype, "_warehouse", 2);
u([
  p()
], r.prototype, "_isLoading", 2);
u([
  p()
], r.prototype, "_isSaving", 2);
u([
  p()
], r.prototype, "_errorMessage", 2);
u([
  p()
], r.prototype, "_routes", 2);
u([
  p()
], r.prototype, "_routerPath", 2);
u([
  p()
], r.prototype, "_activePath", 2);
u([
  p()
], r.prototype, "_formData", 2);
u([
  p()
], r.prototype, "_suppliers", 2);
u([
  p()
], r.prototype, "_countries", 2);
u([
  p()
], r.prototype, "_shippingOptions", 2);
u([
  p()
], r.prototype, "_isDeletingRegion", 2);
u([
  p()
], r.prototype, "_isDeletingOption", 2);
r = u([
  S("merchello-warehouse-detail")
], r);
const j = r;
export {
  r as MerchelloWarehouseDetailElement,
  j as default
};
//# sourceMappingURL=warehouse-detail.element-BNQvMcbG.js.map
