import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { DiscountEligibilityRuleDto } from "@discounts/types/discount.types.js";
import { DiscountEligibilityType } from "@discounts/types/discount.types.js";

/** Eligibility type options for the dropdown */
const ELIGIBILITY_TYPE_OPTIONS = [
  { value: DiscountEligibilityType.AllCustomers, label: "Everyone" },
  { value: DiscountEligibilityType.CustomerSegments, label: "Customer segments" },
  { value: DiscountEligibilityType.SpecificCustomers, label: "Specific customers" },
];

@customElement("merchello-eligibility-rule-builder")
export class MerchelloEligibilityRuleBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) rules: DiscountEligibilityRuleDto[] = [];
  @property({ type: Boolean }) readonly = false;

  @state() private _editingRule?: { index: number; rule: DiscountEligibilityRuleDto };

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
    const newRule: DiscountEligibilityRuleDto = {
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

  private _handleUpdateRule(index: number, updates: Partial<DiscountEligibilityRuleDto>): void {
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

  private _renderRuleCard(rule: DiscountEligibilityRuleDto, index: number): unknown {
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
                    .value=${String(rule.eligibilityType)}
                    @change=${(e: Event) =>
                      this._handleEligibilityTypeChange(index, parseInt((e.target as HTMLSelectElement).value, 10))}
                  >
                    ${ELIGIBILITY_TYPE_OPTIONS.map(
                      (opt) => html` <uui-select-option value=${String(opt.value)}>${opt.label}</uui-select-option> `
                    )}
                  </uui-select>
                </uui-form-layout-item>

                ${rule.eligibilityType !== DiscountEligibilityType.AllCustomers
                  ? html`
                      <div class="selection-placeholder">
                        <uui-icon name="icon-search"></uui-icon>
                        <span>
                          ${rule.eligibilityType === DiscountEligibilityType.SpecificCustomers
                            ? "Customer selection coming soon"
                            : "Customer segment selection coming soon"}
                        </span>
                        ${hasSelection
                          ? html`<small>${rule.eligibilityIds?.length} item(s) selected</small>`
                          : html`<small>No items selected</small>`}
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

  render() {
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

  static styles = css`
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
