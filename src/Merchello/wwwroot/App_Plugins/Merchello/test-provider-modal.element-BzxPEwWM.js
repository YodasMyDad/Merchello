import { html as s, nothing as n, css as b, state as a, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as $ } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-Dp_zU_yi.js";
import { g as S, b as m } from "./store-settings-CHgA9WE7.js";
import { c as x } from "./formatting-B_f6AiQh.js";
var L = Object.defineProperty, T = Object.getOwnPropertyDescriptor, C = (t) => {
  throw TypeError(t);
}, o = (t, e, r, u) => {
  for (var l = u > 1 ? void 0 : u ? T(e, r) : e, h = t.length - 1, p; h >= 0; h--)
    (p = t[h]) && (l = (u ? p(e, r, l) : p(l)) || l);
  return u && l && L(e, r, l), l;
}, f = (t, e, r) => e.has(t) || C("Cannot " + r), v = (t, e, r) => (f(t, e, "read from private field"), e.get(t)), z = (t, e, r) => e.has(t) ? C("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r), _ = (t, e, r, u) => (f(t, e, "write to private field"), e.set(t, r), r), c;
const y = "merchello-test-provider-form";
let i = class extends $ {
  constructor() {
    super(...arguments), this._warehouseId = "", this._countryCode = "", this._regionCode = "", this._postalCode = "", this._city = "", this._weightKg = 1, this._lengthCm = "", this._widthCm = "", this._heightCm = "", this._itemsSubtotal = 100, this._warehouses = [], this._countries = [], this._regions = [], this._isLoadingData = !0, this._isLoadingRegions = !1, this._isTesting = !1, this._errorMessage = null, z(this, c, !1);
  }
  connectedCallback() {
    super.connectedCallback(), _(this, c, !0), this._loadInitialData(), this._restoreSavedValues();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, c, !1);
  }
  async _loadInitialData() {
    this._isLoadingData = !0, S();
    const [t, e] = await Promise.all([
      g.getWarehousesList(),
      g.getLocalityCountries()
    ]);
    if (v(this, c)) {
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
      const t = localStorage.getItem(y);
      if (t) {
        const e = JSON.parse(t);
        e.warehouseId && (this._warehouseId = e.warehouseId), e.countryCode && (this._countryCode = e.countryCode), e.regionCode && (this._regionCode = e.regionCode), e.postalCode && (this._postalCode = e.postalCode), e.city && (this._city = e.city), e.weightKg !== void 0 && (this._weightKg = e.weightKg), e.lengthCm !== void 0 && (this._lengthCm = String(e.lengthCm)), e.widthCm !== void 0 && (this._widthCm = String(e.widthCm)), e.heightCm !== void 0 && (this._heightCm = String(e.heightCm)), e.itemsSubtotal !== void 0 && (this._itemsSubtotal = e.itemsSubtotal);
      }
    } catch {
    }
  }
  _saveFormValues() {
    try {
      const t = {
        warehouseId: this._warehouseId,
        countryCode: this._countryCode,
        regionCode: this._regionCode,
        postalCode: this._postalCode,
        city: this._city,
        weightKg: this._weightKg,
        lengthCm: this._lengthCm ? parseFloat(this._lengthCm) : void 0,
        widthCm: this._widthCm ? parseFloat(this._widthCm) : void 0,
        heightCm: this._heightCm ? parseFloat(this._heightCm) : void 0,
        itemsSubtotal: this._itemsSubtotal
      };
      localStorage.setItem(y, JSON.stringify(t));
    } catch {
    }
  }
  async _loadRegions(t) {
    this._isLoadingRegions = !0, this._regions = [];
    const { data: e } = await g.getLocalityRegions(t);
    v(this, c) && (e && (this._regions = e), this._isLoadingRegions = !1);
  }
  _handleCountryChange(t) {
    const e = t.target.value;
    this._countryCode = e, this._regionCode = "", e ? this._loadRegions(e) : this._regions = [];
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
      regionCode: this._regionCode || void 0,
      postalCode: this._postalCode || void 0,
      city: this._city || void 0,
      weightKg: this._weightKg,
      lengthCm: this._lengthCm ? parseFloat(this._lengthCm) : void 0,
      widthCm: this._widthCm ? parseFloat(this._widthCm) : void 0,
      heightCm: this._heightCm ? parseFloat(this._heightCm) : void 0,
      itemsSubtotal: this._itemsSubtotal
    }, { data: r, error: u } = await g.testShippingProvider(t, e);
    if (v(this, c)) {
      if (u) {
        this._errorMessage = u.message, this._isTesting = !1;
        return;
      }
      this._testResult = r, this._isTesting = !1;
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
      { name: "All regions", value: "", selected: !this._regionCode },
      ...this._regions.map((t) => ({
        name: t.name,
        value: t.regionCode,
        selected: t.regionCode === this._regionCode
      }))
    ];
  }
  // Render methods
  _renderForm() {
    const t = m();
    return s`
      <uui-box headline="Origin">
        <umb-property-layout label="Warehouse" description="The warehouse to ship from" ?mandatory=${!0}>
          <uui-select
            slot="editor"
            label="Warehouse"
            .options=${this._getWarehouseOptions()}
            @change=${(e) => this._warehouseId = e.target.value}
          ></uui-select>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="Destination">
        <umb-property-layout label="Country" description="Destination country" ?mandatory=${!0}>
          <uui-select
            slot="editor"
            label="Country"
            .options=${this._getCountryOptions()}
            @change=${this._handleCountryChange}
          ></uui-select>
        </umb-property-layout>

        <umb-property-layout label="State/Province" description="Narrow down to a specific region">
          <uui-select
            slot="editor"
            label="State/Province"
            .options=${this._getRegionOptions()}
            ?disabled=${!this._countryCode || this._isLoadingRegions}
            @change=${(e) => this._regionCode = e.target.value}
          ></uui-select>
        </umb-property-layout>

        <umb-property-layout label="Postal Code" description="Required for accurate rate quotes from most carriers">
          <uui-input
            slot="editor"
            label="Postal Code"
            type="text"
            .value=${this._postalCode}
            placeholder="e.g., SW1A 1AA"
            @input=${(e) => this._postalCode = e.target.value}
          ></uui-input>
        </umb-property-layout>

        <umb-property-layout label="City">
          <uui-input
            slot="editor"
            label="City"
            type="text"
            .value=${this._city}
            placeholder="e.g., London"
            @input=${(e) => this._city = e.target.value}
          ></uui-input>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="Package">
        <umb-property-layout label="Weight (kg)" description="Package weight" ?mandatory=${!0}>
          <uui-input
            slot="editor"
            label="Weight"
            type="number"
            min="0.01"
            step="0.1"
            .value=${String(this._weightKg)}
            @input=${(e) => this._weightKg = parseFloat(e.target.value) || 1}
          ></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Dimensions (cm)" description="Length x Width x Height (optional)">
          <div slot="editor" class="dimensions-group">
            <uui-input
              label="Length"
              type="number"
              min="0"
              step="1"
              .value=${this._lengthCm}
              placeholder="L"
              @input=${(e) => this._lengthCm = e.target.value}
            ></uui-input>
            <uui-input
              label="Width"
              type="number"
              min="0"
              step="1"
              .value=${this._widthCm}
              placeholder="W"
              @input=${(e) => this._widthCm = e.target.value}
            ></uui-input>
            <uui-input
              label="Height"
              type="number"
              min="0"
              step="1"
              .value=${this._heightCm}
              placeholder="H"
              @input=${(e) => this._heightCm = e.target.value}
            ></uui-input>
          </div>
        </umb-property-layout>

        <umb-property-layout label="Item Value (${t})" description="Used for value-based shipping calculations (e.g., free shipping thresholds)">
          <uui-input
            slot="editor"
            label="Item Value"
            type="number"
            min="0"
            step="0.01"
            .value=${String(this._itemsSubtotal)}
            @input=${(e) => this._itemsSubtotal = parseFloat(e.target.value) || 0}
          ></uui-input>
        </umb-property-layout>
      </uui-box>
    `;
  }
  _renderResults() {
    if (!this._testResult) return n;
    const { isSuccessful: t, serviceLevels: e, errors: r } = this._testResult, u = m(), l = e.filter((d) => d.isConfigured), h = e.filter((d) => !d.isConfigured), p = l.length > 0;
    return s`
      <uui-box headline="Results">
        ${r.length > 0 ? s`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <ul>
                  ${r.map((d) => s`<li>${d}</li>`)}
                </ul>
              </div>
            ` : n}

        ${p ? s`
              <div class="results-group">
                <h4>Configured Service Types</h4>
                <div class="service-levels">
                  ${l.map((d) => this._renderServiceLevelCard(d, u, !0))}
                </div>
              </div>
            ` : n}

        ${h.length > 0 ? s`
              <div class="results-group">
                <h4>${p ? "Other Available Services" : "Available Service Types"}</h4>
                <div class="service-levels">
                  ${h.map((d) => this._renderServiceLevelCard(d, u, !1))}
                </div>
              </div>
            ` : n}

        ${e.length === 0 && t ? s`<p class="no-results">No service levels returned for this destination.</p>` : n}
      </uui-box>
    `;
  }
  _renderServiceLevelCard(t, e, r) {
    const u = t.isValid !== !1;
    return s`
      <div class="service-level-card ${u ? "" : "invalid"}">
        <div class="service-header">
          <span class="service-name">
            ${r ? u ? s`<uui-icon name="icon-check" class="valid-icon"></uui-icon>` : s`<uui-icon name="icon-wrong" class="invalid-icon"></uui-icon>` : n}
            ${t.serviceType || t.serviceName}
          </span>
          ${u ? s`<span class="service-cost">${e}${x(t.totalCost, 2)}</span>` : s`<span class="service-invalid">Invalid / Not Available</span>`}
        </div>
        ${u ? s`
              <div class="service-details">
                <span class="service-code">${t.serviceCode}</span>
                ${t.transitTime ? s`<span class="transit-time">Transit: ${t.transitTime}</span>` : n}
                ${t.estimatedDeliveryDate ? s`<span class="delivery-date">Est. delivery: ${new Date(t.estimatedDeliveryDate).toLocaleDateString()}</span>` : n}
              </div>
              ${t.description ? s`<p class="service-description">${t.description}</p>` : n}
            ` : n}
      </div>
    `;
  }
  render() {
    const t = this.data?.configuration.displayName ?? "Provider";
    return this._isLoadingData ? s`
        <umb-body-layout headline="Test ${t}">
          <div id="main">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading...</span>
            </div>
          </div>
        </umb-body-layout>
      ` : s`
      <umb-body-layout headline="Test ${t}">
        <div id="main">
          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button
                    look="secondary"
                    compact
                    label="Dismiss error"
                    @click=${() => this._errorMessage = null}
                  >
                    Dismiss
                  </uui-button>
                </div>
              ` : n}

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
            ${this._isTesting ? s`<uui-loader-circle></uui-loader-circle>` : n}
            ${this._isTesting ? "Testing..." : "Test Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
i.styles = b`
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

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    umb-property-layout uui-select,
    umb-property-layout uui-input {
      width: 100%;
    }

    .dimensions-group {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .dimensions-group uui-input {
      width: 100%;
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
o([
  a()
], i.prototype, "_warehouseId", 2);
o([
  a()
], i.prototype, "_countryCode", 2);
o([
  a()
], i.prototype, "_regionCode", 2);
o([
  a()
], i.prototype, "_postalCode", 2);
o([
  a()
], i.prototype, "_city", 2);
o([
  a()
], i.prototype, "_weightKg", 2);
o([
  a()
], i.prototype, "_lengthCm", 2);
o([
  a()
], i.prototype, "_widthCm", 2);
o([
  a()
], i.prototype, "_heightCm", 2);
o([
  a()
], i.prototype, "_itemsSubtotal", 2);
o([
  a()
], i.prototype, "_warehouses", 2);
o([
  a()
], i.prototype, "_countries", 2);
o([
  a()
], i.prototype, "_regions", 2);
o([
  a()
], i.prototype, "_isLoadingData", 2);
o([
  a()
], i.prototype, "_isLoadingRegions", 2);
o([
  a()
], i.prototype, "_isTesting", 2);
o([
  a()
], i.prototype, "_testResult", 2);
o([
  a()
], i.prototype, "_errorMessage", 2);
i = o([
  w("merchello-test-provider-modal")
], i);
const k = i;
export {
  i as MerchelloTestProviderModalElement,
  k as default
};
//# sourceMappingURL=test-provider-modal.element-BzxPEwWM.js.map
