import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ProductFilterGroupDto, ProductFilterDto } from "@filters/types/filters.types.js";
import { getFiltersListHref } from "@shared/utils/navigation.js";

// ============================================
// Event Types
// ============================================

/** Event detail for filter selection change */
export interface FiltersChangeDetail {
  filterIds: string[];
}

// ============================================
// Component
// ============================================

/**
 * Shared component for assigning filters to products/variants.
 * Used by both product-detail (single-variant mode) and variant-detail.
 *
 * Filters help customers find products on the storefront.
 * Each filter belongs to a filter group (e.g., "Color", "Material", "Size").
 *
 * Note: Filters are assigned to Products (variants), not ProductRoots.
 * The actual save operation is handled by the parent component.
 *
 * @fires filters-change - Fired when filter selection changes
 */
@customElement("merchello-product-filters")
export class MerchelloProductFiltersElement extends UmbElementMixin(LitElement) {
  /** All available filter groups with their filters */
  @property({ type: Array }) filterGroups: ProductFilterGroupDto[] = [];

  /** Currently assigned filter IDs */
  @property({ type: Array }) assignedFilterIds: string[] = [];

  /** Show "save required" message for new products */
  @property({ type: Boolean }) isNewProduct = false;

  // ============================================
  // Event Handlers
  // ============================================

  /** Handle filter checkbox toggle */
  private _handleFilterToggle(filterId: string, checked: boolean): void {
    let newFilterIds: string[];

    if (checked) {
      newFilterIds = [...this.assignedFilterIds, filterId];
    } else {
      newFilterIds = this.assignedFilterIds.filter((id) => id !== filterId);
    }

    this.dispatchEvent(
      new CustomEvent<FiltersChangeDetail>("filters-change", {
        detail: { filterIds: newFilterIds },
        bubbles: true,
        composed: true,
      })
    );
  }

  // ============================================
  // Render Methods
  // ============================================

  override render() {
    // Show save required message for new products
    if (this.isNewProduct) {
      return html`
        <uui-box class="info-banner warning">
          <div class="info-content">
            <uui-icon name="icon-alert"></uui-icon>
            <div>
              <strong>Save Required</strong>
              <p>You must save the product before assigning filters.</p>
            </div>
          </div>
        </uui-box>
      `;
    }

    // Show message if no filter groups exist
    if (this.filterGroups.length === 0) {
      return html`
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>No Filter Groups</strong>
              <p>
                No filter groups have been created yet. Go to
                <a href=${getFiltersListHref()}>Filters</a>
                to create filter groups and filter values.
              </p>
            </div>
          </div>
        </uui-box>
      `;
    }

    const assignedCount = this.assignedFilterIds.length;

    return html`
      <uui-box class="info-banner">
        <div class="info-content">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <strong>Assign Filters</strong>
            <p>
              Select the filters that apply to this product. Filters help customers find products on your storefront.
              ${assignedCount > 0 ? `${assignedCount} filter${assignedCount > 1 ? "s" : ""} assigned.` : ""}
            </p>
          </div>
        </div>
      </uui-box>

      ${this.filterGroups.map((group) => this._renderFilterGroupSection(group))}
    `;
  }

  /** Renders a filter group section with checkboxes for each filter */
  private _renderFilterGroupSection(group: ProductFilterGroupDto): unknown {
    if (!group.filters || group.filters.length === 0) {
      return nothing;
    }

    return html`
      <uui-box headline=${group.name}>
        <div class="filter-checkbox-list">
          ${group.filters.map((filter: ProductFilterDto) => {
            const isChecked = this.assignedFilterIds.includes(filter.id);
            return html`
              <div class="filter-checkbox-item">
                <uui-checkbox
                  label=${filter.name}
                  ?checked=${isChecked}
                  @change=${(e: Event) => this._handleFilterToggle(filter.id, (e.target as HTMLInputElement).checked)}>
                  ${filter.hexColour
                    ? html`<span class="filter-color-swatch" style="background: ${filter.hexColour}"></span>`
                    : nothing}
                  ${filter.name}
                </uui-checkbox>
              </div>
            `;
          })}
        </div>
      </uui-box>
    `;
  }

  // ============================================
  // Styles
  // ============================================

  static override readonly styles = css`
    :host {
      display: contents;
    }

    /* Info banners */
    .info-banner {
      background: var(--uui-color-surface);
      border-left: 3px solid var(--uui-color-selected);
    }

    .info-banner.warning {
      background: var(--uui-color-warning-surface);
      border-left-color: var(--uui-color-warning);
    }

    .info-content {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
    }

    .info-content uui-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .info-content strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .info-content p {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .info-content a {
      color: var(--uui-color-interactive);
      text-decoration: none;
    }

    .info-content a:hover {
      text-decoration: underline;
    }

    /* Box spacing */
    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    uui-box + uui-box {
      margin-top: var(--uui-size-space-5);
    }

    /* Filter checkbox list */
    .filter-checkbox-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .filter-checkbox-item {
      display: flex;
      align-items: center;
    }

    .filter-checkbox-item uui-checkbox {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    /* Color swatch for color filters */
    .filter-color-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
      margin-right: var(--uui-size-space-1);
      vertical-align: middle;
    }
  `;
}

export default MerchelloProductFiltersElement;

// ============================================
// Type Declarations
// ============================================

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-filters": MerchelloProductFiltersElement;
  }
}
