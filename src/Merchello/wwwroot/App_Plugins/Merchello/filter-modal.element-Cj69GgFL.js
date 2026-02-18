import { nothing as u, html as o, css as C, state as n, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y, UMB_MODAL_MANAGER_CONTEXT as $, UMB_CONFIRM_MODAL as w } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-COnU_HX2.js";
import "@umbraco-cms/backoffice/media";
var M = Object.defineProperty, k = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, s = (e, i, t, l) => {
  for (var r = l > 1 ? void 0 : l ? k(i, t) : i, d = e.length - 1, m; d >= 0; d--)
    (m = e[d]) && (r = (l ? m(i, t, r) : m(r)) || r);
  return l && r && M(i, t, r), r;
}, b = (e, i, t) => i.has(e) || f("Cannot " + t), _ = (e, i, t) => (b(e, i, "read from private field"), i.get(e)), g = (e, i, t) => i.has(e) ? f("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), v = (e, i, t, l) => (b(e, i, "write to private field"), i.set(e, t), t), c, h;
let a = class extends y {
  constructor() {
    super(), this._name = "", this._hexColour = "", this._image = null, this._isSaving = !1, this._isDeleting = !1, this._errors = {}, g(this, c), g(this, h, !1), this.consumeContext($, (e) => {
      v(this, c, e);
    });
  }
  get _isEditMode() {
    return !!this.data?.filter;
  }
  connectedCallback() {
    super.connectedCallback(), v(this, h, !0), this.data?.filter && (this._name = this.data.filter.name, this._hexColour = this.data.filter.hexColour || "", this._image = this.data.filter.image);
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
        const { data: i, error: t } = await p.updateFilter(e, {
          name: this._name.trim(),
          hexColour: this._hexColour || null,
          image: this._image || null
        });
        if (this._isSaving = !1, t) {
          this._errors = { general: t.message };
          return;
        }
        this.value = { filter: i, isUpdated: !0 }, this.modalContext?.submit();
      } else {
        const e = this.data?.filterGroupId;
        if (!e) {
          this._errors = { general: "Filter group ID is missing" }, this._isSaving = !1;
          return;
        }
        const { data: i, error: t } = await p.createFilter(e, {
          name: this._name.trim(),
          hexColour: this._hexColour || void 0,
          image: this._image || void 0
        });
        if (this._isSaving = !1, t) {
          this._errors = { general: t.message };
          return;
        }
        this.value = { filter: i, isCreated: !0 }, this.modalContext?.submit();
      }
  }
  async _handleDelete() {
    const e = this.data?.filter?.id;
    if (!e) return;
    const i = _(this, c)?.open(this, w, {
      data: {
        headline: "Delete Filter",
        content: `Are you sure you want to delete "${this._name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!_(this, h)) return;
    this._isDeleting = !0;
    const { error: t } = await p.deleteFilter(e);
    if (_(this, h)) {
      if (this._isDeleting = !1, t) {
        this._errors = { general: t.message };
        return;
      }
      this.value = { isDeleted: !0 }, this.modalContext?.submit();
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleColorChange(e) {
    const i = e.target;
    this._hexColour = i.value || "";
  }
  _handleMediaChange(e) {
    const t = e.target?.value || [];
    this._image = t.length > 0 && t[0].mediaKey || null;
  }
  _clearColor() {
    this._hexColour = "";
  }
  _clearImage() {
    this._image = null;
  }
  render() {
    const e = this._isEditMode ? "Edit Filter" : "Add Filter", i = this._isEditMode ? "Save Changes" : "Create Filter", t = this._isEditMode ? "Saving..." : "Creating...", l = this._image ? [{ key: this._image, mediaKey: this._image }] : [];
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
              .value=${l}
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
            label=${i}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving || this._isDeleting}
            @click=${this._handleSave}>
            ${this._isSaving ? t : i}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
a.styles = C`
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
s([
  n()
], a.prototype, "_name", 2);
s([
  n()
], a.prototype, "_hexColour", 2);
s([
  n()
], a.prototype, "_image", 2);
s([
  n()
], a.prototype, "_isSaving", 2);
s([
  n()
], a.prototype, "_isDeleting", 2);
s([
  n()
], a.prototype, "_errors", 2);
a = s([
  x("merchello-filter-modal")
], a);
const O = a;
export {
  a as MerchelloFilterModalElement,
  O as default
};
//# sourceMappingURL=filter-modal.element-Cj69GgFL.js.map
