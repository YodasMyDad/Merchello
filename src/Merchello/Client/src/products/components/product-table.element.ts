import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type {
  ProductListItemDto,
  ProductColumnKey,
  ProductClickEventDetail,
  ProductSelectionChangeEventDetail,
} from "@products/types/product.types.js";
import { PRODUCT_COLUMN_LABELS, DEFAULT_PRODUCT_COLUMNS } from "@products/types/product.types.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import { getProductDetailHref } from "@shared/utils/navigation.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import type { WarningItem } from "@shared/types/index.js";
import "@shared/components/warning-popover.element.js";

// Re-export event types for backwards compatibility
export type { ProductClickEventDetail, ProductSelectionChangeEventDetail } from "@products/types/product.types.js";

@customElement("merchello-product-table")
export class MerchelloProductTableElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) products: ProductListItemDto[] = [];
  @property({ type: Array }) columns: ProductColumnKey[] = [...DEFAULT_PRODUCT_COLUMNS];
  @property({ type: Boolean }) selectable = false;
  @property({ type: Array }) selectedIds: string[] = [];
  @property({ type: Boolean }) clickable = true;

  private _getEffectiveColumns(): ProductColumnKey[] {
    const cols = [...this.columns];
    if (!cols.includes("rootName")) cols.unshift("rootName");
    if (this.selectable && !cols.includes("select")) cols.unshift("select");
    return cols;
  }

  private _handleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    const visibleIds = this.products.map((p) => p.id);
    const visibleIdSet = new Set(visibleIds);
    const currentlySelected = this._getSelectedIdSet();

    const nextSelection = checked
      ? new Set([...currentlySelected, ...visibleIds])
      : new Set([...currentlySelected].filter((id) => !visibleIdSet.has(id)));

    const newSelection = Array.from(nextSelection);
    this._dispatchSelectionChange(newSelection);
  }

  private _handleSelectProduct(id: string, e: Event): void {
    e.stopPropagation();
    const checked = (e.target as HTMLInputElement).checked;
    const selection = this._getSelectedIdSet();

    if (checked) {
      selection.add(id);
    } else {
      selection.delete(id);
    }

    const newSelection = Array.from(selection);
    this._dispatchSelectionChange(newSelection);
  }

  private _dispatchSelectionChange(selectedIds: string[]): void {
    const uniqueSelectedIds = Array.from(new Set(selectedIds));

    this.dispatchEvent(new CustomEvent("selection-change", {
      detail: { selectedIds: uniqueSelectedIds } as ProductSelectionChangeEventDetail,
      bubbles: true,
      composed: true,
    }));
  }

  private _getSelectedIdSet(): Set<string> {
    return new Set(this.selectedIds);
  }

  private _getVisibleSelectedCount(): number {
    const selected = this._getSelectedIdSet();
    return this.products.filter((product) => selected.has(product.id)).length;
  }

  private _isAnchorClick(e: Event): boolean {
    const anchor = e
      .composedPath()
      .find(($elem): $elem is HTMLAnchorElement | SVGAElement => {
        const isSvgAnchor = typeof SVGAElement !== "undefined" && $elem instanceof SVGAElement;
        return $elem instanceof HTMLAnchorElement || isSvgAnchor;
      });

    return anchor !== undefined;
  }

  private _handleRowClick(e: Event, product: ProductListItemDto): void {
    if (!this.clickable) return;
    if (this._isAnchorClick(e)) return;
    this.dispatchEvent(new CustomEvent("product-click", {
      detail: { productId: product.productRootId, product } as ProductClickEventDetail,
      bubbles: true,
      composed: true,
    }));
  }

  private _renderHeaderCell(column: ProductColumnKey): unknown {
    if (column === "select") {
      const visibleSelectedCount = this._getVisibleSelectedCount();
      const allVisibleSelected = this.products.length > 0 && visibleSelectedCount === this.products.length;
      const partiallySelected = visibleSelectedCount > 0 && visibleSelectedCount < this.products.length;

      return html`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox
            aria-label="Select all products"
            .indeterminate=${partiallySelected}
            ?checked=${allVisibleSelected}
            @change=${this._handleSelectAll}>
          </uui-checkbox>
        </uui-table-head-cell>
      `;
    }
    return html`<uui-table-head-cell>${PRODUCT_COLUMN_LABELS[column]}</uui-table-head-cell>`;
  }

  private _renderCell(product: ProductListItemDto, column: ProductColumnKey): unknown {
    switch (column) {
      case "select":
        return html`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox
              aria-label="Select ${product.rootName || product.id}"
              ?checked=${this.selectedIds.includes(product.id)}
              @change=${(e: Event) => this._handleSelectProduct(product.id, e)}
              @click=${(e: Event) => e.stopPropagation()}></uui-checkbox>
          </uui-table-cell>
        `;
      case "rootName":
        return html`<uui-table-cell class="product-name"><a href=${getProductDetailHref(product.productRootId)}>${product.rootName}</a></uui-table-cell>`;
      case "sku":
        return html`<uui-table-cell>${product.sku ?? "-"}</uui-table-cell>`;
      case "price":
        return html`<uui-table-cell>${this._formatPriceRange(product)}</uui-table-cell>`;
      case "purchaseable":
        return html`<uui-table-cell><span class="badge ${product.purchaseStatusCssClass}">${product.purchaseStatusLabel}</span></uui-table-cell>`;
      case "variants":
        return html`<uui-table-cell><span class="badge badge-default">${product.variantCount}</span></uui-table-cell>`;
      case "warnings":
        return this._renderWarningsCell(product);
      default:
        return nothing;
    }
  }

  private _getProductWarnings(product: ProductListItemDto): WarningItem[] {
    const warnings: WarningItem[] = [];

    // Digital products don't need warehouse or shipping
    if (product.isDigitalProduct) {
      return warnings;
    }

    // Error: No warehouse assigned
    if (!product.hasWarehouse) {
      warnings.push({
        type: "error",
        message: "No warehouse assigned. This product cannot be fulfilled.",
      });
    }

    // Warning: No shipping options (only if warehouse is assigned)
    if (product.hasWarehouse && !product.hasShippingOptions) {
      warnings.push({
        type: "warning",
        message: "No shipping options configured for assigned warehouses.",
      });
    }

    return warnings;
  }

  private _renderWarningsCell(product: ProductListItemDto): unknown {
    const warnings = this._getProductWarnings(product);
    return html`
      <uui-table-cell class="warnings-col">
        <merchello-warning-popover .warnings=${warnings}></merchello-warning-popover>
      </uui-table-cell>
    `;
  }

  private _formatPriceRange(product: ProductListItemDto): string {
    if (product.minPrice != null && product.maxPrice != null && product.minPrice !== product.maxPrice) {
      return `${formatCurrency(product.minPrice)} - ${formatCurrency(product.maxPrice)}`;
    }
    return formatCurrency(product.price);
  }

  private _renderRow(product: ProductListItemDto): unknown {
    const cols = this._getEffectiveColumns();
    return html`
      <uui-table-row class=${this.clickable ? "clickable" : ""} @click=${(e: Event) => this._handleRowClick(e, product)}>
        ${cols.map((col) => this._renderCell(product, col))}
      </uui-table-row>
    `;
  }

  override render() {
    const cols = this._getEffectiveColumns();
    return html`
      <div class="table-container">
        <uui-table class="product-table">
          <uui-table-head>${cols.map((col) => this._renderHeaderCell(col))}</uui-table-head>
          ${this.products.map((product) => this._renderRow(product))}
        </uui-table>
      </div>
    `;
  }

  static override readonly styles = [
    badgeStyles,
    css`
      :host { display: block; }
      .table-container { overflow-x: auto; background: var(--uui-color-surface); border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }
      .product-table { width: 100%; }
      uui-table-head-cell, uui-table-cell { white-space: nowrap; }
      uui-table-row.clickable { cursor: pointer; }
      uui-table-row.clickable:hover { background: var(--uui-color-surface-emphasis); }
      .checkbox-col { width: 40px; }
      .warnings-col { width: 40px; text-align: center; }
      .product-name a { font-weight: 500; color: var(--uui-color-interactive); text-decoration: none; }
      .product-name a:hover { text-decoration: underline; }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-table": MerchelloProductTableElement;
  }
}
