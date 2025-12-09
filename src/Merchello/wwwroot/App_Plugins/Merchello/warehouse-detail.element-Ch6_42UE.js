import { LitElement as w, html as t, nothing as u, css as $, state as c, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as D } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as S } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as v, UMB_MODAL_MANAGER_CONTEXT as x } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-C2InYbkz.js";
import { M as O } from "./create-supplier-modal.token-D_m5XdXY.js";
import { e as k, h as T, i as M } from "./navigation-Cp3wi1pC.js";
import { b as A } from "./badge.styles-C_lNgH9O.js";
const R = new v("Merchello.ServiceRegion.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), E = new v("Merchello.ShippingOption.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var z = Object.defineProperty, I = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, d = (e, i, a, n) => {
  for (var l = n > 1 ? void 0 : n ? I(i, a) : i, g = e.length - 1, m; g >= 0; g--)
    (m = e[g]) && (l = (n ? m(i, a, l) : m(l)) || l);
  return n && l && z(i, a, l), l;
}, y = (e, i, a) => i.has(e) || _("Cannot " + a), s = (e, i, a) => (y(e, i, "read from private field"), i.get(e)), f = (e, i, a) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), b = (e, i, a, n) => (y(e, i, "write to private field"), i.set(e, a), a), r, p;
let o = class extends D(w) {
  constructor() {
    super(), this._warehouse = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._activeTab = "general", this._formData = {}, this._suppliers = [], this._countries = [], this._shippingOptions = [], this._isDeletingRegion = null, this._isDeletingOption = null, f(this, r), f(this, p), this.consumeContext(S, (e) => {
      b(this, r, e), s(this, r) && this.observe(s(this, r).warehouse, (i) => {
        this._warehouse = i ?? null, i && (this._formData = { ...i }), this._isLoading = !i;
      });
    }), this.consumeContext(x, (e) => {
      b(this, p, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadSuppliers(), this._loadCountries();
  }
  async _loadSuppliers() {
    const { data: e } = await h.getSuppliers();
    e && (this._suppliers = e);
  }
  async _loadCountries() {
    const { data: e } = await h.getLocalityCountries();
    e && (this._countries = e);
  }
  async _loadShippingOptions() {
    if (!this._warehouse?.id) return;
    const { data: e } = await h.getShippingOptions();
    e && (this._shippingOptions = e.filter((i) => i.warehouseId === this._warehouse?.id));
  }
  _handleTabClick(e) {
    this._activeTab = e, e === "options" && this._shippingOptions.length === 0 && this._loadShippingOptions();
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
    const a = e.target.value;
    a === "__create__" ? (this._openCreateSupplierModal(), this.requestUpdate()) : this._formData = { ...this._formData, supplierId: a || void 0 };
  }
  _handleCountryChange(e) {
    const i = e.target;
    this._handleAddressChange("countryCode", i.value);
  }
  async _openCreateSupplierModal() {
    if (!s(this, p)) return;
    const i = await s(this, p).open(this, O, {
      data: {}
    }).onSubmit().catch(() => {
    });
    i?.supplier && (this._suppliers = [...this._suppliers, i.supplier], this._formData = { ...this._formData, supplierId: i.supplier.id });
  }
  async _handleSave() {
    if (this._isSaving = !0, this._errorMessage = null, s(this, r)?.isNew ?? !0) {
      const { data: i, error: a } = await h.createWarehouse({
        name: this._formData.name || "",
        code: this._formData.code,
        supplierId: this._formData.supplierId,
        address: this._formData.address
      });
      if (a) {
        this._errorMessage = a.message, this._isSaving = !1;
        return;
      }
      i && (s(this, r)?.updateWarehouse(i), history.replaceState({}, "", k(i.id)));
    } else {
      const { data: i, error: a } = await h.updateWarehouse(this._warehouse.id, {
        name: this._formData.name,
        code: this._formData.code,
        supplierId: this._formData.supplierId,
        clearSupplierId: !this._formData.supplierId && !!this._warehouse?.supplierId,
        address: this._formData.address
      });
      if (a) {
        this._errorMessage = a.message, this._isSaving = !1;
        return;
      }
      i && s(this, r)?.updateWarehouse(i);
    }
    this._isSaving = !1;
  }
  async _handleDelete() {
    if (!this._warehouse?.id || !confirm(
      `Are you sure you want to delete warehouse "${this._warehouse.name || "Unnamed"}"? This action cannot be undone.`
    )) return;
    const { error: i } = await h.deleteWarehouse(this._warehouse.id);
    if (i) {
      this._errorMessage = `Failed to delete warehouse: ${i.message}`;
      return;
    }
    T();
  }
  // Service Region handlers
  async _openServiceRegionModal(e) {
    if (!s(this, p) || !this._warehouse?.id) return;
    (await s(this, p).open(this, R, {
      data: {
        warehouseId: this._warehouse.id,
        region: e,
        existingRegions: this._warehouse.serviceRegions
      }
    }).onSubmit().catch(() => {
    }))?.saved && s(this, r)?.reload();
  }
  async _handleDeleteRegion(e, i) {
    if (e.stopPropagation(), !this._warehouse?.id || !confirm("Are you sure you want to remove this service region?")) return;
    this._isDeletingRegion = i.id;
    const { error: n } = await h.deleteServiceRegion(this._warehouse.id, i.id);
    if (this._isDeletingRegion = null, n) {
      this._errorMessage = `Failed to delete region: ${n.message}`;
      return;
    }
    s(this, r)?.reload();
  }
  // Shipping Option handlers
  async _openShippingOptionModal(e) {
    if (!s(this, p) || !this._warehouse?.id) return;
    (await s(this, p).open(this, E, {
      data: {
        optionId: e?.id,
        warehouseId: this._warehouse.id
      }
    }).onSubmit().catch(() => {
    }))?.saved && (this._loadShippingOptions(), s(this, r)?.reload());
  }
  async _handleDeleteOption(e, i) {
    if (e.stopPropagation(), !confirm(`Are you sure you want to delete shipping option "${i.name}"?`)) return;
    this._isDeletingOption = i.id;
    const { error: n } = await h.deleteShippingOption(i.id);
    if (this._isDeletingOption = null, n) {
      this._errorMessage = `Failed to delete option: ${n.message}`;
      return;
    }
    this._loadShippingOptions(), s(this, r)?.reload();
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
    return t`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderTabs() {
    const e = this._warehouse?.serviceRegions.length ?? 0, i = this._warehouse?.shippingOptionCount ?? 0;
    return t`
      <uui-tab-group>
        <uui-tab
          label="General"
          ?active=${this._activeTab === "general"}
          @click=${() => this._handleTabClick("general")}>
          General
        </uui-tab>
        <uui-tab
          label="Service Regions"
          ?active=${this._activeTab === "regions"}
          @click=${() => this._handleTabClick("regions")}>
          <span class="tab-label">
            Service Regions${e === 0 ? t`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : u}
            <span class="tab-count">(${e})</span>
          </span>
        </uui-tab>
        <uui-tab
          label="Shipping Options"
          ?active=${this._activeTab === "options"}
          @click=${() => this._handleTabClick("options")}>
          <span class="tab-label">
            Shipping Options${i === 0 ? t`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : u}
            <span class="tab-count">(${i})</span>
          </span>
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderGeneralTab() {
    return t`
      <div class="tab-content">
        <!-- Basic Info Section -->
        <uui-box headline="Basic Information">
          <div class="form-grid">
            <div class="form-field ${this._getValidationClass(this._formData.name, !0)}">
              <label>Name <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.name || ""}
                @input=${(e) => this._handleInputChange("name", e.target.value)}
                placeholder="Main Warehouse"
                label="Warehouse name">
              </uui-input>
            </div>

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
    return this._isFieldEmpty(this._formData.name) && e.push("Warehouse name is required"), this._isFieldEmpty(this._formData.address?.addressOne) && e.push("Address line 1 is required"), this._isFieldEmpty(this._formData.address?.townCity) && e.push("Town/City is required"), this._isFieldEmpty(this._formData.address?.postalCode) && e.push("Postal code is required"), this._isFieldEmpty(this._formData.address?.countryCode) && e.push("Country is required"), e.length === 0 ? u : t`
      <div class="validation-summary">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Please complete the following:</strong>
          <ul>
            ${e.map((i) => t`<li>${i}</li>`)}
          </ul>
        </div>
      </div>
    `;
  }
  _renderRegionsTab() {
    const e = this._warehouse?.serviceRegions ?? [], i = s(this, r)?.isNew ?? !0;
    return t`
      <div class="tab-content">
        ${i ? t`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding service regions.</span>
              </div>
            ` : u}

        ${!i && e.length === 0 ? t`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>This warehouse has no service regions and won't ship anywhere. Add regions to define where this warehouse can fulfill orders.</span>
              </div>
            ` : u}

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

        ${e.length > 0 ? t`
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
            ` : i ? u : t`
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
    return t`
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
            @click=${(a) => this._handleDeleteRegion(a, e)}>
            <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderOptionsTab() {
    const e = s(this, r)?.isNew ?? !0, i = this._shippingOptions.some((a) => a.providerKey !== "flat-rate");
    return t`
      <div class="tab-content">
        ${e ? t`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding shipping options.</span>
              </div>
            ` : u}

        ${!e && this._shippingOptions.length === 0 ? t`
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
            ` : u}

        <!-- Help text for existing options -->
        ${!e && this._shippingOptions.length > 0 ? t`
              <p class="section-description">
                These shipping methods are available for products shipped from this warehouse.
                ${i ? "Live rate options fetch real-time prices from the carrier's API." : "Add more options or configure external providers for live rates."}
              </p>
            ` : u}

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

        ${this._shippingOptions.length > 0 ? t`
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
            ` : e ? u : t`
                <div class="empty-state">
                  <uui-icon name="icon-truck"></uui-icon>
                  <p>No shipping options configured</p>
                </div>
              `}
      </div>
    `;
  }
  _renderOptionRow(e) {
    const i = this._isDeletingOption === e.id, a = e.providerKey !== "flat-rate", n = e.isNextDay ? "Next Day" : e.daysFrom === e.daysTo ? `${e.daysFrom} days` : `${e.daysFrom}-${e.daysTo} days`;
    let l;
    return a ? l = "Live Rates" : e.fixedCost != null ? l = `$${e.fixedCost.toFixed(2)}` : e.costCount > 0 ? l = `${e.costCount} location(s)` : l = "—", t`
      <uui-table-row class="clickable" @click=${() => this._openShippingOptionModal(e)}>
        <uui-table-cell>
          <span class="badge ${a ? "badge-live" : "badge-default"}">
            ${e.providerDisplayName || e.providerKey || "Flat Rate"}
          </span>
          ${e.serviceType ? t`<span class="service-type">${e.serviceType}</span>` : u}
        </uui-table-cell>
        <uui-table-cell>
          <span class="option-name">${e.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${n}</uui-table-cell>
        <uui-table-cell>${l}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${e.isEnabled ? "badge-positive" : "badge-default"}">
            ${e.isEnabled ? "Enabled" : "Disabled"}
          </span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell" @click=${(g) => g.stopPropagation()}>
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
            @click=${(g) => this._handleDeleteOption(g, e)}>
            <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTabContent() {
    switch (this._activeTab) {
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
    const e = s(this, r)?.isNew ?? !0, i = e ? "New Warehouse" : this._warehouse?.name || "Warehouse";
    return t`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="warehouse-container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <a href=${M()}>
                <uui-button
                  look="secondary"
                  compact
                  label="Back to Warehouses">
                  <uui-icon name="icon-arrow-left"></uui-icon>
                  Back
                </uui-button>
              </a>
              <h1>${i}</h1>
            </div>
            <div class="header-actions">
              ${e ? u : t`
                    <uui-button
                      look="primary"
                      color="danger"
                      label="Delete"
                      @click=${this._handleDelete}>
                      Delete
                    </uui-button>
                  `}
              <uui-button
                look="primary"
                color="positive"
                label="Save"
                ?disabled=${this._isSaving}
                @click=${this._handleSave}>
                ${this._isSaving ? "Saving..." : "Save"}
              </uui-button>
            </div>
          </div>

          ${this._errorMessage ? t`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : u}

          <!-- Tabs -->
          ${this._renderTabs()}

          <!-- Tab Content -->
          ${this._renderTabContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
r = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
o.styles = [
  A,
  $`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .warehouse-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-4);
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-4);
      }

      .header-left a {
        text-decoration: none;
      }

      .header-left h1 {
        margin: 0;
        font-size: 1.5rem;
      }

      .header-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }

      uui-tab-group {
        margin-bottom: var(--uui-size-space-4);
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

        .header {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--uui-size-space-3);
        }

        .header-actions {
          width: 100%;
          justify-content: flex-end;
        }
      }
    `
];
d([
  c()
], o.prototype, "_warehouse", 2);
d([
  c()
], o.prototype, "_isLoading", 2);
d([
  c()
], o.prototype, "_isSaving", 2);
d([
  c()
], o.prototype, "_errorMessage", 2);
d([
  c()
], o.prototype, "_activeTab", 2);
d([
  c()
], o.prototype, "_formData", 2);
d([
  c()
], o.prototype, "_suppliers", 2);
d([
  c()
], o.prototype, "_countries", 2);
d([
  c()
], o.prototype, "_shippingOptions", 2);
d([
  c()
], o.prototype, "_isDeletingRegion", 2);
d([
  c()
], o.prototype, "_isDeletingOption", 2);
o = d([
  C("merchello-warehouse-detail")
], o);
const V = o;
export {
  o as MerchelloWarehouseDetailElement,
  V as default
};
//# sourceMappingURL=warehouse-detail.element-Ch6_42UE.js.map
