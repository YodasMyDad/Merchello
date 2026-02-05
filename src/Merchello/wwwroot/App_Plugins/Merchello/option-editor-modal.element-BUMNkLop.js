import { nothing as n, html as s, css as y, state as v, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as D, UMB_MODAL_MANAGER_CONTEXT as w, UMB_CONFIRM_MODAL as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as V } from "@umbraco-cms/backoffice/notification";
import { UMB_MEDIA_PICKER_MODAL as A } from "@umbraco-cms/backoffice/media";
import "@umbraco-cms/backoffice/imaging";
var k = Object.defineProperty, O = Object.getOwnPropertyDescriptor, b = (a) => {
  throw TypeError(a);
}, c = (a, e, t, o) => {
  for (var i = o > 1 ? void 0 : o ? O(e, t) : e, r = a.length - 1, f; r >= 0; r--)
    (f = a[r]) && (i = (o ? f(e, t, i) : f(i)) || i);
  return o && i && k(e, t, i), i;
}, _ = (a, e, t) => e.has(a) || b("Cannot " + t), d = (a, e, t) => (_(a, e, "read from private field"), e.get(a)), g = (a, e, t) => e.has(a) ? b("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(a) : e.set(a, t), h = (a, e, t, o) => (_(a, e, "write to private field"), e.set(a, t), t), m, p, u;
let l = class extends D {
  constructor() {
    super(), this._formData = {
      name: "",
      alias: "",
      sortOrder: 0,
      optionTypeAlias: "",
      optionUiAlias: "dropdown",
      isVariant: !1,
      values: []
    }, this._isSaving = !1, this._errorMessage = null, this._originalIsVariant = !1, g(this, m), g(this, p), g(this, u, !1), this.consumeContext(V, (a) => {
      h(this, m, a);
    }), this.consumeContext(w, (a) => {
      h(this, p, a);
    });
  }
  connectedCallback() {
    super.connectedCallback(), h(this, u, !0), this.data?.option && (this._formData = { ...this.data.option }, this._originalIsVariant = this.data.option.isVariant);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, u, !1);
  }
  _getOptionTypeOptions() {
    const a = this.data?.settings?.optionTypeAliases ?? [];
    return [
      { name: "Select type...", value: "", selected: !this._formData.optionTypeAlias },
      ...a.map((e) => ({
        name: e.charAt(0).toUpperCase() + e.slice(1),
        value: e,
        selected: e === this._formData.optionTypeAlias
      }))
    ];
  }
  _getOptionUiOptions() {
    return (this.data?.settings?.optionUiAliases ?? []).map((e) => ({
      name: e.charAt(0).toUpperCase() + e.slice(1),
      value: e,
      selected: e === this._formData.optionUiAlias
    }));
  }
  async _handleSave() {
    if (this._validateForm()) {
      if (this.data?.option && this._originalIsVariant !== this._formData.isVariant) {
        const a = this._formData.isVariant ? "Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect." : "Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.", e = d(this, p)?.open(this, $, {
          data: {
            headline: "Change Variant Option",
            content: a,
            confirmLabel: "Continue",
            color: "warning"
          }
        });
        try {
          await e?.onSubmit();
        } catch {
          return;
        }
        if (!d(this, u)) return;
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
      }, d(this, m)?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } }), this.modalContext?.submit();
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
      skuSuffix: null,
      weightKg: null
    }), this._formData = { ...this._formData, values: a };
  }
  _removeValue(a) {
    const e = [...this._formData.values || []];
    e.splice(a, 1), e.forEach((t, o) => t.sortOrder = o), this._formData = { ...this._formData, values: e };
  }
  _updateValue(a, e, t) {
    const o = [...this._formData.values || []];
    o[a] = { ...o[a], [e]: t }, this._formData = { ...this._formData, values: o };
  }
  async _openMediaPicker(a) {
    const e = this._formData.values?.[a];
    if (!e) return;
    const t = d(this, p)?.open(this, A, {
      data: {
        multiple: !1
      },
      value: {
        selection: e.mediaKey ? [e.mediaKey] : []
      }
    });
    try {
      const o = await t?.onSubmit();
      if (!d(this, u)) return;
      o?.selection?.length && this._updateValue(a, "mediaKey", o.selection[0]);
    } catch {
    }
  }
  _clearMedia(a) {
    this._updateValue(a, "mediaKey", null);
  }
  _renderValueEditor(a, e) {
    const t = this._formData.optionUiAlias, o = !this._formData.isVariant;
    return s`
      <div class="value-row ${o ? "is-addon" : ""}">
        <div class="value-content">
          <div class="value-name-row">
            <uui-input
              label="Value name"
              .value=${a.name}
              placeholder="Value name"
              @input=${(i) => this._updateValue(e, "name", i.target.value)}>
            </uui-input>

            ${t === "colour" ? s`
                  <uui-input
                    label="Color"
                    type="color"
                    class="color-input"
                    .value=${a.hexValue || "#000000"}
                    @input=${(i) => this._updateValue(e, "hexValue", i.target.value)}>
                  </uui-input>
                ` : n}

            ${t === "image" ? s`
                  <div class="image-picker">
                    ${a.mediaKey ? s`
                          <div class="image-preview" @click=${() => this._openMediaPicker(e)}>
                            <umb-imaging-thumbnail
                              .unique=${a.mediaKey}
                              .width=${40}
                              .height=${40}
                              icon="icon-picture">
                            </umb-imaging-thumbnail>
                          </div>
                          <uui-button
                            compact
                            look="secondary"
                            label="Remove image"
                            @click=${() => this._clearMedia(e)}>
                            <uui-icon name="icon-delete"></uui-icon>
                          </uui-button>
                        ` : s`
                          <uui-button
                            compact
                            look="secondary"
                            label="Select image"
                            @click=${() => this._openMediaPicker(e)}>
                            <uui-icon name="icon-picture"></uui-icon>
                          </uui-button>
                        `}
                  </div>
                ` : n}
          </div>

          ${o ? s`
                <div class="addon-fields">
                  <div class="addon-field">
                    <label class="field-label">Price +/-</label>
                    <uui-input
                      label="Price adjustment"
                      type="number"
                      step="0.01"
                      .value=${String(a.priceAdjustment)}
                      placeholder="0.00"
                      @input=${(i) => this._updateValue(e, "priceAdjustment", parseFloat(i.target.value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field">
                    <label class="field-label">Cost +/-</label>
                    <uui-input
                      label="Cost adjustment"
                      type="number"
                      step="0.01"
                      .value=${String(a.costAdjustment)}
                      placeholder="0.00"
                      @input=${(i) => this._updateValue(e, "costAdjustment", parseFloat(i.target.value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field sku-field">
                    <label class="field-label">SKU Suffix</label>
                    <uui-input
                      label="SKU suffix"
                      .value=${a.skuSuffix || ""}
                      placeholder="e.g., -GW"
                      @input=${(i) => this._updateValue(e, "skuSuffix", i.target.value)}>
                    </uui-input>
                  </div>
                </div>

                <div class="addon-fields shipping-fields">
                  <div class="addon-field weight-field">
                    <label class="field-label">+ Weight (kg)</label>
                    <uui-input
                      label="Weight"
                      type="number"
                      step="0.001"
                      .value=${a.weightKg != null ? String(a.weightKg) : ""}
                      placeholder="0.000"
                      title="Additional weight added to the product for shipping"
                      @input=${(i) => {
      const r = i.target.value;
      this._updateValue(e, "weightKg", r ? parseFloat(r) : null);
    }}>
                    </uui-input>
                    <span class="field-hint">Added to product weight</span>
                  </div>
                </div>
              ` : n}
        </div>

        <uui-button compact look="secondary" color="danger" label="Remove value" @click=${() => this._removeValue(e)}>
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
    const a = !this.data?.option, e = this._formData.values?.length || 0, t = this._getMaxValues(), o = this._formData.isVariant && e > 0 ? `Will create ${e} variants` : "";
    return s`
      <umb-body-layout headline="${a ? "Add Option" : `Edit Option: ${this._formData.name}`}">
        <div class="modal-content">
          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : n}

          ${this._formData.isVariant && e > 0 ? s`
                <div class="info-banner">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Variant Generation</strong>
                    <p>${o} (when combined with other variant options, this creates a cartesian product)</p>
                  </div>
                </div>
              ` : n}

          ${!this._formData.isVariant && e > 0 ? s`
                <div class="info-banner addon-info">
                  <uui-icon name="icon-coin"></uui-icon>
                  <div>
                    <strong>Add-on Pricing &amp; Shipping</strong>
                    <p>Price, cost, and weight adjustments are <em>added</em> to the base product when customers select this option. Weight affects shipping calculations.</p>
                  </div>
                </div>
              ` : n}

          <uui-box headline="Option Details">
            <umb-property-layout
              label="Option Name"
              description="Customer-facing name for this option"
              ?mandatory=${!0}>
              <uui-input
                slot="editor"
                label="Option name"
                .value=${this._formData.name || ""}
                placeholder="e.g., Size, Color, Material"
                @input=${(i) => this._formData = { ...this._formData, name: i.target.value }}
                aria-required="true">
              </uui-input>
            </umb-property-layout>

            <umb-property-layout
              label="Alias"
              description="Used in code/integrations (auto-generated if empty)">
              <uui-input
                slot="editor"
                label="Alias"
                .value=${this._formData.alias || ""}
                placeholder="Optional: machine-readable name"
                @input=${(i) => this._formData = { ...this._formData, alias: i.target.value }}>
              </uui-input>
            </umb-property-layout>

            <umb-property-layout
              label="Option Type"
              description="Categorize this option (e.g., colour, size, material)">
              <uui-select
                slot="editor"
                label="Option type"
                .options=${this._getOptionTypeOptions()}
                @change=${(i) => {
      const r = i.target.value;
      this._formData = { ...this._formData, optionTypeAlias: r };
    }}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Display As"
              description="How customers select this option on your storefront">
              <uui-select
                slot="editor"
                label="Display type"
                .options=${this._getOptionUiOptions()}
                @change=${(i) => {
      const r = i.target.value;
      this._formData = { ...this._formData, optionUiAlias: r };
    }}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Generates Variants"
              description="Creates all combinations (e.g., 3 sizes × 4 colors = 12 variants). If disabled, this is an add-on that modifies price.">
              <uui-toggle
                slot="editor"
                label="Generates Variants"
                .checked=${this._formData.isVariant ?? !1}
                @change=${(i) => this._formData = { ...this._formData, isVariant: i.target.checked }}>
              </uui-toggle>
            </umb-property-layout>
          </uui-box>

          <uui-box>
            <div class="section-header" slot="headline">
              <span>Option Values</span>
              <span class="value-count">${e}/${t}</span>
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
                    ${this._formData.values.map((i, r) => this._renderValueEditor(i, r))}
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
          <uui-button look="secondary" label="Cancel" @click=${() => this.modalContext?.reject()}> Cancel </uui-button>
          ${a ? n : s`
                <uui-button look="primary" color="danger" @click=${this._handleDelete} label="Delete Option">
                  <uui-icon name="icon-trash"></uui-icon>
                  Delete Option
                </uui-button>
              `}
          <uui-button look="primary" color="positive" label="Save" ?disabled=${this._isSaving} @click=${this._handleSave}>
            <uui-icon name="icon-check"></uui-icon>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
m = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
l.styles = y`
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
      gap: var(--uui-size-space-3);
    }

    .value-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: flex-start;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .value-row.is-addon {
      padding: var(--uui-size-space-4);
    }

    .value-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .value-name-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .value-name-row > uui-input:first-child {
      flex: 1;
    }

    .color-input {
      width: 48px;
      flex-shrink: 0;
    }

    .image-picker {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-shrink: 0;
    }

    .image-preview {
      width: 40px;
      height: 40px;
      border-radius: var(--uui-border-radius);
      overflow: hidden;
      cursor: pointer;
      border: 1px solid var(--uui-color-border);
    }

    .image-preview:hover {
      border-color: var(--uui-color-selected);
    }

    .image-preview umb-imaging-thumbnail {
      width: 100%;
      height: 100%;
    }

    .addon-fields {
      display: flex;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
      padding-top: var(--uui-size-space-2);
      border-top: 1px dashed var(--uui-color-border);
    }

    .addon-field {
      flex: 1;
      min-width: 100px;
      max-width: 140px;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .addon-field.sku-field {
      flex: 1.2;
      max-width: 160px;
    }

    .addon-field .field-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .addon-field uui-input {
      width: 100%;
    }

    .shipping-fields {
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px dashed var(--uui-color-border);
    }

    .shipping-fields .weight-field {
      min-width: 120px;
      max-width: 160px;
    }

    .field-hint {
      font-size: 0.625rem;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .info-banner.addon-info {
      border-left-color: var(--uui-color-warning);
    }

    .info-banner.addon-info uui-icon {
      color: var(--uui-color-warning);
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
c([
  v()
], l.prototype, "_formData", 2);
c([
  v()
], l.prototype, "_isSaving", 2);
c([
  v()
], l.prototype, "_errorMessage", 2);
c([
  v()
], l.prototype, "_originalIsVariant", 2);
l = c([
  x("merchello-option-editor-modal")
], l);
const E = l;
export {
  l as MerchelloOptionEditorModalElement,
  E as default
};
//# sourceMappingURL=option-editor-modal.element-BUMNkLop.js.map
