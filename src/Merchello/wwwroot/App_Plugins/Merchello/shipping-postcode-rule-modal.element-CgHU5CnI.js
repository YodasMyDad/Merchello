import { nothing as m, html as l, css as v, state as o, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as b } from "@umbraco-cms/backoffice/notification";
import { M as d } from "./merchello-api-BuImeZL2.js";
var C = Object.defineProperty, x = Object.getOwnPropertyDescriptor, g = (t) => {
  throw TypeError(t);
}, r = (t, e, a, c) => {
  for (var u = c > 1 ? void 0 : c ? x(e, a) : e, h = t.length - 1, p; h >= 0; h--)
    (p = t[h]) && (u = (c ? p(e, a, u) : p(u)) || u);
  return c && u && C(e, a, u), u;
}, _ = (t, e, a) => e.has(t) || g("Cannot " + a), n = (t, e, a) => (_(t, e, "read from private field"), e.get(t)), S = (t, e, a) => e.has(t) ? g("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), w = (t, e, a, c) => (_(t, e, "write to private field"), e.set(t, a), a), s;
let i = class extends f {
  constructor() {
    super(), this._isSaving = !1, this._isLoadingCountries = !0, this._countryCode = "", this._pattern = "", this._matchType = "Prefix", this._action = "Block", this._surcharge = 0, this._description = "", this._countries = [], S(this, s), this.consumeContext(b, (t) => {
      w(this, s, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCountries(), this.data?.rule && (this._countryCode = this.data.rule.countryCode, this._pattern = this.data.rule.pattern, this._matchType = this.data.rule.matchType, this._action = this.data.rule.action, this._surcharge = this.data.rule.surcharge, this._description = this.data.rule.description ?? "");
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
  get _countryOptions() {
    const t = [
      { name: "Select a country...", value: "", selected: !this._countryCode }
    ];
    return this._countries.forEach((e) => {
      t.push({
        name: e.name,
        value: e.code,
        selected: e.code === this._countryCode
      });
    }), t;
  }
  get _matchTypeOptions() {
    return [
      { name: "Prefix match (e.g., IM, HS, ZE)", value: "Prefix", selected: this._matchType === "Prefix" },
      { name: "UK outcode range (e.g., IV21-IV28)", value: "OutcodeRange", selected: this._matchType === "OutcodeRange" },
      { name: "Numeric range (e.g., 20010-21000)", value: "NumericRange", selected: this._matchType === "NumericRange" },
      { name: "Exact postcode", value: "Exact", selected: this._matchType === "Exact" }
    ];
  }
  get _actionOptions() {
    return [
      { name: "Block delivery", value: "Block", selected: this._action === "Block" },
      { name: "Add surcharge", value: "Surcharge", selected: this._action === "Surcharge" }
    ];
  }
  get _patternPlaceholder() {
    switch (this._matchType) {
      case "Prefix":
        return "e.g., IM, HS, ZE, BT";
      case "OutcodeRange":
        return "e.g., IV21-IV28, PA20-PA80";
      case "NumericRange":
        return "e.g., 20010-21000";
      case "Exact":
        return "e.g., IM1 1AA";
      default:
        return "Enter pattern";
    }
  }
  get _patternHelp() {
    switch (this._matchType) {
      case "Prefix":
        return "Matches any postcode starting with this prefix";
      case "OutcodeRange":
        return "Matches UK postcodes where the outcode falls within the range (e.g., IV21-IV28 matches IV21, IV22...IV28)";
      case "NumericRange":
        return "Matches numeric zip codes within the range (inclusive)";
      case "Exact":
        return "Matches this exact postcode (spaces and case are ignored)";
      default:
        return "";
    }
  }
  async _save() {
    if (!this._countryCode) {
      n(this, s)?.peek("warning", {
        data: { headline: "Validation", message: "Country is required" }
      });
      return;
    }
    if (!this._pattern.trim()) {
      n(this, s)?.peek("warning", {
        data: { headline: "Validation", message: "Pattern is required" }
      });
      return;
    }
    if (this._action === "Surcharge" && this._surcharge <= 0) {
      n(this, s)?.peek("warning", {
        data: { headline: "Validation", message: "Surcharge must be greater than 0" }
      });
      return;
    }
    this._isSaving = !0;
    const t = {
      countryCode: this._countryCode.toUpperCase(),
      pattern: this._pattern.trim(),
      matchType: this._matchType,
      action: this._action,
      surcharge: this._action === "Surcharge" ? this._surcharge : 0,
      description: this._description.trim() || void 0
    };
    try {
      const e = this.data?.rule ? await d.updateShippingPostcodeRule(this.data.rule.id, t) : await d.addShippingPostcodeRule(this.data?.optionId, t);
      if (e.error) {
        n(this, s)?.peek("danger", {
          data: { headline: "Error", message: e.error.message }
        }), this._isSaving = !1;
        return;
      }
      n(this, s)?.peek("positive", {
        data: {
          headline: "Success",
          message: this.data?.rule ? "Rule updated" : "Rule added"
        }
      }), this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (e) {
      n(this, s)?.peek("danger", {
        data: { headline: "Error", message: e instanceof Error ? e.message : "Failed to save" }
      });
    }
    this._isSaving = !1;
  }
  _close() {
    this.modalContext?.reject();
  }
  render() {
    const t = !!this.data?.rule;
    return l`
      <umb-body-layout headline="${t ? "Edit" : "Add"} Postcode Rule">
        <div class="form-content">
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>Create rules to block delivery or add surcharges for specific postcodes. Rules are evaluated by specificity - more specific patterns take precedence.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country</uui-label>
            ${this._isLoadingCountries ? l`<uui-loader></uui-loader>` : l`
                  <uui-select
                    id="countryCode"
                    .options=${this._countryOptions}
                    @change=${(e) => this._countryCode = e.target.value}
                  ></uui-select>
                `}
            <div slot="description">The country this rule applies to (postcode formats vary by country)</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="matchType" required>Match Type</uui-label>
            <uui-select
              id="matchType"
              .options=${this._matchTypeOptions}
              @change=${(e) => this._matchType = e.target.value}
            ></uui-select>
            <div slot="description">How the pattern should be matched against customer postcodes</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="pattern" required>Pattern</uui-label>
            <uui-input
              id="pattern"
              .value=${this._pattern}
              @input=${(e) => this._pattern = e.target.value}
              placeholder=${this._patternPlaceholder}
            ></uui-input>
            <div slot="description">${this._patternHelp}</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="action" required>Action</uui-label>
            <uui-select
              id="action"
              .options=${this._actionOptions}
              @change=${(e) => this._action = e.target.value}
            ></uui-select>
            <div slot="description">What happens when a customer's postcode matches this rule</div>
          </uui-form-layout-item>

          ${this._action === "Surcharge" ? l`
                <uui-form-layout-item>
                  <uui-label slot="label" for="surcharge" required>Surcharge Amount</uui-label>
                  <div class="cost-input-wrapper">
                    <span class="currency-symbol">$</span>
                    <uui-input
                      id="surcharge"
                      type="number"
                      step="0.01"
                      min="0.01"
                      .value=${this._surcharge.toString()}
                      @input=${(e) => this._surcharge = parseFloat(e.target.value) || 0}
                      placeholder="0.00"
                    ></uui-input>
                  </div>
                  <div slot="description">Additional amount added to shipping cost for matching postcodes</div>
                </uui-form-layout-item>
              ` : m}

          <uui-form-layout-item>
            <uui-label slot="label" for="description">Description</uui-label>
            <uui-input
              id="description"
              .value=${this._description}
              @input=${(e) => this._description = e.target.value}
              placeholder="e.g., Scottish Highlands surcharge"
            ></uui-input>
            <div slot="description">Optional note to help identify this rule in the list</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${t ? "Save Rule" : "Add Rule"}"
            ?disabled=${this._isSaving || !this._countryCode || !this._pattern}
            @click=${this._save}
          >
            ${this._isSaving ? l`<uui-loader-circle></uui-loader-circle>` : m}
            ${t ? "Save Rule" : "Add Rule"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
s = /* @__PURE__ */ new WeakMap();
i.styles = v`
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
r([
  o()
], i.prototype, "_isSaving", 2);
r([
  o()
], i.prototype, "_isLoadingCountries", 2);
r([
  o()
], i.prototype, "_countryCode", 2);
r([
  o()
], i.prototype, "_pattern", 2);
r([
  o()
], i.prototype, "_matchType", 2);
r([
  o()
], i.prototype, "_action", 2);
r([
  o()
], i.prototype, "_surcharge", 2);
r([
  o()
], i.prototype, "_description", 2);
r([
  o()
], i.prototype, "_countries", 2);
i = r([
  y("merchello-shipping-postcode-rule-modal")
], i);
const R = i;
export {
  i as MerchelloShippingPostcodeRuleModalElement,
  R as default
};
//# sourceMappingURL=shipping-postcode-rule-modal.element-CgHU5CnI.js.map
