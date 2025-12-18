import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { DiscountTargetRuleDto } from "@discounts/types/discount.types.js";
import { DiscountTargetType } from "@discounts/types/discount.types.js";

/** Target type options for the dropdown */
const TARGET_TYPE_OPTIONS = [
  { value: DiscountTargetType.AllProducts, label: "All products" },
  { value: DiscountTargetType.SpecificProducts, label: "Specific products" },
  { value: DiscountTargetType.Categories, label: "Specific categories" },
  { value: DiscountTargetType.ProductFilters, label: "Product filters" },
  { value: DiscountTargetType.ProductTypes, label: "Product types" },
  { value: DiscountTargetType.Suppliers, label: "Suppliers" },
  { value: DiscountTargetType.Warehouses, label: "Warehouses" },
];

@customElement("merchello-target-rule-builder")
export class MerchelloTargetRuleBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) rules: DiscountTargetRuleDto[] = [];
  @property({ type: Boolean }) readonly = false;

  @state() private _editingRule?: { index: number; rule: DiscountTargetRuleDto };

  private _dispatchChange(): void {
    this.dispatchEvent(
      new CustomEvent("rules-change", {
        detail: { rules: this.rules },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleAddRule(): void {
    const newRule: DiscountTargetRuleDto = {
      id: crypto.randomUUID(),
      targetType: DiscountTargetType.AllProducts,
      targetIds: null,
      targetNames: null,
      isExclusion: false,
    };

    this.rules = [...this.rules, newRule];
    this._editingRule = { index: this.rules.length - 1, rule: newRule };
    this._dispatchChange();
  }

  private _handleRemoveRule(index: number): void {
    this.rules = this.rules.filter((_, i) => i !== index);
    if (this._editingRule?.index === index) {
      this._editingRule = undefined;
    }
    this._dispatchChange();
  }

  private _handleUpdateRule(index: number, updates: Partial<DiscountTargetRuleDto>): void {
    this.rules = this.rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
    this._dispatchChange();
  }

  private _handleTargetTypeChange(index: number, targetType: DiscountTargetType): void {
    // Clear IDs when changing target type
    this._handleUpdateRule(index, {
      targetType,
      targetIds: targetType === DiscountTargetType.AllProducts ? null : [],
      targetNames: null,
    });
  }

  private _getTargetTypeLabel(targetType: DiscountTargetType): string {
    return TARGET_TYPE_OPTIONS.find((opt) => opt.value === targetType)?.label ?? "Unknown";
  }

  private _renderRuleCard(rule: DiscountTargetRuleDto, index: number): unknown {
    const isEditing = this._editingRule?.index === index;
    const hasSelection = rule.targetIds && rule.targetIds.length > 0;

    return html`
      <div class="rule-card ${rule.isExclusion ? "exclusion" : "inclusion"}">
        <div class="rule-header">
          <div class="rule-type">
            ${rule.isExclusion
              ? html`<uui-tag look="secondary" color="danger">Exclude</uui-tag>`
              : html`<uui-tag look="secondary" color="positive">Include</uui-tag>`}
            <span>${this._getTargetTypeLabel(rule.targetType)}</span>
          </div>
          ${!this.readonly
            ? html`
                <div class="rule-actions">
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => (this._editingRule = isEditing ? undefined : { index, rule })}
                  >
                    ${isEditing ? "Done" : "Edit"}
                  </uui-button>
                  <uui-button look="secondary" color="danger" compact @click=${() => this._handleRemoveRule(index)}>
                    Remove
                  </uui-button>
                </div>
              `
            : nothing}
        </div>

        ${isEditing
          ? html`
              <div class="rule-edit-form">
                <uui-form-layout-item>
                  <uui-label slot="label">Rule Type</uui-label>
                  <uui-select
                    .value=${String(rule.targetType)}
                    @change=${(e: Event) =>
                      this._handleTargetTypeChange(index, parseInt((e.target as HTMLSelectElement).value, 10))}
                  >
                    ${TARGET_TYPE_OPTIONS.map(
                      (opt) => html` <uui-select-option value=${String(opt.value)}>${opt.label}</uui-select-option> `
                    )}
                  </uui-select>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Action</uui-label>
                  <uui-select
                    .value=${rule.isExclusion ? "exclude" : "include"}
                    @change=${(e: Event) =>
                      this._handleUpdateRule(index, { isExclusion: (e.target as HTMLSelectElement).value === "exclude" })}
                  >
                    <uui-select-option value="include">Include these products</uui-select-option>
                    <uui-select-option value="exclude">Exclude these products</uui-select-option>
                  </uui-select>
                </uui-form-layout-item>

                ${rule.targetType !== DiscountTargetType.AllProducts
                  ? html`
                      <div class="selection-placeholder">
                        <uui-icon name="icon-search"></uui-icon>
                        <span>
                          ${rule.targetType === DiscountTargetType.SpecificProducts
                            ? "Product selection coming soon"
                            : rule.targetType === DiscountTargetType.Categories
                              ? "Category selection coming soon"
                              : rule.targetType === DiscountTargetType.ProductFilters
                                ? "Product filter selection coming soon"
                                : rule.targetType === DiscountTargetType.ProductTypes
                                  ? "Product type selection coming soon"
                                  : rule.targetType === DiscountTargetType.Suppliers
                                    ? "Supplier selection coming soon"
                                    : "Warehouse selection coming soon"}
                        </span>
                        ${hasSelection
                          ? html`<small>${rule.targetIds?.length} item(s) selected</small>`
                          : html`<small>No items selected</small>`}
                      </div>
                    `
                  : nothing}
              </div>
            `
          : html`
              <div class="rule-summary">
                ${rule.targetType === DiscountTargetType.AllProducts
                  ? html`<span>Applies to all products</span>`
                  : html`
                      <span>
                        ${hasSelection ? `${rule.targetIds?.length} item(s) selected` : "No items selected"}
                      </span>
                    `}
              </div>
            `}
      </div>
    `;
  }

  render() {
    return html`
      <div class="target-rule-builder">
        <div class="builder-header">
          <span class="builder-title">Target Rules</span>
          <span class="builder-description">Define which products this discount applies to</span>
        </div>

        ${this.rules.length === 0
          ? html`
              <div class="empty-state">
                <uui-icon name="icon-filter"></uui-icon>
                <p>No target rules defined. By default, the discount applies to all products.</p>
              </div>
            `
          : html`
              <div class="rules-list">
                ${this.rules.map((rule, index) => this._renderRuleCard(rule, index))}
              </div>
            `}

        ${!this.readonly
          ? html`
              <uui-button look="secondary" @click=${this._handleAddRule}>
                <uui-icon name="icon-add"></uui-icon>
                Add target rule
              </uui-button>
            `
          : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .target-rule-builder {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .builder-header {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .builder-title {
      font-weight: 600;
    }

    .builder-description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-5);
      text-align: center;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 2em;
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-state p {
      margin: 0;
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .rule-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .rule-card.inclusion {
      border-left: 3px solid var(--uui-color-positive);
    }

    .rule-card.exclusion {
      border-left: 3px solid var(--uui-color-danger);
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
    }

    .rule-type {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .rule-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .rule-edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
    }

    .rule-summary {
      padding: var(--uui-size-space-3);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .selection-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      border: 1px dashed var(--uui-color-border);
      text-align: center;
      gap: var(--uui-size-space-2);
    }

    .selection-placeholder small {
      color: var(--uui-color-text-alt);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-select {
      width: 100%;
    }
  `;
}

export default MerchelloTargetRuleBuilderElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-target-rule-builder": MerchelloTargetRuleBuilderElement;
  }
}
