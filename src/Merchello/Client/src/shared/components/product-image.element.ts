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

const GUID_D_FORMAT_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUID_N_FORMAT_REGEX = /^[0-9a-f]{32}$/i;
const MEDIA_UDI_REGEX = /^umb:\/\/media\/([0-9a-f]{32})$/i;

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

  private get _normalizedMediaKey(): string | null {
    const key = typeof this.mediaKey === "string" ? this.mediaKey.trim() : "";
    if (!key) return null;

    const lowered = key.toLowerCase();
    if (lowered === "null" || lowered === "undefined") {
      return null;
    }

    if (key === "00000000-0000-0000-0000-000000000000") {
      return null;
    }

    return this._normalizeMediaKeyToGuid(key);
  }

  private _normalizeMediaKeyToGuid(value: string): string | null {
    const cleaned = value.replace(/[{}]/g, "").trim();
    if (!cleaned) {
      return null;
    }

    if (GUID_D_FORMAT_REGEX.test(cleaned)) {
      return cleaned;
    }

    if (GUID_N_FORMAT_REGEX.test(cleaned)) {
      return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`;
    }

    const udiMatch = MEDIA_UDI_REGEX.exec(cleaned);
    if (udiMatch?.[1]) {
      const guid = udiMatch[1];
      return `${guid.slice(0, 8)}-${guid.slice(8, 12)}-${guid.slice(12, 16)}-${guid.slice(16, 20)}-${guid.slice(20)}`;
    }

    return null;
  }

  override render() {
    const dimension = this._dimension;
    const mediaKey = this._normalizedMediaKey;

    if (mediaKey) {
      return html`
        <div class="image-container" style="width: ${dimension}px; height: ${dimension}px;">
          <umb-imaging-thumbnail
            .unique=${mediaKey}
            .width=${dimension}
            .height=${dimension}
            .alt=${this.alt}
            icon="icon-picture"
            loading="lazy">
          </umb-imaging-thumbnail>
        </div>
      `;
    }

    // Use Umbraco thumbnail fallback for consistent placeholder styling.
    return html`
      <div class="image-container" style="width: ${dimension}px; height: ${dimension}px;">
        <umb-imaging-thumbnail
          .unique=${""}
          .width=${dimension}
          .height=${dimension}
          .alt=${this.alt || "No image available"}
          icon="icon-picture"
          loading="lazy">
        </umb-imaging-thumbnail>
      </div>
    `;
  }

  static override readonly styles = css`
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

  `;
}

export default MerchelloProductImageElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-image": MerchelloProductImageElement;
  }
}
