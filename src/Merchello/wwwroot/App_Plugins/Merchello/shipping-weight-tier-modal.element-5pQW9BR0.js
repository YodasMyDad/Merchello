import { nothing as p, html as n, css as v, state as r, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as d } from "./merchello-api-BtOE5E-_.js";
var b = Object.defineProperty, x = Object.getOwnPropertyDescriptor, _ = (t) => {
  throw TypeError(t);
}, o = (t, e, i, h) => {
  for (var u = h > 1 ? void 0 : h ? x(e, i) : e, c = t.length - 1, g; c >= 0; c--)
    (g = t[c]) && (u = (h ? g(e, i, u) : g(u)) || u);
  return h && u && b(e, i, u), u;
}, m = (t, e, i) => e.has(t) || _("Cannot " + i), l = (t, e, i) => (m(t, e, "read from private field"), e.get(t)), W = (t, e, i) => e.has(t) ? _("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), w = (t, e, i, h) => (m(t, e, "write to private field"), e.set(t, i), i), s;
let a = class extends y {
  constructor() {
    super(), this._isSaving = !1, this._isLoadingCountries = !0, this._isLoadingRegions = !1, this._countryCode = "", this._stateOrProvinceCode = "", this._minWeightKg = 0, this._maxWeightKg = null, this._surcharge = 0, this._countries = [], this._regions = [], W(this, s), this.consumeContext(C, (t) => {
      w(this, s, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCountries(), this.data?.tier && (this._countryCode = this.data.tier.countryCode, this._stateOrProvinceCode = this.data.tier.stateOrProvinceCode ?? "", this._minWeightKg = this.data.tier.minWeightKg, this._maxWeightKg = this.data.tier.maxWeightKg ?? null, this._surcharge = this.data.tier.surcharge, this._countryCode && this._countryCode !== "*" && this._loadRegions(this._countryCode));
  }
  async _loadCountries() {
    if (this._isLoadingCountries = !0, this.data?.warehouseId) {
      const { data: t } = await d.getAvailableDestinationsForWarehouse(this.data.warehouseId);
      t && (this._countries = t);
    } else {
      const { data: t } = await d.getCountries();
      t && (this._countries = t);
    }
    this._isLoadingCountries = !1;
  }
  async _loadRegions(t) {
    if (this._isLoadingRegions = !0, this._regions = [], this.data?.warehouseId) {
      const { data: e } = await d.getAvailableRegionsForWarehouse(this.data.warehouseId, t);
      e && (this._regions = e);
    } else {
      const { data: e } = await d.getLocalityRegions(t);
      e && (this._regions = e);
    }
    this._isLoadingRegions = !1;
  }
  _handleCountryChange(t) {
    const e = t.target.value;
    this._countryCode = e, this._stateOrProvinceCode = "", this._regions = [], e && e !== "*" && this._loadRegions(e);
  }
  /** Options for destination dropdown */
  get _destinationOptions() {
    const t = [
      { name: "Select a destination...", value: "", selected: !this._countryCode },
      { name: "★ All Destinations (Default)", value: "*", selected: this._countryCode === "*" }
    ];
    return this._countries.forEach((e) => {
      t.push({
        name: e.name,
        value: e.code,
        selected: e.code === this._countryCode
      });
    }), t;
  }
  /** Options for region dropdown */
  get _regionOptions() {
    const t = [
      { name: "Entire country (all regions)", value: "", selected: !this._stateOrProvinceCode }
    ];
    return this._regions.forEach((e) => {
      t.push({
        name: e.name,
        value: e.regionCode,
        selected: e.regionCode === this._stateOrProvinceCode
      });
    }), t;
  }
  async _save() {
    if (!this._countryCode) {
      l(this, s)?.peek("warning", {
        data: { headline: "Validation", message: "Country code is required" }
      });
      return;
    }
    if (this._minWeightKg < 0) {
      l(this, s)?.peek("warning", {
        data: { headline: "Validation", message: "Min weight must be 0 or greater" }
      });
      return;
    }
    if (this._maxWeightKg !== null && this._maxWeightKg <= this._minWeightKg) {
      l(this, s)?.peek("warning", {
        data: { headline: "Validation", message: "Max weight must be greater than min weight" }
      });
      return;
    }
    if (this._surcharge < 0) {
      l(this, s)?.peek("warning", {
        data: { headline: "Validation", message: "Surcharge must be 0 or greater" }
      });
      return;
    }
    this._isSaving = !0;
    const t = {
      countryCode: this._countryCode.toUpperCase(),
      stateOrProvinceCode: this._stateOrProvinceCode.toUpperCase() || void 0,
      minWeightKg: this._minWeightKg,
      maxWeightKg: this._maxWeightKg ?? void 0,
      surcharge: this._surcharge
    };
    try {
      const e = this.data?.tier ? await d.updateShippingWeightTier(this.data.tier.id, t) : await d.addShippingWeightTier(this.data?.optionId, t);
      if (e.error) {
        l(this, s)?.peek("danger", {
          data: { headline: "Error", message: e.error.message }
        }), this._isSaving = !1;
        return;
      }
      l(this, s)?.peek("positive", {
        data: {
          headline: "Success",
          message: this.data?.tier ? "Weight tier updated" : "Weight tier added"
        }
      }), this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (e) {
      l(this, s)?.peek("danger", {
        data: { headline: "Error", message: e instanceof Error ? e.message : "Failed to save" }
      });
    }
    this._isSaving = !1;
  }
  _close() {
    this.modalContext?.reject();
  }
  render() {
    const t = !!this.data?.tier;
    return n`
      <umb-body-layout headline="${t ? "Edit" : "Add"} Weight Surcharge">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>Add extra charges based on order weight. Surcharges are added on top of the base shipping rate.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Destination</uui-label>
            ${this._isLoadingCountries ? n`<uui-loader></uui-loader>` : n`
                  <uui-select
                    id="countryCode"
                    .options=${this._destinationOptions}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">Choose a specific country or apply to all destinations</div>
          </uui-form-layout-item>

          ${this._countryCode && this._countryCode !== "*" ? n`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State</uui-label>
                  ${this._isLoadingRegions ? n`<uui-loader></uui-loader>` : this._regions.length > 0 ? n`
                          <uui-select
                            id="stateCode"
                            .options=${this._regionOptions}
                            @change=${(e) => this._stateOrProvinceCode = e.target.value}
                          ></uui-select>
                        ` : n`
                          <uui-input
                            id="stateCode"
                            .value=${this._stateOrProvinceCode}
                            @input=${(e) => this._stateOrProvinceCode = e.target.value}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">Optionally apply to a specific state or province</div>
                </uui-form-layout-item>
              ` : p}

          <div class="row">
            <uui-form-layout-item>
              <uui-label slot="label" for="minWeight" required>Min Weight (kg)</uui-label>
              <uui-input
                id="minWeight"
                type="number"
                step="0.01"
                min="0"
                .value=${this._minWeightKg.toString()}
                @input=${(e) => this._minWeightKg = parseFloat(e.target.value) || 0}
                placeholder="0"
              ></uui-input>
            </uui-form-layout-item>

            <uui-form-layout-item>
              <uui-label slot="label" for="maxWeight">Max Weight (kg)</uui-label>
              <uui-input
                id="maxWeight"
                type="number"
                step="0.01"
                min="0"
                .value=${this._maxWeightKg?.toString() ?? ""}
                @input=${(e) => {
      const i = e.target.value;
      this._maxWeightKg = i ? parseFloat(i) : null;
    }}
                placeholder="No limit"
              ></uui-input>
            </uui-form-layout-item>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="surcharge" required>Surcharge</uui-label>
            <div class="cost-input-wrapper">
              <span class="currency-symbol">$</span>
              <uui-input
                id="surcharge"
                type="number"
                step="0.01"
                min="0"
                .value=${this._surcharge.toString()}
                @input=${(e) => this._surcharge = parseFloat(e.target.value) || 0}
                placeholder="0.00"
              ></uui-input>
            </div>
            <div slot="description">Additional cost added to base shipping rate for this weight range</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${t ? "Save Surcharge" : "Add Surcharge"}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${this._isSaving ? n`<uui-loader-circle></uui-loader-circle>` : p}
            ${t ? "Save Surcharge" : "Add Surcharge"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
s = /* @__PURE__ */ new WeakMap();
a.styles = v`
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

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
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
o([
  r()
], a.prototype, "_isSaving", 2);
o([
  r()
], a.prototype, "_isLoadingCountries", 2);
o([
  r()
], a.prototype, "_isLoadingRegions", 2);
o([
  r()
], a.prototype, "_countryCode", 2);
o([
  r()
], a.prototype, "_stateOrProvinceCode", 2);
o([
  r()
], a.prototype, "_minWeightKg", 2);
o([
  r()
], a.prototype, "_maxWeightKg", 2);
o([
  r()
], a.prototype, "_surcharge", 2);
o([
  r()
], a.prototype, "_countries", 2);
o([
  r()
], a.prototype, "_regions", 2);
a = o([
  f("merchello-shipping-weight-tier-modal")
], a);
const P = a;
export {
  a as MerchelloShippingWeightTierModalElement,
  P as default
};
//# sourceMappingURL=shipping-weight-tier-modal.element-5pQW9BR0.js.map
