import { nothing as c, html as n, css as f, state as l, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-DkRa4ImO.js";
var v = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, s = (i, r, a, e) => {
  for (var o = e > 1 ? void 0 : e ? _(r, a) : r, u = i.length - 1, d; u >= 0; u--)
    (d = i[u]) && (o = (e ? d(r, a, o) : d(o)) || o);
  return e && o && v(r, a, o), o;
};
let t = class extends h {
  constructor() {
    super(...arguments), this._name = "", this._code = "", this._fulfilmentProviderConfigurationId = "", this._fulfilmentProviderOptions = [], this._isLoadingProviders = !1, this._isSaving = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.supplier;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.supplier && (this._name = this.data.supplier.name, this._code = this.data.supplier.code ?? "", this._fulfilmentProviderConfigurationId = this.data.supplier.fulfilmentProviderConfigurationId ?? ""), this._loadFulfilmentProviders();
  }
  async _loadFulfilmentProviders() {
    this._isLoadingProviders = !0;
    const { data: i } = await p.getFulfilmentProviderOptions();
    this._fulfilmentProviderOptions = i ?? [], this._isLoadingProviders = !1;
  }
  _validate() {
    const i = {};
    return this._name.trim() || (i.name = "Supplier name is required"), this._errors = i, Object.keys(i).length === 0;
  }
  async _handleSave() {
    if (this._validate())
      if (this._isSaving = !0, this._isEditMode) {
        const i = this.data?.supplier?.id;
        if (!i) {
          this._errors = { general: "Supplier ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: r, error: a } = await p.updateSupplier(i, {
          name: this._name.trim(),
          code: this._code.trim() || void 0,
          fulfilmentProviderConfigurationId: this._fulfilmentProviderConfigurationId || void 0
        });
        if (this._isSaving = !1, a) {
          this._errors = { general: a.message };
          return;
        }
        this.value = { supplier: r, isUpdated: !0 }, this.modalContext?.submit();
      } else {
        const { data: i, error: r } = await p.createSupplier({
          name: this._name.trim(),
          code: this._code.trim() || void 0,
          fulfilmentProviderConfigurationId: this._fulfilmentProviderConfigurationId || void 0
        });
        if (this._isSaving = !1, r) {
          this._errors = { general: r.message };
          return;
        }
        this.value = { supplier: i, isCreated: !0 }, this.modalContext?.submit();
      }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const i = this._isEditMode ? "Edit Supplier" : "Add Supplier", r = this._isEditMode ? "Save Changes" : "Create Supplier", a = this._isEditMode ? "Saving..." : "Creating...";
    return n`
      <umb-body-layout headline=${i}>
        <div id="main">
          ${this._errors.general ? n`<div class="error-banner">${this._errors.general}</div>` : c}

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
            ${this._errors.name ? n`<span class="error">${this._errors.name}</span>` : c}
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

          <div class="form-row">
            <label for="fulfilment-provider">Fulfilment Provider</label>
            ${this._isLoadingProviders ? n`<uui-loader-bar></uui-loader-bar>` : n`
                  <uui-select
                    id="fulfilment-provider"
                    .options=${[
      { name: "None (manual fulfilment)", value: "", selected: !this._fulfilmentProviderConfigurationId },
      ...this._fulfilmentProviderOptions.filter((e) => e.isEnabled).map((e) => ({
        name: e.displayName,
        value: e.configurationId,
        selected: e.configurationId === this._fulfilmentProviderConfigurationId
      }))
    ]}
                    @change=${(e) => this._fulfilmentProviderConfigurationId = e.target.value}
                  ></uui-select>
                `}
            <span class="hint">Default fulfilment provider for products from this supplier</span>
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${r}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? a : r}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
t.styles = f`
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

    uui-input,
    uui-select {
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
s([
  l()
], t.prototype, "_name", 2);
s([
  l()
], t.prototype, "_code", 2);
s([
  l()
], t.prototype, "_fulfilmentProviderConfigurationId", 2);
s([
  l()
], t.prototype, "_fulfilmentProviderOptions", 2);
s([
  l()
], t.prototype, "_isLoadingProviders", 2);
s([
  l()
], t.prototype, "_isSaving", 2);
s([
  l()
], t.prototype, "_errors", 2);
t = s([
  m("merchello-supplier-modal")
], t);
const C = t;
export {
  t as MerchelloSupplierModalElement,
  C as default
};
//# sourceMappingURL=supplier-modal.element-BOZ87xad.js.map
