import { nothing as m, html as u, css as p, state as d, customElement as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-Dp_zU_yi.js";
var f = Object.defineProperty, b = Object.getOwnPropertyDescriptor, l = (t, e, i, a) => {
  for (var r = a > 1 ? void 0 : a ? b(e, i) : e, s = t.length - 1, n; s >= 0; s--)
    (n = t[s]) && (r = (a ? n(e, i, r) : n(r)) || r);
  return a && r && f(e, i, r), r;
};
const c = "MerchelloCollectionForm";
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
  _handleNameInput(t) {
    this._name = t.target.value, (this._errors.name || this._errors.general) && (this._errors = {});
  }
  _validate() {
    const t = this.shadowRoot?.querySelector(`#${c}`);
    if (t && !t.checkValidity())
      return t.reportValidity(), !1;
    const e = {};
    return this._name.trim() || (e.name = "Collection name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave(t) {
    if (t?.preventDefault(), this._isSaving || !this._validate()) return;
    this._isSaving = !0, this._errors = {};
    const e = this._name.trim();
    if (this._isEditMode) {
      const i = this.data?.collection?.id;
      if (!i) {
        this._errors = { general: "Collection ID is missing" }, this._isSaving = !1;
        return;
      }
      const { data: a, error: r } = await h.updateProductCollection(i, {
        name: e
      });
      if (this._isSaving = !1, r) {
        this._errors = { general: r.message };
        return;
      }
      this.value = { collection: a, isUpdated: !0 }, this.modalContext?.submit();
    } else {
      const { data: i, error: a } = await h.createProductCollection({
        name: e
      });
      if (this._isSaving = !1, a) {
        this._errors = { general: a.message };
        return;
      }
      this.value = { collection: i, isCreated: !0 }, this.modalContext?.submit();
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const t = this._isEditMode ? "Edit Collection" : "Add Collection", e = this._isEditMode ? "Save Changes" : "Create Collection", i = this._isSaving ? "Saving..." : e;
    return u`
      <umb-body-layout headline=${t}>
        <div id="main">
          ${this._errors.general ? u`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              ` : m}

          <uui-box>
            <uui-form>
              <form id=${c} @submit=${this._handleSave}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="collection-name" required>Collection Name</uui-label>
                  <uui-input
                    id="collection-name"
                    name="collectionName"
                    label="Collection name"
                    maxlength="500"
                    required
                    placeholder="e.g., Summer Sale"
                    .value=${this._name}
                    @input=${this._handleNameInput}>
                  </uui-input>
                  <span class="hint">Use a clear, short name to identify this collection.</span>
                  ${this._errors.name ? u`<span class="error" role="alert">${this._errors.name}</span>` : m}
                </uui-form-layout-item>
              </form>
            </uui-form>
          </uui-box>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          type="submit"
          form=${c}
          label=${e}
          look="primary"
          color="positive"
          ?disabled=${this._isSaving}>
          ${i}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
o.styles = p`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    uui-input {
      width: 100%;
    }

    .hint {
      display: block;
      margin-top: var(--uui-size-space-2);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error {
      display: block;
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
    }
  `;
l([
  d()
], o.prototype, "_name", 2);
l([
  d()
], o.prototype, "_isSaving", 2);
l([
  d()
], o.prototype, "_errors", 2);
o = l([
  _("merchello-collection-modal")
], o);
const S = o;
export {
  o as MerchelloCollectionModalElement,
  S as default
};
//# sourceMappingURL=collection-modal.element-BWK46GE4.js.map
