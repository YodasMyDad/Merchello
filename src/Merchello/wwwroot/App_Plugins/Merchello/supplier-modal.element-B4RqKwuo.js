import { nothing as d, html as p, css as h, state as o, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as c } from "./merchello-api-CCwReUh_.js";
var _ = Object.defineProperty, g = Object.getOwnPropertyDescriptor, l = (e, i, r, a) => {
  for (var s = a > 1 ? void 0 : a ? g(i, r) : i, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (s = (a ? u(i, r, s) : u(s)) || s);
  return a && s && _(i, r, s), s;
};
let t = class extends v {
  constructor() {
    super(...arguments), this._name = "", this._code = "", this._isSaving = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.supplier;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.supplier && (this._name = this.data.supplier.name, this._code = this.data.supplier.code ?? "");
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Supplier name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (this._validate())
      if (this._isSaving = !0, this._isEditMode) {
        const e = this.data?.supplier?.id;
        if (!e) {
          this._errors = { general: "Supplier ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: i, error: r } = await c.updateSupplier(e, {
          name: this._name.trim(),
          code: this._code.trim() || void 0
        });
        if (this._isSaving = !1, r) {
          this._errors = { general: r.message };
          return;
        }
        this.value = { supplier: i, isUpdated: !0 }, this.modalContext?.submit();
      } else {
        const { data: e, error: i } = await c.createSupplier({
          name: this._name.trim(),
          code: this._code.trim() || void 0
        });
        if (this._isSaving = !1, i) {
          this._errors = { general: i.message };
          return;
        }
        this.value = { supplier: e, isCreated: !0 }, this.modalContext?.submit();
      }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = this._isEditMode ? "Edit Supplier" : "Add Supplier", i = this._isEditMode ? "Save Changes" : "Create Supplier", r = this._isEditMode ? "Saving..." : "Creating...";
    return p`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? p`<div class="error-banner">${this._errors.general}</div>` : d}

          <div class="form-row">
            <label for="supplier-name">Supplier Name <span class="required">*</span></label>
            <uui-input
              id="supplier-name"
              .value=${this._name}
              @input=${(a) => this._name = a.target.value}
              placeholder="e.g., Acme Distribution Co."
              label="Supplier name">
            </uui-input>
            <span class="hint">The name of the company or supplier</span>
            ${this._errors.name ? p`<span class="error">${this._errors.name}</span>` : d}
          </div>

          <div class="form-row">
            <label for="supplier-code">Reference Code</label>
            <uui-input
              id="supplier-code"
              .value=${this._code}
              @input=${(a) => this._code = a.target.value}
              placeholder="e.g., SUP-001"
              label="Supplier code">
            </uui-input>
            <span class="hint">Optional code for internal tracking or accounting systems</span>
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${i}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? r : i}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
t.styles = h`
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
l([
  o()
], t.prototype, "_name", 2);
l([
  o()
], t.prototype, "_code", 2);
l([
  o()
], t.prototype, "_isSaving", 2);
l([
  o()
], t.prototype, "_errors", 2);
t = l([
  m("merchello-supplier-modal")
], t);
const y = t;
export {
  t as MerchelloSupplierModalElement,
  y as default
};
//# sourceMappingURL=supplier-modal.element-B4RqKwuo.js.map
