import { nothing as u, html as o, css as m, state as n, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as p } from "@umbraco-cms/backoffice/modal";
import { M as d } from "./merchello-api-CCwReUh_.js";
import "@umbraco-cms/backoffice/media";
var _ = Object.defineProperty, f = Object.getOwnPropertyDescriptor, l = (e, t, i, s) => {
  for (var r = s > 1 ? void 0 : s ? f(t, i) : t, c = e.length - 1, h; c >= 0; c--)
    (h = e[c]) && (r = (s ? h(t, i, r) : h(r)) || r);
  return s && r && _(t, i, r), r;
};
let a = class extends p {
  constructor() {
    super(...arguments), this._name = "", this._hexColour = "", this._image = null, this._isSaving = !1, this._isDeleting = !1, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.filter;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.filter && (this._name = this.data.filter.name, this._hexColour = this.data.filter.hexColour || "", this._image = this.data.filter.image);
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Filter name is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (this._validate())
      if (this._isSaving = !0, this._isEditMode) {
        const e = this.data?.filter?.id;
        if (!e) {
          this._errors = { general: "Filter ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: t, error: i } = await d.updateFilter(e, {
          name: this._name.trim(),
          hexColour: this._hexColour || null,
          image: this._image || null
        });
        if (this._isSaving = !1, i) {
          this._errors = { general: i.message };
          return;
        }
        this.value = { filter: t, isUpdated: !0 }, this.modalContext?.submit();
      } else {
        const e = this.data?.filterGroupId;
        if (!e) {
          this._errors = { general: "Filter group ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: t, error: i } = await d.createFilter(e, {
          name: this._name.trim(),
          hexColour: this._hexColour || void 0,
          image: this._image || void 0
        });
        if (this._isSaving = !1, i) {
          this._errors = { general: i.message };
          return;
        }
        this.value = { filter: t, isCreated: !0 }, this.modalContext?.submit();
      }
  }
  async _handleDelete() {
    const e = this.data?.filter?.id;
    if (!e || !confirm(`Are you sure you want to delete "${this._name}"? This cannot be undone.`)) return;
    this._isDeleting = !0;
    const { error: i } = await d.deleteFilter(e);
    if (this._isDeleting = !1, i) {
      this._errors = { general: i.message };
      return;
    }
    this.value = { isDeleted: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleColorChange(e) {
    const t = e.target;
    this._hexColour = t.value || "";
  }
  _handleMediaChange(e) {
    const i = e.target?.value || [];
    this._image = i.length > 0 && i[0].mediaKey || null;
  }
  _clearColor() {
    this._hexColour = "";
  }
  _clearImage() {
    this._image = null;
  }
  render() {
    const e = this._isEditMode ? "Edit Filter" : "Add Filter", t = this._isEditMode ? "Save Changes" : "Create Filter", i = this._isEditMode ? "Saving..." : "Creating...", s = this._image ? [{ key: this._image, mediaKey: this._image }] : [];
    return o`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? o`<div class="error-banner">${this._errors.general}</div>` : u}

          <div class="form-row">
            <label for="filter-name">Name <span class="required">*</span></label>
            <uui-input
              id="filter-name"
              .value=${this._name}
              @input=${(r) => this._name = r.target.value}
              placeholder="e.g., Red, Blue, Large, Cotton"
              label="Filter name">
            </uui-input>
            <span class="hint">The name of the filter value (e.g., Red, Blue, Large)</span>
            ${this._errors.name ? o`<span class="error">${this._errors.name}</span>` : u}
          </div>

          <div class="form-row">
            <label>Color (Optional)</label>
            <div class="color-picker-row">
              <uui-color-picker
                label="Filter color"
                .value=${this._hexColour}
                @change=${this._handleColorChange}>
              </uui-color-picker>
              ${this._hexColour ? o`
                    <div class="color-preview-row">
                      <span class="color-swatch" style="background: ${this._hexColour}"></span>
                      <span class="color-value">${this._hexColour}</span>
                      <uui-button
                        label="Clear"
                        look="placeholder"
                        compact
                        @click=${this._clearColor}>
                        <uui-icon name="icon-trash"></uui-icon>
                      </uui-button>
                    </div>
                  ` : u}
            </div>
            <span class="hint">Optional color for display (e.g., for color swatches)</span>
          </div>

          <div class="form-row">
            <label>Image (Optional)</label>
            <umb-input-rich-media
              .value=${s}
              ?multiple=${!1}
              @change=${this._handleMediaChange}>
            </umb-input-rich-media>
            ${this._image ? o`
                  <uui-button
                    label="Clear image"
                    look="placeholder"
                    compact
                    @click=${this._clearImage}>
                    <uui-icon name="icon-trash"></uui-icon> Clear image
                  </uui-button>
                ` : u}
            <span class="hint">Optional image for this filter (e.g., material texture)</span>
          </div>
        </div>

        <div slot="actions">
          ${this._isEditMode ? o`
                <uui-button
                  label="Delete"
                  look="secondary"
                  color="danger"
                  ?disabled=${this._isDeleting || this._isSaving}
                  @click=${this._handleDelete}>
                  ${this._isDeleting ? "Deleting..." : "Delete"}
                </uui-button>
              ` : u}
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${t}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving || this._isDeleting}
            @click=${this._handleSave}>
            ${this._isSaving ? i : t}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
a.styles = m`
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

    .color-picker-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .color-preview-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .color-swatch {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .color-value {
      font-family: monospace;
      font-size: 0.875rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    [slot="actions"] uui-button:first-child {
      margin-right: auto;
    }
  `;
l([
  n()
], a.prototype, "_name", 2);
l([
  n()
], a.prototype, "_hexColour", 2);
l([
  n()
], a.prototype, "_image", 2);
l([
  n()
], a.prototype, "_isSaving", 2);
l([
  n()
], a.prototype, "_isDeleting", 2);
l([
  n()
], a.prototype, "_errors", 2);
a = l([
  g("merchello-filter-modal")
], a);
const y = a;
export {
  a as MerchelloFilterModalElement,
  y as default
};
//# sourceMappingURL=filter-modal.element-LUKUQ_OJ.js.map
