import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UpsellEligibilityType, type UpsellEligibilityRuleDto } from "@upsells/types/upsell.types.js";
import { MERCHELLO_CUSTOMER_PICKER_MODAL } from "@customers/modals/customer-picker-modal.token.js";
import { MERCHELLO_SEGMENT_PICKER_MODAL } from "@customers/modals/segment-picker-modal.token.js";

const ELIGIBILITY_TYPE_OPTIONS = [
  { value: UpsellEligibilityType.AllCustomers, label: "Everyone" },
  { value: UpsellEligibilityType.CustomerSegments, label: "Customer segments" },
  { value: UpsellEligibilityType.SpecificCustomers, label: "Specific customers" },
];

function getEligibilityTypeSelectOptions(currentValue: UpsellEligibilityType): Array<{ name: string; value: string; selected: boolean }> {
  return ELIGIBILITY_TYPE_OPTIONS.map((opt) => ({
    name: opt.label,
    value: String(opt.value),
    selected: opt.value === currentValue,
  }));
}

@customElement("merchello-upsell-eligibility-rule-builder")
export class MerchelloUpsellEligibilityRuleBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) rules: UpsellEligibilityRuleDto[] = [];

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
      eligibilityType: UpsellEligibilityType.AllCustomers,
      eligibilityIds: [],
      eligibilityNames: [],
    }];
    this._dispatchChange();
  }

  private _handleRemoveRule(index: number): void {
    this.rules = this.rules.filter((_, i) => i !== index);
    this._dispatchChange();
  }

  private _handleUpdateRule(index: number, updates: Partial<UpsellEligibilityRuleDto>): void {
    this.rules = this.rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
    this._dispatchChange();
  }

  private _handleTypeChange(index: number, eligibilityType: UpsellEligibilityType): void {
    this._handleUpdateRule(index, {
      eligibilityType,
      eligibilityIds: [],
      eligibilityNames: [],
    });
  }

  private _needsPicker(type: UpsellEligibilityType): boolean {
    return type === UpsellEligibilityType.CustomerSegments || type === UpsellEligibilityType.SpecificCustomers;
  }

  private async _openPicker(index: number, rule: UpsellEligibilityRuleDto): Promise<void> {
    if (!this.#modalManager) return;

    if (rule.eligibilityType === UpsellEligibilityType.CustomerSegments) {
      const modal = this.#modalManager.open(this, MERCHELLO_SEGMENT_PICKER_MODAL, {
        data: { excludeIds: rule.eligibilityIds ?? [], multiSelect: true },
      });
      const result = await modal.onSubmit().catch(() => undefined);
      if (result?.selectedIds?.length) {
        this._handleUpdateRule(index, {
          eligibilityIds: [...(rule.eligibilityIds ?? []), ...result.selectedIds],
          eligibilityNames: [...(rule.eligibilityNames ?? []), ...result.selectedNames],
        });
      }
    } else if (rule.eligibilityType === UpsellEligibilityType.SpecificCustomers) {
      const modal = this.#modalManager.open(this, MERCHELLO_CUSTOMER_PICKER_MODAL, {
        data: { excludeCustomerIds: rule.eligibilityIds ?? [], multiSelect: true },
      });
      const result = await modal.onSubmit().catch(() => undefined);
      if (result?.selectedCustomerIds?.length) {
        this._handleUpdateRule(index, {
          eligibilityIds: [...(rule.eligibilityIds ?? []), ...result.selectedCustomerIds],
        });
      }
    }
  }

  private _removeItem(index: number, rule: UpsellEligibilityRuleDto, itemIndex: number): void {
    this._handleUpdateRule(index, {
      eligibilityIds: rule.eligibilityIds?.filter((_, i) => i !== itemIndex) ?? [],
      eligibilityNames: rule.eligibilityNames?.filter((_, i) => i !== itemIndex) ?? [],
    });
  }

  private _getPickerLabel(type: UpsellEligibilityType): string {
    switch (type) {
      case UpsellEligibilityType.CustomerSegments: return "Select segments";
      case UpsellEligibilityType.SpecificCustomers: return "Select customers";
      default: return "Select";
    }
  }

  override render() {
    return html`
      ${this.rules.map((rule, index) => this._renderRule(rule, index))}
      <uui-button look="placeholder" @click=${this._handleAddRule} label="Add eligibility rule">
        <uui-icon name="icon-add"></uui-icon> Add eligibility rule
      </uui-button>
    `;
  }

  private _renderRule(rule: UpsellEligibilityRuleDto, index: number): unknown {
    return html`
      <div class="rule-card">
        <div class="rule-header">
          <uui-select
            label="Eligibility type"
            .options=${getEligibilityTypeSelectOptions(rule.eligibilityType)}
            @change=${(e: Event) => this._handleTypeChange(index, (e.target as HTMLSelectElement).value as UpsellEligibilityType)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(index)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        ${this._needsPicker(rule.eligibilityType)
          ? html`
            <div class="rule-body">
              <div class="tags">
                ${(rule.eligibilityNames ?? []).map((name, i) => html`
                  <uui-tag look="secondary">
                    ${name}
                    <uui-button compact label="Remove" @click=${() => this._removeItem(index, rule, i)}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  </uui-tag>
                `)}
              </div>
              <uui-button look="outline" @click=${() => this._openPicker(index, rule)} label=${this._getPickerLabel(rule.eligibilityType)}>
                ${this._getPickerLabel(rule.eligibilityType)}
              </uui-button>
            </div>
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

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
}

export default MerchelloUpsellEligibilityRuleBuilderElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-upsell-eligibility-rule-builder": MerchelloUpsellEligibilityRuleBuilderElement;
  }
}
