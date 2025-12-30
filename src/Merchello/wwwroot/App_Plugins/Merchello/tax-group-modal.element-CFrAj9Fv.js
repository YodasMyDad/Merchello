import { nothing as d, html as o, css as h, state as l, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-BtOE5E-_.js";
var x = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, n = (a, e, r, t) => {
  for (var s = t > 1 ? void 0 : t ? _(e, r) : e, u = a.length - 1, c; u >= 0; u--)
    (c = a[u]) && (s = (t ? c(e, r, s) : c(s)) || s);
  return t && s && x(e, r, s), s;
};
let i = class extends m {
  constructor() {
    super(...arguments), this._name = "", this._taxPercentage = "", this._isSaving = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.taxGroup;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.taxGroup && (this._name = this.data.taxGroup.name, this._taxPercentage = String(this.data.taxGroup.taxPercentage));
  }
  _validate() {
    const a = {};
    this._name.trim() || (a.name = "Tax group name is required");
    const e = parseFloat(this._taxPercentage);
    return isNaN(e) ? a.taxPercentage = "Tax percentage is required" : (e < 0 || e > 100) && (a.taxPercentage = "Tax percentage must be between 0 and 100"), this._errors = a, Object.keys(a).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) return;
    this._isSaving = !0;
    const a = parseFloat(this._taxPercentage);
    if (this._isEditMode) {
      const e = this.data?.taxGroup?.id;
      if (!e) {
        this._errors = { general: "Tax group ID is missing" }, this._isSaving = !1;
        return;
      }
      const { data: r, error: t } = await p.updateTaxGroup(e, {
        name: this._name.trim(),
        taxPercentage: a
      });
      if (this._isSaving = !1, t) {
        this._errors = { general: t.message };
        return;
      }
      this.value = { taxGroup: r, isUpdated: !0 }, this.modalContext?.submit();
    } else {
      const { data: e, error: r } = await p.createTaxGroup({
        name: this._name.trim(),
        taxPercentage: a
      });
      if (this._isSaving = !1, r) {
        this._errors = { general: r.message };
        return;
      }
      this.value = { taxGroup: e, isCreated: !0 }, this.modalContext?.submit();
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const a = this._isEditMode ? "Edit Tax Group" : "Add Tax Group", e = this._isEditMode ? "Save Changes" : "Create Tax Group", r = this._isEditMode ? "Saving..." : "Creating...";
    return o`
      <umb-body-layout headline=${a}>
        <div id="main">
          ${this._errors.general ? o`<div class="error-banner">${this._errors.general}</div>` : d}

          <div class="form-row">
            <label for="tax-group-name">Name <span class="required">*</span></label>
            <uui-input
              id="tax-group-name"
              .value=${this._name}
              @input=${(t) => this._name = t.target.value}
              placeholder="e.g., Standard VAT"
              label="Tax group name">
            </uui-input>
            <span class="hint">A descriptive name for this tax rate</span>
            ${this._errors.name ? o`<span class="error">${this._errors.name}</span>` : d}
          </div>

          <div class="form-row">
            <label for="tax-percentage">Tax Rate (%) <span class="required">*</span></label>
            <uui-input
              id="tax-percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              .value=${this._taxPercentage}
              @input=${(t) => this._taxPercentage = t.target.value}
              placeholder="e.g., 20"
              label="Tax percentage">
            </uui-input>
            <span class="hint">The tax percentage (0-100). For example, 20 for 20% VAT.</span>
            ${this._errors.taxPercentage ? o`<span class="error">${this._errors.taxPercentage}</span>` : d}
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${e}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? r : e}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = h`
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
  `;
n([
  l()
], i.prototype, "_name", 2);
n([
  l()
], i.prototype, "_taxPercentage", 2);
n([
  l()
], i.prototype, "_isSaving", 2);
n([
  l()
], i.prototype, "_errors", 2);
i = n([
  g("merchello-tax-group-modal")
], i);
const y = i;
export {
  i as MerchelloTaxGroupModalElement,
  y as default
};
//# sourceMappingURL=tax-group-modal.element-CFrAj9Fv.js.map
