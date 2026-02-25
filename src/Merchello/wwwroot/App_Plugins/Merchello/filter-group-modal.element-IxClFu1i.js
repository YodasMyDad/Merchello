import { nothing as p, html as u, css as h, state as m, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as _ } from "@umbraco-cms/backoffice/modal";
import { M as c } from "./merchello-api-NdGX4WPd.js";
import { m as g } from "./modal-layout.styles-C2OaUji5.js";
var v = Object.defineProperty, b = Object.getOwnPropertyDescriptor, n = (r, e, i, a) => {
  for (var t = a > 1 ? void 0 : a ? b(e, i) : e, l = r.length - 1, o; l >= 0; l--)
    (o = r[l]) && (t = (a ? o(e, i, t) : o(t)) || t);
  return a && t && v(e, i, t), t;
};
const d = "MerchelloFilterGroupForm";
let s = class extends _ {
  constructor() {
    super(...arguments), this._name = "", this._isSaving = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.filterGroup;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.filterGroup && (this._name = this.data.filterGroup.name);
  }
  _handleNameInput(r) {
    this._name = r.target.value, (this._errors.name || this._errors.general) && (this._errors = {});
  }
  _validate() {
    const r = this.shadowRoot?.querySelector(`#${d}`);
    if (r && !r.checkValidity())
      return r.reportValidity(), !1;
    const e = {};
    return this._name.trim() || (e.name = "Filter group name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave(r) {
    if (r?.preventDefault(), this._isSaving || !this._validate()) return;
    this._isSaving = !0, this._errors = {};
    const e = this._name.trim();
    if (this._isEditMode) {
      const t = this.data?.filterGroup?.id;
      if (!t) {
        this._errors = { general: "Filter group ID is missing" }, this._isSaving = !1;
        return;
      }
      const { data: l, error: o } = await c.updateFilterGroup(t, {
        name: e
      });
      if (this._isSaving = !1, o) {
        this._errors = { general: o.message };
        return;
      }
      this.value = { filterGroup: l, isUpdated: !0 }, this.modalContext?.submit();
      return;
    }
    const { data: i, error: a } = await c.createFilterGroup({
      name: e
    });
    if (this._isSaving = !1, a) {
      this._errors = { general: a.message };
      return;
    }
    this.value = { filterGroup: i, isCreated: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const r = this._isEditMode ? "Edit Filter Group" : "Add Filter Group", e = this._isEditMode ? "Save Changes" : "Create Filter Group", i = this._isSaving ? "Saving..." : e;
    return u`
      <umb-body-layout headline=${r}>
        <div id="main">
          ${this._errors.general ? u`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              ` : p}

          <uui-box>
            <uui-form>
              <form id=${d} @submit=${this._handleSave}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="filter-group-name" required>Filter Group Name</uui-label>
                  <uui-input
                    id="filter-group-name"
                    name="filterGroupName"
                    label="Filter group name"
                    maxlength="255"
                    required
                    placeholder="e.g., Color, Size, Material"
                    .value=${this._name}
                    @input=${this._handleNameInput}>
                  </uui-input>
                  <span class="hint">Use a clear label shown to merchandisers when assigning filter values.</span>
                  ${this._errors.name ? u`<span class="error" role="alert">${this._errors.name}</span>` : p}
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
          form=${d}
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
s.styles = [
  g,
  h`
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
  `
];
n([
  m()
], s.prototype, "_name", 2);
n([
  m()
], s.prototype, "_isSaving", 2);
n([
  m()
], s.prototype, "_errors", 2);
s = n([
  f("merchello-filter-group-modal")
], s);
const $ = s;
export {
  s as MerchelloFilterGroupModalElement,
  $ as default
};
//# sourceMappingURL=filter-group-modal.element-IxClFu1i.js.map
