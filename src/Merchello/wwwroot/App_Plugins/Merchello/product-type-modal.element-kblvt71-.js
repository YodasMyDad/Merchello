import { nothing as c, html as u, css as h, state as n, customElement as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-Dp_zU_yi.js";
var f = Object.defineProperty, v = Object.getOwnPropertyDescriptor, l = (e, r, a, i) => {
  for (var t = i > 1 ? void 0 : i ? v(r, a) : r, s = e.length - 1, d; s >= 0; s--)
    (d = e[s]) && (t = (i ? d(r, a, t) : d(t)) || t);
  return i && t && f(r, a, t), t;
};
const m = "MerchelloProductTypeForm";
let o = class extends y {
  constructor() {
    super(...arguments), this._name = "", this._isSaving = !1, this._nameError = null, this._generalError = null;
  }
  get _isEditMode() {
    return !!this.data?.productType;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.productType && (this._name = this.data.productType.name);
  }
  _validateName() {
    const e = this._name.trim();
    return e ? e.length > 120 ? (this._nameError = "Product type name must be 120 characters or fewer", !1) : (this._nameError = null, !0) : (this._nameError = "Product type name is required", !1);
  }
  _handleNameInput(e) {
    this._name = e.target.value, this._nameError = null, this._generalError = null;
  }
  async _handleSubmit(e) {
    if (e.preventDefault(), this._isSaving) return;
    const r = e.currentTarget;
    if (!r.checkValidity()) {
      r.reportValidity();
      return;
    }
    if (!this._validateName())
      return;
    this._isSaving = !0, this._generalError = null;
    const a = this._name.trim();
    if (this._isEditMode) {
      const i = this.data?.productType?.id;
      if (!i) {
        this._generalError = "Product type ID is missing", this._isSaving = !1;
        return;
      }
      const { data: t, error: s } = await p.updateProductType(i, {
        name: a
      });
      if (this._isSaving = !1, s) {
        this._generalError = s.message;
        return;
      }
      this.value = { productType: t, isUpdated: !0 }, this.modalContext?.submit();
    } else {
      const { data: i, error: t } = await p.createProductType({
        name: a
      });
      if (this._isSaving = !1, t) {
        this._generalError = t.message;
        return;
      }
      this.value = { productType: i, isCreated: !0 }, this.modalContext?.submit();
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = this._isEditMode ? "Edit Product Type" : "Add Product Type", r = this._isEditMode ? "Save Changes" : "Create Product Type", a = this._isEditMode ? "Saving..." : "Creating...";
    return u`
      <umb-body-layout .headline=${e}>
        <uui-form>
          <form id=${m} @submit=${this._handleSubmit} novalidate>
            ${this._generalError ? u`
                  <div class="error-banner" role="alert">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>${this._generalError}</span>
                  </div>
                ` : c}

            <uui-form-layout-item>
              <uui-label slot="label" for="product-type-name" required>Name</uui-label>
              <uui-input
                id="product-type-name"
                name="name"
                label="Product type name"
                required
                maxlength="120"
                .value=${this._name}
                placeholder="Physical, Digital, Service"
                @input=${this._handleNameInput}>
              </uui-input>
              <div class="field-hint">A clear display name used when classifying products.</div>
              ${this._nameError ? u`<div class="field-error" role="alert">${this._nameError}</div>` : c}
            </uui-form-layout-item>

            ${this._isEditMode && this.data?.productType?.alias ? u`
                  <uui-form-layout-item>
                    <uui-label slot="label" for="product-type-alias">Alias</uui-label>
                    <uui-input
                      id="product-type-alias"
                      label="Product type alias"
                      .value=${this.data.productType.alias}
                      readonly
                      disabled>
                    </uui-input>
                    <div class="field-hint">Alias is generated automatically and cannot be changed.</div>
                  </uui-form-layout-item>
                ` : c}
          </form>
        </uui-form>

        <uui-button
          slot="actions"
          label="Cancel"
          look="secondary"
          ?disabled=${this._isSaving}
          @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          .label=${r}
          look="primary"
          color="positive"
          type="submit"
          form=${m}
          ?disabled=${this._isSaving}>
          ${this._isSaving ? a : r}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
o.styles = h`
    :host {
      display: block;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    uui-input {
      width: 100%;
    }

    .field-hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    .field-error {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    .error-banner {
      align-items: center;
      background: var(--uui-color-danger-standalone);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger-contrast);
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
    }
  `;
l([
  n()
], o.prototype, "_name", 2);
l([
  n()
], o.prototype, "_isSaving", 2);
l([
  n()
], o.prototype, "_nameError", 2);
l([
  n()
], o.prototype, "_generalError", 2);
o = l([
  _("merchello-product-type-modal")
], o);
const P = o;
export {
  o as MerchelloProductTypeModalElement,
  P as default
};
//# sourceMappingURL=product-type-modal.element-kblvt71-.js.map
