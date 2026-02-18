import { nothing as d, html as n, css as x, state as h, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as k, UMB_MODAL_MANAGER_CONTEXT as D, UMB_CONFIRM_MODAL as M } from "@umbraco-cms/backoffice/modal";
import { M as _ } from "./merchello-api-Dp_zU_yi.js";
import "@umbraco-cms/backoffice/media";
var w = Object.defineProperty, F = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, l = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? F(t, i) : t, o = e.length - 1, c; o >= 0; o--)
    (c = e[o]) && (r = (a ? c(t, i, r) : c(r)) || r);
  return a && r && w(t, i, r), r;
}, y = (e, t, i) => t.has(e) || C("Cannot " + i), p = (e, t, i) => (y(e, t, "read from private field"), t.get(e)), b = (e, t, i) => t.has(e) ? C("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), g = (e, t, i, a) => (y(e, t, "write to private field"), t.set(e, i), i), m, u;
const f = "MerchelloFilterForm";
let s = class extends k {
  constructor() {
    super(), this._name = "", this._hexColour = "", this._image = null, this._isSaving = !1, this._isDeleting = !1, this._errors = {}, b(this, m), b(this, u, !1), this.consumeContext(D, (e) => {
      g(this, m, e);
    });
  }
  get _isEditMode() {
    return !!this.data?.filter;
  }
  connectedCallback() {
    super.connectedCallback(), g(this, u, !0), this.data?.filter && (this._name = this.data.filter.name, this._hexColour = this.data.filter.hexColour || "", this._image = this.data.filter.image);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, u, !1);
  }
  _handleNameInput(e) {
    this._name = e.target.value, (this._errors.name || this._errors.general) && (this._errors = {});
  }
  _validate() {
    const e = this.shadowRoot?.querySelector(`#${f}`);
    if (e && !e.checkValidity())
      return e.reportValidity(), !1;
    const t = {};
    return this._name.trim() || (t.name = "Filter name is required"), this._errors = t, Object.keys(t).length === 0;
  }
  async _handleSave(e) {
    if (e?.preventDefault(), this._isSaving || this._isDeleting || !this._validate()) return;
    this._isSaving = !0, this._errors = {};
    const t = this._name.trim();
    if (this._isEditMode) {
      const o = this.data?.filter?.id;
      if (!o) {
        this._errors = { general: "Filter ID is missing" }, this._isSaving = !1;
        return;
      }
      const { data: c, error: v } = await _.updateFilter(o, {
        name: t,
        hexColour: this._hexColour || null,
        image: this._image || null
      });
      if (this._isSaving = !1, v) {
        this._errors = { general: v.message };
        return;
      }
      this.value = { filter: c, isUpdated: !0 }, this.modalContext?.submit();
      return;
    }
    const i = this.data?.filterGroupId;
    if (!i) {
      this._errors = { general: "Filter group ID is missing" }, this._isSaving = !1;
      return;
    }
    const { data: a, error: r } = await _.createFilter(i, {
      name: t,
      hexColour: this._hexColour || void 0,
      image: this._image || void 0
    });
    if (this._isSaving = !1, r) {
      this._errors = { general: r.message };
      return;
    }
    this.value = { filter: a, isCreated: !0 }, this.modalContext?.submit();
  }
  async _handleDelete() {
    const e = this.data?.filter?.id;
    if (!e || this._isDeleting || this._isSaving) return;
    const t = this._name.trim() || "this filter", i = p(this, m)?.open(this, M, {
      data: {
        headline: "Delete Filter",
        content: `Delete "${t}"? This cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!p(this, u)) return;
    this._isDeleting = !0, this._errors = {};
    const { error: a } = await _.deleteFilter(e);
    if (p(this, u)) {
      if (this._isDeleting = !1, a) {
        this._errors = { general: a.message };
        return;
      }
      this.value = { isDeleted: !0 }, this.modalContext?.submit();
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleColorChange(e) {
    this._hexColour = e.target.value || "";
  }
  _handleMediaChange(e) {
    const i = e.target.value ?? [];
    this._image = i.length > 0 && i[0].mediaKey || null;
  }
  _clearColor() {
    this._hexColour = "";
  }
  _clearImage() {
    this._image = null;
  }
  render() {
    const e = this._isEditMode ? "Edit Filter" : "Add Filter", t = this._isEditMode ? "Save Changes" : "Create Filter", i = this._isSaving ? "Saving..." : t, a = this._image ? [{ key: this._image, mediaKey: this._image }] : [];
    return n`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? n`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              ` : d}

          <uui-box>
            <uui-form>
              <form id=${f} @submit=${this._handleSave}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="filter-name" required>Filter Name</uui-label>
                  <uui-input
                    id="filter-name"
                    name="filterName"
                    label="Filter name"
                    maxlength="255"
                    required
                    placeholder="e.g., Red, Blue, Large, Cotton"
                    .value=${this._name}
                    @input=${this._handleNameInput}>
                  </uui-input>
                  <span class="hint">Label shown when this filter value is selected on products.</span>
                  ${this._errors.name ? n`<span class="error" role="alert">${this._errors.name}</span>` : d}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Color (Optional)</uui-label>
                  <div class="field-stack">
                    <uui-color-picker
                      label="Filter color"
                      .value=${this._hexColour}
                      @change=${this._handleColorChange}>
                    </uui-color-picker>
                    ${this._hexColour ? n`
                          <div class="color-preview-row">
                            <span class="color-swatch" style="background: ${this._hexColour}"></span>
                            <span class="color-value">${this._hexColour}</span>
                            <uui-button
                              type="button"
                              label="Clear color"
                              look="secondary"
                              compact
                              @click=${this._clearColor}>
                              Clear
                            </uui-button>
                          </div>
                        ` : d}
                  </div>
                  <span class="hint">Optional color for storefront swatches.</span>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Image (Optional)</uui-label>
                  <div class="field-stack">
                    <umb-input-rich-media
                      .value=${a}
                      ?multiple=${!1}
                      @change=${this._handleMediaChange}>
                    </umb-input-rich-media>
                    ${this._image ? n`
                          <uui-button
                            type="button"
                            label="Clear image"
                            look="secondary"
                            compact
                            @click=${this._clearImage}>
                            Clear image
                          </uui-button>
                        ` : d}
                  </div>
                  <span class="hint">Optional image reference for material or texture-based filters.</span>
                </uui-form-layout-item>
              </form>
            </uui-form>
          </uui-box>
        </div>

        ${this._isEditMode ? n`
              <uui-button
                slot="actions"
                class="delete-action"
                label="Delete"
                look="secondary"
                color="danger"
                ?disabled=${this._isDeleting || this._isSaving}
                @click=${this._handleDelete}>
                ${this._isDeleting ? "Deleting..." : "Delete"}
              </uui-button>
            ` : d}
        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          type="submit"
          form=${f}
          label=${t}
          look="primary"
          color="positive"
          ?disabled=${this._isSaving || this._isDeleting}>
          ${i}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
m = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
s.styles = x`
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

    .field-stack {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
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

    .delete-action {
      margin-right: auto;
    }
  `;
l([
  h()
], s.prototype, "_name", 2);
l([
  h()
], s.prototype, "_hexColour", 2);
l([
  h()
], s.prototype, "_image", 2);
l([
  h()
], s.prototype, "_isSaving", 2);
l([
  h()
], s.prototype, "_isDeleting", 2);
l([
  h()
], s.prototype, "_errors", 2);
s = l([
  $("merchello-filter-modal")
], s);
const z = s;
export {
  s as MerchelloFilterModalElement,
  z as default
};
//# sourceMappingURL=filter-modal.element-KuzWQdJU.js.map
