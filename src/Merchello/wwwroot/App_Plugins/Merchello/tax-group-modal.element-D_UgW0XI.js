import { html as r, nothing as p, css as y, state as d, customElement as R } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as w, UmbModalBaseElement as $, UMB_MODAL_MANAGER_CONTEXT as T, UMB_CONFIRM_MODAL as C } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as M } from "@umbraco-cms/backoffice/notification";
import { M as h } from "./merchello-api-DkRa4ImO.js";
import { c as G } from "./formatting-DQoM1drN.js";
const _ = new w("Merchello.TaxRate.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var S = Object.defineProperty, E = Object.getOwnPropertyDescriptor, b = (e) => {
  throw TypeError(e);
}, l = (e, t, a, i) => {
  for (var u = i > 1 ? void 0 : i ? E(t, a) : t, g = e.length - 1, m; g >= 0; g--)
    (m = e[g]) && (u = (i ? m(t, a, u) : m(u)) || u);
  return i && u && S(t, a, u), u;
}, f = (e, t, a) => t.has(e) || b("Cannot " + a), o = (e, t, a) => (f(e, t, "read from private field"), t.get(e)), x = (e, t, a) => t.has(e) ? b("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), v = (e, t, a, i) => (f(e, t, "write to private field"), t.set(e, a), a), n, c;
let s = class extends $ {
  constructor() {
    super(), this._name = "", this._taxPercentage = "", this._isSaving = !1, this._errors = {}, this._rates = [], this._isLoadingRates = !1, this._isDeletingRate = null, x(this, n), x(this, c), this.consumeContext(T, (e) => {
      v(this, n, e);
    }), this.consumeContext(M, (e) => {
      v(this, c, e);
    });
  }
  get _isEditMode() {
    return !!this.data?.taxGroup;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.taxGroup && (this._name = this.data.taxGroup.name, this._taxPercentage = String(this.data.taxGroup.taxPercentage), this._loadRates());
  }
  async _loadRates() {
    const e = this.data?.taxGroup?.id;
    if (!e) return;
    this._isLoadingRates = !0;
    const { data: t, error: a } = await h.getTaxGroupRates(e);
    if (this._isLoadingRates = !1, a) {
      o(this, c)?.peek("danger", {
        data: { headline: "Error", message: "Failed to load tax rates" }
      });
      return;
    }
    this._rates = t ?? [];
  }
  _validate() {
    const e = {};
    this._name.trim() || (e.name = "Tax group name is required");
    const t = parseFloat(this._taxPercentage);
    return isNaN(t) ? e.taxPercentage = "Tax percentage is required" : (t < 0 || t > 100) && (e.taxPercentage = "Tax percentage must be between 0 and 100"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) return;
    this._isSaving = !0;
    const e = parseFloat(this._taxPercentage);
    if (this._isEditMode) {
      const t = this.data?.taxGroup?.id;
      if (!t) {
        this._errors = { general: "Tax group ID is missing" }, this._isSaving = !1;
        return;
      }
      const { data: a, error: i } = await h.updateTaxGroup(t, {
        name: this._name.trim(),
        taxPercentage: e
      });
      if (this._isSaving = !1, i) {
        this._errors = { general: i.message };
        return;
      }
      this.value = { taxGroup: a, isUpdated: !0 }, this.modalContext?.submit();
    } else {
      const { data: t, error: a } = await h.createTaxGroup({
        name: this._name.trim(),
        taxPercentage: e
      });
      if (this._isSaving = !1, a) {
        this._errors = { general: a.message };
        return;
      }
      this.value = { taxGroup: t, isCreated: !0 }, this.modalContext?.submit();
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  async _handleAddRate() {
    const e = this.data?.taxGroup?.id;
    if (!e || !o(this, n)) return;
    (await o(this, n).open(this, _, {
      data: { taxGroupId: e }
    }).onSubmit().catch(() => null))?.isSaved && await this._loadRates();
  }
  async _handleEditRate(e) {
    const t = this.data?.taxGroup?.id;
    if (!t || !o(this, n)) return;
    (await o(this, n).open(this, _, {
      data: { taxGroupId: t, rate: e }
    }).onSubmit().catch(() => null))?.isSaved && await this._loadRates();
  }
  async _handleDeleteRate(e) {
    if (!o(this, n)) return;
    const t = e.regionName ? `${e.countryName ?? e.countryCode} - ${e.regionName}` : e.countryName ?? e.countryCode, a = o(this, n).open(this, C, {
      data: {
        headline: "Delete Tax Rate",
        content: `Are you sure you want to delete the tax rate for ${t}?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await a.onSubmit();
    } catch {
      return;
    }
    this._isDeletingRate = e.id;
    const { error: i } = await h.deleteTaxGroupRate(e.id);
    if (this._isDeletingRate = null, i) {
      o(this, c)?.peek("danger", {
        data: { headline: "Error", message: i.message }
      });
      return;
    }
    o(this, c)?.peek("positive", {
      data: { headline: "Success", message: "Tax rate deleted" }
    }), await this._loadRates();
  }
  _renderRatesSection() {
    return r`
      <div class="rates-section">
        <div class="rates-header">
          <div class="rates-title">
            <label>Regional Tax Rates</label>
            <span class="hint"
              >Define tax rates per country or state. If no rate exists for a customer's location, 0%
              tax will be applied.</span
            >
          </div>
          <uui-button
            look="outline"
            label="Add Rate"
            @click=${this._handleAddRate}
            ?disabled=${this._isLoadingRates}>
            <uui-icon name="icon-add"></uui-icon>
            Add Rate
          </uui-button>
        </div>

        ${this._isLoadingRates ? r`<uui-loader-bar></uui-loader-bar>` : this._rates.length === 0 ? r`
                <div class="empty-rates">
                  <uui-icon name="icon-globe"></uui-icon>
                  <p>No regional rates defined</p>
                  <span>Add regional rates to apply location-specific tax percentages</span>
                </div>
              ` : r`
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Country</uui-table-head-cell>
                    <uui-table-head-cell>State/Province</uui-table-head-cell>
                    <uui-table-head-cell style="text-align: right">Rate</uui-table-head-cell>
                    <uui-table-head-cell style="width: 100px"></uui-table-head-cell>
                  </uui-table-head>
                  ${this._rates.map(
      (e) => r`
                      <uui-table-row>
                        <uui-table-cell>
                          ${e.countryName ?? e.countryCode}
                        </uui-table-cell>
                        <uui-table-cell>
                          ${e.regionName ?? e.stateOrProvinceCode ?? "All regions"}
                        </uui-table-cell>
                        <uui-table-cell style="text-align: right">
                          ${G(e.taxPercentage, 2)}%
                        </uui-table-cell>
                        <uui-table-cell>
                          <div class="rate-actions">
                            <uui-button
                              look="default"
                              compact
                              label="Edit"
                              @click=${() => this._handleEditRate(e)}
                              ?disabled=${this._isDeletingRate === e.id}>
                              <uui-icon name="icon-edit"></uui-icon>
                            </uui-button>
                            <uui-button
                              look="default"
                              compact
                              label="Delete"
                              @click=${() => this._handleDeleteRate(e)}
                              ?disabled=${this._isDeletingRate === e.id}>
                              ${this._isDeletingRate === e.id ? r`<uui-loader-circle></uui-loader-circle>` : r`<uui-icon name="icon-delete"></uui-icon>`}
                            </uui-button>
                          </div>
                        </uui-table-cell>
                      </uui-table-row>
                    `
    )}
                </uui-table>
              `}
      </div>
    `;
  }
  render() {
    const e = this._isEditMode ? "Edit Tax Group" : "Add Tax Group", t = this._isEditMode ? "Save Changes" : "Create Tax Group", a = this._isEditMode ? "Saving..." : "Creating...";
    return r`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? r`<div class="error-banner">${this._errors.general}</div>` : p}

          <div class="form-row">
            <label for="tax-group-name">Name <span class="required">*</span></label>
            <uui-input
              id="tax-group-name"
              .value=${this._name}
              @input=${(i) => this._name = i.target.value}
              placeholder="e.g., Standard VAT"
              label="Tax group name">
            </uui-input>
            <span class="hint">A descriptive name for this tax rate</span>
            ${this._errors.name ? r`<span class="error">${this._errors.name}</span>` : p}
          </div>

          <div class="form-row">
            <label for="tax-percentage">Default Tax Rate (%) <span class="required">*</span></label>
            <uui-input
              id="tax-percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              .value=${this._taxPercentage}
              @input=${(i) => this._taxPercentage = i.target.value}
              placeholder="e.g., 20"
              label="Tax percentage">
            </uui-input>
            <span class="hint">Fallback rate used when no regional rate matches the customer's location.</span>
            ${this._errors.taxPercentage ? r`<span class="error">${this._errors.taxPercentage}</span>` : p}
          </div>

          ${this._isEditMode ? this._renderRatesSection() : p}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${t}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? a : t}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
s.styles = y`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .required {
      color: var(--uui-color-danger);
    }

    uui-input {
      width: 100%;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
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

    .error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    /* Rates section styles */
    .rates-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-5);
      border-top: 1px solid var(--uui-color-border);
    }

    .rates-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-4);
    }

    .rates-title {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .rates-title label {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .empty-rates {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-6);
      background: var(--uui-color-surface-alt);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      text-align: center;
    }

    .empty-rates uui-icon {
      font-size: 2rem;
      color: var(--uui-color-text-alt);
    }

    .empty-rates p {
      margin: 0;
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .empty-rates span {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    uui-table {
      width: 100%;
    }

    .rate-actions {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
    }

    .rate-actions uui-button {
      --uui-button-padding-left-factor: 1;
      --uui-button-padding-right-factor: 1;
    }
  `;
l([
  d()
], s.prototype, "_name", 2);
l([
  d()
], s.prototype, "_taxPercentage", 2);
l([
  d()
], s.prototype, "_isSaving", 2);
l([
  d()
], s.prototype, "_errors", 2);
l([
  d()
], s.prototype, "_rates", 2);
l([
  d()
], s.prototype, "_isLoadingRates", 2);
l([
  d()
], s.prototype, "_isDeletingRate", 2);
s = l([
  R("merchello-tax-group-modal")
], s);
const N = s;
export {
  s as MerchelloTaxGroupModalElement,
  N as default
};
//# sourceMappingURL=tax-group-modal.element-D_UgW0XI.js.map
