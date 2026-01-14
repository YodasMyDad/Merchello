import { nothing as u, html as o, css as h, state as c, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-BAKL0aIE.js";
var _ = Object.defineProperty, y = Object.getOwnPropertyDescriptor, n = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? y(t, a) : t, l = e.length - 1, d; l >= 0; l--)
    (d = e[l]) && (i = (s ? d(t, a, i) : d(i)) || i);
  return s && i && _(t, a, i), i;
};
let r = class extends v {
  constructor() {
    super(...arguments), this._name = "", this._isSaving = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.productType;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.productType && (this._name = this.data.productType.name);
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Product type name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (this._validate())
      if (this._isSaving = !0, this._isEditMode) {
        const e = this.data?.productType?.id;
        if (!e) {
          this._errors = { general: "Product type ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: t, error: a } = await p.updateProductType(e, {
          name: this._name.trim()
        });
        if (this._isSaving = !1, a) {
          this._errors = { general: a.message };
          return;
        }
        this.value = { productType: t, isUpdated: !0 }, this.modalContext?.submit();
      } else {
        const { data: e, error: t } = await p.createProductType({
          name: this._name.trim()
        });
        if (this._isSaving = !1, t) {
          this._errors = { general: t.message };
          return;
        }
        this.value = { productType: e, isCreated: !0 }, this.modalContext?.submit();
      }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = this._isEditMode ? "Edit Product Type" : "Add Product Type", t = this._isEditMode ? "Save Changes" : "Create Product Type", a = this._isEditMode ? "Saving..." : "Creating...";
    return o`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? o`<div class="error-banner">${this._errors.general}</div>` : u}

          <div class="form-row">
            <label for="product-type-name">Name <span class="required">*</span></label>
            <uui-input
              id="product-type-name"
              .value=${this._name}
              @input=${(s) => this._name = s.target.value}
              placeholder="e.g., Physical, Digital, Service"
              label="Product type name">
            </uui-input>
            <span class="hint">A descriptive name for this product type (e.g., Physical, Digital, Service)</span>
            ${this._errors.name ? o`<span class="error">${this._errors.name}</span>` : u}
          </div>

          ${this._isEditMode && this.data?.productType?.alias ? o`
                <div class="form-row">
                  <label>Alias</label>
                  <uui-input .value=${this.data.productType.alias} readonly disabled></uui-input>
                  <span class="hint">The alias is auto-generated and cannot be changed</span>
                </div>
              ` : u}
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
r.styles = h`
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
  c()
], r.prototype, "_name", 2);
n([
  c()
], r.prototype, "_isSaving", 2);
n([
  c()
], r.prototype, "_errors", 2);
r = n([
  m("merchello-product-type-modal")
], r);
const T = r;
export {
  r as MerchelloProductTypeModalElement,
  T as default
};
//# sourceMappingURL=product-type-modal.element-pnB2AKS2.js.map
