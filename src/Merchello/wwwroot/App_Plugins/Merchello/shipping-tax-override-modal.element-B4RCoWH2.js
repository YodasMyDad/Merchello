import { nothing as g, html as s, css as C, state as r, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as f } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-D-qg1PlO.js";
var x = Object.defineProperty, O = Object.getOwnPropertyDescriptor, v = (e) => {
  throw TypeError(e);
}, a = (e, i, t, l) => {
  for (var d = l > 1 ? void 0 : l ? O(i, t) : i, c = e.length - 1, h; c >= 0; c--)
    (h = e[c]) && (d = (l ? h(i, t, d) : h(d)) || d);
  return l && d && x(i, t, d), d;
}, _ = (e, i, t) => i.has(e) || v("Cannot " + t), u = (e, i, t) => (_(e, i, "read from private field"), i.get(e)), b = (e, i, t) => i.has(e) ? v("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), T = (e, i, t, l) => (_(e, i, "write to private field"), i.set(e, t), t), n;
let o = class extends m {
  constructor() {
    super(), this._isSaving = !1, this._isLoadingCountries = !0, this._isLoadingRegions = !1, this._isLoadingTaxGroups = !0, this._countryCode = "", this._stateOrProvinceCode = "", this._shippingTaxGroupId = null, this._countries = [], this._regions = [], this._taxGroups = [], b(this, n), this.consumeContext(f, (e) => {
      T(this, n, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCountries(), this._loadTaxGroups(), this.data?.override && (this._countryCode = this.data.override.countryCode, this._stateOrProvinceCode = this.data.override.stateOrProvinceCode ?? "", this._shippingTaxGroupId = this.data.override.shippingTaxGroupId ?? null, this._countryCode && this._loadRegions(this._countryCode));
  }
  async _loadCountries() {
    this._isLoadingCountries = !0;
    const { data: e } = await p.getLocalityCountries();
    e && (this._countries = e.map((i) => ({ code: i.code, name: i.name }))), this._isLoadingCountries = !1;
  }
  async _loadRegions(e) {
    this._isLoadingRegions = !0, this._regions = [];
    const { data: i } = await p.getLocalityRegions(e);
    i && (this._regions = i.map((t) => ({ regionCode: t.regionCode, name: t.name }))), this._isLoadingRegions = !1;
  }
  async _loadTaxGroups() {
    this._isLoadingTaxGroups = !0;
    const { data: e } = await p.getTaxGroups();
    e && (this._taxGroups = e), this._isLoadingTaxGroups = !1;
  }
  _handleCountryChange(e) {
    const i = e.target.value;
    this._countryCode = i, this._stateOrProvinceCode = "", this._regions = [], i && this._loadRegions(i);
  }
  /** Options for country dropdown */
  get _countryOptions() {
    const e = [
      { name: "Select a country...", value: "", selected: !this._countryCode }
    ];
    return this._countries.forEach((i) => {
      e.push({
        name: i.name,
        value: i.code,
        selected: i.code === this._countryCode
      });
    }), e;
  }
  /** Options for region dropdown */
  get _regionOptions() {
    const e = [
      { name: "Entire country (all regions)", value: "", selected: !this._stateOrProvinceCode }
    ];
    return this._regions.forEach((i) => {
      e.push({
        name: i.name,
        value: i.regionCode,
        selected: i.regionCode === this._stateOrProvinceCode
      });
    }), e;
  }
  /** Options for tax group dropdown */
  get _taxGroupOptions() {
    const e = [
      {
        name: "No shipping tax (never taxed)",
        value: "",
        selected: !this._shippingTaxGroupId
      }
    ];
    return this._taxGroups.forEach((i) => {
      e.push({
        name: `${i.name} (${i.taxPercentage}%)`,
        value: i.id,
        selected: i.id === this._shippingTaxGroupId
      });
    }), e;
  }
  async _save() {
    if (!this._countryCode) {
      u(this, n)?.peek("warning", {
        data: { headline: "Validation", message: "Country is required" }
      });
      return;
    }
    this._isSaving = !0;
    try {
      if (this.data?.override) {
        const e = await p.updateShippingTaxOverride(this.data.override.id, {
          shippingTaxGroupId: this._shippingTaxGroupId || void 0
        });
        if (e.error) {
          u(this, n)?.peek("danger", {
            data: { headline: "Error", message: e.error.message }
          }), this._isSaving = !1;
          return;
        }
        u(this, n)?.peek("positive", {
          data: { headline: "Success", message: "Shipping tax override updated" }
        });
      } else {
        const e = await p.createShippingTaxOverride({
          countryCode: this._countryCode.toUpperCase(),
          stateOrProvinceCode: this._stateOrProvinceCode.toUpperCase() || void 0,
          shippingTaxGroupId: this._shippingTaxGroupId || void 0
        });
        if (e.error) {
          u(this, n)?.peek("danger", {
            data: { headline: "Error", message: e.error.message }
          }), this._isSaving = !1;
          return;
        }
        u(this, n)?.peek("positive", {
          data: { headline: "Success", message: "Shipping tax override added" }
        });
      }
      this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (e) {
      u(this, n)?.peek("danger", {
        data: {
          headline: "Error",
          message: e instanceof Error ? e.message : "Failed to save"
        }
      });
    }
    this._isSaving = !1;
  }
  _close() {
    this.modalContext?.reject();
  }
  render() {
    const e = !!this.data?.override;
    return s`
      <umb-body-layout headline="${e ? "Edit" : "Add"} Shipping Tax Override">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              Regional shipping tax overrides take precedence over global settings. Set a tax group
              to apply that rate to shipping, or leave empty to indicate shipping is never taxed in
              this region.
            </span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country</uui-label>
            ${this._isLoadingCountries ? s`<uui-loader></uui-loader>` : s`
                  <uui-select
                    id="countryCode"
                    .options=${this._countryOptions}
                    ?disabled=${e}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">
              ${e ? "Country cannot be changed when editing" : "Select the country this override applies to"}
            </div>
          </uui-form-layout-item>

          ${this._countryCode ? s`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State</uui-label>
                  ${this._isLoadingRegions ? s`<uui-loader></uui-loader>` : this._regions.length > 0 ? s`
                          <uui-select
                            id="stateCode"
                            .options=${this._regionOptions}
                            ?disabled=${e}
                            @change=${(i) => this._stateOrProvinceCode = i.target.value}
                          ></uui-select>
                        ` : s`
                          <uui-input
                            id="stateCode"
                            .value=${this._stateOrProvinceCode}
                            ?disabled=${e}
                            @input=${(i) => this._stateOrProvinceCode = i.target.value}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">
                    ${e ? "Region cannot be changed when editing" : "Optionally set an override for a specific state or province"}
                  </div>
                </uui-form-layout-item>
              ` : g}

          <uui-form-layout-item>
            <uui-label slot="label" for="taxGroupId">Shipping Tax Group</uui-label>
            ${this._isLoadingTaxGroups ? s`<uui-loader></uui-loader>` : s`
                  <uui-select
                    id="taxGroupId"
                    .options=${this._taxGroupOptions}
                    @change=${(i) => {
      const t = i.target.value;
      this._shippingTaxGroupId = t || null;
    }}
                  ></uui-select>
                `}
            <div slot="description">
              Select a tax group to apply that rate to shipping. Leave empty to indicate shipping is
              never taxed in this region.
            </div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${e ? "Save Override" : "Add Override"}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : g}
            ${e ? "Save Override" : "Add Override"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
o.styles = C`
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
a([
  r()
], o.prototype, "_isSaving", 2);
a([
  r()
], o.prototype, "_isLoadingCountries", 2);
a([
  r()
], o.prototype, "_isLoadingRegions", 2);
a([
  r()
], o.prototype, "_isLoadingTaxGroups", 2);
a([
  r()
], o.prototype, "_countryCode", 2);
a([
  r()
], o.prototype, "_stateOrProvinceCode", 2);
a([
  r()
], o.prototype, "_shippingTaxGroupId", 2);
a([
  r()
], o.prototype, "_countries", 2);
a([
  r()
], o.prototype, "_regions", 2);
a([
  r()
], o.prototype, "_taxGroups", 2);
o = a([
  y("merchello-shipping-tax-override-modal")
], o);
const E = o;
export {
  o as MerchelloShippingTaxOverrideModalElement,
  E as default
};
//# sourceMappingURL=shipping-tax-override-modal.element-B4RCoWH2.js.map
