import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { DiscountDetailDto } from "@discounts/types/discount.types.js";
import {
  DiscountCategory,
  DiscountMethod,
  DiscountValueType,
  DiscountRequirementType,
  DISCOUNT_CATEGORIES,
  DISCOUNT_STATUS_LABELS,
  DISCOUNT_STATUS_COLORS,
} from "@discounts/types/discount.types.js";

@customElement("merchello-discount-summary-card")
export class MerchelloDiscountSummaryCardElement extends UmbElementMixin(LitElement) {
  @property({ type: Object }) discount?: DiscountDetailDto;
  @property({ type: Boolean }) isNew = false;

  private _getCategoryInfo(category: DiscountCategory): typeof DISCOUNT_CATEGORIES[number] | undefined {
    return DISCOUNT_CATEGORIES.find((c) => c.category === category);
  }

  private _formatValue(): string {
    if (!this.discount) return "";

    if (this.discount.valueType === DiscountValueType.Percentage) {
      return `${this.discount.value}% off`;
    } else if (this.discount.valueType === DiscountValueType.FixedAmount) {
      return `${this.discount.value} off`;
    } else if (this.discount.valueType === DiscountValueType.Free) {
      return "Free";
    }
    return "";
  }

  private _formatDate(isoString: string | null | undefined): string {
    if (!isoString) return "Not set";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private _renderSummaryItem(label: string, value: string | number | undefined | null, icon?: string): unknown {
    if (value === undefined || value === null || value === "") return nothing;

    return html`
      <div class="summary-item">
        ${icon ? html`<uui-icon name=${icon}></uui-icon>` : nothing}
        <div class="summary-item-content">
          <span class="summary-item-label">${label}</span>
          <span class="summary-item-value">${value}</span>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.discount) return nothing;

    const categoryInfo = this._getCategoryInfo(this.discount.category);
    const statusLabel = DISCOUNT_STATUS_LABELS[this.discount.status];
    const statusColor = DISCOUNT_STATUS_COLORS[this.discount.status];

    return html`
      <uui-box>
        <!-- Header with category icon -->
        <div class="card-header">
          <div class="category-badge">
            <uui-icon name=${categoryInfo?.icon ?? "icon-tag"}></uui-icon>
            <span>${categoryInfo?.label ?? "Discount"}</span>
          </div>
          ${!this.isNew
            ? html`<uui-tag look="secondary" color=${statusColor}>${statusLabel}</uui-tag>`
            : nothing}
        </div>

        <!-- Code or Automatic badge -->
        <div class="method-section">
          ${this.discount.method === DiscountMethod.Code
            ? html`
                <div class="code-display">
                  <uui-icon name="icon-barcode"></uui-icon>
                  <span class="code-value">${this.discount.code || "No code set"}</span>
                </div>
              `
            : html`
                <div class="automatic-badge">
                  <uui-icon name="icon-flash"></uui-icon>
                  <span>Automatic discount</span>
                </div>
              `}
        </div>

        <hr class="divider" />

        <!-- Summary Details -->
        <div class="summary-list">
          ${this._renderSummaryItem("Value", this._formatValue(), "icon-coin")}

          ${this.discount.requirementType !== DiscountRequirementType.None
            ? this._renderSummaryItem(
                "Minimum",
                this.discount.requirementType === DiscountRequirementType.MinimumPurchaseAmount
                  ? `${this.discount.requirementValue} purchase`
                  : `${this.discount.requirementValue} items`,
                "icon-shopping-basket"
              )
            : nothing}

          ${this._renderSummaryItem(
            "Usage",
            this.discount.totalUsageLimit
              ? `${this.discount.currentUsageCount} / ${this.discount.totalUsageLimit}`
              : `${this.discount.currentUsageCount} uses`,
            "icon-users"
          )}

          ${this._renderSummaryItem("Starts", this._formatDate(this.discount.startsAt), "icon-calendar")}

          ${this.discount.endsAt
            ? this._renderSummaryItem("Ends", this._formatDate(this.discount.endsAt), "icon-calendar")
            : nothing}
        </div>

        <hr class="divider" />

        <!-- Combinations -->
        <div class="combinations-section">
          <span class="section-label">Combinations</span>
          <div class="combinations-icons">
            ${this.discount.canCombineWithProductDiscounts
              ? html`<uui-icon name="icon-tags" title="Combines with product discounts"></uui-icon>`
              : nothing}
            ${this.discount.canCombineWithOrderDiscounts
              ? html`<uui-icon name="icon-receipt-dollar" title="Combines with order discounts"></uui-icon>`
              : nothing}
            ${this.discount.canCombineWithShippingDiscounts
              ? html`<uui-icon name="icon-truck" title="Combines with shipping discounts"></uui-icon>`
              : nothing}
            ${!this.discount.canCombineWithProductDiscounts &&
            !this.discount.canCombineWithOrderDiscounts &&
            !this.discount.canCombineWithShippingDiscounts
              ? html`<span class="no-combinations">None</span>`
              : nothing}
          </div>
        </div>
      </uui-box>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .category-badge {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .category-badge uui-icon {
      font-size: 1.2em;
    }

    .method-section {
      margin-bottom: var(--uui-size-space-3);
    }

    .code-display {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      border: 1px dashed var(--uui-color-border-emphasis);
    }

    .code-value {
      font-family: monospace;
      font-size: 1.1em;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .automatic-badge {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
    }

    .divider {
      border: none;
      border-top: 1px solid var(--uui-color-border);
      margin: var(--uui-size-space-3) 0;
    }

    .summary-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .summary-item {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
    }

    .summary-item uui-icon {
      color: var(--uui-color-text-alt);
      margin-top: 2px;
    }

    .summary-item-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .summary-item-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .summary-item-value {
      font-weight: 500;
    }

    .section-label {
      display: block;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    .combinations-section {
      margin-top: var(--uui-size-space-1);
    }

    .combinations-icons {
      display: flex;
      gap: var(--uui-size-space-3);
    }

    .combinations-icons uui-icon {
      font-size: 1.2em;
      color: var(--uui-color-positive);
    }

    .no-combinations {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }
  `;
}

export default MerchelloDiscountSummaryCardElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discount-summary-card": MerchelloDiscountSummaryCardElement;
  }
}
