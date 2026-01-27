import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { DiscountTargetRuleEdit } from "@discounts/types/discount.types.js";
import { DiscountTargetType } from "@discounts/types/discount.types.js";
import { MERCHELLO_PRODUCT_PICKER_MODAL } from "@shared/product-picker/product-picker-modal.token.js";
import { MERCHELLO_COLLECTION_PICKER_MODAL } from "@collections/modals/collection-picker-modal.token.js";
import { MERCHELLO_PRODUCT_TYPE_PICKER_MODAL } from "@product-types/modals/product-type-picker-modal.token.js";
import { MERCHELLO_SUPPLIER_PICKER_MODAL } from "@suppliers/modals/supplier-picker-modal.token.js";
import { MERCHELLO_WAREHOUSE_PICKER_MODAL } from "@warehouses/modals/warehouse-picker-modal.token.js";
import { MERCHELLO_FILTER_PICKER_MODAL } from "@filters/modals/filter-picker-modal.token.js";

/** Target type options for the dropdown */
const TARGET_TYPE_OPTIONS = [
  { value: DiscountTargetType.AllProducts, label: "All products" },
  { value: DiscountTargetType.SpecificProducts, label: "Specific products" },
  { value: DiscountTargetType.Collections, label: "Specific collections" },
  { value: DiscountTargetType.ProductFilters, label: "Product filters" },
  { value: DiscountTargetType.ProductTypes, label: "Product types" },
  { value: DiscountTargetType.Suppliers, label: "Suppliers" },
  { value: DiscountTargetType.Warehouses, label: "Warehouses" },
];

/** Get select options for target type dropdown with selected state */
function getTargetTypeSelectOptions(currentValue: DiscountTargetType): Array<{ name: string; value: string; selected: boolean }> {
  return TARGET_TYPE_OPTIONS.map((opt) => ({
    name: opt.label,
    value: String(opt.value),
    selected: opt.value === currentValue,
  }));
}

/** Get select options for include/exclude action with selected state */
function getActionSelectOptions(isExclusion: boolean): Array<{ name: string; value: string; selected: boolean }> {
  return [
    { name: "Include these products", value: "include", selected: !isExclusion },
    { name: "Exclude these products", value: "exclude", selected: isExclusion },
  ];
}

@customElement("merchello-target-rule-builder")
export class MerchelloTargetRuleBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) rules: DiscountTargetRuleEdit[] = [];
  @property({ type: Boolean }) readonly = false;

  @state() private _editingRule?: { index: number; rule: DiscountTargetRuleEdit };

  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

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
    const newRule: DiscountTargetRuleEdit = {
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

  private _handleUpdateRule(index: number, updates: Partial<DiscountTargetRuleEdit>): void {
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

  private async _openProductPicker(index: number, rule: DiscountTargetRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_PICKER_MODAL, {
      data: {
        config: {
          currencySymbol: "",
          excludeProductIds: rule.targetIds ?? [],
        },
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selections?.length) {
      const newIds = result.selections.map((s) => s.productId);
      const newNames = result.selections.map((s) => s.name);

      this._handleUpdateRule(index, {
        targetIds: [...(rule.targetIds ?? []), ...newIds],
        targetNames: [...(rule.targetNames ?? []), ...newNames],
      });
    }
  }

  private async _openCollectionPicker(index: number, rule: DiscountTargetRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_COLLECTION_PICKER_MODAL, {
      data: {
        excludeIds: rule.targetIds ?? [],
        multiSelect: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedIds?.length) {
      this._handleUpdateRule(index, {
        targetIds: [...(rule.targetIds ?? []), ...result.selectedIds],
        targetNames: [...(rule.targetNames ?? []), ...result.selectedNames],
      });
    }
  }

  private async _openProductTypePicker(index: number, rule: DiscountTargetRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_TYPE_PICKER_MODAL, {
      data: {
        excludeIds: rule.targetIds ?? [],
        multiSelect: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedIds?.length) {
      this._handleUpdateRule(index, {
        targetIds: [...(rule.targetIds ?? []), ...result.selectedIds],
        targetNames: [...(rule.targetNames ?? []), ...result.selectedNames],
      });
    }
  }

  private async _openSupplierPicker(index: number, rule: DiscountTargetRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SUPPLIER_PICKER_MODAL, {
      data: {
        excludeIds: rule.targetIds ?? [],
        multiSelect: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedIds?.length) {
      this._handleUpdateRule(index, {
        targetIds: [...(rule.targetIds ?? []), ...result.selectedIds],
        targetNames: [...(rule.targetNames ?? []), ...result.selectedNames],
      });
    }
  }

  private async _openWarehousePicker(index: number, rule: DiscountTargetRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_WAREHOUSE_PICKER_MODAL, {
      data: {
        excludeIds: rule.targetIds ?? [],
        multiSelect: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedIds?.length) {
      this._handleUpdateRule(index, {
        targetIds: [...(rule.targetIds ?? []), ...result.selectedIds],
        targetNames: [...(rule.targetNames ?? []), ...result.selectedNames],
      });
    }
  }

  private async _openFilterPicker(index: number, rule: DiscountTargetRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_FILTER_PICKER_MODAL, {
      data: {
        excludeFilterIds: rule.targetIds ?? [],
        multiSelect: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedFilterIds?.length) {
      this._handleUpdateRule(index, {
        targetIds: [...(rule.targetIds ?? []), ...result.selectedFilterIds],
        targetNames: [...(rule.targetNames ?? []), ...result.selectedFilterNames],
      });
    }
  }

  private _removeTargetItem(index: number, rule: DiscountTargetRuleEdit, itemIndex: number): void {
    const newIds = rule.targetIds?.filter((_, i) => i !== itemIndex) ?? [];
    const newNames = rule.targetNames?.filter((_, i) => i !== itemIndex) ?? [];

    this._handleUpdateRule(index, {
      targetIds: newIds.length > 0 ? newIds : [],
      targetNames: newNames.length > 0 ? newNames : [],
    });
  }

  private _getIconForTargetType(targetType: DiscountTargetType): string {
    switch (targetType) {
      case DiscountTargetType.SpecificProducts:
        return "icon-box";
      case DiscountTargetType.Collections:
        return "icon-categories";
      case DiscountTargetType.ProductFilters:
        return "icon-filter";
      case DiscountTargetType.ProductTypes:
        return "icon-item-arrangement";
      case DiscountTargetType.Suppliers:
        return "icon-truck";
      case DiscountTargetType.Warehouses:
        return "icon-store";
      default:
        return "icon-document";
    }
  }

  private _getPickerButtonLabel(targetType: DiscountTargetType): string {
    switch (targetType) {
      case DiscountTargetType.SpecificProducts:
        return "Select products";
      case DiscountTargetType.Collections:
        return "Select collections";
      case DiscountTargetType.ProductFilters:
        return "Select product filters";
      case DiscountTargetType.ProductTypes:
        return "Select product types";
      case DiscountTargetType.Suppliers:
        return "Select suppliers";
      case DiscountTargetType.Warehouses:
        return "Select warehouses";
      default:
        return "Select items";
    }
  }

  private async _openPicker(index: number, rule: DiscountTargetRuleEdit): Promise<void> {
    switch (rule.targetType) {
      case DiscountTargetType.SpecificProducts:
        await this._openProductPicker(index, rule);
        break;
      case DiscountTargetType.Collections:
        await this._openCollectionPicker(index, rule);
        break;
      case DiscountTargetType.ProductFilters:
        await this._openFilterPicker(index, rule);
        break;
      case DiscountTargetType.ProductTypes:
        await this._openProductTypePicker(index, rule);
        break;
      case DiscountTargetType.Suppliers:
        await this._openSupplierPicker(index, rule);
        break;
      case DiscountTargetType.Warehouses:
        await this._openWarehousePicker(index, rule);
        break;
    }
  }

  private _renderRuleCard(rule: DiscountTargetRuleEdit, index: number): unknown {
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
                    .options=${getTargetTypeSelectOptions(rule.targetType)}
                    .value=${rule.targetType}
                    @change=${(e: Event) =>
                      this._handleTargetTypeChange(index, (e.target as HTMLSelectElement).value as DiscountTargetType)}
                  ></uui-select>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Action</uui-label>
                  <uui-select
                    .options=${getActionSelectOptions(rule.isExclusion)}
                    .value=${rule.isExclusion ? "exclude" : "include"}
                    @change=${(e: Event) =>
                      this._handleUpdateRule(index, { isExclusion: (e.target as HTMLSelectElement).value === "exclude" })}
                  ></uui-select>
                </uui-form-layout-item>

                ${rule.targetType !== DiscountTargetType.AllProducts
                  ? html`
                      <div class="selection-area">
                        <uui-button look="secondary" @click=${() => this._openPicker(index, rule)}>
                          <uui-icon name="icon-search"></uui-icon>
                          ${this._getPickerButtonLabel(rule.targetType)}
                        </uui-button>
                        ${hasSelection
                          ? html`
                              <uui-ref-list>
                                ${rule.targetNames?.map(
                                  (name, itemIndex) => html`
                                    <uui-ref-node name=${name}>
                                      <uui-icon slot="icon" name=${this._getIconForTargetType(rule.targetType)}></uui-icon>
                                      <uui-action-bar slot="actions">
                                        <uui-button
                                          label="Remove"
                                          @click=${(e: Event) => {
                                            e.stopPropagation();
                                            this._removeTargetItem(index, rule, itemIndex);
                                          }}></uui-button>
                                      </uui-action-bar>
                                    </uui-ref-node>
                                  `
                                )}
                              </uui-ref-list>
                            `
                          : html`<small class="no-selection">No items selected</small>`}
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

  override render() {
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

  static override readonly styles = css`
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

    .selection-area {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    uui-ref-list {
      margin-top: var(--uui-size-space-2);
    }

    .no-selection {
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
