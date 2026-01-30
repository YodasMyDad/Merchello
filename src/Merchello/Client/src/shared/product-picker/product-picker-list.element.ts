import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { PickerProductRoot, PickerVariant } from "./product-picker.types.js";
import { formatPriceRange } from "./product-picker.types.js";
import "./product-picker-variant-row.element.js";

/**
 * Product picker list component that displays expandable product roots with variants.
 *
 * Events:
 * - `toggle-expand`: Fired when a product root is clicked to expand/collapse
 * - `variant-select`: Fired when a variant checkbox is toggled
 */
@customElement("merchello-product-picker-list")
export class MerchelloProductPickerListElement extends UmbElementMixin(LitElement) {
  @property({ type: Array })
  productRoots: PickerProductRoot[] = [];

  @property({ type: Array })
  selectedIds: string[] = [];

  @property({ type: String })
  currencySymbol = "£";

  @property({ type: Boolean })
  showImages = true;

  @state()
  private _failedImages: Set<string> = new Set();

  private _handleRootClick(root: PickerProductRoot): void {
    this.dispatchEvent(
      new CustomEvent("toggle-expand", {
        detail: { rootId: root.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleVariantSelect(variant: PickerVariant): void {
    this.dispatchEvent(
      new CustomEvent("variant-select", {
        detail: { variant },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleImageError(imageUrl: string) {
    this._failedImages = new Set([...this._failedImages, imageUrl]);
  }

  private _renderProductImage(imageUrl: string | null, name: string) {
    if (imageUrl && !this._failedImages.has(imageUrl)) {
      return html`<img
        src="${imageUrl}"
        alt="${name}"
        class="product-image"
        @error=${() => this._handleImageError(imageUrl)}
      />`;
    }
    return html`
      <div class="product-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }

  private _renderPriceRange(root: PickerProductRoot) {
    return formatPriceRange(root.minPrice, root.maxPrice, this.currencySymbol);
  }

  /**
   * Renders stock status badge using backend-provided label and CSS class.
   * Backend is the single source of truth for stock status display.
   */
  private _renderStockBadge(root: PickerProductRoot) {
    if (!root.stockStatusLabel) return nothing;
    const countSuffix = root.totalStock > 0 ? ` (${root.totalStock})` : "";
    return html`<span class="badge ${root.stockStatusCssClass}">${root.stockStatusLabel}${countSuffix}</span>`;
  }

  private _renderExpandIcon(isExpanded: boolean) {
    return html`
      <uui-icon name=${isExpanded ? "icon-navigation-down" : "icon-navigation-right"} class="expand-icon"></uui-icon>
    `;
  }

  private _renderProductRoot(root: PickerProductRoot) {
    const isSingleVariant = root.variantCount === 1;

    return html`
      <div class="product-root ${root.isExpanded ? "expanded" : ""} ${this.showImages ? "" : "no-images"}">
        <button
          type="button"
          class="product-root-header"
          @click=${() => this._handleRootClick(root)}
          aria-expanded=${root.isExpanded}
        >
          ${!isSingleVariant ? this._renderExpandIcon(root.isExpanded) : html`<div class="expand-spacer"></div>`}
          ${this.showImages ? this._renderProductImage(root.imageUrl, root.rootName) : nothing}
          <div class="product-info">
            <div class="product-name">${root.rootName}</div>
            <div class="product-meta">
              <span class="price">${this._renderPriceRange(root)}</span>
              ${!isSingleVariant ? html`<span class="variant-count">${root.variantCount} variants</span>` : nothing}
              ${this._renderStockBadge(root)}
            </div>
          </div>
        </button>

        ${root.isExpanded && root.variantsLoaded
          ? html`
              <div class="variants-container ${this.showImages ? "" : "no-images"}">
                ${root.variants.map(
                  (variant) => html`
                    <merchello-product-picker-variant-row
                      .variant=${variant}
                      .selected=${this.selectedIds.includes(variant.id)}
                      .currencySymbol=${this.currencySymbol}
                      .showImage=${this.showImages}
                      @select=${() => this._handleVariantSelect(variant)}
                    ></merchello-product-picker-variant-row>
                  `
                )}
              </div>
            `
          : nothing}

        ${root.isExpanded && !root.variantsLoaded
          ? html`
              <div class="variants-loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    if (this.productRoots.length === 0) {
      return html`<div class="empty">No products to display</div>`;
    }

    return html`
      <div class="product-list">
        ${this.productRoots.map((root) => this._renderProductRoot(root))}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .product-list {
      display: flex;
      flex-direction: column;
    }

    .product-root {
      border-bottom: 1px solid var(--uui-color-border);
    }

    .product-root:last-child {
      border-bottom: none;
    }

    .product-root-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background-color 0.15s ease;
    }

    .product-root-header:hover {
      background-color: var(--uui-color-surface-alt);
    }

    .product-root.expanded .product-root-header {
      background-color: var(--uui-color-surface-alt);
    }

    .expand-icon {
      flex-shrink: 0;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      transition: transform 0.15s ease;
    }

    .expand-spacer {
      width: 0.75rem;
      flex-shrink: 0;
    }

    .product-image {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      flex-shrink: 0;
    }

    .product-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .product-info {
      flex: 1;
      min-width: 0;
    }

    .product-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-1);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .price {
      font-weight: 500;
      color: var(--uui-color-text);
    }

    .variant-count {
      color: var(--uui-color-text-alt);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .badge.badge-positive {
      background-color: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.badge-warning {
      background-color: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .badge.badge-danger {
      background-color: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge.badge-default {
      background-color: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .variants-container {
      padding-left: calc(0.75rem + var(--uui-size-space-3) + 40px + var(--uui-size-space-3));
      padding-bottom: var(--uui-size-space-2);
    }

    .variants-container.no-images {
      padding-left: calc(0.75rem + var(--uui-size-space-3));
    }

    .variants-loading {
      padding: var(--uui-size-space-3);
      padding-left: calc(0.75rem + var(--uui-size-space-3) + 40px + var(--uui-size-space-3));
    }

    .product-root.no-images .variants-loading {
      padding-left: calc(0.75rem + var(--uui-size-space-3));
    }

    .empty {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-picker-list": MerchelloProductPickerListElement;
  }
}
