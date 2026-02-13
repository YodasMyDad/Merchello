import { nothing as _, html as r, css as C, state as a, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as b } from "@umbraco-cms/backoffice/notification";
import { M as l } from "./merchello-api-DNSJzonx.js";
import { b as g, g as S } from "./store-settings-BPUUVKYl.js";
var w = Object.defineProperty, x = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, s = (e, t, o, d) => {
  for (var u = d > 1 ? void 0 : d ? x(t, o) : t, h = e.length - 1, p; h >= 0; h--)
    (p = e[h]) && (u = (d ? p(t, o, u) : p(u)) || u);
  return d && u && w(t, o, u), u;
}, f = (e, t, o) => t.has(e) || y("Cannot " + o), c = (e, t, o) => (f(e, t, "read from private field"), t.get(e)), $ = (e, t, o) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, o), R = (e, t, o, d) => (f(e, t, "write to private field"), t.set(e, o), o), n;
let i = class extends m {
  constructor() {
    super(), this._isSaving = !1, this._isLoadingCountries = !0, this._isLoadingRegions = !1, this._countryCode = "", this._regionCode = "", this._cost = 0, this._currencySymbol = g(), this._countries = [], this._regions = [], $(this, n), this.consumeContext(b, (e) => {
      R(this, n, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCurrencySymbol(), this._loadCountries(), this.data?.cost && (this._countryCode = this.data.cost.countryCode, this._regionCode = this.data.cost.regionCode ?? "", this._cost = this.data.cost.cost, this._countryCode && this._countryCode !== "*" && this._loadRegions(this._countryCode));
  }
  async _loadCurrencySymbol() {
    try {
      await S(), this._currencySymbol = g();
    } catch {
      this._currencySymbol = g();
    }
  }
  async _loadCountries() {
    if (this._isLoadingCountries = !0, this.data?.warehouseId) {
      const { data: e } = await l.getAvailableDestinationsForWarehouse(this.data.warehouseId);
      e && (this._countries = e);
    } else {
      const { data: e } = await l.getCountries();
      e && (this._countries = e);
    }
    this._isLoadingCountries = !1;
  }
  async _loadRegions(e) {
    if (this._isLoadingRegions = !0, this._regions = [], this.data?.warehouseId) {
      const { data: t } = await l.getAvailableRegionsForWarehouse(this.data.warehouseId, e);
      t && (this._regions = t);
    } else {
      const { data: t } = await l.getLocalityRegions(e);
      t && (this._regions = t);
    }
    this._isLoadingRegions = !1;
  }
  _handleCountryChange(e) {
    const t = e.target.value;
    this._countryCode = t, this._regionCode = "", this._regions = [], t && t !== "*" && this._loadRegions(t);
  }
  /** Options for destination dropdown */
  get _destinationOptions() {
    const e = [
      { name: "Select a destination...", value: "", selected: !this._countryCode },
      { name: "★ All Destinations (Default Rate)", value: "*", selected: this._countryCode === "*" }
    ];
    return this._countries.forEach((t) => {
      e.push({
        name: t.name,
        value: t.code,
        selected: t.code === this._countryCode
      });
    }), e;
  }
  /** Options for region dropdown */
  get _regionOptions() {
    const e = [
      { name: "Entire country (all regions)", value: "", selected: !this._regionCode }
    ];
    return this._regions.forEach((t) => {
      e.push({
        name: t.name,
        value: t.regionCode,
        selected: t.regionCode === this._regionCode
      });
    }), e;
  }
  async _save() {
    if (!this._countryCode) {
      c(this, n)?.peek("warning", {
        data: { headline: "Validation", message: "Country code is required" }
      });
      return;
    }
    if (this._cost < 0) {
      c(this, n)?.peek("warning", {
        data: { headline: "Validation", message: "Cost must be 0 or greater" }
      });
      return;
    }
    this._isSaving = !0;
    const e = {
      countryCode: this._countryCode.toUpperCase(),
      regionCode: this._regionCode.toUpperCase() || void 0,
      cost: this._cost
    };
    try {
      const t = this.data?.cost ? await l.updateShippingCost(this.data.cost.id, e) : await l.addShippingCost(this.data?.optionId, e);
      if (t.error) {
        c(this, n)?.peek("danger", {
          data: { headline: "Error", message: t.error.message }
        }), this._isSaving = !1;
        return;
      }
      c(this, n)?.peek("positive", {
        data: {
          headline: "Success",
          message: this.data?.cost ? "Cost updated" : "Cost added"
        }
      }), this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (t) {
      c(this, n)?.peek("danger", {
        data: { headline: "Error", message: t instanceof Error ? t.message : "Failed to save" }
      });
    }
    this._isSaving = !1;
  }
  _close() {
    this.modalContext?.reject();
  }
  render() {
    const e = !!this.data?.cost;
    return r`
      <umb-body-layout headline="${e ? "Edit" : "Add"} Shipping Rate">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>Set the shipping cost for a specific destination. Use "All Destinations" as a default rate that applies when no specific rate is configured.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Destination</uui-label>
            ${this._isLoadingCountries ? r`<uui-loader></uui-loader>` : r`
                  <uui-select
                    id="countryCode"
                    .options=${this._destinationOptions}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">Choose a specific country or set a default rate for all destinations</div>
          </uui-form-layout-item>

          ${this._countryCode && this._countryCode !== "*" ? r`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State</uui-label>
                  ${this._isLoadingRegions ? r`<uui-loader></uui-loader>` : this._regions.length > 0 ? r`
                          <uui-select
                            id="stateCode"
                            .options=${this._regionOptions}
                            @change=${(t) => this._regionCode = t.target.value}
                          ></uui-select>
                        ` : r`
                          <uui-input
                            id="stateCode"
                            .value=${this._regionCode}
                            @input=${(t) => this._regionCode = t.target.value}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">Optionally set a rate for a specific state or province</div>
                </uui-form-layout-item>
              ` : _}

          <uui-form-layout-item>
            <uui-label slot="label" for="cost" required>Shipping Rate</uui-label>
            <div class="cost-input-wrapper">
              <span class="currency-symbol">${this._currencySymbol}</span>
              <uui-input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                .value=${this._cost.toString()}
                @input=${(t) => this._cost = parseFloat(t.target.value) || 0}
                placeholder="0.00"
              ></uui-input>
            </div>
            <div slot="description">The shipping cost charged to customers for this destination</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${e ? "Save Rate" : "Add Rate"}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : _}
            ${e ? "Save Rate" : "Add Rate"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
i.styles = C`
    :host {
      display: block;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .info-box {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .info-box uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
    }

    uui-select,
    uui-input {
      width: 100%;
    }

    .cost-input-wrapper {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .currency-symbol {
      font-weight: 600;
      font-size: 1.125rem;
      color: var(--uui-color-text-alt);
    }

    .cost-input-wrapper uui-input {
      flex: 1;
      max-width: 150px;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
    }

    [slot="description"] {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }
  `;
s([
  a()
], i.prototype, "_isSaving", 2);
s([
  a()
], i.prototype, "_isLoadingCountries", 2);
s([
  a()
], i.prototype, "_isLoadingRegions", 2);
s([
  a()
], i.prototype, "_countryCode", 2);
s([
  a()
], i.prototype, "_regionCode", 2);
s([
  a()
], i.prototype, "_cost", 2);
s([
  a()
], i.prototype, "_currencySymbol", 2);
s([
  a()
], i.prototype, "_countries", 2);
s([
  a()
], i.prototype, "_regions", 2);
i = s([
  v("merchello-shipping-cost-modal")
], i);
const z = i;
export {
  i as MerchelloShippingCostModalElement,
  z as default
};
//# sourceMappingURL=shipping-cost-modal.element-h3V2BR4J.js.map
