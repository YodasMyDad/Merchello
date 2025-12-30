import { LitElement as x, html as s, nothing as d, css as S, state as h, customElement as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as k } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as R } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as C, UMB_MODAL_MANAGER_CONTEXT as T, UMB_CONFIRM_MODAL as y } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as A } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-BtOE5E-_.js";
import { M } from "./supplier-modal.token-CWeQ_zlc.js";
import { l as E, o as z, p as w } from "./navigation-m-G5wLvz.js";
import { b as I } from "./badge.styles-DUcdl6GY.js";
import { a as P } from "./formatting-Cb4qHFJ9.js";
const L = new C("Merchello.ServiceRegion.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), N = new C("Merchello.ShippingOption.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var W = Object.defineProperty, F = Object.getOwnPropertyDescriptor, $ = (e) => {
  throw TypeError(e);
}, u = (e, i, a, m) => {
  for (var o = m > 1 ? void 0 : m ? F(i, a) : i, g = e.length - 1, _; g >= 0; g--)
    (_ = e[g]) && (o = (m ? _(i, a, o) : _(o)) || o);
  return m && o && W(i, a, o), o;
}, D = (e, i, a) => i.has(e) || $("Cannot " + a), t = (e, i, a) => (D(e, i, "read from private field"), i.get(e)), v = (e, i, a) => i.has(e) ? $("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), f = (e, i, a, m) => (D(e, i, "write to private field"), i.set(e, a), a), l, p, c, r;
let n = class extends k(x) {
  constructor() {
    super(), this._warehouse = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._routes = [], this._activePath = "", this._formData = {}, this._suppliers = [], this._countries = [], this._shippingOptions = [], this._isDeletingRegion = null, this._isDeletingOption = null, v(this, l), v(this, p), v(this, c), v(this, r, !1), this.consumeContext(R, (e) => {
      f(this, l, e), t(this, l) && this.observe(t(this, l).warehouse, (i) => {
        this._warehouse = i ?? null, i && (this._formData = { ...i }), this._isLoading = !i;
      });
    }), this.consumeContext(T, (e) => {
      f(this, p, e);
    }), this.consumeContext(A, (e) => {
      f(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), f(this, r, !0), this._createRoutes(), this._loadSuppliers(), this._loadCountries();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, r, !1);
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
    const { data: e } = await b.getSuppliers();
    t(this, r) && e && (this._suppliers = e);
  }
  async _loadCountries() {
    const { data: e } = await b.getLocalityCountries();
    t(this, r) && e && (this._countries = e);
  }
  async _loadShippingOptions() {
    if (!this._warehouse?.id) return;
    const { data: e } = await b.getShippingOptions();
    t(this, r) && e && (this._shippingOptions = e.filter((i) => i.warehouseId === this._warehouse?.id));
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
    if (!t(this, p)) return;
    const i = await t(this, p).open(this, M, {
      data: {}
    }).onSubmit().catch(() => {
    });
    t(this, r) && i?.isCreated && i.supplier && (this._suppliers = [...this._suppliers, i.supplier], this._formData = { ...this._formData, supplierId: i.supplier.id });
  }
  async _handleSave() {
    this._isSaving = !0, this._errorMessage = null;
    const e = t(this, l)?.isNew ?? !0;
    try {
      if (e) {
        const { data: i, error: a } = await b.createWarehouse({
          name: this._formData.name || "",
          code: this._formData.code,
          supplierId: this._formData.supplierId,
          address: this._formData.address
        });
        if (!t(this, r)) return;
        if (a) {
          this._errorMessage = a.message, t(this, c)?.peek("danger", {
            data: { headline: "Failed to create", message: a.message || "Could not create warehouse" }
          });
          return;
        }
        i && (t(this, l)?.updateWarehouse(i), history.replaceState({}, "", E(i.id)), t(this, c)?.peek("positive", {
          data: { headline: "Warehouse created", message: "The warehouse has been created successfully" }
        }));
      } else {
        const { data: i, error: a } = await b.updateWarehouse(this._warehouse.id, {
          name: this._formData.name,
          code: this._formData.code,
          supplierId: this._formData.supplierId,
          shouldClearSupplierId: !this._formData.supplierId && !!this._warehouse?.supplierId,
          address: this._formData.address
        });
        if (!t(this, r)) return;
        if (a) {
          this._errorMessage = a.message, t(this, c)?.peek("danger", {
            data: { headline: "Failed to save", message: a.message || "Could not save changes" }
          });
          return;
        }
        i && (t(this, l)?.updateWarehouse(i), t(this, c)?.peek("positive", {
          data: { headline: "Changes saved", message: "The warehouse has been updated successfully" }
        }));
      }
    } finally {
      t(this, r) && (this._isSaving = !1);
    }
  }
  async _handleDelete() {
    if (!this._warehouse?.id || !await t(this, p)?.open(this, y, {
      data: {
        headline: "Delete Warehouse",
        content: `Are you sure you want to delete warehouse "${this._warehouse.name || "Unnamed"}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !t(this, r)) return;
    const { error: a } = await b.deleteWarehouse(this._warehouse.id);
    if (t(this, r)) {
      if (a) {
        this._errorMessage = `Failed to delete warehouse: ${a.message}`, t(this, c)?.peek("danger", {
          data: { headline: "Failed to delete", message: a.message || "Could not delete warehouse" }
        });
        return;
      }
      t(this, c)?.peek("positive", {
        data: { headline: "Warehouse deleted", message: "The warehouse has been deleted successfully" }
      }), z();
    }
  }
  // Service Region handlers
  async _openServiceRegionModal(e) {
    if (!t(this, p) || !this._warehouse?.id) return;
    const a = await t(this, p).open(this, L, {
      data: {
        warehouseId: this._warehouse.id,
        region: e,
        existingRegions: this._warehouse.serviceRegions
      }
    }).onSubmit().catch(() => {
    });
    t(this, r) && a?.isSaved && t(this, l)?.reload();
  }
  async _handleDeleteRegion(e, i) {
    if (e.stopPropagation(), !this._warehouse?.id) return;
    const a = i.regionDisplay || `${i.stateOrProvinceCode || ""} ${i.countryCode}`.trim();
    if (!await t(this, p)?.open(this, y, {
      data: {
        headline: "Remove Service Region",
        content: `Are you sure you want to remove the service region "${a}"?`,
        confirmLabel: "Remove",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !t(this, r)) return;
    this._isDeletingRegion = i.id;
    const { error: g } = await b.deleteServiceRegion(this._warehouse.id, i.id);
    if (t(this, r)) {
      if (this._isDeletingRegion = null, g) {
        this._errorMessage = `Failed to delete region: ${g.message}`, t(this, c)?.peek("danger", {
          data: { headline: "Failed to delete", message: g.message || "Could not delete region" }
        });
        return;
      }
      t(this, c)?.peek("positive", {
        data: { headline: "Region deleted", message: "The service region has been removed" }
      }), t(this, l)?.reload();
    }
  }
  // Shipping Option handlers
  async _openShippingOptionModal(e) {
    if (!t(this, p) || !this._warehouse?.id) return;
    const a = await t(this, p).open(this, N, {
      data: {
        optionId: e?.id,
        warehouseId: this._warehouse.id
      }
    }).onSubmit().catch(() => {
    });
    t(this, r) && a?.isSaved && (this._loadShippingOptions(), t(this, l)?.reload());
  }
  async _handleDeleteOption(e, i) {
    if (e.stopPropagation(), !await t(this, p)?.open(this, y, {
      data: {
        headline: "Delete Shipping Option",
        content: `Are you sure you want to delete shipping option "${i.name}"?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !t(this, r)) return;
    this._isDeletingOption = i.id;
    const { error: o } = await b.deleteShippingOption(i.id);
    if (t(this, r)) {
      if (this._isDeletingOption = null, o) {
        this._errorMessage = `Failed to delete option: ${o.message}`, t(this, c)?.peek("danger", {
          data: { headline: "Failed to delete", message: o.message || "Could not delete shipping option" }
        });
        return;
      }
      t(this, c)?.peek("positive", {
        data: { headline: "Option deleted", message: "The shipping option has been removed" }
      }), this._loadShippingOptions(), t(this, l)?.reload();
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
    return this._isFieldEmpty(this._formData.name) && e.push("Warehouse name is required"), this._isFieldEmpty(this._formData.address?.addressOne) && e.push("Address line 1 is required"), this._isFieldEmpty(this._formData.address?.townCity) && e.push("Town/City is required"), this._isFieldEmpty(this._formData.address?.postalCode) && e.push("Postal code is required"), this._isFieldEmpty(this._formData.address?.countryCode) && e.push("Country is required"), e.length === 0 ? d : s`
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
    const e = this._warehouse?.serviceRegions ?? [], i = t(this, l)?.isNew ?? !0;
    return s`
      <div class="tab-content">
        ${i ? s`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding service regions.</span>
              </div>
            ` : d}

        ${!i && e.length === 0 ? s`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>This warehouse has no service regions and won't ship anywhere. Add regions to define where this warehouse can fulfill orders.</span>
              </div>
            ` : d}

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
                  ${e.map((a) => this._renderRegionRow(a))}
                </uui-table>
              </div>
            ` : i ? d : s`
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
            @click=${(a) => this._handleDeleteRegion(a, e)}>
            <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderOptionsTab() {
    const e = t(this, l)?.isNew ?? !0, i = this._shippingOptions.some((a) => a.providerKey !== "flat-rate");
    return s`
      <div class="tab-content">
        ${e ? s`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding shipping options.</span>
              </div>
            ` : d}

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
            ` : d}

        <!-- Help text for existing options -->
        ${!e && this._shippingOptions.length > 0 ? s`
              <p class="section-description">
                These shipping methods are available for products shipped from this warehouse.
                ${i ? "Live rate options fetch real-time prices from the carrier's API." : "Add more options or configure external providers for live rates."}
              </p>
            ` : d}

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
                  ${this._shippingOptions.map((a) => this._renderOptionRow(a))}
                </uui-table>
              </div>
            ` : e ? d : s`
                <div class="empty-state">
                  <uui-icon name="icon-truck"></uui-icon>
                  <p>No shipping options configured</p>
                </div>
              `}
      </div>
    `;
  }
  _renderOptionRow(e) {
    const i = this._isDeletingOption === e.id, a = e.providerKey !== "flat-rate", m = e.isNextDay ? "Next Day" : e.daysFrom === e.daysTo ? `${e.daysFrom} days` : `${e.daysFrom}-${e.daysTo} days`;
    let o;
    return a ? o = "Live Rates" : e.fixedCost != null ? o = P(e.fixedCost) : e.costCount > 0 ? o = `${e.costCount} location(s)` : o = "—", s`
      <uui-table-row class="clickable" @click=${() => this._openShippingOptionModal(e)}>
        <uui-table-cell>
          <span class="badge ${a ? "badge-live" : "badge-default"}">
            ${e.providerDisplayName || e.providerKey || "Flat Rate"}
          </span>
          ${e.serviceType ? s`<span class="service-type">${e.serviceType}</span>` : d}
        </uui-table-cell>
        <uui-table-cell>
          <span class="option-name">${e.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${m}</uui-table-cell>
        <uui-table-cell>${o}</uui-table-cell>
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
    const e = t(this, l)?.isNew ?? !0;
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${w()} label="Back to Warehouses" class="back-button">
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
              ` : d}

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
                Service Regions${(this._warehouse?.serviceRegions.length ?? 0) === 0 ? s`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : d}
                <span class="tab-count">(${this._warehouse?.serviceRegions.length ?? 0})</span>
              </span>
            </uui-tab>
            <uui-tab
              label="Shipping Options"
              href="${this._routerPath}/tab/options"
              ?active=${this._getActiveTab() === "options"}>
              <span class="tab-label">
                Shipping Options${(this._warehouse?.shippingOptionCount ?? 0) === 0 ? s`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : d}
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
            <uui-breadcrumb-item href=${w()}>Warehouses</uui-breadcrumb-item>
            <uui-breadcrumb-item>${this._formData.name || "New Warehouse"}</uui-breadcrumb-item>
          </uui-breadcrumbs>

          ${e ? d : s`
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
p = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
r = /* @__PURE__ */ new WeakMap();
n.styles = [
  I,
  S`
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
  h()
], n.prototype, "_warehouse", 2);
u([
  h()
], n.prototype, "_isLoading", 2);
u([
  h()
], n.prototype, "_isSaving", 2);
u([
  h()
], n.prototype, "_errorMessage", 2);
u([
  h()
], n.prototype, "_routes", 2);
u([
  h()
], n.prototype, "_routerPath", 2);
u([
  h()
], n.prototype, "_activePath", 2);
u([
  h()
], n.prototype, "_formData", 2);
u([
  h()
], n.prototype, "_suppliers", 2);
u([
  h()
], n.prototype, "_countries", 2);
u([
  h()
], n.prototype, "_shippingOptions", 2);
u([
  h()
], n.prototype, "_isDeletingRegion", 2);
u([
  h()
], n.prototype, "_isDeletingOption", 2);
n = u([
  O("merchello-warehouse-detail")
], n);
const J = n;
export {
  n as MerchelloWarehouseDetailElement,
  J as default
};
//# sourceMappingURL=warehouse-detail.element-BbTqNslh.js.map
