import { nothing as u, html as r, css as D, state as h, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as w, UMB_MODAL_MANAGER_CONTEXT as V, UMB_CONFIRM_MODAL as A } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as M } from "@umbraco-cms/backoffice/sorter";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { UmbMediaPickerInputContext as $, UMB_MEDIA_PICKER_MODAL as C } from "@umbraco-cms/backoffice/media";
import "@umbraco-cms/backoffice/imaging";
import { m as k } from "./modal-layout.styles-C2OaUji5.js";
var U = Object.defineProperty, O = Object.getOwnPropertyDescriptor, b = (e) => {
  throw TypeError(e);
}, c = (e, t, a, i) => {
  for (var o = i > 1 ? void 0 : i ? O(t, a) : t, n = e.length - 1, _; n >= 0; n--)
    (_ = e[n]) && (o = (i ? _(t, a, o) : _(o)) || o);
  return i && o && U(t, a, o), o;
}, y = (e, t, a) => t.has(e) || b("Cannot " + a), s = (e, t, a) => (y(e, t, "read from private field"), a ? a.call(e) : t.get(e)), f = (e, t, a) => t.has(e) ? b("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), v = (e, t, a, i) => (y(e, t, "write to private field"), t.set(e, a), a), g, m, d, p;
let l = class extends w {
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
    }, this._isSaving = !1, this._errorMessage = null, this._originalIsVariant = !1, this._hasAttemptedSave = !1, f(this, g), f(this, m), f(this, d, !1), f(this, p, new M(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-value-id") ?? "",
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.OptionValues.Sorter",
      itemSelector: ".value-row",
      containerSelector: ".values-list",
      onChange: ({ model: e }) => {
        const t = e.map((a, i) => ({ ...a, sortOrder: i }));
        this._formData = { ...this._formData, values: t }, s(this, p).setModel(t);
      }
    })), new $(this), this.consumeContext(S, (e) => {
      v(this, g, e);
    }), this.consumeContext(V, (e) => {
      v(this, m, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), v(this, d, !0), this.data?.option && (this._formData = {
      ...this.data.option,
      isMultiSelect: this.data.option.isMultiSelect ?? !this.data.option.isVariant,
      isRequired: this.data.option.isVariant ? !1 : this.data.option.isRequired ?? !1
    }, this._originalIsVariant = this.data.option.isVariant), s(this, p).setModel(this._formData.values ?? []);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, d, !1);
  }
  _toPropertyValueMap(e) {
    const t = {};
    for (const a of e)
      t[a.alias] = a.value;
    return t;
  }
  _getStringFromPropertyValue(e) {
    return typeof e == "string" ? e : "";
  }
  _getFirstDropdownValue(e) {
    if (Array.isArray(e)) {
      const t = e.find((a) => typeof a == "string");
      return typeof t == "string" ? t : "";
    }
    return typeof e == "string" ? e : "";
  }
  _getBooleanFromPropertyValue(e, t) {
    if (typeof e == "boolean") return e;
    if (typeof e == "string") {
      if (e.toLowerCase() === "true") return !0;
      if (e.toLowerCase() === "false") return !1;
    }
    return t;
  }
  _getOptionTypePropertyConfig() {
    const e = this.data?.settings?.optionTypeAliases ?? [];
    return [
      {
        alias: "items",
        value: [
          { name: "Select type...", value: "" },
          ...e.map((t) => ({
            name: t.charAt(0).toUpperCase() + t.slice(1),
            value: t
          }))
        ]
      }
    ];
  }
  _getOptionUiPropertyConfig() {
    return [
      {
        alias: "items",
        value: (this.data?.settings?.optionUiAliases ?? []).map((t) => ({
          name: t.charAt(0).toUpperCase() + t.slice(1),
          value: t
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
    const t = e.target, a = this._toPropertyValueMap(t.value ?? []), i = this._getBooleanFromPropertyValue(a.isVariant, !1);
    this._formData = {
      ...this._formData,
      name: this._getStringFromPropertyValue(a.name),
      alias: this._getStringFromPropertyValue(a.alias),
      optionTypeAlias: this._getFirstDropdownValue(a.optionTypeAlias),
      optionUiAlias: this._getFirstDropdownValue(a.optionUiAlias),
      isVariant: i,
      isMultiSelect: i ? !1 : this._getBooleanFromPropertyValue(a.isMultiSelect, !0),
      isRequired: i ? !1 : this._getBooleanFromPropertyValue(a.isRequired, !1)
    };
  }
  async _handleSave() {
    if (this._validateForm()) {
      if (this.data?.option && this._originalIsVariant !== this._formData.isVariant) {
        const e = this._formData.isVariant ? "Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect." : "Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.", t = s(this, m)?.open(this, A, {
          data: {
            headline: "Change Variant Option",
            content: e,
            confirmLabel: "Continue",
            color: "warning"
          }
        });
        try {
          await t?.onSubmit();
        } catch {
          return;
        }
        if (!s(this, d)) return;
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
      }, s(this, g)?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } }), this.modalContext?.submit();
    }
  }
  _handleDelete() {
    this.value = {
      isSaved: !0,
      isDeleted: !0
    }, this.modalContext?.submit();
  }
  _validateForm() {
    if (this._hasAttemptedSave = !0, this._errorMessage = null, !this._formData.name?.trim())
      return this._errorMessage = "Option name is required", !1;
    if (!this._formData.values || this._formData.values.length === 0)
      return this._errorMessage = "At least one value is required", !1;
    const e = this._formData.values.filter((a) => !a.name?.trim());
    if (e.length > 0)
      return this._errorMessage = e.length === 1 ? "One option value has an empty name. All values must have a name." : `${e.length} option values have empty names. All values must have a name.`, !1;
    const t = /* @__PURE__ */ new Set();
    for (const a of this._formData.values) {
      const i = a.name.trim().toLowerCase();
      if (t.has(i))
        return this._errorMessage = `Duplicate value name "${a.name.trim()}". Each value must have a unique name.`, !1;
      t.add(i);
    }
    return !0;
  }
  async _addValue() {
    const e = [...this._formData.values || []];
    if (e.length > 0 && !e[e.length - 1].name?.trim()) {
      this._errorMessage = "Please name the current value before adding another";
      return;
    }
    this._errorMessage = null, e.push({
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
    }), this._formData = { ...this._formData, values: e }, s(this, p).setModel(e), await this.updateComplete;
    const t = this.renderRoot.querySelectorAll(".value-row uui-input[label='Value name']");
    t[t.length - 1]?.focus();
  }
  _removeValue(e) {
    const t = [...this._formData.values || []];
    t.splice(e, 1);
    const a = t.map((i, o) => ({ ...i, sortOrder: o }));
    this._formData = { ...this._formData, values: a }, s(this, p).setModel(a);
  }
  _updateValue(e, t, a) {
    const i = [...this._formData.values || []];
    i[e] = { ...i[e], [t]: a }, this._formData = { ...this._formData, values: i }, t === "name" && this._errorMessage && (this._errorMessage = null);
  }
  async _openMediaPicker(e) {
    const t = this._formData.values?.[e];
    if (!t) return;
    const a = s(this, m)?.open(this, C, {
      data: {
        multiple: !1
      },
      value: {
        selection: t.mediaKey ? [t.mediaKey] : []
      }
    });
    try {
      const i = await a?.onSubmit();
      if (!s(this, d)) return;
      i?.selection?.length && this._updateValue(e, "mediaKey", i.selection[0]);
    } catch {
    }
  }
  _clearMedia(e) {
    this._updateValue(e, "mediaKey", null);
  }
  _renderValueEditor(e, t) {
    const a = this._formData.optionUiAlias, i = !this._formData.isVariant;
    return r`
      <div class="value-row ${i ? "is-addon" : ""}" data-value-id=${e.id}>
        <uui-icon class="value-drag-handle" name="icon-navigation"></uui-icon>
        <div class="value-content">
          <div class="value-name-row">
            <uui-input
              label="Value name"
              .value=${e.name}
              placeholder="Value name"
              ?error=${this._hasAttemptedSave && !e.name?.trim()}
              @input=${(o) => this._updateValue(t, "name", o.target.value)}>
            </uui-input>

            ${a === "colour" ? r`
                  <uui-input
                    label="Color"
                    type="color"
                    class="color-input"
                    .value=${e.hexValue || "#000000"}
                    @input=${(o) => this._updateValue(t, "hexValue", o.target.value)}>
                  </uui-input>
                ` : u}

            ${a === "image" ? r`
                  <div class="image-picker">
                    ${e.mediaKey ? r`
                          <div class="image-preview" @click=${() => this._openMediaPicker(t)}>
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
                            @click=${() => this._clearMedia(t)}>
                            <uui-icon name="icon-delete"></uui-icon>
                          </uui-button>
                        ` : r`
                          <uui-button
                            compact
                            look="secondary"
                            label="Select image"
                            @click=${() => this._openMediaPicker(t)}>
                            <uui-icon name="icon-picture"></uui-icon>
                          </uui-button>
                        `}
                  </div>
                ` : u}
          </div>

          ${i ? r`
                <div class="addon-fields">
                  <div class="addon-field">
                    <label class="field-label">Price +/-</label>
                    <uui-input
                      label="Price adjustment"
                      type="number"
                      step="0.01"
                      .value=${String(e.priceAdjustment)}
                      placeholder="0.00"
                      @input=${(o) => this._updateValue(t, "priceAdjustment", parseFloat(o.target.value) || 0)}>
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
                      @input=${(o) => this._updateValue(t, "costAdjustment", parseFloat(o.target.value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field sku-field">
                    <label class="field-label">SKU Suffix</label>
                    <uui-input
                      label="SKU suffix"
                      .value=${e.skuSuffix || ""}
                      placeholder="e.g., -GW"
                      @input=${(o) => this._updateValue(t, "skuSuffix", o.target.value)}>
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
      const n = o.target.value;
      this._updateValue(t, "weightKg", n ? parseFloat(n) : null);
    }}>
                    </uui-input>
                    <span class="field-hint">Added to product weight</span>
                  </div>
                </div>
              ` : u}
        </div>

        <uui-button compact look="secondary" color="danger" label="Remove value" @click=${() => this._removeValue(t)}>
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
    const e = !this.data?.option, t = this._formData.values?.length || 0, a = this._getMaxValues(), i = this._formData.isVariant && t > 0 ? `Will create ${t} variants` : "";
    return r`
      <umb-body-layout headline="${e ? "Add Option" : `Edit Option: ${this._formData.name}`}">
        <div class="modal-content">
          ${this._errorMessage ? r`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : u}

          ${this._formData.isVariant && t > 0 ? r`
                <div class="info-banner">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Variant Generation</strong>
                    <p>${i} (when combined with other variant options, this creates a cartesian product)</p>
                  </div>
                </div>
              ` : u}

          ${!this._formData.isVariant && t > 0 ? r`
                <div class="info-banner addon-info">
                  <uui-icon name="icon-coin"></uui-icon>
                  <div>
                    <strong>Add-on Pricing &amp; Shipping</strong>
                    <p>Price, cost, and weight adjustments are <em>added</em> to the base product when customers select this option. Weight affects shipping calculations.</p>
                  </div>
                </div>
              ` : u}
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

              ${this._formData.isVariant ?? !1 ? u : r`
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
              <span class="value-count">${t}/${a}</span>
            </div>

            <div class="values-list">
              ${this._formData.values && this._formData.values.length > 0 ? this._formData.values.map((o, n) => this._renderValueEditor(o, n)) : r`
                    <div class="empty-state">
                      <uui-icon name="icon-list"></uui-icon>
                      <p>No values added yet</p>
                      <p class="hint">Use the <strong>Add Value</strong> button below to add options like Small, Medium, Large</p>
                    </div>
                  `}
            </div>

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
          ${e ? u : r`
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
g = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
l.styles = [
  k,
  D`
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

    .value-row.--umb-sorter-placeholder {
      opacity: 0.3;
    }

    .value-drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
      flex-shrink: 0;
      margin-top: var(--uui-size-space-1);
    }

    .value-drag-handle:active {
      cursor: grabbing;
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

    .value-name-row uui-input[error] {
      --uui-input-border-color: var(--uui-color-danger);
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
  `
];
c([
  h()
], l.prototype, "_formData", 2);
c([
  h()
], l.prototype, "_isSaving", 2);
c([
  h()
], l.prototype, "_errorMessage", 2);
c([
  h()
], l.prototype, "_originalIsVariant", 2);
c([
  h()
], l.prototype, "_hasAttemptedSave", 2);
l = c([
  x("merchello-option-editor-modal")
], l);
const R = l;
export {
  l as MerchelloOptionEditorModalElement,
  R as default
};
//# sourceMappingURL=option-editor-modal.element-ikrIxjzA.js.map
