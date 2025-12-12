import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

// Import imaging package to register umb-imaging-thumbnail
import "@umbraco-cms/backoffice/imaging";

type ImageSize = "small" | "medium" | "large";

const SIZE_MAP: Record<ImageSize, number> = {
  small: 32,
  medium: 40,
  large: 56,
};

/**
 * Reusable product image component that displays media from an Umbraco media GUID.
 * Shows a subtle placeholder when no image is available.
 *
 * @example
 * ```html
 * <merchello-product-image
 *   media-key="abc123-..."
 *   size="medium"
 *   alt="Product Name">
 * </merchello-product-image>
 * ```
 */
@customElement("merchello-product-image")
export class MerchelloProductImageElement extends UmbElementMixin(LitElement) {
  /**
   * The Umbraco media GUID/key for the image.
   * If null/empty, displays a placeholder.
   */
  @property({ attribute: "media-key" })
  mediaKey: string | null = null;

  /**
   * The size preset for the image.
   * - small: 32x32px (compact lists)
   * - medium: 40x40px (standard lists)
   * - large: 56x56px (detail views)
   */
  @property()
  size: ImageSize = "medium";

  /**
   * Alt text for the image (accessibility).
   */
  @property()
  alt = "";

  private get _dimension(): number {
    return SIZE_MAP[this.size] || SIZE_MAP.medium;
  }

  render() {
    const dimension = this._dimension;

    if (this.mediaKey) {
      return html`
        <div class="image-container" style="width: ${dimension}px; height: ${dimension}px;">
          <umb-imaging-thumbnail
            .unique=${this.mediaKey}
            .width=${dimension}
            .height=${dimension}
            .alt=${this.alt}
            icon="icon-picture"
            loading="lazy">
          </umb-imaging-thumbnail>
        </div>
      `;
    }

    // Placeholder when no image
    return html`
      <div
        class="placeholder"
        style="width: ${dimension}px; height: ${dimension}px;"
        role="img"
        aria-label=${this.alt || "No image available"}>
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: inline-block;
    }

    .image-container {
      border-radius: var(--uui-border-radius);
      overflow: hidden;
      background-color: var(--uui-color-surface-alt);
    }

    .image-container umb-imaging-thumbnail {
      width: 100%;
      height: 100%;
    }

    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .placeholder uui-icon {
      font-size: 50%;
      opacity: 0.4;
      color: var(--uui-color-text-alt);
    }
  `;
}

export default MerchelloProductImageElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-image": MerchelloProductImageElement;
  }
}
