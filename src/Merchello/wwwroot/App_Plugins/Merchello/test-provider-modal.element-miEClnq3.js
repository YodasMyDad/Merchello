import { html as n, nothing as u, css as C, state as o, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as w } from "@umbraco-cms/backoffice/modal";
import { M as c } from "./merchello-api-BSrPLgGs.js";
import { a as $, g as v } from "./store-settings-CoNaLkN5.js";
var S = Object.defineProperty, x = Object.getOwnPropertyDescriptor, f = (t) => {
  throw TypeError(t);
}, r = (t, e, a, l) => {
  for (var s = l > 1 ? void 0 : l ? x(e, a) : e, h = t.length - 1, p; h >= 0; h--)
    (p = t[h]) && (s = (l ? p(e, a, s) : p(s)) || s);
  return l && s && S(e, a, s), s;
}, y = (t, e, a) => e.has(t) || f("Cannot " + a), g = (t, e, a) => (y(t, e, "read from private field"), e.get(t)), O = (t, e, a) => e.has(t) ? f("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), _ = (t, e, a, l) => (y(t, e, "write to private field"), e.set(t, a), a), d;
const m = "merchello-test-provider-form";
let i = class extends w {
  constructor() {
    super(...arguments), this._warehouseId = "", this._countryCode = "", this._stateOrProvinceCode = "", this._postalCode = "", this._city = "", this._weightKg = 1, this._lengthCm = "", this._widthCm = "", this._heightCm = "", this._itemsSubtotal = 100, this._warehouses = [], this._countries = [], this._regions = [], this._isLoadingData = !0, this._isLoadingRegions = !1, this._isTesting = !1, this._errorMessage = null, O(this, d, !1);
  }
  connectedCallback() {
    super.connectedCallback(), _(this, d, !0), this._loadInitialData(), this._restoreSavedValues();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, d, !1);
  }
  async _loadInitialData() {
    this._isLoadingData = !0, $();
    const [t, e] = await Promise.all([
      c.getWarehousesList(),
      c.getLocalityCountries()
    ]);
    if (g(this, d)) {
      if (t.error) {
        this._errorMessage = t.error.message, this._isLoadingData = !1;
        return;
      }
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoadingData = !1;
        return;
      }
      this._warehouses = t.data ?? [], this._countries = e.data ?? [], this._warehouses.length === 1 && !this._warehouseId && (this._warehouseId = this._warehouses[0].id), this._countryCode && await this._loadRegions(this._countryCode), this._isLoadingData = !1;
    }
  }
  _restoreSavedValues() {
    try {
      const t = localStorage.getItem(m);
      if (t) {
        const e = JSON.parse(t);
        e.warehouseId && (this._warehouseId = e.warehouseId), e.countryCode && (this._countryCode = e.countryCode), e.stateOrProvinceCode && (this._stateOrProvinceCode = e.stateOrProvinceCode), e.postalCode && (this._postalCode = e.postalCode), e.city && (this._city = e.city), e.weightKg !== void 0 && (this._weightKg = e.weightKg), e.lengthCm !== void 0 && (this._lengthCm = String(e.lengthCm)), e.widthCm !== void 0 && (this._widthCm = String(e.widthCm)), e.heightCm !== void 0 && (this._heightCm = String(e.heightCm)), e.itemsSubtotal !== void 0 && (this._itemsSubtotal = e.itemsSubtotal);
      }
    } catch {
    }
  }
  _saveFormValues() {
    try {
      const t = {
        warehouseId: this._warehouseId,
        countryCode: this._countryCode,
        stateOrProvinceCode: this._stateOrProvinceCode,
        postalCode: this._postalCode,
        city: this._city,
        weightKg: this._weightKg,
        lengthCm: this._lengthCm ? parseFloat(this._lengthCm) : void 0,
        widthCm: this._widthCm ? parseFloat(this._widthCm) : void 0,
        heightCm: this._heightCm ? parseFloat(this._heightCm) : void 0,
        itemsSubtotal: this._itemsSubtotal
      };
      localStorage.setItem(m, JSON.stringify(t));
    } catch {
    }
  }
  async _loadRegions(t) {
    this._isLoadingRegions = !0, this._regions = [];
    const { data: e } = await c.getLocalityRegions(t);
    g(this, d) && (e && (this._regions = e), this._isLoadingRegions = !1);
  }
  _handleCountryChange(t) {
    const e = t.target.value;
    this._countryCode = e, this._stateOrProvinceCode = "", e ? this._loadRegions(e) : this._regions = [];
  }
  async _handleTest() {
    if (!this._warehouseId || !this._countryCode) {
      this._errorMessage = "Please select a warehouse and destination country.";
      return;
    }
    this._isTesting = !0, this._errorMessage = null, this._testResult = void 0, this._saveFormValues();
    const t = this.data?.configuration.id;
    if (!t) {
      this._errorMessage = "Configuration ID missing.", this._isTesting = !1;
      return;
    }
    const e = {
      warehouseId: this._warehouseId,
      countryCode: this._countryCode,
      stateOrProvinceCode: this._stateOrProvinceCode || void 0,
      postalCode: this._postalCode || void 0,
      city: this._city || void 0,
      weightKg: this._weightKg,
      lengthCm: this._lengthCm ? parseFloat(this._lengthCm) : void 0,
      widthCm: this._widthCm ? parseFloat(this._widthCm) : void 0,
      heightCm: this._heightCm ? parseFloat(this._heightCm) : void 0,
      itemsSubtotal: this._itemsSubtotal
    }, { data: a, error: l } = await c.testShippingProvider(t, e);
    if (g(this, d)) {
      if (l) {
        this._errorMessage = l.message, this._isTesting = !1;
        return;
      }
      this._testResult = a, this._isTesting = !1;
    }
  }
  _handleClose() {
    this.modalContext?.reject();
  }
  // Select options builders
  _getWarehouseOptions() {
    return [
      { name: "Select warehouse...", value: "", selected: !this._warehouseId },
      ...this._warehouses.map((t) => ({
        name: t.name || t.code || "Unnamed Warehouse",
        value: t.id,
        selected: t.id === this._warehouseId
      }))
    ];
  }
  _getCountryOptions() {
    return [
      { name: "Select country...", value: "", selected: !this._countryCode },
      ...this._countries.map((t) => ({
        name: t.name,
        value: t.code,
        selected: t.code === this._countryCode
      }))
    ];
  }
  _getRegionOptions() {
    return this._isLoadingRegions ? [{ name: "Loading...", value: "", selected: !0 }] : [
      { name: "All regions", value: "", selected: !this._stateOrProvinceCode },
      ...this._regions.map((t) => ({
        name: t.name,
        value: t.regionCode,
        selected: t.regionCode === this._stateOrProvinceCode
      }))
    ];
  }
  // Render methods
  _renderForm() {
    const t = v();
    return n`
      <div class="form-section">
        <h3>Origin</h3>
        <div class="form-row">
          <label>Warehouse <span class="required">*</span></label>
          <uui-select
            label="Warehouse"
            .options=${this._getWarehouseOptions()}
            @change=${(e) => this._warehouseId = e.target.value}
          ></uui-select>
        </div>
      </div>

      <div class="form-section">
        <h3>Destination</h3>
        <div class="form-row">
          <label>Country <span class="required">*</span></label>
          <uui-select
            label="Country"
            .options=${this._getCountryOptions()}
            @change=${this._handleCountryChange}
          ></uui-select>
        </div>

        <div class="form-row">
          <label>State/Province</label>
          <uui-select
            label="State/Province"
            .options=${this._getRegionOptions()}
            ?disabled=${!this._countryCode || this._isLoadingRegions}
            @change=${(e) => this._stateOrProvinceCode = e.target.value}
          ></uui-select>
        </div>

        <div class="form-row">
          <label>Postal Code</label>
          <uui-input
            type="text"
            .value=${this._postalCode}
            placeholder="e.g., SW1A 1AA"
            @input=${(e) => this._postalCode = e.target.value}
          ></uui-input>
          <span class="hint">Required for accurate rate quotes from most carriers</span>
        </div>

        <div class="form-row">
          <label>City</label>
          <uui-input
            type="text"
            .value=${this._city}
            placeholder="e.g., London"
            @input=${(e) => this._city = e.target.value}
          ></uui-input>
        </div>
      </div>

      <div class="form-section">
        <h3>Package</h3>
        <div class="form-row">
          <label>Weight (kg) <span class="required">*</span></label>
          <uui-input
            type="number"
            min="0.01"
            step="0.1"
            .value=${String(this._weightKg)}
            @input=${(e) => this._weightKg = parseFloat(e.target.value) || 1}
          ></uui-input>
        </div>

        <div class="form-row-group">
          <div class="form-row">
            <label>Length (cm)</label>
            <uui-input
              type="number"
              min="0"
              step="1"
              .value=${this._lengthCm}
              placeholder="Optional"
              @input=${(e) => this._lengthCm = e.target.value}
            ></uui-input>
          </div>
          <div class="form-row">
            <label>Width (cm)</label>
            <uui-input
              type="number"
              min="0"
              step="1"
              .value=${this._widthCm}
              placeholder="Optional"
              @input=${(e) => this._widthCm = e.target.value}
            ></uui-input>
          </div>
          <div class="form-row">
            <label>Height (cm)</label>
            <uui-input
              type="number"
              min="0"
              step="1"
              .value=${this._heightCm}
              placeholder="Optional"
              @input=${(e) => this._heightCm = e.target.value}
            ></uui-input>
          </div>
        </div>

        <div class="form-row">
          <label>Item Value (${t})</label>
          <uui-input
            type="number"
            min="0"
            step="0.01"
            .value=${String(this._itemsSubtotal)}
            @input=${(e) => this._itemsSubtotal = parseFloat(e.target.value) || 0}
          ></uui-input>
          <span class="hint">Used for value-based shipping calculations (e.g., free shipping thresholds)</span>
        </div>
      </div>
    `;
  }
  _renderResults() {
    if (!this._testResult) return u;
    const { success: t, serviceLevels: e, errors: a } = this._testResult, l = v();
    return n`
      <div class="results-section">
        <h3>Results</h3>

        ${a.length > 0 ? n`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <ul>
                  ${a.map((s) => n`<li>${s}</li>`)}
                </ul>
              </div>
            ` : u}

        ${e.length > 0 ? n`
              <div class="service-levels">
                ${e.map(
      (s) => n`
                    <div class="service-level-card">
                      <div class="service-header">
                        <span class="service-name">${s.serviceName}</span>
                        <span class="service-cost">${l}${s.totalCost.toFixed(2)}</span>
                      </div>
                      <div class="service-details">
                        <span class="service-code">${s.serviceCode}</span>
                        ${s.transitTime ? n`<span class="transit-time">Transit: ${s.transitTime}</span>` : u}
                        ${s.estimatedDeliveryDate ? n`<span class="delivery-date">Est. delivery: ${new Date(s.estimatedDeliveryDate).toLocaleDateString()}</span>` : u}
                      </div>
                      ${s.description ? n`<p class="service-description">${s.description}</p>` : u}
                    </div>
                  `
    )}
              </div>
            ` : t ? n`<p class="no-results">No service levels returned for this destination.</p>` : u}
      </div>
    `;
  }
  render() {
    const t = this.data?.configuration.displayName ?? "Provider";
    return this._isLoadingData ? n`
        <umb-body-layout headline="Test ${t}">
          <div id="main">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading...</span>
            </div>
          </div>
        </umb-body-layout>
      ` : n`
      <umb-body-layout headline="Test ${t}">
        <div id="main">
          ${this._errorMessage ? n`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._errorMessage = null}
                  >
                    Dismiss
                  </uui-button>
                </div>
              ` : u}

          ${this._renderForm()}
          ${this._renderResults()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
          <uui-button
            label="Test Provider"
            look="primary"
            color="positive"
            ?disabled=${this._isTesting || !this._warehouseId || !this._countryCode}
            @click=${this._handleTest}
          >
            ${this._isTesting ? n`<uui-loader-circle></uui-loader-circle>` : u}
            ${this._isTesting ? "Testing..." : "Test Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
i.styles = C`
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
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error-banner span {
      flex: 1;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .form-section h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      border-bottom: 1px solid var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .form-row-group {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .required {
      color: var(--uui-color-danger);
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-select,
    uui-input {
      width: 100%;
    }

    .results-section {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .results-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .result-errors {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .result-errors ul {
      margin: 0;
      padding-left: var(--uui-size-space-4);
    }

    .service-levels {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .service-level-card {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .service-name {
      font-weight: 600;
    }

    .service-cost {
      font-weight: 700;
      font-size: 1.125rem;
      color: var(--uui-color-positive);
    }

    .service-details {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-2);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .service-description {
      margin: var(--uui-size-space-2) 0 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .no-results {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
r([
  o()
], i.prototype, "_warehouseId", 2);
r([
  o()
], i.prototype, "_countryCode", 2);
r([
  o()
], i.prototype, "_stateOrProvinceCode", 2);
r([
  o()
], i.prototype, "_postalCode", 2);
r([
  o()
], i.prototype, "_city", 2);
r([
  o()
], i.prototype, "_weightKg", 2);
r([
  o()
], i.prototype, "_lengthCm", 2);
r([
  o()
], i.prototype, "_widthCm", 2);
r([
  o()
], i.prototype, "_heightCm", 2);
r([
  o()
], i.prototype, "_itemsSubtotal", 2);
r([
  o()
], i.prototype, "_warehouses", 2);
r([
  o()
], i.prototype, "_countries", 2);
r([
  o()
], i.prototype, "_regions", 2);
r([
  o()
], i.prototype, "_isLoadingData", 2);
r([
  o()
], i.prototype, "_isLoadingRegions", 2);
r([
  o()
], i.prototype, "_isTesting", 2);
r([
  o()
], i.prototype, "_testResult", 2);
r([
  o()
], i.prototype, "_errorMessage", 2);
i = r([
  b("merchello-test-provider-modal")
], i);
const T = i;
export {
  i as MerchelloTestProviderModalElement,
  T as default
};
//# sourceMappingURL=test-provider-modal.element-miEClnq3.js.map
