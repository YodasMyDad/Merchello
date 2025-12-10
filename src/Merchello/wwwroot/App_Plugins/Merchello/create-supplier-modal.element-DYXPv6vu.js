import { nothing as c, html as p, css as d, state as s, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-gshzVGsw.js";
var f = Object.defineProperty, b = Object.getOwnPropertyDescriptor, a = (e, i, l, t) => {
  for (var o = t > 1 ? void 0 : t ? b(i, l) : i, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (o = (t ? u(i, l, o) : u(o)) || o);
  return t && o && f(i, l, o), o;
};
let r = class extends v {
  constructor() {
    super(...arguments), this._name = "", this._code = "", this._isSaving = !1, this._errors = {};
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Supplier name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) return;
    this._isSaving = !0;
    const { data: e, error: i } = await h.createSupplier({
      name: this._name.trim(),
      code: this._code.trim() || void 0
    });
    if (this._isSaving = !1, i) {
      this._errors = { general: i.message };
      return;
    }
    this.value = {
      supplier: e
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    return p`
      <umb-body-layout headline="Create Supplier">
        <div id="main">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-factory"></uui-icon>
            <div>
              <strong>What is a Supplier?</strong>
              <p>Suppliers are companies or sources that provide your inventory. Link warehouses to suppliers to track where your stock comes from.</p>
            </div>
          </div>

          ${this._errors.general ? p`<div class="error-banner">${this._errors.general}</div>` : c}

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
            ${this._errors.name ? p`<span class="error">${this._errors.name}</span>` : c}
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
            label="Create Supplier"
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? "Creating..." : "Create Supplier"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = d`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    /* Info box */
    .info-box {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: linear-gradient(135deg, var(--uui-color-surface-alt) 0%, var(--uui-color-surface) 100%);
      border: 1px solid var(--uui-color-border);
      border-left: 4px solid var(--uui-color-interactive);
      border-radius: var(--uui-border-radius);
    }

    .info-box > uui-icon {
      flex-shrink: 0;
      font-size: 1.25rem;
      color: var(--uui-color-interactive);
    }

    .info-box strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
      font-size: 0.875rem;
    }

    .info-box p {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
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
a([
  s()
], r.prototype, "_name", 2);
a([
  s()
], r.prototype, "_code", 2);
a([
  s()
], r.prototype, "_isSaving", 2);
a([
  s()
], r.prototype, "_errors", 2);
r = a([
  m("merchello-create-supplier-modal")
], r);
const x = r;
export {
  r as MerchelloCreateSupplierModalElement,
  x as default
};
//# sourceMappingURL=create-supplier-modal.element-DYXPv6vu.js.map
