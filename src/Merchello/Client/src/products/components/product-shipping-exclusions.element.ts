import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ShippingOptionExclusionDto } from "@products/types/product.types.js";

// ============================================
// Event Types
// ============================================

/** Event detail for shipping exclusions change */
export interface ShippingExclusionsChangeDetail {
  excludedShippingOptionIds: string[];
}

// ============================================
// Component
// ============================================

/**
 * Shared component for managing shipping option exclusions.
 * Used in the Shipping Tab of both product-detail (bulk mode) and variant-detail (individual mode).
 *
 * @fires shipping-exclusions-change - Fired when exclusion selection changes
 */
@customElement("merchello-product-shipping-exclusions")
export class MerchelloProductShippingExclusionsElement extends UmbElementMixin(LitElement) {
  /** Available shipping options with exclusion status */
  @property({ type: Array }) shippingOptions: ShippingOptionExclusionDto[] = [];

  /** When true, shows inherited exclusions as read-only */
  @property({ type: Boolean }) variantMode = false;

  /** IDs of exclusions inherited from ProductRoot (read-only in variant mode) */
  @property({ type: Array }) inheritedExclusionIds: string[] = [];

  /** When true, shows message to save product first */
  @property({ type: Boolean }) isNewProduct = false;

  /** Disables all checkboxes */
  @property({ type: Boolean }) disabled = false;

  // ============================================
  // Event Handlers
  // ============================================

  private _handleExclusionToggle(optionId: string, checked: boolean): void {
    const currentExclusions = this.shippingOptions
      .filter((o) => o.isExcluded)
      .map((o) => o.id);

    const newExclusions = checked
      ? [...currentExclusions, optionId]
      : currentExclusions.filter((id) => id !== optionId);

    this.dispatchEvent(
      new CustomEvent<ShippingExclusionsChangeDetail>("shipping-exclusions-change", {
        detail: { excludedShippingOptionIds: newExclusions },
        bubbles: true,
        composed: true,
      })
    );
  }

  // ============================================
  // Render Methods
  // ============================================

  override render() {
    // Handle new/unsaved product state
    if (this.isNewProduct) {
      return html`
        <uui-box headline="Shipping Exclusions">
          <div class="empty-state">
            <uui-icon name="icon-info"></uui-icon>
            <p>Save the product before configuring shipping exclusions.</p>
          </div>
        </uui-box>
      `;
    }

    // Handle no shipping options available
    if (this.shippingOptions.length === 0) {
      return html`
        <uui-box headline="Shipping Exclusions">
          <div class="empty-state">
            <uui-icon name="icon-truck"></uui-icon>
            <p>No shipping options available.</p>
            <p class="hint">Assign warehouses with shipping options configured on the Details tab.</p>
          </div>
        </uui-box>
      `;
    }

    const excludedCount = this.shippingOptions.filter((o) => o.isExcluded).length;

    return html`
      <uui-box headline="Shipping Exclusions">
        <p class="description">
          Check options to <strong>exclude</strong> them from checkout.
          ${excludedCount > 0
            ? html`<span class="excluded-count">${excludedCount} excluded</span>`
            : html`<span class="all-available">All options available</span>`}
        </p>

        ${this.variantMode && this.inheritedExclusionIds.length > 0
          ? this._renderInheritedNote()
          : nothing}

        <div class="option-list">
          ${this.shippingOptions.map((option) => this._renderOption(option))}
        </div>
      </uui-box>
    `;
  }

  private _renderInheritedNote(): unknown {
    return html`
      <div class="inherited-note">
        <uui-icon name="icon-info"></uui-icon>
        <span>Some exclusions are inherited from the product level and cannot be changed here.</span>
      </div>
    `;
  }

  private _renderOption(option: ShippingOptionExclusionDto): unknown {
    const isInherited = this.inheritedExclusionIds.includes(option.id);
    const hasPartialState = option.isPartiallyExcluded && !this.variantMode;

    return html`
      <div class="option-item ${isInherited ? "inherited" : ""} ${hasPartialState ? "partial" : ""}">
        <uui-checkbox
          label="${option.name ?? "Unnamed"}"
          ?checked=${option.isExcluded || option.isPartiallyExcluded}
          .indeterminate=${hasPartialState}
          ?disabled=${this.disabled || isInherited}
          @change=${(e: Event) =>
            this._handleExclusionToggle(option.id, (e.target as HTMLInputElement).checked)}>
          <span class="option-label">
            <span class="option-name">${option.name ?? "Unnamed"}</span>
            <span class="option-meta">
              ${option.warehouseName ?? "Unknown warehouse"}${option.providerKey !== "flat-rate"
                ? ` - ${option.providerKey}`
                : ""}
              ${hasPartialState
                ? html` -
                    <em class="partial-count"
                      >${option.excludedVariantCount}/${option.totalVariantCount} variants excluded</em
                    >`
                : nothing}
            </span>
          </span>
        </uui-checkbox>
        <div class="badges">
          ${isInherited ? html`<uui-badge>Inherited</uui-badge>` : nothing}
          ${hasPartialState ? html`<uui-badge color="warning">Mixed</uui-badge>` : nothing}
        </div>
      </div>
    `;
  }

  // ============================================
  // Styles
  // ============================================

  static override readonly styles = css`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .description {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text-alt);
    }

    .excluded-count {
      color: var(--uui-color-danger);
      font-weight: 500;
    }

    .all-available {
      color: var(--uui-color-positive);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-5);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 32px;
    }

    .empty-state p {
      margin: 0;
    }

    .hint {
      font-size: 0.875rem;
    }

    .option-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
    }

    .option-item.inherited {
      background: var(--uui-color-surface-alt);
      opacity: 0.7;
    }

    .option-item.partial {
      border-color: var(--uui-color-warning);
      background: color-mix(in srgb, var(--uui-color-warning) 5%, var(--uui-color-surface));
    }

    .partial-count {
      color: var(--uui-color-warning-emphasis);
    }

    .option-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .option-name {
      font-weight: 500;
    }

    .option-meta {
      font-size: 0.8rem;
      color: var(--uui-color-text-alt);
    }

    .inherited-note {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
    }

    .inherited-note uui-icon {
      flex-shrink: 0;
    }

    .badges {
      display: flex;
      gap: var(--uui-size-space-2);
    }
  `;
}

export default MerchelloProductShippingExclusionsElement;

// ============================================
// Type Declarations
// ============================================

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-shipping-exclusions": MerchelloProductShippingExclusionsElement;
  }
}
