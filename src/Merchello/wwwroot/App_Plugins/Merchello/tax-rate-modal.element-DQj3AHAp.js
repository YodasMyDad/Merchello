import { nothing as g, html as s, css as f, state as n, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as C } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as y } from "@umbraco-cms/backoffice/notification";
import { M as c } from "./merchello-api-DFeoGYDY.js";
var x = Object.defineProperty, b = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, r = (e, t, i, d) => {
  for (var u = d > 1 ? void 0 : d ? b(t, i) : t, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (u = (d ? h(t, i, u) : h(u)) || u);
  return d && u && x(t, i, u), u;
}, v = (e, t, i) => t.has(e) || _("Cannot " + i), l = (e, t, i) => (v(e, t, "read from private field"), t.get(e)), R = (e, t, i) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), $ = (e, t, i, d) => (v(e, t, "write to private field"), t.set(e, i), i), o;
let a = class extends C {
  constructor() {
    super(), this._isSaving = !1, this._isLoadingCountries = !0, this._isLoadingRegions = !1, this._countryCode = "", this._regionCode = "", this._taxPercentage = 0, this._countries = [], this._regions = [], R(this, o), this.consumeContext(y, (e) => {
      $(this, o, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCountries(), this.data?.rate && (this._countryCode = this.data.rate.countryCode, this._regionCode = this.data.rate.regionCode ?? "", this._taxPercentage = this.data.rate.taxPercentage, this._countryCode && this._loadRegions(this._countryCode));
  }
  async _loadCountries() {
    this._isLoadingCountries = !0;
    const { data: e } = await c.getLocalityCountries();
    e && (this._countries = e.map((t) => ({ code: t.code, name: t.name }))), this._isLoadingCountries = !1;
  }
  async _loadRegions(e) {
    this._isLoadingRegions = !0, this._regions = [];
    const { data: t } = await c.getLocalityRegions(e);
    t && (this._regions = t.map((i) => ({ regionCode: i.regionCode, name: i.name }))), this._isLoadingRegions = !1;
  }
  _handleCountryChange(e) {
    const t = e.target.value;
    this._countryCode = t, this._regionCode = "", this._regions = [], t && this._loadRegions(t);
  }
  /** Options for country dropdown */
  get _countryOptions() {
    const e = [
      { name: "Select a country...", value: "", selected: !this._countryCode }
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
      l(this, o)?.peek("warning", {
        data: { headline: "Validation", message: "Country is required" }
      });
      return;
    }
    if (this._taxPercentage < 0 || this._taxPercentage > 100) {
      l(this, o)?.peek("warning", {
        data: { headline: "Validation", message: "Tax rate must be between 0 and 100" }
      });
      return;
    }
    this._isSaving = !0;
    try {
      if (this.data?.rate) {
        const e = await c.updateTaxGroupRate(this.data.rate.id, {
          taxPercentage: this._taxPercentage
        });
        if (e.error) {
          l(this, o)?.peek("danger", {
            data: { headline: "Error", message: e.error.message }
          }), this._isSaving = !1;
          return;
        }
        l(this, o)?.peek("positive", {
          data: { headline: "Success", message: "Tax rate updated" }
        });
      } else {
        const e = await c.createTaxGroupRate(this.data.taxGroupId, {
          countryCode: this._countryCode.toUpperCase(),
          regionCode: this._regionCode.toUpperCase() || void 0,
          taxPercentage: this._taxPercentage
        });
        if (e.error) {
          l(this, o)?.peek("danger", {
            data: { headline: "Error", message: e.error.message }
          }), this._isSaving = !1;
          return;
        }
        l(this, o)?.peek("positive", {
          data: { headline: "Success", message: "Tax rate added" }
        });
      }
      this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (e) {
      l(this, o)?.peek("danger", {
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
    const e = !!this.data?.rate;
    return s`
      <umb-body-layout headline="${e ? "Edit" : "Add"} Tax Rate">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span
              >Set the tax rate for a specific country or region. If no specific rate exists for a
              customer's location, 0% tax will be applied.</span
            >
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country</uui-label>
            ${this._isLoadingCountries ? s`<uui-loader></uui-loader>` : s`
                  <uui-select
                    id="countryCode"
                    label="Country"
                    .options=${this._countryOptions}
                    ?disabled=${e}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">
              ${e ? "Country cannot be changed when editing" : "Select the country this tax rate applies to"}
            </div>
          </uui-form-layout-item>

          ${this._countryCode ? s`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State</uui-label>
                  ${this._isLoadingRegions ? s`<uui-loader></uui-loader>` : this._regions.length > 0 ? s`
                          <uui-select
                            id="stateCode"
                            label="Region/State"
                            .options=${this._regionOptions}
                            ?disabled=${e}
                            @change=${(t) => this._regionCode = t.target.value}
                          ></uui-select>
                        ` : s`
                          <uui-input
                            id="stateCode"
                            label="Region/State"
                            .value=${this._regionCode}
                            ?disabled=${e}
                            @input=${(t) => this._regionCode = t.target.value}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">
                    ${e ? "Region cannot be changed when editing" : "Optionally set a rate for a specific state or province"}
                  </div>
                </uui-form-layout-item>
              ` : g}

          <uui-form-layout-item>
            <uui-label slot="label" for="taxPercentage" required>Tax Rate (%)</uui-label>
            <div class="rate-input-wrapper">
              <uui-input
                id="taxPercentage"
                label="Tax rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                .value=${this._taxPercentage.toString()}
                @input=${(t) => this._taxPercentage = parseFloat(t.target.value) || 0}
                placeholder="0.00"
              ></uui-input>
              <span class="percent-symbol">%</span>
            </div>
            <div slot="description">The tax percentage (0-100). For example, 20 for 20% VAT.</div>
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
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : g}
            ${e ? "Save Rate" : "Add Rate"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
o = /* @__PURE__ */ new WeakMap();
a.styles = f`
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

    .rate-input-wrapper {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .percent-symbol {
      font-weight: 600;
      font-size: 1.125rem;
      color: var(--uui-color-text-alt);
    }

    .rate-input-wrapper uui-input {
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
r([
  n()
], a.prototype, "_isSaving", 2);
r([
  n()
], a.prototype, "_isLoadingCountries", 2);
r([
  n()
], a.prototype, "_isLoadingRegions", 2);
r([
  n()
], a.prototype, "_countryCode", 2);
r([
  n()
], a.prototype, "_regionCode", 2);
r([
  n()
], a.prototype, "_taxPercentage", 2);
r([
  n()
], a.prototype, "_countries", 2);
r([
  n()
], a.prototype, "_regions", 2);
a = r([
  m("merchello-tax-rate-modal")
], a);
const E = a;
export {
  a as MerchelloTaxRateModalElement,
  E as default
};
//# sourceMappingURL=tax-rate-modal.element-DQj3AHAp.js.map
