import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UpsellRecommendationType, type UpsellRecommendationRuleDto } from "@upsells/types/upsell.types.js";
import { MERCHELLO_PRODUCT_PICKER_MODAL } from "@shared/product-picker/product-picker-modal.token.js";
import { MERCHELLO_COLLECTION_PICKER_MODAL } from "@collections/modals/collection-picker-modal.token.js";
import { MERCHELLO_PRODUCT_TYPE_PICKER_MODAL } from "@product-types/modals/product-type-picker-modal.token.js";
import { MERCHELLO_SUPPLIER_PICKER_MODAL } from "@suppliers/modals/supplier-picker-modal.token.js";
import { MERCHELLO_FILTER_PICKER_MODAL } from "@filters/modals/filter-picker-modal.token.js";

const REC_TYPE_OPTIONS = [
  { value: UpsellRecommendationType.ProductTypes, label: "Product types" },
  { value: UpsellRecommendationType.ProductFilters, label: "Product filters" },
  { value: UpsellRecommendationType.Collections, label: "Collections" },
  { value: UpsellRecommendationType.SpecificProducts, label: "Specific products" },
  { value: UpsellRecommendationType.Suppliers, label: "Suppliers" },
];

function getRecTypeSelectOptions(currentValue: UpsellRecommendationType): Array<{ name: string; value: string; selected: boolean }> {
  return REC_TYPE_OPTIONS.map((opt) => ({
    name: opt.label,
    value: String(opt.value),
    selected: opt.value === currentValue,
  }));
}

@customElement("merchello-upsell-recommendation-rule-builder")
export class MerchelloUpsellRecommendationRuleBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) rules: UpsellRecommendationRuleDto[] = [];

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
      recommendationType: UpsellRecommendationType.ProductTypes,
      recommendationIds: [],
      recommendationNames: [],
      matchTriggerFilters: false,
      matchFilterIds: [],
      matchFilterNames: [],
    }];
    this._dispatchChange();
  }

  private _handleRemoveRule(index: number): void {
    this.rules = this.rules.filter((_, i) => i !== index);
    this._dispatchChange();
  }

  private _handleUpdateRule(index: number, updates: Partial<UpsellRecommendationRuleDto>): void {
    this.rules = this.rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
    this._dispatchChange();
  }

  private _handleTypeChange(index: number, recommendationType: UpsellRecommendationType): void {
    this._handleUpdateRule(index, {
      recommendationType,
      recommendationIds: [],
      recommendationNames: [],
    });
  }

  private async _openPicker(index: number, rule: UpsellRecommendationRuleDto): Promise<void> {
    if (!this.#modalManager) return;

    switch (rule.recommendationType) {
      case UpsellRecommendationType.SpecificProducts: {
        const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_PICKER_MODAL, {
          data: { config: { currencySymbol: "", excludeProductIds: rule.recommendationIds ?? [] } },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selections?.length) {
          this._handleUpdateRule(index, {
            recommendationIds: [...(rule.recommendationIds ?? []), ...result.selections.map((s) => s.productId)],
            recommendationNames: [...(rule.recommendationNames ?? []), ...result.selections.map((s) => s.name)],
          });
        }
        break;
      }
      case UpsellRecommendationType.Collections: {
        const modal = this.#modalManager.open(this, MERCHELLO_COLLECTION_PICKER_MODAL, {
          data: { excludeIds: rule.recommendationIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedIds?.length) {
          this._handleUpdateRule(index, {
            recommendationIds: [...(rule.recommendationIds ?? []), ...result.selectedIds],
            recommendationNames: [...(rule.recommendationNames ?? []), ...result.selectedNames],
          });
        }
        break;
      }
      case UpsellRecommendationType.ProductTypes: {
        const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_TYPE_PICKER_MODAL, {
          data: { excludeIds: rule.recommendationIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedIds?.length) {
          this._handleUpdateRule(index, {
            recommendationIds: [...(rule.recommendationIds ?? []), ...result.selectedIds],
            recommendationNames: [...(rule.recommendationNames ?? []), ...result.selectedNames],
          });
        }
        break;
      }
      case UpsellRecommendationType.Suppliers: {
        const modal = this.#modalManager.open(this, MERCHELLO_SUPPLIER_PICKER_MODAL, {
          data: { excludeIds: rule.recommendationIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedIds?.length) {
          this._handleUpdateRule(index, {
            recommendationIds: [...(rule.recommendationIds ?? []), ...result.selectedIds],
            recommendationNames: [...(rule.recommendationNames ?? []), ...result.selectedNames],
          });
        }
        break;
      }
      case UpsellRecommendationType.ProductFilters: {
        const modal = this.#modalManager.open(this, MERCHELLO_FILTER_PICKER_MODAL, {
          data: { excludeFilterIds: rule.recommendationIds ?? [], multiSelect: true },
        });
        const result = await modal.onSubmit().catch(() => undefined);
        if (result?.selectedFilterIds?.length) {
          this._handleUpdateRule(index, {
            recommendationIds: [...(rule.recommendationIds ?? []), ...result.selectedFilterIds],
            recommendationNames: [...(rule.recommendationNames ?? []), ...result.selectedFilterNames],
          });
        }
        break;
      }
    }
  }

  private async _openFilterValuePicker(index: number, rule: UpsellRecommendationRuleDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_FILTER_PICKER_MODAL, {
      data: { excludeFilterIds: rule.matchFilterIds ?? [], multiSelect: true },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedFilterIds?.length) {
      this._handleUpdateRule(index, {
        matchFilterIds: [...(rule.matchFilterIds ?? []), ...result.selectedFilterIds],
        matchFilterNames: [...(rule.matchFilterNames ?? []), ...result.selectedFilterNames],
      });
    }
  }

  private _removeItem(index: number, rule: UpsellRecommendationRuleDto, itemIndex: number): void {
    this._handleUpdateRule(index, {
      recommendationIds: rule.recommendationIds?.filter((_, i) => i !== itemIndex) ?? [],
      recommendationNames: rule.recommendationNames?.filter((_, i) => i !== itemIndex) ?? [],
    });
  }

  private _removeFilter(index: number, rule: UpsellRecommendationRuleDto, itemIndex: number): void {
    this._handleUpdateRule(index, {
      matchFilterIds: rule.matchFilterIds?.filter((_, i) => i !== itemIndex) ?? [],
      matchFilterNames: rule.matchFilterNames?.filter((_, i) => i !== itemIndex) ?? [],
    });
  }

  private _getPickerLabel(type: UpsellRecommendationType): string {
    switch (type) {
      case UpsellRecommendationType.ProductTypes: return "Select product types";
      case UpsellRecommendationType.ProductFilters: return "Select filters";
      case UpsellRecommendationType.Collections: return "Select collections";
      case UpsellRecommendationType.SpecificProducts: return "Select products";
      case UpsellRecommendationType.Suppliers: return "Select suppliers";
      default: return "Select";
    }
  }

  override render() {
    return html`
      ${this.rules.map((rule, index) => this._renderRule(rule, index))}
      <uui-button look="placeholder" @click=${this._handleAddRule} label="Add recommendation rule">
        <uui-icon name="icon-add"></uui-icon> Add recommendation rule
      </uui-button>
    `;
  }

  private _renderRule(rule: UpsellRecommendationRuleDto, index: number): unknown {
    return html`
      <div class="rule-card">
        <div class="rule-header">
          <uui-select
            label="Recommendation type"
            .options=${getRecTypeSelectOptions(rule.recommendationType)}
            @change=${(e: Event) => this._handleTypeChange(index, (e.target as HTMLSelectElement).value as UpsellRecommendationType)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(index)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        <div class="rule-body">
          <div class="tags">
            ${(rule.recommendationNames ?? []).map((name, i) => html`
              <uui-tag look="secondary">
                ${name}
                <uui-button compact label="Remove" @click=${() => this._removeItem(index, rule, i)}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              </uui-tag>
            `)}
          </div>
          <uui-button look="outline" @click=${() => this._openPicker(index, rule)} label=${this._getPickerLabel(rule.recommendationType)}>
            ${this._getPickerLabel(rule.recommendationType)}
          </uui-button>
        </div>

        <div class="filter-match">
          <uui-toggle
            label="Match trigger filters"
            .checked=${rule.matchTriggerFilters}
            @change=${(e: Event) => this._handleUpdateRule(index, { matchTriggerFilters: (e.target as HTMLInputElement).checked })}
          >Match trigger filters</uui-toggle>

          ${rule.matchTriggerFilters
            ? html`
              <div class="filter-values">
                <label>Narrow to specific filter values (leave empty to match ALL extracted values):</label>
                <div class="tags">
                  ${(rule.matchFilterNames ?? []).map((name, i) => html`
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
        </div>
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

    .filter-match {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px dashed var(--uui-color-border);
    }

    .filter-values {
      margin-top: var(--uui-size-space-3);
    }

    .filter-values label {
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

export default MerchelloUpsellRecommendationRuleBuilderElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-upsell-recommendation-rule-builder": MerchelloUpsellRecommendationRuleBuilderElement;
  }
}
