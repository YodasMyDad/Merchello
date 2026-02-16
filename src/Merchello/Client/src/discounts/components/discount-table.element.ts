import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { DiscountListItemDto } from "@discounts/types/discount.types.js";
import { DiscountMethod } from "@discounts/types/discount.types.js";
import { formatRelativeDate } from "@shared/utils/formatting.js";
import { getDiscountDetailHref } from "@shared/utils/navigation.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";

/** Event detail for discount click */
export interface DiscountClickEventDetail {
  discountId: string;
  discount: DiscountListItemDto;
}

/** Event detail for selection change */
export interface DiscountSelectionChangeEventDetail {
  selectedIds: string[];
}

/**
 * Reusable discount table component.
 *
 * @fires discount-click - Dispatched when a discount row is clicked.
 * @fires selection-change - Dispatched when selection changes.
 */
@customElement("merchello-discount-table")
export class MerchelloDiscountTableElement extends UmbElementMixin(LitElement) {
  /**
   * Array of discounts to display.
   */
  @property({ type: Array })
  discounts: DiscountListItemDto[] = [];

  /**
   * Enable row selection with checkboxes.
   */
  @property({ type: Boolean })
  selectable = false;

  /**
   * Currently selected discount IDs.
   */
  @property({ type: Array })
  selectedIds: string[] = [];

  /**
   * Make rows clickable (navigates to discount detail).
   */
  @property({ type: Boolean })
  clickable = true;

  private _handleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    const newSelection = checked ? this.discounts.map((d) => d.id) : [];
    this._dispatchSelectionChange(newSelection);
  }

  private _handleSelectDiscount(id: string, e: Event): void {
    e.stopPropagation();
    const checked = (e.target as HTMLInputElement).checked;
    const newSelection = checked
      ? [...this.selectedIds, id]
      : this.selectedIds.filter((selectedId) => selectedId !== id);
    this._dispatchSelectionChange(newSelection);
  }

  private _dispatchSelectionChange(selectedIds: string[]): void {
    const detail: DiscountSelectionChangeEventDetail = { selectedIds };
    this.dispatchEvent(
      new CustomEvent("selection-change", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleRowClick(discount: DiscountListItemDto): void {
    if (!this.clickable) return;

    const detail: DiscountClickEventDetail = { discountId: discount.id, discount };
    this.dispatchEvent(
      new CustomEvent("discount-click", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleNameLinkClick(e: MouseEvent, discount: DiscountListItemDto): void {
    // Preserve native link behavior for modified clicks (new tab/window, context menu).
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      e.stopPropagation();
      return;
    }

    // Prevent a hard navigation and route through the workspace event flow.
    e.preventDefault();
    e.stopPropagation();
    this._handleRowClick(discount);
  }

  private _getMethodIcon(method: DiscountMethod): string {
    return method === DiscountMethod.Automatic ? "icon-bolt" : "icon-receipt-dollar";
  }

  private _formatUsage(discount: DiscountListItemDto): string {
    if (discount.totalUsageLimit) {
      return `${discount.currentUsageCount} / ${discount.totalUsageLimit}`;
    }
    return `${discount.currentUsageCount}`;
  }

  override render() {
    return html`
      <uui-table>
        <uui-table-head>
          ${this.selectable
            ? html`
                <uui-table-head-cell class="checkbox-col">
                  <uui-checkbox
                    aria-label="Select all discounts"
                    @change=${this._handleSelectAll}
                    ?checked=${this.selectedIds.length === this.discounts.length && this.discounts.length > 0}
                  ></uui-checkbox>
                </uui-table-head-cell>
              `
            : nothing}
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Type</uui-table-head-cell>
          <uui-table-head-cell>Method</uui-table-head-cell>
          <uui-table-head-cell>Value</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
          <uui-table-head-cell>Usage</uui-table-head-cell>
          <uui-table-head-cell>Created</uui-table-head-cell>
        </uui-table-head>

        ${this.discounts.map(
          (discount) => html`
            <uui-table-row
              class="${this.clickable ? 'clickable' : ''}"
              @click=${() => this._handleRowClick(discount)}
            >
              ${this.selectable
                ? html`
                    <uui-table-cell class="checkbox-col">
                      <uui-checkbox
                        aria-label="Select discount ${discount.name}"
                        ?checked=${this.selectedIds.includes(discount.id)}
                        @change=${(e: Event) => this._handleSelectDiscount(discount.id, e)}
                        @click=${(e: Event) => e.stopPropagation()}
                      ></uui-checkbox>
                    </uui-table-cell>
                  `
                : nothing}

              <uui-table-cell class="name-cell">
                <a
                  href=${getDiscountDetailHref(discount.id)}
                  @click=${(e: MouseEvent) => this._handleNameLinkClick(e, discount)}
                >
                  ${discount.name}
                </a>
                ${discount.code
                  ? html`<span class="code">${discount.code}</span>`
                  : nothing}
              </uui-table-cell>

              <uui-table-cell>
                ${discount.categoryLabel}
              </uui-table-cell>

              <uui-table-cell class="method-cell">
                <uui-icon name="${this._getMethodIcon(discount.method)}"></uui-icon>
                ${discount.method === DiscountMethod.Automatic ? "Auto" : "Code"}
              </uui-table-cell>

              <uui-table-cell class="value-cell">
                ${discount.formattedValue}
              </uui-table-cell>

              <uui-table-cell>
                <span class="badge ${discount.statusColor}">
                  ${discount.statusLabel}
                </span>
              </uui-table-cell>

              <uui-table-cell>
                ${this._formatUsage(discount)}
              </uui-table-cell>

              <uui-table-cell>
                ${formatRelativeDate(discount.dateCreated)}
              </uui-table-cell>
            </uui-table-row>
          `
        )}
      </uui-table>
    `;
  }

  static override readonly styles = [
    badgeStyles,
    css`
      :host {
        display: block;
      }

      uui-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .checkbox-col {
        width: 40px;
      }

      .name-cell {
        font-weight: 500;
      }

      .name-cell a {
        color: inherit;
        text-decoration: none;
      }

      .name-cell a:hover {
        text-decoration: underline;
        color: var(--uui-color-interactive);
      }

      .code {
        display: inline-block;
        margin-left: var(--uui-size-space-2);
        padding: 2px 6px;
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        font-size: var(--uui-type-small-size);
        font-family: monospace;
        color: var(--uui-color-text-alt);
      }

      .method-cell {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
      }

      .value-cell {
        font-weight: 600;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discount-table": MerchelloDiscountTableElement;
  }
}
