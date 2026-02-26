import { nothing as p, html as a, css as C, state as r, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as y } from "@umbraco-cms/backoffice/notification";
import { M as l } from "./merchello-api-NdGX4WPd.js";
import { m } from "./modal-layout.styles-C2OaUji5.js";
var x = Object.defineProperty, b = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, s = (e, i, t, u) => {
  for (var n = u > 1 ? void 0 : u ? b(i, t) : i, c = e.length - 1, h; c >= 0; c--)
    (h = e[c]) && (n = (u ? h(i, t, n) : h(n)) || n);
  return u && n && x(i, t, n), n;
}, _ = (e, i, t) => i.has(e) || g("Cannot " + t), E = (e, i, t) => (_(e, i, "read from private field"), i.get(e)), w = (e, i, t) => i.has(e) ? g("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), S = (e, i, t, u) => (_(e, i, "write to private field"), i.set(e, t), t), d;
let o = class extends f {
  constructor() {
    super(), this._isSaving = !1, this._isLoadingCountries = !0, this._isLoadingRegions = !1, this._countryCode = "", this._regionCode = "", this._countries = [], this._regions = [], w(this, d), this.consumeContext(y, (e) => {
      S(this, d, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCountries(), this.data?.exclusion && (this._countryCode = this.data.exclusion.countryCode, this._regionCode = this.data.exclusion.regionCode ?? "", this._countryCode && this._loadRegions(this._countryCode));
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
      const { data: i } = await l.getAvailableRegionsForWarehouse(this.data.warehouseId, e);
      i && (this._regions = i);
    } else {
      const { data: i } = await l.getLocalityRegions(e);
      i && (this._regions = i);
    }
    this._isLoadingRegions = !1;
  }
  _handleCountryChange(e) {
    const i = e.target.value;
    this._countryCode = i, this._regionCode = "", this._regions = [], i && this._loadRegions(i);
  }
  get _destinationOptions() {
    const e = [
      { name: "Select a destination...", value: "", selected: !this._countryCode }
    ];
    return this._countries.forEach((i) => {
      e.push({
        name: i.name,
        value: i.code,
        selected: i.code === this._countryCode
      });
    }), e;
  }
  get _regionOptions() {
    const e = [
      { name: "Entire country (all regions)", value: "", selected: !this._regionCode }
    ];
    return this._regions.forEach((i) => {
      e.push({
        name: i.name,
        value: i.regionCode,
        selected: i.regionCode === this._regionCode
      });
    }), e;
  }
  async _save() {
    if (!this._countryCode) {
      E(this, d)?.peek("warning", {
        data: { headline: "Validation", message: "Destination country is required" }
      });
      return;
    }
    this._isSaving = !0, this.modalContext?.setValue({
      isSaved: !0,
      exclusion: {
        countryCode: this._countryCode.toUpperCase(),
        regionCode: this._regionCode.toUpperCase() || void 0
      }
    }), this.modalContext?.submit(), this._isSaving = !1;
  }
  _close() {
    this.modalContext?.reject();
  }
  render() {
    const e = !!this.data?.exclusion;
    return a`
      <umb-body-layout headline="${e ? "Edit" : "Add"} Destination Exclusion">
        <div class="form-content">
          <div class="info-box">
            <uui-icon name="icon-alert"></uui-icon>
            <span>Excluded destinations will not see this shipping option during basket estimate or checkout.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Destination Country</uui-label>
            ${this._isLoadingCountries ? a`<uui-loader></uui-loader>` : a`
                  <uui-select
                    id="countryCode"
                    label="Destination country"
                    .options=${this._destinationOptions}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
          </uui-form-layout-item>

          ${this._countryCode ? a`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State (Optional)</uui-label>
                  ${this._isLoadingRegions ? a`<uui-loader></uui-loader>` : this._regions.length > 0 ? a`
                          <uui-select
                            id="stateCode"
                            label="Destination region"
                            .options=${this._regionOptions}
                            @change=${(i) => this._regionCode = i.target.value}
                          ></uui-select>
                        ` : a`
                          <uui-input
                            id="stateCode"
                            label="Destination region code"
                            .value=${this._regionCode}
                            @input=${(i) => this._regionCode = i.target.value}
                            placeholder="Optional region code"
                          ></uui-input>
                        `}
                </uui-form-layout-item>
              ` : p}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="danger"
            label="${e ? "Save Exclusion" : "Add Exclusion"}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${e ? "Save Exclusion" : "Add Exclusion"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
o.styles = [
  m,
  C`
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
      color: var(--uui-color-danger);
    }

    uui-select,
    uui-input {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
    }
  `
];
s([
  r()
], o.prototype, "_isSaving", 2);
s([
  r()
], o.prototype, "_isLoadingCountries", 2);
s([
  r()
], o.prototype, "_isLoadingRegions", 2);
s([
  r()
], o.prototype, "_countryCode", 2);
s([
  r()
], o.prototype, "_regionCode", 2);
s([
  r()
], o.prototype, "_countries", 2);
s([
  r()
], o.prototype, "_regions", 2);
o = s([
  v("merchello-shipping-destination-exclusion-modal")
], o);
const k = o;
export {
  o as MerchelloShippingDestinationExclusionModalElement,
  k as default
};
//# sourceMappingURL=shipping-destination-exclusion-modal.element-BTDLEnnn.js.map
