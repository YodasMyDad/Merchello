import { nothing as n, html as s, css as y, state as m, customElement as D } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as x, UMB_MODAL_MANAGER_CONTEXT as V, UMB_CONFIRM_MODAL as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as A } from "@umbraco-cms/backoffice/notification";
var w = Object.defineProperty, O = Object.getOwnPropertyDescriptor, _ = (t) => {
  throw TypeError(t);
}, d = (t, a, i, o) => {
  for (var e = o > 1 ? void 0 : o ? O(a, i) : a, l = t.length - 1, v; l >= 0; l--)
    (v = t[l]) && (e = (o ? v(a, i, e) : v(e)) || e);
  return o && e && w(a, i, e), e;
}, b = (t, a, i) => a.has(t) || _("Cannot " + i), f = (t, a, i) => (b(t, a, "read from private field"), a.get(t)), g = (t, a, i) => a.has(t) ? _("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(t) : a.set(t, i), p = (t, a, i, o) => (b(t, a, "write to private field"), a.set(t, i), i), c, h, u;
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
    }, this._isSaving = !1, this._errorMessage = null, this._originalIsVariant = !1, g(this, c), g(this, h), g(this, u, !1), this.consumeContext(A, (t) => {
      p(this, c, t);
    }), this.consumeContext(V, (t) => {
      p(this, h, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, u, !0), this.data?.option && (this._formData = { ...this.data.option }, this._originalIsVariant = this.data.option.isVariant);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, u, !1);
  }
  _getOptionTypeOptions() {
    const t = this.data?.settings?.optionTypeAliases ?? [];
    return [
      { name: "Select type...", value: "", selected: !this._formData.optionTypeAlias },
      ...t.map((a) => ({
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
  async _handleSave() {
    if (this._validateForm()) {
      if (this.data?.option && this._originalIsVariant !== this._formData.isVariant) {
        const t = this._formData.isVariant ? "Enabling 'Generates Variants' will create new product variants. You'll need to regenerate variants for this to take effect." : "Disabling 'Generates Variants' will not delete existing variants, but they won't be regenerated.";
        if (!await f(this, h)?.open(this, $, {
          data: {
            headline: "Change Variant Option",
            content: t,
            confirmLabel: "Continue",
            color: "warning"
          }
        })?.onSubmit().catch(() => {
        }) || !f(this, u)) return;
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
      }, f(this, c)?.peek("positive", { data: { headline: "Option saved", message: `"${this._formData.name}" has been saved` } }), this.modalContext?.submit();
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
    const t = [...this._formData.values || []];
    t.push({
      id: crypto.randomUUID(),
      name: "",
      fullName: null,
      sortOrder: t.length,
      hexValue: null,
      mediaKey: null,
      priceAdjustment: 0,
      costAdjustment: 0,
      skuSuffix: null
    }), this._formData = { ...this._formData, values: t };
  }
  _removeValue(t) {
    const a = [...this._formData.values || []];
    a.splice(t, 1), a.forEach((i, o) => i.sortOrder = o), this._formData = { ...this._formData, values: a };
  }
  _updateValue(t, a, i) {
    const o = [...this._formData.values || []];
    o[t] = { ...o[t], [a]: i }, this._formData = { ...this._formData, values: o };
  }
  _renderValueEditor(t, a) {
    const i = this._formData.optionUiAlias, o = !this._formData.isVariant;
    return s`
      <div class="value-row ${o ? "is-addon" : ""}">
        <div class="value-content">
          <div class="value-name-row">
            <uui-input
              .value=${t.name}
              placeholder="Value name"
              @input=${(e) => this._updateValue(a, "name", e.target.value)}>
            </uui-input>

            ${i === "colour" ? s`
                  <uui-input
                    type="color"
                    class="color-input"
                    .value=${t.hexValue || "#000000"}
                    @input=${(e) => this._updateValue(a, "hexValue", e.target.value)}>
                  </uui-input>
                ` : n}
          </div>

          ${o ? s`
                <div class="addon-fields">
                  <div class="addon-field">
                    <label class="field-label">Price +/-</label>
                    <uui-input
                      type="number"
                      step="0.01"
                      .value=${String(t.priceAdjustment)}
                      placeholder="0.00"
                      @input=${(e) => this._updateValue(a, "priceAdjustment", parseFloat(e.target.value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field">
                    <label class="field-label">Cost +/-</label>
                    <uui-input
                      type="number"
                      step="0.01"
                      .value=${String(t.costAdjustment)}
                      placeholder="0.00"
                      @input=${(e) => this._updateValue(a, "costAdjustment", parseFloat(e.target.value) || 0)}>
                    </uui-input>
                  </div>

                  <div class="addon-field sku-field">
                    <label class="field-label">SKU Suffix</label>
                    <uui-input
                      .value=${t.skuSuffix || ""}
                      placeholder="e.g., -GW"
                      @input=${(e) => this._updateValue(a, "skuSuffix", e.target.value)}>
                    </uui-input>
                  </div>
                </div>
              ` : n}
        </div>

        <uui-button compact look="secondary" color="danger" @click=${() => this._removeValue(a)}>
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
    const t = !this.data?.option, a = this._formData.values?.length || 0, i = this._getMaxValues(), o = this._formData.isVariant && a > 0 ? `Will create ${a} variants` : "";
    return s`
      <umb-body-layout headline="${t ? "Add Option" : `Edit Option: ${this._formData.name}`}">
        <div class="modal-content">
          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : n}

          ${this._formData.isVariant && a > 0 ? s`
                <div class="info-banner">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Variant Generation</strong>
                    <p>${o} (when combined with other variant options, this creates a cartesian product)</p>
                  </div>
                </div>
              ` : n}

          ${!this._formData.isVariant && a > 0 ? s`
                <div class="info-banner addon-info">
                  <uui-icon name="icon-coin"></uui-icon>
                  <div>
                    <strong>Add-on Pricing</strong>
                    <p>Price and cost adjustments are added to the base product when customers select this option. Negative values apply discounts.</p>
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
                .value=${this._formData.name || ""}
                placeholder="e.g., Size, Color, Material"
                @input=${(e) => this._formData = { ...this._formData, name: e.target.value }}
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
                @input=${(e) => this._formData = { ...this._formData, alias: e.target.value }}>
              </uui-input>
            </umb-property-layout>

            <umb-property-layout
              label="Option Type"
              description="Categorize this option (e.g., colour, size, material)">
              <uui-select
                slot="editor"
                .value=${this._formData.optionTypeAlias || ""}
                .options=${this._getOptionTypeOptions()}
                @change=${(e) => this._formData = { ...this._formData, optionTypeAlias: e.target.value }}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Display As"
              description="How customers select this option on your storefront">
              <uui-select
                slot="editor"
                .value=${this._formData.optionUiAlias || "dropdown"}
                .options=${this._getOptionUiOptions()}
                @change=${(e) => this._formData = { ...this._formData, optionUiAlias: e.target.value }}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="Generates Variants"
              description="Creates all combinations (e.g., 3 sizes × 4 colors = 12 variants). If disabled, this is an add-on that modifies price.">
              <uui-toggle
                slot="editor"
                .checked=${this._formData.isVariant ?? !1}
                @change=${(e) => this._formData = { ...this._formData, isVariant: e.target.checked }}>
              </uui-toggle>
            </umb-property-layout>
          </uui-box>

          <uui-box>
            <div class="section-header" slot="headline">
              <span>Option Values</span>
              <span class="value-count">${a}/${i}</span>
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
                    ${this._formData.values.map((e, l) => this._renderValueEditor(e, l))}
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
          ${t ? n : s`
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
c = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
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
d([
  m()
], r.prototype, "_formData", 2);
d([
  m()
], r.prototype, "_isSaving", 2);
d([
  m()
], r.prototype, "_errorMessage", 2);
d([
  m()
], r.prototype, "_originalIsVariant", 2);
r = d([
  D("merchello-option-editor-modal")
], r);
const M = r;
export {
  r as MerchelloOptionEditorModalElement,
  M as default
};
//# sourceMappingURL=option-editor-modal.element-Rrq09XgU.js.map
