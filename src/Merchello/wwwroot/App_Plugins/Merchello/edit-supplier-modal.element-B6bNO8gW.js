import { nothing as d, html as p, css as c, state as l, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-BSrPLgGs.js";
var _ = Object.defineProperty, f = Object.getOwnPropertyDescriptor, t = (e, r, o, s) => {
  for (var a = s > 1 ? void 0 : s ? f(r, o) : r, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (a = (s ? u(r, o, a) : u(a)) || a);
  return s && a && _(r, o, a), a;
};
let i = class extends m {
  constructor() {
    super(...arguments), this._name = "", this._code = "", this._isSaving = !1, this._errors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.supplier && (this._name = this.data.supplier.name, this._code = this.data.supplier.code ?? "");
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Supplier name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) return;
    this._isSaving = !0;
    const e = this.data?.supplier.id;
    if (!e) {
      this._errors = { general: "Supplier ID is missing" }, this._isSaving = !1;
      return;
    }
    const { error: r } = await v.updateSupplier(e, {
      name: this._name.trim(),
      code: this._code.trim() || void 0
    });
    if (this._isSaving = !1, r) {
      this._errors = { general: r.message };
      return;
    }
    this.value = { updated: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    return p`
      <umb-body-layout headline="Edit Supplier">
        <div id="main">
          ${this._errors.general ? p`<div class="error-banner">${this._errors.general}</div>` : d}

          <div class="form-row">
            <label for="supplier-name">Supplier Name <span class="required">*</span></label>
            <uui-input
              id="supplier-name"
              .value=${this._name}
              @input=${(e) => this._name = e.target.value}
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
              @input=${(e) => this._code = e.target.value}
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
            label="Save Changes"
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? "Saving..." : "Save Changes"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = c`
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
t([
  l()
], i.prototype, "_name", 2);
t([
  l()
], i.prototype, "_code", 2);
t([
  l()
], i.prototype, "_isSaving", 2);
t([
  l()
], i.prototype, "_errors", 2);
i = t([
  h("merchello-edit-supplier-modal")
], i);
const y = i;
export {
  i as MerchelloEditSupplierModalElement,
  y as default
};
//# sourceMappingURL=edit-supplier-modal.element-B6bNO8gW.js.map
