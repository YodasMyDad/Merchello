import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { DiscountEligibilityRuleEdit } from "@discounts/types/discount.types.js";
import { DiscountEligibilityType } from "@discounts/types/discount.types.js";
import { MERCHELLO_CUSTOMER_PICKER_MODAL } from "@customers/modals/customer-picker-modal.token.js";
import { MERCHELLO_SEGMENT_PICKER_MODAL } from "@customers/modals/segment-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

/** Eligibility type options for the dropdown */
const ELIGIBILITY_TYPE_OPTIONS = [
  { value: DiscountEligibilityType.AllCustomers, label: "Everyone" },
  { value: DiscountEligibilityType.CustomerSegments, label: "Customer segments" },
  { value: DiscountEligibilityType.SpecificCustomers, label: "Specific customers" },
];

/** Get select options for eligibility type dropdown with selected state */
function getEligibilityTypeSelectOptions(currentValue: DiscountEligibilityType): Array<{ name: string; value: string; selected: boolean }> {
  return ELIGIBILITY_TYPE_OPTIONS.map((opt) => ({
    name: opt.label,
    value: String(opt.value),
    selected: opt.value === currentValue,
  }));
}

@customElement("merchello-eligibility-rule-builder")
export class MerchelloEligibilityRuleBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) rules: DiscountEligibilityRuleEdit[] = [];
  @property({ type: Boolean }) readonly = false;

  @state() private _editingRule?: { index: number; rule: DiscountEligibilityRuleEdit };

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
    const newRule: DiscountEligibilityRuleEdit = {
      id: crypto.randomUUID(),
      eligibilityType: DiscountEligibilityType.AllCustomers,
      eligibilityIds: null,
      eligibilityNames: null,
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

  private _handleUpdateRule(index: number, updates: Partial<DiscountEligibilityRuleEdit>): void {
    this.rules = this.rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
    this._dispatchChange();
  }

  private _handleEligibilityTypeChange(index: number, eligibilityType: DiscountEligibilityType): void {
    // Clear IDs when changing eligibility type
    this._handleUpdateRule(index, {
      eligibilityType,
      eligibilityIds: eligibilityType === DiscountEligibilityType.AllCustomers ? null : [],
      eligibilityNames: null,
    });
  }

  private _getEligibilityTypeLabel(eligibilityType: DiscountEligibilityType): string {
    return ELIGIBILITY_TYPE_OPTIONS.find((opt) => opt.value === eligibilityType)?.label ?? "Unknown";
  }

  private _getTypeIcon(eligibilityType: DiscountEligibilityType): string {
    switch (eligibilityType) {
      case DiscountEligibilityType.AllCustomers:
        return "icon-globe";
      case DiscountEligibilityType.CustomerSegments:
        return "icon-users";
      case DiscountEligibilityType.SpecificCustomers:
        return "icon-user";
      default:
        return "icon-user";
    }
  }

  private async _openCustomerPicker(index: number, rule: DiscountEligibilityRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_CUSTOMER_PICKER_MODAL, {
      data: {
        excludeCustomerIds: rule.eligibilityIds ?? [],
        multiSelect: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedCustomerIds?.length) {
      // Fetch customer names for display
      const names: string[] = [];
      for (const customerId of result.selectedCustomerIds) {
        const { data } = await MerchelloApi.getCustomer(customerId);
        if (data) {
          const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email;
          names.push(name);
        }
      }

      this._handleUpdateRule(index, {
        eligibilityIds: [...(rule.eligibilityIds ?? []), ...result.selectedCustomerIds],
        eligibilityNames: [...(rule.eligibilityNames ?? []), ...names],
      });
    }
  }

  private async _openSegmentPicker(index: number, rule: DiscountEligibilityRuleEdit): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SEGMENT_PICKER_MODAL, {
      data: {
        excludeIds: rule.eligibilityIds ?? [],
        multiSelect: true,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.selectedIds?.length) {
      this._handleUpdateRule(index, {
        eligibilityIds: [...(rule.eligibilityIds ?? []), ...result.selectedIds],
        eligibilityNames: [...(rule.eligibilityNames ?? []), ...result.selectedNames],
      });
    }
  }

  private _removeEligibilityItem(index: number, rule: DiscountEligibilityRuleEdit, itemIndex: number): void {
    const newIds = rule.eligibilityIds?.filter((_, i) => i !== itemIndex) ?? [];
    const newNames = rule.eligibilityNames?.filter((_, i) => i !== itemIndex) ?? [];

    this._handleUpdateRule(index, {
      eligibilityIds: newIds.length > 0 ? newIds : [],
      eligibilityNames: newNames.length > 0 ? newNames : [],
    });
  }

  private _getPickerButtonLabel(eligibilityType: DiscountEligibilityType): string {
    switch (eligibilityType) {
      case DiscountEligibilityType.SpecificCustomers:
        return "Select customers";
      case DiscountEligibilityType.CustomerSegments:
        return "Select segments";
      default:
        return "Select items";
    }
  }

  private async _openPicker(index: number, rule: DiscountEligibilityRuleEdit): Promise<void> {
    switch (rule.eligibilityType) {
      case DiscountEligibilityType.SpecificCustomers:
        await this._openCustomerPicker(index, rule);
        break;
      case DiscountEligibilityType.CustomerSegments:
        await this._openSegmentPicker(index, rule);
        break;
    }
  }

  private _renderRuleCard(rule: DiscountEligibilityRuleEdit, index: number): unknown {
    const isEditing = this._editingRule?.index === index;
    const hasSelection = rule.eligibilityIds && rule.eligibilityIds.length > 0;

    return html`
      <div class="rule-card">
        <div class="rule-header">
          <div class="rule-type">
            <uui-icon name=${this._getTypeIcon(rule.eligibilityType)}></uui-icon>
            <span>${this._getEligibilityTypeLabel(rule.eligibilityType)}</span>
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
                  <uui-label slot="label">Who can use this discount?</uui-label>
                  <uui-select
                    .options=${getEligibilityTypeSelectOptions(rule.eligibilityType)}
                    .value=${rule.eligibilityType}
                    @change=${(e: Event) =>
                      this._handleEligibilityTypeChange(index, (e.target as HTMLSelectElement).value as DiscountEligibilityType)}
                  ></uui-select>
                </uui-form-layout-item>

                ${rule.eligibilityType !== DiscountEligibilityType.AllCustomers
                  ? html`
                      <div class="selection-area">
                        <uui-button look="secondary" @click=${() => this._openPicker(index, rule)}>
                          <uui-icon name="icon-search"></uui-icon>
                          ${this._getPickerButtonLabel(rule.eligibilityType)}
                        </uui-button>
                        ${hasSelection
                          ? html`
                              <uui-ref-list>
                                ${rule.eligibilityNames?.map(
                                  (name, itemIndex) => html`
                                    <uui-ref-node name=${name}>
                                      <uui-icon slot="icon" name=${this._getTypeIcon(rule.eligibilityType)}></uui-icon>
                                      <uui-action-bar slot="actions">
                                        <uui-button
                                          label="Remove"
                                          @click=${(e: Event) => {
                                            e.stopPropagation();
                                            this._removeEligibilityItem(index, rule, itemIndex);
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
                  : html`
                      <div class="info-message">
                        <uui-icon name="icon-info"></uui-icon>
                        <span>This discount will be available to all customers.</span>
                      </div>
                    `}
              </div>
            `
          : html`
              <div class="rule-summary">
                ${rule.eligibilityType === DiscountEligibilityType.AllCustomers
                  ? html`<span>Available to everyone</span>`
                  : html`
                      <span>
                        ${hasSelection ? `${rule.eligibilityIds?.length} item(s) selected` : "No items selected"}
                      </span>
                    `}
              </div>
            `}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="eligibility-rule-builder">
        <div class="builder-header">
          <span class="builder-title">Customer Eligibility</span>
          <span class="builder-description">Define who can use this discount</span>
        </div>

        ${this.rules.length === 0
          ? html`
              <div class="empty-state">
                <uui-icon name="icon-users"></uui-icon>
                <p>No eligibility rules defined. By default, the discount is available to everyone.</p>
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
                Add eligibility rule
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

    .eligibility-rule-builder {
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

    .rule-type uui-icon {
      color: var(--uui-color-current);
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

    .info-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .info-message uui-icon {
      color: var(--uui-color-current);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-select {
      width: 100%;
    }
  `;
}

export default MerchelloEligibilityRuleBuilderElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-eligibility-rule-builder": MerchelloEligibilityRuleBuilderElement;
  }
}
