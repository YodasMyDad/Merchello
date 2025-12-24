import { html as s, nothing as l, css as b, state as a, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as $ } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-EmrUndo3.js";
import { b as S, a as m } from "./store-settings-BXLLfekO.js";
import { c as x } from "./formatting-QYLVqNiR.js";
var z = Object.defineProperty, O = Object.getOwnPropertyDescriptor, C = (i) => {
  throw TypeError(i);
}, r = (i, e, o, n) => {
  for (var u = n > 1 ? void 0 : n ? O(e, o) : e, h = i.length - 1, p; h >= 0; h--)
    (p = i[h]) && (u = (n ? p(e, o, u) : p(u)) || u);
  return n && u && z(e, o, u), u;
}, y = (i, e, o) => e.has(i) || C("Cannot " + o), g = (i, e, o) => (y(i, e, "read from private field"), e.get(i)), P = (i, e, o) => e.has(i) ? C("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, o), _ = (i, e, o, n) => (y(i, e, "write to private field"), e.set(i, o), o), c;
const f = "merchello-test-provider-form";
let t = class extends $ {
  constructor() {
    super(...arguments), this._warehouseId = "", this._countryCode = "", this._stateOrProvinceCode = "", this._postalCode = "", this._city = "", this._weightKg = 1, this._lengthCm = "", this._widthCm = "", this._heightCm = "", this._itemsSubtotal = 100, this._warehouses = [], this._countries = [], this._regions = [], this._isLoadingData = !0, this._isLoadingRegions = !1, this._isTesting = !1, this._errorMessage = null, P(this, c, !1);
  }
  connectedCallback() {
    super.connectedCallback(), _(this, c, !0), this._loadInitialData(), this._restoreSavedValues();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, c, !1);
  }
  async _loadInitialData() {
    this._isLoadingData = !0, S();
    const [i, e] = await Promise.all([
      v.getWarehousesList(),
      v.getLocalityCountries()
    ]);
    if (g(this, c)) {
      if (i.error) {
        this._errorMessage = i.error.message, this._isLoadingData = !1;
        return;
      }
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoadingData = !1;
        return;
      }
      this._warehouses = i.data ?? [], this._countries = e.data ?? [], this._warehouses.length === 1 && !this._warehouseId && (this._warehouseId = this._warehouses[0].id), this._countryCode && await this._loadRegions(this._countryCode), this._isLoadingData = !1;
    }
  }
  _restoreSavedValues() {
    try {
      const i = localStorage.getItem(f);
      if (i) {
        const e = JSON.parse(i);
        e.warehouseId && (this._warehouseId = e.warehouseId), e.countryCode && (this._countryCode = e.countryCode), e.stateOrProvinceCode && (this._stateOrProvinceCode = e.stateOrProvinceCode), e.postalCode && (this._postalCode = e.postalCode), e.city && (this._city = e.city), e.weightKg !== void 0 && (this._weightKg = e.weightKg), e.lengthCm !== void 0 && (this._lengthCm = String(e.lengthCm)), e.widthCm !== void 0 && (this._widthCm = String(e.widthCm)), e.heightCm !== void 0 && (this._heightCm = String(e.heightCm)), e.itemsSubtotal !== void 0 && (this._itemsSubtotal = e.itemsSubtotal);
      }
    } catch {
    }
  }
  _saveFormValues() {
    try {
      const i = {
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
      localStorage.setItem(f, JSON.stringify(i));
    } catch {
    }
  }
  async _loadRegions(i) {
    this._isLoadingRegions = !0, this._regions = [];
    const { data: e } = await v.getLocalityRegions(i);
    g(this, c) && (e && (this._regions = e), this._isLoadingRegions = !1);
  }
  _handleCountryChange(i) {
    const e = i.target.value;
    this._countryCode = e, this._stateOrProvinceCode = "", e ? this._loadRegions(e) : this._regions = [];
  }
  async _handleTest() {
    if (!this._warehouseId || !this._countryCode) {
      this._errorMessage = "Please select a warehouse and destination country.";
      return;
    }
    this._isTesting = !0, this._errorMessage = null, this._testResult = void 0, this._saveFormValues();
    const i = this.data?.configuration.id;
    if (!i) {
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
    }, { data: o, error: n } = await v.testShippingProvider(i, e);
    if (g(this, c)) {
      if (n) {
        this._errorMessage = n.message, this._isTesting = !1;
        return;
      }
      this._testResult = o, this._isTesting = !1;
    }
  }
  _handleClose() {
    this.modalContext?.reject();
  }
  // Select options builders
  _getWarehouseOptions() {
    return [
      { name: "Select warehouse...", value: "", selected: !this._warehouseId },
      ...this._warehouses.map((i) => ({
        name: i.name || i.code || "Unnamed Warehouse",
        value: i.id,
        selected: i.id === this._warehouseId
      }))
    ];
  }
  _getCountryOptions() {
    return [
      { name: "Select country...", value: "", selected: !this._countryCode },
      ...this._countries.map((i) => ({
        name: i.name,
        value: i.code,
        selected: i.code === this._countryCode
      }))
    ];
  }
  _getRegionOptions() {
    return this._isLoadingRegions ? [{ name: "Loading...", value: "", selected: !0 }] : [
      { name: "All regions", value: "", selected: !this._stateOrProvinceCode },
      ...this._regions.map((i) => ({
        name: i.name,
        value: i.regionCode,
        selected: i.regionCode === this._stateOrProvinceCode
      }))
    ];
  }
  // Render methods
  _renderForm() {
    const i = m();
    return s`
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
          <label>Item Value (${i})</label>
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
    if (!this._testResult) return l;
    const { isSuccessful: i, serviceLevels: e, errors: o } = this._testResult, n = m(), u = e.filter((d) => d.isConfigured), h = e.filter((d) => !d.isConfigured), p = u.length > 0;
    return s`
      <div class="results-section">
        <h3>Results</h3>

        ${o.length > 0 ? s`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <ul>
                  ${o.map((d) => s`<li>${d}</li>`)}
                </ul>
              </div>
            ` : l}

        ${p ? s`
              <div class="results-group">
                <h4>Configured Service Types</h4>
                <div class="service-levels">
                  ${u.map((d) => this._renderServiceLevelCard(d, n, !0))}
                </div>
              </div>
            ` : l}

        ${h.length > 0 ? s`
              <div class="results-group">
                <h4>${p ? "Other Available Services" : "Available Service Types"}</h4>
                <div class="service-levels">
                  ${h.map((d) => this._renderServiceLevelCard(d, n, !1))}
                </div>
              </div>
            ` : l}

        ${e.length === 0 && i ? s`<p class="no-results">No service levels returned for this destination.</p>` : l}
      </div>
    `;
  }
  _renderServiceLevelCard(i, e, o) {
    const n = i.isValid !== !1;
    return s`
      <div class="service-level-card ${n ? "" : "invalid"}">
        <div class="service-header">
          <span class="service-name">
            ${o ? n ? s`<uui-icon name="icon-check" class="valid-icon"></uui-icon>` : s`<uui-icon name="icon-wrong" class="invalid-icon"></uui-icon>` : l}
            ${i.serviceType || i.serviceName}
          </span>
          ${n ? s`<span class="service-cost">${e}${x(i.totalCost, 2)}</span>` : s`<span class="service-invalid">Invalid / Not Available</span>`}
        </div>
        ${n ? s`
              <div class="service-details">
                <span class="service-code">${i.serviceCode}</span>
                ${i.transitTime ? s`<span class="transit-time">Transit: ${i.transitTime}</span>` : l}
                ${i.estimatedDeliveryDate ? s`<span class="delivery-date">Est. delivery: ${new Date(i.estimatedDeliveryDate).toLocaleDateString()}</span>` : l}
              </div>
              ${i.description ? s`<p class="service-description">${i.description}</p>` : l}
            ` : l}
      </div>
    `;
  }
  render() {
    const i = this.data?.configuration.displayName ?? "Provider";
    return this._isLoadingData ? s`
        <umb-body-layout headline="Test ${i}">
          <div id="main">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading...</span>
            </div>
          </div>
        </umb-body-layout>
      ` : s`
      <umb-body-layout headline="Test ${i}">
        <div id="main">
          ${this._errorMessage ? s`
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
              ` : l}

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
            ${this._isTesting ? s`<uui-loader-circle></uui-loader-circle>` : l}
            ${this._isTesting ? "Testing..." : "Test Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
t.styles = b`
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

    .service-cost {
      font-weight: 700;
      font-size: 1.125rem;
      color: var(--uui-color-positive);
    }

    .service-invalid {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--uui-color-danger);
    }

    .results-group {
      margin-bottom: var(--uui-size-space-4);
    }

    .results-group h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .service-name {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
    }

    .valid-icon {
      color: var(--uui-color-positive);
    }

    .invalid-icon {
      color: var(--uui-color-danger);
    }

    .service-level-card.invalid {
      border-color: var(--uui-color-danger);
      background: color-mix(in srgb, var(--uui-color-danger) 5%, var(--uui-color-surface));
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
  a()
], t.prototype, "_warehouseId", 2);
r([
  a()
], t.prototype, "_countryCode", 2);
r([
  a()
], t.prototype, "_stateOrProvinceCode", 2);
r([
  a()
], t.prototype, "_postalCode", 2);
r([
  a()
], t.prototype, "_city", 2);
r([
  a()
], t.prototype, "_weightKg", 2);
r([
  a()
], t.prototype, "_lengthCm", 2);
r([
  a()
], t.prototype, "_widthCm", 2);
r([
  a()
], t.prototype, "_heightCm", 2);
r([
  a()
], t.prototype, "_itemsSubtotal", 2);
r([
  a()
], t.prototype, "_warehouses", 2);
r([
  a()
], t.prototype, "_countries", 2);
r([
  a()
], t.prototype, "_regions", 2);
r([
  a()
], t.prototype, "_isLoadingData", 2);
r([
  a()
], t.prototype, "_isLoadingRegions", 2);
r([
  a()
], t.prototype, "_isTesting", 2);
r([
  a()
], t.prototype, "_testResult", 2);
r([
  a()
], t.prototype, "_errorMessage", 2);
t = r([
  w("merchello-test-provider-modal")
], t);
const M = t;
export {
  t as MerchelloTestProviderModalElement,
  M as default
};
//# sourceMappingURL=test-provider-modal.element-DPU01shW.js.map
