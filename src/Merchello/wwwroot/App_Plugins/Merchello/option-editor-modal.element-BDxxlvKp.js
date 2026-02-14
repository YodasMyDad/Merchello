import { nothing as l, html as r, css as y, state as f, customElement as D } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as x, UMB_MODAL_MANAGER_CONTEXT as V, UMB_CONFIRM_MODAL as w } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as A } from "@umbraco-cms/backoffice/notification";
import { UMB_MEDIA_PICKER_MODAL as $ } from "@umbraco-cms/backoffice/media";
import "@umbraco-cms/backoffice/imaging";
var M = Object.defineProperty, k = Object.getOwnPropertyDescriptor, b = (e) => {
  throw TypeError(e);
}, c = (e, i, a, t) => {
  for (var o = t > 1 ? void 0 : t ? k(i, a) : i, s = e.length - 1, v; s >= 0; s--)
    (v = e[s]) && (o = (t ? v(i, a, o) : v(o)) || o);
  return t && o && M(i, a, o), o;
}, _ = (e, i, a) => i.has(e) || b("Cannot " + a), d = (e, i, a) => (_(e, i, "read from private field"), i.get(e)), g = (e, i, a) => i.has(e) ? b("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), m = (e, i, a, t) => (_(e, i, "write to private field"), i.set(e, a), a), h, p, u;
let n = class extends x {
  constructor() {
    super(), this._formData = {
      name: "",
      alias: "",
      sortOrder: 0,
      optionTypeAlias: "",
      optionUiAlias: "dropdown",
      isVariant: !1,
      isMultiSelect: !0,
      isRequired: !1,
      values: []
    }, this._isSaving = !1, this._errorMessage = null, this._originalIsVariant = !1, g(this, h), g(this, p), g(this, u, !1), this.consumeContext(A, (e) => {
      m(this, h, e);
    }), this.consumeContext(V, (e) => {
      m(this, p, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), m(this, u, !0), this.data?.option && (this._formData = {
      ...this.data.option,
      isMultiSelect: this.data.option.isMultiSelect ?? !this.data.option.isVariant,
      isRequired: this.data.option.isVariant ? !1 : this.data.option.isRequired ?? !1
    }, this._originalIsVariant = this.data.option.isVariant);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, u, !1);
  }
  _toPropertyValueMap(e) {
    const i = {};
    for (const a of e)
      i[a.alias] = a.value;
    return i;
  }
  _getStringFromPropertyValue(e) {
    return typeof e == "string" ? e : "";
  }
  _getFirstDropdownValue(e) {
    if (Array.isArray(e)) {
      const i = e.find((a) => typeof a == "string");
      return typeof i == "string" ? i : "";
    }
    return typeof e == "string" ? e : "";
  }
  _getBooleanFromPropertyValue(e, i) {
    if (typeof e == "boolean") return e;
    if (typeof e == "string") {
      if (e.toLowerCase() === "true") return !0;
      if (e.toLowerCase() === "false") return !1;
    }
    return i;
  }
  _getOptionTypePropertyConfig() {
    const e = this.data?.settings?.optionTypeAliases ?? [];
    return [
      {
        alias: "items",
        value: [
          { name: "Select type...", value: "" },
          ...e.map((i) => ({
            name: i.charAt(0).toUpperCase() + i.slice(1),
            value: i
          }))
        ]
      }
    ];
  }
  _getOptionUiPropertyConfig() {
    return [
      {
        alias: "items",
        value: (this.data?.settings?.optionUiAliases ?? []).map((i) => ({
          name: i.charAt(0).toUpperCase() + i.slice(1),
          value: i
        }))
      }
    ];
  }
  _getOptionDetailsDatasetValue() {
    return [
      { alias: "name", value: this._formData.name ?? "" },
      { alias: "alias", value: this._formData.alias ?? "" },
      { alias: "optionTypeAlias", value: this._formData.optionTypeAlias ? [this._formData.optionTypeAlias] : [] },
      { alias: "optionUiAlias", value: this._formData.optionUiAlias ? [this._formData.optionUiAlias] : [] },
      { alias: "isVariant", value: this._formData.isVariant ?? !1 },
      { alias: "isMultiSelect", value: this._formData.isMultiSelect ?? !0 },
      { alias: "isRequired", value: this._formData.isRequired ?? !1 }
    ];
  }
  _handleOptionDetailsDatasetChange(e) {
    const i = e.target, a = this._toPropertyValueMap(i.value ?? []), t = this._getBooleanFromPropertyValue(a.isVariant, !1);
    this._formData = {
      ...this._formData,
      name: this._getStringFromPropertyValue(a.name),
      alias: this._getStringFromPropertyValue(a.alias),
      optionTypeAlias: this._getFirstDropdownValue(a.optionTypeAlias),
      optionUiAlias: this._getFirstDropdownValue(a.optionUiAlias),
      isVariant: t,
      isMultiSelect: t ? !1 : this._getBooleanFromPropertyValue(a.isMultiSelect, !0),
      isRequired: t ? !1 : this._getBooleanFromPropertyValue(a.isRequired, !1)
    };
  }
  async _handleSave() {
    if (this._validateForm()) {
      if (this.data?.option && this._originalIsVariant !== this._formData.isVariant) {
        const e = this._formData.isVariant ? "Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect." : "Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.", i = d(this, p)?.open(this, w, {
          data: {
            headline: "Change Variant Option",
            content: e,
            confirmLabel: "Continue",
            color: "warning"
          }
        });
        try {
          await i?.onSubmit();
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
          isMultiSelect: this._formData.isVariant ? !1 : this._formData.isMultiSelect ?? !0,
          isRequired: this._formData.isVariant ? !1 : this._formData.isRequired ?? !1,
          values: this._formData.values || []
        }
      }, d(this, h)?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } }), this.modalContext?.submit();
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
      skuSuffix: null,
      weightKg: null
    }), this._formData = { ...this._formData, values: e };
  }
  _removeValue(e) {
    const i = [...this._formData.values || []];
    i.splice(e, 1), i.forEach((a, t) => a.sortOrder = t), this._formData = { ...this._formData, values: i };
  }
  _updateValue(e, i, a) {
    const t = [...this._formData.values || []];
    t[e] = { ...t[e], [i]: a }, this._formData = { ...this._formData, values: t };
  }
  async _openMediaPicker(e) {
    const i = this._formData.values?.[e];
    if (!i) return;
    const a = d(this, p)?.open(this, $, {
      data: {
        multiple: !1
      },
      value: {
        selection: i.mediaKey ? [i.mediaKey] : []
      }
    });
    try {
      const t = await a?.onSubmit();
      if (!d(this, u)) return;
      t?.selection?.length && this._updateValue(e, "mediaKey", t.selection[0]);
    } catch {
    }
  }
  _clearMedia(e) {
    this._updateValue(e, "mediaKey", null);
  }
  _renderValueEditor(e, i) {
    const a = this._formData.optionUiAlias, t = !this._formData.isVariant;
    return r`
      <div class="value-row ${t ? "is-addon" : ""}">
        <div class="value-content">
          <div class="value-name-row">
            <uui-input
              label="Value name"
              .value=${e.name}
              placeholder="Value name"
              @input=${(o) => this._updateValue(i, "name", o.target.value)}>
            </uui-input>

            ${a === "colour" ? r`
                  <uui-input
                    label="Color"
                    type="color"
                    class="color-input"
                    .value=${e.hexValue || "#000000"}
                    @input=${(o) => this._updateValue(i, "hexValue", o.target.value)}>
                  </uui-input>
                ` : l}

            ${a === "image" ? r`
                  <div class="image-picker">
                    ${e.mediaKey ? r`
                          <div class="image-preview" @click=${() => this._openMediaPicker(i)}>
                            <umb-imaging-thumbnail
                              .unique=${e.mediaKey}
                              .width=${40}
                              .height=${40}
                              icon="icon-picture">
                            </umb-imaging-thumbnail>
                          </div>
                          <uui-button
                            compact
                            look="secondary"
                            label="Remove image"
                            @click=${() => this._clearMedia(i)}>
                            <uui-icon name="icon-delete"></uui-icon>
                          </uui-button>
                        ` : r`
                          <uui-button
                            compact
                            look="secondary"
                            label="Select image"
                            @click=${() => this._openMediaPicker(i)}>
                            <uui-icon name="icon-picture"></uui-icon>
                          </uui-button>
                        `}
                  </div>
                ` : l}
          </div>

          ${t ? r`
                <div class="addon-fields">
                  <div class="addon-field">
                    <label class="field-label">Price +/-</label>
                    <uui-input
                      label="Price adjustment"
                      type="number"
                      step="0.01"
                      .value=${String(e.priceAdjustment)}
                      placeholder="0.00"
                      @input=${(o) => this._updateValue(i, "priceAdjustment", parseFloat(o.target.value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field">
                    <label class="field-label">Cost +/-</label>
                    <uui-input
                      label="Cost adjustment"
                      type="number"
                      step="0.01"
                      .value=${String(e.costAdjustment)}
                      placeholder="0.00"
                      @input=${(o) => this._updateValue(i, "costAdjustment", parseFloat(o.target.value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field sku-field">
                    <label class="field-label">SKU Suffix</label>
                    <uui-input
                      label="SKU suffix"
                      .value=${e.skuSuffix || ""}
                      placeholder="e.g., -GW"
                      @input=${(o) => this._updateValue(i, "skuSuffix", o.target.value)}>
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
                      .value=${e.weightKg != null ? String(e.weightKg) : ""}
                      placeholder="0.000"
                      title="Additional weight added to the product for shipping"
                      @input=${(o) => {
      const s = o.target.value;
      this._updateValue(i, "weightKg", s ? parseFloat(s) : null);
    }}>
                    </uui-input>
                    <span class="field-hint">Added to product weight</span>
                  </div>
                </div>
              ` : l}
        </div>

        <uui-button compact look="secondary" color="danger" label="Remove value" @click=${() => this._removeValue(i)}>
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
    const e = !this.data?.option, i = this._formData.values?.length || 0, a = this._getMaxValues(), t = this._formData.isVariant && i > 0 ? `Will create ${i} variants` : "";
    return r`
      <umb-body-layout headline="${e ? "Add Option" : `Edit Option: ${this._formData.name}`}">
        <div class="modal-content">
          ${this._errorMessage ? r`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : l}

          ${this._formData.isVariant && i > 0 ? r`
                <div class="info-banner">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Variant Generation</strong>
                    <p>${t} (when combined with other variant options, this creates a cartesian product)</p>
                  </div>
                </div>
              ` : l}

          ${!this._formData.isVariant && i > 0 ? r`
                <div class="info-banner addon-info">
                  <uui-icon name="icon-coin"></uui-icon>
                  <div>
                    <strong>Add-on Pricing &amp; Shipping</strong>
                    <p>Price, cost, and weight adjustments are <em>added</em> to the base product when customers select this option. Weight affects shipping calculations.</p>
                  </div>
                </div>
              ` : l}
          <uui-box headline="Option Details">
            <umb-property-dataset
              .value=${this._getOptionDetailsDatasetValue()}
              @change=${this._handleOptionDetailsDatasetChange}>
              <umb-property
                alias="name"
                label="Option Name"
                description="Customer-facing name for this option"
                property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                .validation=${{ mandatory: !0 }}>
              </umb-property>

              <umb-property
                alias="alias"
                label="Alias"
                description="Used in code/integrations (auto-generated if empty)"
                property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
              </umb-property>

              <umb-property
                alias="optionTypeAlias"
                label="Option Type"
                description="Categorize this option (e.g., colour, size, material)"
                property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
                .config=${this._getOptionTypePropertyConfig()}>
              </umb-property>

              <umb-property
                alias="optionUiAlias"
                label="Display As"
                description="How customers select this option on your storefront"
                property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
                .config=${this._getOptionUiPropertyConfig()}>
              </umb-property>

              <umb-property
                alias="isVariant"
                label="Generates Variants"
                description="Creates all combinations (e.g., 3 sizes x 4 colors = 12 variants). If disabled, this is an add-on that modifies price."
                property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
              </umb-property>

              ${this._formData.isVariant ?? !1 ? l : r`
                    <umb-property
                      alias="isMultiSelect"
                      label="Allow Multiple Selections"
                      description="Enabled = multi-select. Disabled = single-select (one value only)."
                      property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
                    </umb-property>

                    <umb-property
                      alias="isRequired"
                      label="Required Add-on"
                      description="If enabled, customers must select at least one value from this add-on option before adding to basket."
                      property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
                    </umb-property>
                  `}
            </umb-property-dataset>
          </uui-box>

          <uui-box>
            <div class="section-header" slot="headline">
              <span>Option Values</span>
              <span class="value-count">${i}/${a}</span>
            </div>

            ${this._formData.values && this._formData.values.length > 0 ? r`
                  <div class="values-list">
                    ${this._formData.values.map((o, s) => this._renderValueEditor(o, s))}
                  </div>
                ` : r`
                  <div class="empty-state">
                    <uui-icon name="icon-list"></uui-icon>
                    <p>No values added yet</p>
                    <p class="hint">Use the <strong>Add Value</strong> button below to add options like Small, Medium, Large</p>
                  </div>
                `}

            <div class="values-footer">
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
          </uui-box>
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Cancel" @click=${() => this.modalContext?.reject()}> Cancel </uui-button>
          ${e ? l : r`
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
h = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
n.styles = y`
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

    .values-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
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

    umb-property uui-input,
    umb-property uui-select {
      width: 100%;
    }
  `;
c([
  f()
], n.prototype, "_formData", 2);
c([
  f()
], n.prototype, "_isSaving", 2);
c([
  f()
], n.prototype, "_errorMessage", 2);
c([
  f()
], n.prototype, "_originalIsVariant", 2);
n = c([
  D("merchello-option-editor-modal")
], n);
const P = n;
export {
  n as MerchelloOptionEditorModalElement,
  P as default
};
//# sourceMappingURL=option-editor-modal.element-BDxxlvKp.js.map
