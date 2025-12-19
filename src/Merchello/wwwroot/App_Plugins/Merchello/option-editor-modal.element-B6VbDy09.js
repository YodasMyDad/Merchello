import { nothing as u, html as s, css as y, state as m, customElement as D } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as x, UMB_MODAL_MANAGER_CONTEXT as V, UMB_CONFIRM_MODAL as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as O } from "@umbraco-cms/backoffice/notification";
var A = Object.defineProperty, C = Object.getOwnPropertyDescriptor, g = (a) => {
  throw TypeError(a);
}, p = (a, t, i, e) => {
  for (var o = e > 1 ? void 0 : e ? C(t, i) : t, n = a.length - 1, v; n >= 0; n--)
    (v = a[n]) && (o = (e ? v(t, i, o) : v(o)) || o);
  return e && o && A(t, i, o), o;
}, b = (a, t, i) => t.has(a) || g("Cannot " + i), f = (a, t, i) => (b(a, t, "read from private field"), t.get(a)), _ = (a, t, i) => t.has(a) ? g("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(a) : t.set(a, i), c = (a, t, i, e) => (b(a, t, "write to private field"), t.set(a, i), i), d, h, l;
let r = class extends x {
  constructor() {
    super(), this._formData = {
      name: "",
      alias: "",
      sortOrder: 0,
      optionTypeAlias: "",
      optionUiAlias: "dropdown",
      isVariant: !1,
      values: []
    }, this._isSaving = !1, this._errorMessage = null, this._originalIsVariant = !1, _(this, d), _(this, h), _(this, l, !1), this.consumeContext(O, (a) => {
      c(this, d, a);
    }), this.consumeContext(V, (a) => {
      c(this, h, a);
    });
  }
  connectedCallback() {
    super.connectedCallback(), c(this, l, !0), this.data?.option && (this._formData = { ...this.data.option }, this._originalIsVariant = this.data.option.isVariant);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), c(this, l, !1);
  }
  _getOptionTypeOptions() {
    const a = this.data?.settings?.optionTypeAliases ?? [];
    return [
      { name: "Select type...", value: "", selected: !this._formData.optionTypeAlias },
      ...a.map((t) => ({
        name: t.charAt(0).toUpperCase() + t.slice(1),
        value: t,
        selected: t === this._formData.optionTypeAlias
      }))
    ];
  }
  _getOptionUiOptions() {
    return (this.data?.settings?.optionUiAliases ?? []).map((t) => ({
      name: t.charAt(0).toUpperCase() + t.slice(1),
      value: t,
      selected: t === this._formData.optionUiAlias
    }));
  }
  async _handleSave() {
    if (this._validateForm()) {
      if (this.data?.option && this._originalIsVariant !== this._formData.isVariant) {
        const a = this._formData.isVariant ? "Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect." : "Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.";
        if (!await f(this, h)?.open(this, $, {
          data: {
            headline: "Change Variant Option",
            content: a,
            confirmLabel: "Continue",
            color: "warning"
          }
        })?.onSubmit().catch(() => {
        }) || !f(this, l)) return;
      }
      this.value = {
        isSaved: !0,
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
      }, f(this, d)?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } }), this.modalContext?.submit();
    }
  }
  _handleDelete() {
    this.value = {
      isSaved: !0,
      isDeleted: !0
    }, this.modalContext?.submit();
  }
  _validateForm() {
    return this._formData.name ? !this._formData.values || this._formData.values.length === 0 ? (this._errorMessage = "At least one value is required", !1) : !0 : (this._errorMessage = "Option name is required", !1);
  }
  _addValue() {
    const a = [...this._formData.values || []];
    a.push({
      id: crypto.randomUUID(),
      name: "",
      fullName: null,
      sortOrder: a.length,
      hexValue: null,
      mediaKey: null,
      priceAdjustment: 0,
      costAdjustment: 0,
      skuSuffix: null
    }), this._formData = { ...this._formData, values: a };
  }
  _removeValue(a) {
    const t = [...this._formData.values || []];
    t.splice(a, 1), t.forEach((i, e) => i.sortOrder = e), this._formData = { ...this._formData, values: t };
  }
  _updateValue(a, t, i) {
    const e = [...this._formData.values || []];
    e[a] = { ...e[a], [t]: i }, this._formData = { ...this._formData, values: e };
  }
  _renderValueEditor(a, t) {
    const i = this._formData.optionUiAlias;
    return s`
      <div class="value-row">
        <div class="value-main">
          <uui-input
            .value=${a.name}
            placeholder="Value name"
            @input=${(e) => this._updateValue(t, "name", e.target.value)}>
          </uui-input>

          ${i === "colour" ? s`
                <uui-input
                  type="color"
                  .value=${a.hexValue || "#000000"}
                  @input=${(e) => this._updateValue(t, "hexValue", e.target.value)}>
                </uui-input>
              ` : u}

          ${this._formData.isVariant ? u : s`
                <uui-input
                  type="number"
                  step="0.01"
                  .value=${String(a.priceAdjustment)}
                  placeholder="Price +/-"
                  @input=${(e) => this._updateValue(t, "priceAdjustment", parseFloat(e.target.value) || 0)}>
                </uui-input>

                <uui-input
                  .value=${a.skuSuffix || ""}
                  placeholder="SKU suffix"
                  @input=${(e) => this._updateValue(t, "skuSuffix", e.target.value)}>
                </uui-input>
              `}
        </div>

        <uui-button compact look="secondary" color="danger" @click=${() => this._removeValue(t)}>
          <uui-icon name="icon-trash"></uui-icon>
        </uui-button>
      </div>
    `;
  }
  _getMaxValues() {
    return this.data?.settings?.maxOptionValuesPerOption ?? 20;
  }
  _isAtMaxValues() {
    return (this._formData.values?.length ?? 0) >= this._getMaxValues();
  }
  render() {
    const a = !this.data?.option, t = this._formData.values?.length || 0, i = this._getMaxValues(), e = this._formData.isVariant && t > 0 ? `Will create ${t} variants` : "";
    return s`
      <umb-body-layout headline="${a ? "Add Option" : `Edit Option: ${this._formData.name}`}">
        <div class="modal-content">
          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : u}

          ${this._formData.isVariant && t > 0 ? s`
                <div class="info-banner">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Variant Generation</strong>
                    <p>${e} (when combined with other variant options, this creates a cartesian product)</p>
                  </div>
                </div>
              ` : u}

          <uui-box headline="Option Details">
            <umb-property-layout
              label="Option Name"
              description="Customer-facing name for this option"
              ?mandatory=${!0}>
              <uui-input
                slot="editor"
                .value=${this._formData.name || ""}
                placeholder="e.g., Size, Color, Material"
                @input=${(o) => this._formData = { ...this._formData, name: o.target.value }}
                aria-required="true">
              </uui-input>
            </umb-property-layout>

            <umb-property-layout
              label="Alias"
              description="Used in code/integrations (auto-generated if empty)">
              <uui-input
                slot="editor"
                .value=${this._formData.alias || ""}
                placeholder="Optional: machine-readable name"
                @input=${(o) => this._formData = { ...this._formData, alias: o.target.value }}>
              </uui-input>
            </umb-property-layout>

            <umb-property-layout
              label="Option Type"
              description="Categorize this option (e.g., colour, size, material)">
              <uui-select
                slot="editor"
                .options=${this._getOptionTypeOptions()}
                @change=${(o) => this._formData = { ...this._formData, optionTypeAlias: o.target.value }}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Display As"
              description="How customers select this option on your storefront">
              <uui-select
                slot="editor"
                .options=${this._getOptionUiOptions()}
                @change=${(o) => this._formData = { ...this._formData, optionUiAlias: o.target.value }}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Generates Variants"
              description="Creates all combinations (e.g., 3 sizes × 4 colors = 12 variants). If disabled, this is an add-on that modifies price.">
              <uui-toggle
                slot="editor"
                .checked=${this._formData.isVariant ?? !1}
                @change=${(o) => this._formData = { ...this._formData, isVariant: o.target.checked }}>
              </uui-toggle>
            </umb-property-layout>
          </uui-box>

          <uui-box>
            <div class="section-header" slot="headline">
              <span>Option Values</span>
              <span class="value-count">${t}/${i}</span>
            </div>
            <div class="section-header-actions" slot="header-actions">
              <uui-button
                compact
                look="primary"
                color="positive"
                @click=${this._addValue}
                label="Add Value"
                ?disabled=${this._isAtMaxValues()}>
                <uui-icon name="icon-add"></uui-icon>
                Add Value
              </uui-button>
            </div>

            ${this._formData.values && this._formData.values.length > 0 ? s`
                  <div class="values-list">
                    ${this._formData.values.map((o, n) => this._renderValueEditor(o, n))}
                  </div>
                ` : s`
                  <div class="empty-state">
                    <uui-icon name="icon-list"></uui-icon>
                    <p>No values added yet</p>
                    <p class="hint">Use the <strong>Add Value</strong> button above to add options like Small, Medium, Large</p>
                  </div>
                `}
          </uui-box>
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${() => this.modalContext?.reject()}> Cancel </uui-button>
          ${a ? u : s`
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
d = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
r.styles = y`
    :host {
      display: block;
    }

    .modal-content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .value-count {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      font-weight: normal;
    }

    .hint {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      display: block;
      margin: 0;
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
      padding: var(--uui-size-space-5);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 36px;
      opacity: 0.5;
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-state p {
      margin: var(--uui-size-space-2) 0;
    }

    .empty-state strong {
      color: var(--uui-color-text);
    }

    umb-property-layout uui-input,
    umb-property-layout uui-select {
      width: 100%;
    }
  `;
p([
  m()
], r.prototype, "_formData", 2);
p([
  m()
], r.prototype, "_isSaving", 2);
p([
  m()
], r.prototype, "_errorMessage", 2);
p([
  m()
], r.prototype, "_originalIsVariant", 2);
r = p([
  D("merchello-option-editor-modal")
], r);
const z = r;
export {
  r as MerchelloOptionEditorModalElement,
  z as default
};
//# sourceMappingURL=option-editor-modal.element-B6VbDy09.js.map
