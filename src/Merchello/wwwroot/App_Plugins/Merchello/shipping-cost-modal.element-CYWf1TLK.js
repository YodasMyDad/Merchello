import { nothing as g, html as s, css as C, state as n, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as m } from "@umbraco-cms/backoffice/notification";
import { M as c } from "./merchello-api-DuHTSXU5.js";
var b = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, a = (e, t, o, l) => {
  for (var u = l > 1 ? void 0 : l ? $(t, o) : t, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (u = (l ? h(t, o, u) : h(u)) || u);
  return l && u && b(t, o, u), u;
}, v = (e, t, o) => t.has(e) || _("Cannot " + o), d = (e, t, o) => (v(e, t, "read from private field"), t.get(e)), x = (e, t, o) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, o), S = (e, t, o, l) => (v(e, t, "write to private field"), t.set(e, o), o), r;
let i = class extends y {
  constructor() {
    super(), this._isSaving = !1, this._isLoadingCountries = !0, this._isLoadingRegions = !1, this._countryCode = "", this._stateOrProvinceCode = "", this._cost = 0, this._countries = [], this._regions = [], x(this, r), this.consumeContext(m, (e) => {
      S(this, r, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCountries(), this.data?.cost && (this._countryCode = this.data.cost.countryCode, this._stateOrProvinceCode = this.data.cost.stateOrProvinceCode ?? "", this._cost = this.data.cost.cost, this._countryCode && this._countryCode !== "*" && this._loadRegions(this._countryCode));
  }
  async _loadCountries() {
    this._isLoadingCountries = !0;
    const { data: e } = await c.getCountries();
    e && (this._countries = e), this._isLoadingCountries = !1;
  }
  async _loadRegions(e) {
    this._isLoadingRegions = !0, this._regions = [];
    const { data: t } = await c.getLocalityRegions(e);
    t && (this._regions = t), this._isLoadingRegions = !1;
  }
  _handleCountryChange(e) {
    const t = e.target.value;
    this._countryCode = t, this._stateOrProvinceCode = "", this._regions = [], t && t !== "*" && this._loadRegions(t);
  }
  async _save() {
    if (!this._countryCode) {
      d(this, r)?.peek("warning", {
        data: { headline: "Validation", message: "Country code is required" }
      });
      return;
    }
    if (this._cost < 0) {
      d(this, r)?.peek("warning", {
        data: { headline: "Validation", message: "Cost must be 0 or greater" }
      });
      return;
    }
    this._isSaving = !0;
    const e = {
      countryCode: this._countryCode.toUpperCase(),
      stateOrProvinceCode: this._stateOrProvinceCode.toUpperCase() || void 0,
      cost: this._cost
    };
    try {
      const t = this.data?.cost ? await c.updateShippingCost(this.data.cost.id, e) : await c.addShippingCost(this.data?.optionId, e);
      if (t.error) {
        d(this, r)?.peek("danger", {
          data: { headline: "Error", message: t.error.message }
        }), this._isSaving = !1;
        return;
      }
      d(this, r)?.peek("positive", {
        data: {
          headline: "Success",
          message: this.data?.cost ? "Cost updated" : "Cost added"
        }
      }), this.modalContext?.setValue({ saved: !0 }), this.modalContext?.submit();
    } catch (t) {
      d(this, r)?.peek("danger", {
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
    return s`
      <umb-body-layout headline="${e ? "Edit" : "Add"} Shipping Rate">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>Set the shipping cost for a specific destination. Use "All Destinations" as a default rate that applies when no specific rate is configured.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Destination</uui-label>
            ${this._isLoadingCountries ? s`<uui-loader></uui-loader>` : s`
                  <uui-select
                    id="countryCode"
                    @change=${this._handleCountryChange}
                    label="Select destination">
                    <option value="" ?selected=${!this._countryCode}>Select a destination...</option>
                    <option value="*" ?selected=${this._countryCode === "*"}>
                      ⭐ All Destinations (Default Rate)
                    </option>
                    <optgroup label="Countries">
                      ${this._countries.map(
      (t) => s`<option value="${t.code}" ?selected=${t.code === this._countryCode}>${t.name}</option>`
    )}
                    </optgroup>
                  </uui-select>
                `}
            <div slot="description">Choose a specific country or set a default rate for all destinations</div>
          </uui-form-layout-item>

          ${this._countryCode && this._countryCode !== "*" ? s`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State</uui-label>
                  ${this._isLoadingRegions ? s`<uui-loader></uui-loader>` : this._regions.length > 0 ? s`
                        <uui-select
                          id="stateCode"
                          @change=${(t) => this._stateOrProvinceCode = t.target.value}
                          label="Select region">
                          <option value="" ?selected=${!this._stateOrProvinceCode}>Entire country (all regions)</option>
                          ${this._regions.map(
      (t) => s`<option value="${t.regionCode}" ?selected=${t.regionCode === this._stateOrProvinceCode}>${t.name}</option>`
    )}
                        </uui-select>
                      ` : s`
                        <uui-input
                          id="stateCode"
                          .value=${this._stateOrProvinceCode}
                          @input=${(t) => this._stateOrProvinceCode = t.target.value}
                          placeholder="Optional: CA, NY, etc."
                        ></uui-input>
                      `}
                  <div slot="description">Optionally set a rate for a specific state or province</div>
                </uui-form-layout-item>
              ` : g}

          <uui-form-layout-item>
            <uui-label slot="label" for="cost" required>Shipping Rate</uui-label>
            <div class="cost-input-wrapper">
              <span class="currency-symbol">$</span>
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
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : g}
            ${e ? "Save Rate" : "Add Rate"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r = /* @__PURE__ */ new WeakMap();
i.styles = C`
    :host {
      display: block;
    }

    .form-content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      min-width: 400px;
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
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    [slot="description"] {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }
  `;
a([
  n()
], i.prototype, "_isSaving", 2);
a([
  n()
], i.prototype, "_isLoadingCountries", 2);
a([
  n()
], i.prototype, "_isLoadingRegions", 2);
a([
  n()
], i.prototype, "_countryCode", 2);
a([
  n()
], i.prototype, "_stateOrProvinceCode", 2);
a([
  n()
], i.prototype, "_cost", 2);
a([
  n()
], i.prototype, "_countries", 2);
a([
  n()
], i.prototype, "_regions", 2);
i = a([
  f("merchello-shipping-cost-modal")
], i);
const E = i;
export {
  i as MerchelloShippingCostModalElement,
  E as default
};
//# sourceMappingURL=shipping-cost-modal.element-CYWf1TLK.js.map
