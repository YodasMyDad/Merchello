import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

import "./product-image.element.js";

type ImageSize = "small" | "medium" | "large";

interface SelectedOption {
  optionName: string;
  valueName: string;
}

/**
 * Displays the identity block for a line item: product image, name, variant options, and SKU.
 * Use this anywhere a product line item needs consistent display.
 *
 * @example
 * ```html
 * <merchello-line-item-identity
 *   media-key="abc123-..."
 *   name="Heritage Collection Hoodie"
 *   .selectedOptions=${[{ optionName: "Color", valueName: "Burgundy" }]}
 *   sku="HC-HOODIE-BURG-XS"
 *   size="large">
 * </merchello-line-item-identity>
 * ```
 */
@customElement("merchello-line-item-identity")
export class MerchelloLineItemIdentityElement extends UmbElementMixin(LitElement) {
  /** Umbraco media GUID for the product image. Null/empty shows placeholder. */
  @property({ attribute: "media-key" })
  mediaKey: string | null = null;

  /** Product display name. Use productRootName when available, falls back to variant name. */
  @property()
  name = "";

  /** Selected variant options (e.g., Color: Burgundy, Size: XS). */
  @property({ attribute: false })
  selectedOptions: SelectedOption[] = [];

  /** Product SKU. Empty hides the row. */
  @property()
  sku = "";

  /** Image size preset. */
  @property()
  size: ImageSize = "medium";

  override render() {
    return html`
      <merchello-product-image
        media-key=${this.mediaKey || nothing}
        size=${this.size}
        alt=${this.name}>
      </merchello-product-image>
      <div class="details">
        <div class="name">${this.name || "Unknown item"}</div>
        ${this.selectedOptions?.length
          ? html`
              <div class="options">
                ${this.selectedOptions.map(
                  (opt) => html`<span class="option">${opt.optionName}: ${opt.valueName}</span>`
                )}
              </div>
            `
          : nothing}
        ${this.sku ? html`<div class="sku">${this.sku}</div>` : nothing}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      min-width: 0;
    }

    .details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--line-item-color, var(--uui-color-text));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
    }

    .option {
      font-size: 0.8125rem;
      color: var(--line-item-secondary-color, var(--uui-color-text-alt));
    }

    .sku {
      font-size: 0.75rem;
      color: var(--line-item-secondary-color, var(--uui-color-text-alt));
    }
  `;
}

export default MerchelloLineItemIdentityElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-line-item-identity": MerchelloLineItemIdentityElement;
  }
}
