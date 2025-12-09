import { nothing as l, html as s, css as f, state as d, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as _ } from "@umbraco-cms/backoffice/notification";
var b = Object.defineProperty, D = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, n = (e, a, t, i) => {
  for (var o = i > 1 ? void 0 : i ? D(a, t) : a, c = e.length - 1, p; c >= 0; c--)
    (p = e[c]) && (o = (i ? p(a, t, o) : p(o)) || o);
  return i && o && b(a, t, o), o;
}, h = (e, a, t) => a.has(e) || m("Cannot " + t), y = (e, a, t) => (h(e, a, "read from private field"), a.get(e)), x = (e, a, t) => a.has(e) ? m("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), $ = (e, a, t, i) => (h(e, a, "write to private field"), a.set(e, t), t), u;
let r = class extends g {
  constructor() {
    super(), this._formData = {
      name: "",
      alias: "",
      sortOrder: 0,
      optionTypeAlias: "",
      optionUiAlias: "dropdown",
      isVariant: !1,
      values: []
    }, this._isSaving = !1, this._errorMessage = null, this._originalIsVariant = !1, x(this, u), this.consumeContext(_, (e) => {
      $(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.option && (this._formData = { ...this.data.option }, this._originalIsVariant = this.data.option.isVariant);
  }
  _getOptionTypeOptions() {
    const e = this.data?.settings?.optionTypeAliases ?? [];
    return [
      { name: "Select type...", value: "", selected: !this._formData.optionTypeAlias },
      ...e.map((a) => ({
        name: a.charAt(0).toUpperCase() + a.slice(1),
        value: a,
        selected: a === this._formData.optionTypeAlias
      }))
    ];
  }
  _getOptionUiOptions() {
    return (this.data?.settings?.optionUiAliases ?? []).map((a) => ({
      name: a.charAt(0).toUpperCase() + a.slice(1),
      value: a,
      selected: a === this._formData.optionUiAlias
    }));
  }
  _handleSave() {
    this._validateForm() && (this.data?.option && this._originalIsVariant !== this._formData.isVariant && !confirm(
      this._formData.isVariant ? `Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect.

Continue?` : `Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.

Continue?`
    ) || (this.value = {
      saved: !0,
      option: {
        id: this._formData.id || crypto.randomUUID(),
        name: this._formData.name || "",
        alias: this._formData.alias || null,
        sortOrder: this._formData.sortOrder || 0,
        optionTypeAlias: this._formData.optionTypeAlias || null,
        optionUiAlias: this._formData.optionUiAlias || null,
        isVariant: this._formData.isVariant || !1,
        values: this._formData.values || []
      }
    }, y(this, u)?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } }), this.modalContext?.submit()));
  }
  _handleDelete() {
    this.value = {
      saved: !0,
      deleted: !0
    }, this.modalContext?.submit();
  }
  _validateForm() {
    return this._formData.name ? !this._formData.values || this._formData.values.length === 0 ? (this._errorMessage = "At least one value is required", !1) : !0 : (this._errorMessage = "Option name is required", !1);
  }
  _addValue() {
    const e = [...this._formData.values || []];
    e.push({
      id: crypto.randomUUID(),
      name: "",
      fullName: null,
      sortOrder: e.length,
      hexValue: null,
      mediaKey: null,
      priceAdjustment: 0,
      costAdjustment: 0,
      skuSuffix: null
    }), this._formData = { ...this._formData, values: e };
  }
  _removeValue(e) {
    const a = [...this._formData.values || []];
    a.splice(e, 1), a.forEach((t, i) => t.sortOrder = i), this._formData = { ...this._formData, values: a };
  }
  _updateValue(e, a, t) {
    const i = [...this._formData.values || []];
    i[e] = { ...i[e], [a]: t }, this._formData = { ...this._formData, values: i };
  }
  _renderValueEditor(e, a) {
    const t = this._formData.optionUiAlias;
    return s`
      <div class="value-row">
        <div class="value-main">
          <uui-input
            .value=${e.name}
            placeholder="Value name"
            @input=${(i) => this._updateValue(a, "name", i.target.value)}>
          </uui-input>

          ${t === "colour" ? s`
                <uui-input
                  type="color"
                  .value=${e.hexValue || "#000000"}
                  @input=${(i) => this._updateValue(a, "hexValue", i.target.value)}>
                </uui-input>
              ` : l}

          ${this._formData.isVariant ? l : s`
                <uui-input
                  type="number"
                  step="0.01"
                  .value=${String(e.priceAdjustment)}
                  placeholder="Price +/-"
                  @input=${(i) => this._updateValue(a, "priceAdjustment", parseFloat(i.target.value) || 0)}>
                </uui-input>

                <uui-input
                  .value=${e.skuSuffix || ""}
                  placeholder="SKU suffix"
                  @input=${(i) => this._updateValue(a, "skuSuffix", i.target.value)}>
                </uui-input>
              `}
        </div>

        <uui-button compact look="secondary" color="danger" @click=${() => this._removeValue(a)}>
          <uui-icon name="icon-trash"></uui-icon>
        </uui-button>
      </div>
    `;
  }
  render() {
    const e = !this.data?.option, a = this._formData.values?.length || 0, t = this._formData.isVariant && a > 0 ? `Will create ${a} variants` : "";
    return s`
      <umb-body-layout headline="${e ? "Add Option" : `Edit Option: ${this._formData.name}`}">
        <div class="modal-content">
          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : l}

          ${this._formData.isVariant && a > 0 ? s`
                <div class="info-banner">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Variant Generation</strong>
                    <p>${t} (when combined with other variant options, this creates a cartesian product)</p>
                  </div>
                </div>
              ` : l}

          <div class="form-section">
            <h3>Option Details</h3>

            <div class="form-field">
              <label>Option Name <span class="required">*</span></label>
              <uui-input
                .value=${this._formData.name || ""}
                placeholder="e.g., Size, Color, Material"
                @input=${(i) => this._formData = { ...this._formData, name: i.target.value }}
                aria-required="true">
              </uui-input>
              <small class="hint">Customer-facing name for this option</small>
            </div>

            <div class="form-field">
              <label>Alias</label>
              <uui-input
                .value=${this._formData.alias || ""}
                placeholder="Optional: machine-readable name"
                @input=${(i) => this._formData = { ...this._formData, alias: i.target.value }}>
              </uui-input>
              <small class="hint">Optional: Used in code/integrations (auto-generated if empty)</small>
            </div>

            <div class="form-field">
              <label>Option Type</label>
              <uui-select
                .options=${this._getOptionTypeOptions()}
                @change=${(i) => this._formData = { ...this._formData, optionTypeAlias: i.target.value }}>
              </uui-select>
              <small class="hint">Categorize this option (e.g., colour, size, material)</small>
            </div>

            <div class="form-field">
              <label>Display As</label>
              <uui-select
                .options=${this._getOptionUiOptions()}
                @change=${(i) => this._formData = { ...this._formData, optionUiAlias: i.target.value }}>
              </uui-select>
              <small class="hint">How customers select this option: dropdown (default), color swatches, or image gallery</small>
            </div>

            <div class="form-field">
              <div class="toggle-field">
                <uui-toggle
                  .checked=${this._formData.isVariant ?? !1}
                  @change=${(i) => this._formData = { ...this._formData, isVariant: i.target.checked }}>
                </uui-toggle>
                <div>
                  <label>Generates Variants</label>
                  <small class="hint">Creates all combinations (e.g., 3 sizes × 4 colors = 12 variants). If disabled, this is an add-on that modifies price.</small>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <div>
                <h3>Option Values <span class="required">*</span></h3>
                ${a > 0 ? s`<small class="hint">${a} value${a !== 1 ? "s" : ""}</small>` : l}
              </div>
              <uui-button compact look="primary" color="positive" @click=${this._addValue} label="Add Value">
                <uui-icon name="icon-add"></uui-icon>
                Add Value
              </uui-button>
            </div>

            ${this._formData.values && this._formData.values.length > 0 ? s`
                  <div class="values-list">
                    ${this._formData.values.map((i, o) => this._renderValueEditor(i, o))}
                  </div>
                ` : s`
                  <div class="empty-state">
                    <uui-icon name="icon-list"></uui-icon>
                    <p>No values added yet</p>
                    <p class="hint"><strong>Examples:</strong> Small, Medium, Large | Red, Blue, Green | Cotton, Polyester</p>
                    <uui-button look="primary" @click=${this._addValue}>
                      <uui-icon name="icon-add"></uui-icon>
                      Add Your First Value
                    </uui-button>
                  </div>
                `}
          </div>
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${() => this.modalContext?.reject()}> Cancel </uui-button>
          ${e ? l : s`
                <uui-button look="primary" color="danger" @click=${this._handleDelete} label="Delete Option">
                  <uui-icon name="icon-trash"></uui-icon>
                  Delete Option
                </uui-button>
              `}
          <uui-button look="primary" color="positive" ?disabled=${this._isSaving} @click=${this._handleSave}>
            <uui-icon name="icon-check"></uui-icon>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
r.styles = f`
    :host {
      display: block;
    }

    .modal-content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .form-section h3 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--uui-color-text);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-field label {
      font-weight: 600;
      color: var(--uui-color-text);
      font-size: 0.875rem;
    }

    .required {
      color: var(--uui-color-danger);
    }

    .hint {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      display: block;
      margin: 0;
    }

    .toggle-field {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
    }

    .toggle-field > div {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .toggle-field label {
      font-weight: 500;
    }

    .info-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border-left: 3px solid var(--uui-color-selected);
      border-radius: var(--uui-border-radius);
    }

    .info-banner uui-icon {
      font-size: 24px;
      color: var(--uui-color-selected);
      flex-shrink: 0;
    }

    .info-banner strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .info-banner p {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-surface);
      color: var(--uui-color-danger);
      border-radius: var(--uui-border-radius);
      border-left: 3px solid var(--uui-color-danger);
    }

    .values-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .value-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: flex-start;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .value-main {
      flex: 1;
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .value-main > * {
      flex: 1;
      min-width: 150px;
    }

    .empty-state {
      text-align: center;
      padding: var(--uui-size-space-6);
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .empty-state uui-icon {
      font-size: 48px;
      opacity: 0.5;
      margin-bottom: var(--uui-size-space-3);
    }

    .empty-state p {
      margin: var(--uui-size-space-2) 0;
    }

    .empty-state strong {
      color: var(--uui-color-text);
    }
  `;
n([
  d()
], r.prototype, "_formData", 2);
n([
  d()
], r.prototype, "_isSaving", 2);
n([
  d()
], r.prototype, "_errorMessage", 2);
n([
  d()
], r.prototype, "_originalIsVariant", 2);
r = n([
  v("merchello-option-editor-modal")
], r);
const k = r;
export {
  r as MerchelloOptionEditorModalElement,
  k as default
};
//# sourceMappingURL=option-editor-modal.element-R0uRNDLU.js.map
