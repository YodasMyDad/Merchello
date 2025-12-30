import { nothing as u, html as c, css as h, state as d, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-BtOE5E-_.js";
var _ = Object.defineProperty, f = Object.getOwnPropertyDescriptor, s = (e, i, t, r) => {
  for (var a = r > 1 ? void 0 : r ? f(i, t) : i, l = e.length - 1, n; l >= 0; l--)
    (n = e[l]) && (a = (r ? n(i, t, a) : n(a)) || a);
  return r && a && _(i, t, a), a;
};
let o = class extends v {
  constructor() {
    super(...arguments), this._name = "", this._isSaving = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.collection;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.collection && (this._name = this.data.collection.name);
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Collection name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (this._validate())
      if (this._isSaving = !0, this._isEditMode) {
        const e = this.data?.collection?.id;
        if (!e) {
          this._errors = { general: "Collection ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: i, error: t } = await m.updateProductCollection(e, {
          name: this._name.trim()
        });
        if (this._isSaving = !1, t) {
          this._errors = { general: t.message };
          return;
        }
        this.value = { collection: i, isUpdated: !0 }, this.modalContext?.submit();
      } else {
        const { data: e, error: i } = await m.createProductCollection({
          name: this._name.trim()
        });
        if (this._isSaving = !1, i) {
          this._errors = { general: i.message };
          return;
        }
        this.value = { collection: e, isCreated: !0 }, this.modalContext?.submit();
      }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = this._isEditMode ? "Edit Collection" : "Add Collection", i = this._isEditMode ? "Save Changes" : "Create Collection", t = this._isEditMode ? "Saving..." : "Creating...";
    return c`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? c`<div class="error-banner">${this._errors.general}</div>` : u}

          <div class="form-row">
            <label for="collection-name">Collection Name <span class="required">*</span></label>
            <uui-input
              id="collection-name"
              .value=${this._name}
              @input=${(r) => this._name = r.target.value}
              placeholder="e.g., Summer Sale, New Arrivals"
              label="Collection name">
            </uui-input>
            <span class="hint">A name to identify this collection of products</span>
            ${this._errors.name ? c`<span class="error">${this._errors.name}</span>` : u}
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
            ${this._isSaving ? t : i}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
o.styles = h`
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
s([
  d()
], o.prototype, "_name", 2);
s([
  d()
], o.prototype, "_isSaving", 2);
s([
  d()
], o.prototype, "_errors", 2);
o = s([
  p("merchello-collection-modal")
], o);
const y = o;
export {
  o as MerchelloCollectionModalElement,
  y as default
};
//# sourceMappingURL=collection-modal.element-C4zOxlO3.js.map
