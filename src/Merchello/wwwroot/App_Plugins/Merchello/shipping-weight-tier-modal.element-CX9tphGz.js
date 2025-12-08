import { nothing as v, html as g, css as _, state as n, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-DuHTSXU5.js";
var W = Object.defineProperty, b = Object.getOwnPropertyDescriptor, c = (t) => {
  throw TypeError(t);
}, u = (t, e, i, l) => {
  for (var o = l > 1 ? void 0 : l ? b(e, i) : e, d = t.length - 1, h; d >= 0; d--)
    (h = t[d]) && (o = (l ? h(e, i, o) : h(o)) || o);
  return l && o && W(e, i, o), o;
}, m = (t, e, i) => e.has(t) || c("Cannot " + i), s = (t, e, i) => (m(t, e, "read from private field"), e.get(t)), x = (t, e, i) => e.has(t) ? c("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), S = (t, e, i, l) => (m(t, e, "write to private field"), e.set(t, i), i), a;
let r = class extends y {
  constructor() {
    super(), this._isSaving = !1, this._countryCode = "", this._stateOrProvinceCode = "", this._minWeightKg = 0, this._maxWeightKg = null, this._surcharge = 0, x(this, a), this.consumeContext(C, (t) => {
      S(this, a, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.tier && (this._countryCode = this.data.tier.countryCode, this._stateOrProvinceCode = this.data.tier.stateOrProvinceCode ?? "", this._minWeightKg = this.data.tier.minWeightKg, this._maxWeightKg = this.data.tier.maxWeightKg ?? null, this._surcharge = this.data.tier.surcharge);
  }
  async _save() {
    if (!this._countryCode) {
      s(this, a)?.peek("warning", {
        data: { headline: "Validation", message: "Country code is required" }
      });
      return;
    }
    if (this._minWeightKg < 0) {
      s(this, a)?.peek("warning", {
        data: { headline: "Validation", message: "Min weight must be 0 or greater" }
      });
      return;
    }
    if (this._maxWeightKg !== null && this._maxWeightKg <= this._minWeightKg) {
      s(this, a)?.peek("warning", {
        data: { headline: "Validation", message: "Max weight must be greater than min weight" }
      });
      return;
    }
    if (this._surcharge < 0) {
      s(this, a)?.peek("warning", {
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
      const e = this.data?.tier ? await p.updateShippingWeightTier(this.data.tier.id, t) : await p.addShippingWeightTier(this.data?.optionId, t);
      if (e.error) {
        s(this, a)?.peek("danger", {
          data: { headline: "Error", message: e.error.message }
        }), this._isSaving = !1;
        return;
      }
      s(this, a)?.peek("positive", {
        data: {
          headline: "Success",
          message: this.data?.tier ? "Weight tier updated" : "Weight tier added"
        }
      }), this.modalContext?.setValue({ saved: !0 }), this.modalContext?.submit();
    } catch (e) {
      s(this, a)?.peek("danger", {
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
    return g`
      <umb-body-layout headline="${t ? "Edit" : "Add"} Weight Tier">
        <div class="form-content">
          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country Code</uui-label>
            <uui-input
              id="countryCode"
              .value=${this._countryCode}
              @input=${(e) => this._countryCode = e.target.value}
              placeholder="GB, US, * for all"
            ></uui-input>
            <div slot="description">Use * for all countries</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="stateCode">State/Province Code</uui-label>
            <uui-input
              id="stateCode"
              .value=${this._stateOrProvinceCode}
              @input=${(e) => this._stateOrProvinceCode = e.target.value}
              placeholder="CA, NY (optional)"
            ></uui-input>
            <div slot="description">Leave empty for country-wide tier</div>
          </uui-form-layout-item>

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
                placeholder="Leave empty for unlimited"
              ></uui-input>
            </uui-form-layout-item>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="surcharge" required>Surcharge</uui-label>
            <uui-input
              id="surcharge"
              type="number"
              step="0.01"
              min="0"
              .value=${this._surcharge.toString()}
              @input=${(e) => this._surcharge = parseFloat(e.target.value) || 0}
            ></uui-input>
            <div slot="description">Additional cost added to base shipping rate</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            label="${t ? "Save" : "Add"}"
            ?disabled=${this._isSaving}
            @click=${this._save}
          >
            ${this._isSaving ? g`<uui-loader-circle></uui-loader-circle>` : v}
            ${t ? "Save" : "Add"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
a = /* @__PURE__ */ new WeakMap();
r.styles = _`
    :host {
      display: block;
    }

    .form-content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    [slot="description"] {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }
  `;
u([
  n()
], r.prototype, "_isSaving", 2);
u([
  n()
], r.prototype, "_countryCode", 2);
u([
  n()
], r.prototype, "_stateOrProvinceCode", 2);
u([
  n()
], r.prototype, "_minWeightKg", 2);
u([
  n()
], r.prototype, "_maxWeightKg", 2);
u([
  n()
], r.prototype, "_surcharge", 2);
r = u([
  f("merchello-shipping-weight-tier-modal")
], r);
const k = r;
export {
  r as MerchelloShippingWeightTierModalElement,
  k as default
};
//# sourceMappingURL=shipping-weight-tier-modal.element-CX9tphGz.js.map
