import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UpsellTriggerType, type UpsellTriggerRuleDto } from "@upsells/types/upsell.types.js";
import { MERCHELLO_PRODUCT_PICKER_MODAL } from "@shared/product-picker/product-picker-modal.token.js";
import { MERCHELLO_COLLECTION_PICKER_MODAL } from "@collections/modals/collection-picker-modal.token.js";
import { MERCHELLO_PRODUCT_TYPE_PICKER_MODAL } from "@product-types/modals/product-type-picker-modal.token.js";
import { MERCHELLO_SUPPLIER_PICKER_MODAL } from "@suppliers/modals/supplier-picker-modal.token.js";
import { MERCHELLO_FILTER_PICKER_MODAL } from "@filters/modals/filter-picker-modal.token.js";

const TRIGGER_TYPE_OPTIONS = [
  { value: UpsellTriggerType.ProductTypes, label: "Product types" },
  { value: UpsellTriggerType.ProductFilters, label: "Product filters" },
  { value: UpsellTriggerType.Collections, label: "Collections" },
  { value: UpsellTriggerType.SpecificProducts, label: "Specific products" },
  { value: UpsellTriggerType.Suppliers, label: "Suppliers" },
  { value: UpsellTriggerType.MinimumCartValue, label: "Minimum cart value" },
  { value: UpsellTriggerType.MaximumCartValue, label: "Maximum cart value" },
  { value: UpsellTriggerType.CartValueBetween, label: "Cart value between" },
];

function getTriggerTypeSelectOptions(currentValue: UpsellTriggerType): Array<{ name: string; value: string; selected: boolean }> {
  return TRIGGER_TYPE_OPTIONS.map((opt) => ({
    name: opt.label,
    value: String(opt.value),
    selected: opt.value === currentValue,
  }));
}

@customElement("merchello-upsell-trigger-rule-builder")
export class MerchelloUpsellTriggerRuleBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) rules: UpsellTriggerRuleDto[] = [];

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
    this.rules = [...this.rules, {
      triggerType: UpsellTriggerType.ProductTypes,
      triggerIds: [],
      triggerNames: [],
      extractFilterIds: [],
      extractFilterNames: [],
    }];
    this._dispatchChange();
  }

  private _handleRemoveRule(index: number): void {
    this.rules = this.rules.filter((_, i) => i !== index);
    this._dispatchChange();
  }

  private _handleUpdateRule(index: number, updates: Partial<UpsellTriggerRuleDto>): void {
    this.rules = this.rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
    this._dispatchChange();
  }

  private _handleTypeChange(index: number, triggerType: UpsellTriggerType): void {
    this._handleUpdateRule(index, {
      triggerType,
      triggerIds: [],
      triggerNames: [],
      extractFilterIds: [],
      extractFilterNames: [],
    });
  }

  private _needsEntityPicker(type: UpsellTriggerType): boolean {
    return [
      UpsellTriggerType.ProductTypes,
      UpsellTriggerType.ProductFilters,
      UpsellTriggerType.Collections,
      UpsellTriggerType.SpecificProducts,
      UpsellTriggerType.Suppliers,
    ].includes(type);
  }

  private _supportsFilterExtraction(type: UpsellTriggerType): boolean {
    return [
      UpsellTriggerType.ProductTypes,
      UpsellTriggerType.Collections,
      UpsellTriggerType.SpecificProducts,
    ].includes(type);
  }

  private async _openPicker(index: number, rule: UpsellTriggerRuleDto): Promise<void> {
    if (!this.#modalManager) return;

    switch (rule.triggerType) {
      case UpsellTriggerType.SpecificProducts: {
        const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_PICKER_MODAL, {
          data: { config: { currencySymbol: "", excludeProductIds: rule.triggerIds ?? [] } },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selections?.length) {
          this._handleUpdateRule(index, {
            triggerIds: [...(rule.triggerIds ?? []), ...result.selections.map((s) => s.productId)],
            triggerNames: [...(rule.triggerNames ?? []), ...result.selections.map((s) => s.name)],
          });
        }
        break;
      }
      case UpsellTriggerType.Collections: {
        const modal = this.#modalManager.open(this, MERCHELLO_COLLECTION_PICKER_MODAL, {
          data: { excludeIds: rule.triggerIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedIds?.length) {
          this._handleUpdateRule(index, {
            triggerIds: [...(rule.triggerIds ?? []), ...result.selectedIds],
            triggerNames: [...(rule.triggerNames ?? []), ...result.selectedNames],
          });
        }
        break;
      }
      case UpsellTriggerType.ProductTypes: {
        const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_TYPE_PICKER_MODAL, {
          data: { excludeIds: rule.triggerIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedIds?.length) {
          this._handleUpdateRule(index, {
            triggerIds: [...(rule.triggerIds ?? []), ...result.selectedIds],
            triggerNames: [...(rule.triggerNames ?? []), ...result.selectedNames],
          });
        }
        break;
      }
      case UpsellTriggerType.Suppliers: {
        const modal = this.#modalManager.open(this, MERCHELLO_SUPPLIER_PICKER_MODAL, {
          data: { excludeIds: rule.triggerIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedIds?.length) {
          this._handleUpdateRule(index, {
            triggerIds: [...(rule.triggerIds ?? []), ...result.selectedIds],
            triggerNames: [...(rule.triggerNames ?? []), ...result.selectedNames],
          });
        }
        break;
      }
      case UpsellTriggerType.ProductFilters: {
        const modal = this.#modalManager.open(this, MERCHELLO_FILTER_PICKER_MODAL, {
          data: { excludeFilterIds: rule.triggerIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedFilterIds?.length) {
          this._handleUpdateRule(index, {
            triggerIds: [...(rule.triggerIds ?? []), ...result.selectedFilterIds],
            triggerNames: [...(rule.triggerNames ?? []), ...result.selectedFilterNames],
          });
        }
        break;
      }
    }
  }

  private async _openFilterValuePicker(index: number, rule: UpsellTriggerRuleDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_FILTER_PICKER_MODAL, {
      data: { excludeFilterIds: rule.extractFilterIds ?? [], multiSelect: true },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedFilterIds?.length) {
      this._handleUpdateRule(index, {
        extractFilterIds: [...(rule.extractFilterIds ?? []), ...result.selectedFilterIds],
        extractFilterNames: [...(rule.extractFilterNames ?? []), ...result.selectedFilterNames],
      });
    }
  }

  private _removeItem(index: number, rule: UpsellTriggerRuleDto, itemIndex: number): void {
    this._handleUpdateRule(index, {
      triggerIds: rule.triggerIds?.filter((_, i) => i !== itemIndex) ?? [],
      triggerNames: rule.triggerNames?.filter((_, i) => i !== itemIndex) ?? [],
    });
  }

  private _removeFilter(index: number, rule: UpsellTriggerRuleDto, itemIndex: number): void {
    this._handleUpdateRule(index, {
      extractFilterIds: rule.extractFilterIds?.filter((_, i) => i !== itemIndex) ?? [],
      extractFilterNames: rule.extractFilterNames?.filter((_, i) => i !== itemIndex) ?? [],
    });
  }

  private _getPickerLabel(type: UpsellTriggerType): string {
    switch (type) {
      case UpsellTriggerType.ProductTypes: return "Select product types";
      case UpsellTriggerType.ProductFilters: return "Select filters";
      case UpsellTriggerType.Collections: return "Select collections";
      case UpsellTriggerType.SpecificProducts: return "Select products";
      case UpsellTriggerType.Suppliers: return "Select suppliers";
      default: return "Select";
    }
  }

  override render() {
    return html`
      ${this.rules.map((rule, index) => this._renderRule(rule, index))}
      <uui-button look="placeholder" @click=${this._handleAddRule} label="Add trigger rule">
        <uui-icon name="icon-add"></uui-icon> Add trigger rule
      </uui-button>
    `;
  }

  private _renderRule(rule: UpsellTriggerRuleDto, index: number): unknown {
    return html`
      <div class="rule-card">
        <div class="rule-header">
          <uui-select
            label="Trigger type"
            .options=${getTriggerTypeSelectOptions(rule.triggerType)}
            @change=${(e: Event) => this._handleTypeChange(index, (e.target as HTMLSelectElement).value as UpsellTriggerType)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(index)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        ${this._needsEntityPicker(rule.triggerType)
          ? html`
            <div class="rule-body">
              <div class="tags">
                ${(rule.triggerNames ?? []).map((name, i) => html`
                  <uui-tag look="secondary">
                    ${name}
                    <uui-button compact label="Remove" @click=${() => this._removeItem(index, rule, i)}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  </uui-tag>
                `)}
              </div>
              <uui-button look="outline" @click=${() => this._openPicker(index, rule)} label=${this._getPickerLabel(rule.triggerType)}>
                ${this._getPickerLabel(rule.triggerType)}
              </uui-button>
            </div>

            ${this._supportsFilterExtraction(rule.triggerType)
              ? html`
                <div class="filter-extraction">
                  <label>Only match products with these filter values (optional):</label>
                  <div class="tags">
                    ${(rule.extractFilterNames ?? []).map((name, i) => html`
                      <uui-tag look="secondary" color="warning">
                        ${name}
                        <uui-button compact label="Remove" @click=${() => this._removeFilter(index, rule, i)}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      </uui-tag>
                    `)}
                  </div>
                  <uui-button look="outline" @click=${() => this._openFilterValuePicker(index, rule)} label="Select filter values">
                    Select filter values
                  </uui-button>
                </div>
              `
              : nothing}
          `
          : nothing}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .rule-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .rule-header {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .rule-header uui-select {
      flex: 1;
    }

    .rule-body {
      margin-top: var(--uui-size-space-3);
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .filter-extraction {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px dashed var(--uui-color-border);
    }

    .filter-extraction label {
      display: block;
      font-size: 0.85em;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
}

export default MerchelloUpsellTriggerRuleBuilderElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-upsell-trigger-rule-builder": MerchelloUpsellTriggerRuleBuilderElement;
  }
}
