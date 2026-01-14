import { nothing as c, html as u, css as h, state as d, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-BAKL0aIE.js";
var v = Object.defineProperty, g = Object.getOwnPropertyDescriptor, o = (e, r, i, s) => {
  for (var t = s > 1 ? void 0 : s ? g(r, i) : r, l = e.length - 1, n; l >= 0; l--)
    (n = e[l]) && (t = (s ? n(r, i, t) : n(t)) || t);
  return s && t && v(r, i, t), t;
};
let a = class extends f {
  constructor() {
    super(...arguments), this._name = "", this._isSaving = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.filterGroup;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.filterGroup && (this._name = this.data.filterGroup.name);
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Filter group name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (this._validate())
      if (this._isSaving = !0, this._isEditMode) {
        const e = this.data?.filterGroup?.id;
        if (!e) {
          this._errors = { general: "Filter group ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: r, error: i } = await p.updateFilterGroup(e, {
          name: this._name.trim()
        });
        if (this._isSaving = !1, i) {
          this._errors = { general: i.message };
          return;
        }
        this.value = { filterGroup: r, isUpdated: !0 }, this.modalContext?.submit();
      } else {
        const { data: e, error: r } = await p.createFilterGroup({
          name: this._name.trim()
        });
        if (this._isSaving = !1, r) {
          this._errors = { general: r.message };
          return;
        }
        this.value = { filterGroup: e, isCreated: !0 }, this.modalContext?.submit();
      }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = this._isEditMode ? "Edit Filter Group" : "Add Filter Group", r = this._isEditMode ? "Save Changes" : "Create Filter Group", i = this._isEditMode ? "Saving..." : "Creating...";
    return u`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? u`<div class="error-banner">${this._errors.general}</div>` : c}

          <div class="form-row">
            <label for="filter-group-name">Name <span class="required">*</span></label>
            <uui-input
              id="filter-group-name"
              .value=${this._name}
              @input=${(s) => this._name = s.target.value}
              placeholder="e.g., Color, Size, Material"
              label="Filter group name">
            </uui-input>
            <span class="hint">A descriptive name for this filter group (e.g., Color, Size, Material)</span>
            ${this._errors.name ? u`<span class="error">${this._errors.name}</span>` : c}
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
            ${this._isSaving ? i : r}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
a.styles = h`
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
o([
  d()
], a.prototype, "_name", 2);
o([
  d()
], a.prototype, "_isSaving", 2);
o([
  d()
], a.prototype, "_errors", 2);
a = o([
  m("merchello-filter-group-modal")
], a);
const C = a;
export {
  a as MerchelloFilterGroupModalElement,
  C as default
};
//# sourceMappingURL=filter-group-modal.element-BU1fd7Zc.js.map
