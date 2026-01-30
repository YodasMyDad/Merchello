import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { PickerVariant } from "./product-picker.types.js";
import { formatPrice } from "./product-picker.types.js";

/**
 * Variant row component for the product picker.
 * Displays a single variant with checkbox, name, SKU, price, and eligibility status.
 *
 * Events:
 * - `select`: Fired when the checkbox is clicked (only if variant can be selected)
 */
@customElement("merchello-product-picker-variant-row")
export class MerchelloProductPickerVariantRowElement extends UmbElementMixin(LitElement) {
  @property({ type: Object })
  variant!: PickerVariant;

  @property({ type: Boolean })
  selected = false;

  @property({ type: String })
  currencySymbol = "£";

  @property({ type: Boolean })
  showImage = true;

  @state()
  private _imageFailed = false;

  private _handleClick(): void {
    if (!this.variant.canSelect) return;

    this.dispatchEvent(
      new CustomEvent("select", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleCheckboxChange(e: Event): void {
    e.stopPropagation();
    if (!this.variant.canSelect) return;

    this.dispatchEvent(
      new CustomEvent("select", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderImage() {
    if (this.variant.imageUrl && !this._imageFailed) {
      return html`<img
        src="${this.variant.imageUrl}"
        alt="${this.variant.name ?? ""}"
        class="variant-image"
        @error=${() => (this._imageFailed = true)}
      />`;
    }
    return html`
      <div class="variant-image placeholder">
        <uui-icon name="icon-picture"></uui-icon>
      </div>
    `;
  }

  private _renderName() {
    const displayName = this.variant.optionValuesDisplay ?? this.variant.name ?? "Default";
    return html`<span class="variant-name">${displayName}</span>`;
  }

  private _renderSku() {
    if (!this.variant.sku) return nothing;
    return html`<span class="variant-sku">${this.variant.sku}</span>`;
  }

  private _renderPrice() {
    return html`<span class="variant-price">${formatPrice(this.variant.price, this.currencySymbol)}</span>`;
  }

  /**
   * Renders stock status using backend-provided label and CSS class.
   * Backend is the single source of truth for stock status display.
   */
  private _renderStockStatus() {
    if (!this.variant.stockStatusLabel) return nothing;
    const countSuffix = this.variant.availableStock > 0 ? ` (${this.variant.availableStock})` : "";
    return html`<span class="badge ${this.variant.stockStatusCssClass}">${this.variant.stockStatusLabel}${countSuffix}</span>`;
  }

  private _renderRegionStatus() {
    if (!this.variant.canShipToRegion) {
      return html`<span class="status blocked">${this.variant.regionMessage ?? "Cannot ship"}</span>`;
    }
    return nothing;
  }

  private _renderBlockedReason() {
    if (!this.variant.canSelect && this.variant.blockedReason) {
      return html`
        <div class="blocked-overlay">
          <uui-icon name="icon-block"></uui-icon>
          <span>${this.variant.blockedReason}</span>
        </div>
      `;
    }
    return nothing;
  }

  override render() {
    const isBlocked = !this.variant.canSelect;

    return html`
      <div
        class="variant-row ${isBlocked ? "blocked" : ""} ${this.selected ? "selected" : ""}"
        @click=${this._handleClick}
        role="option"
        aria-selected=${this.selected}
        aria-disabled=${isBlocked}
      >
        <uui-checkbox
          .checked=${this.selected}
          ?disabled=${isBlocked}
          @change=${this._handleCheckboxChange}
          label="Select variant"
        ></uui-checkbox>

        ${this.showImage ? this._renderImage() : nothing}

        <div class="variant-info">
          <div class="variant-name-row">
            ${this._renderName()}
            ${this._renderSku()}
          </div>
          <div class="variant-meta">
            ${this._renderPrice()}
            ${this._renderStockStatus()}
            ${this._renderRegionStatus()}
          </div>
        </div>

        ${this._renderBlockedReason()}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .variant-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      position: relative;
      transition: background-color 0.15s ease;
    }

    .variant-row:hover:not(.blocked) {
      background-color: var(--uui-color-surface-emphasis);
    }

    .variant-row.selected {
      background-color: var(--uui-color-selected);
    }

    .variant-row.blocked {
      opacity: 0.6;
      cursor: not-allowed;
    }

    uui-checkbox {
      flex-shrink: 0;
    }

    .variant-image {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      flex-shrink: 0;
    }

    .variant-image.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
    }

    .variant-info {
      flex: 1;
      min-width: 0;
    }

    .variant-name-row {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-2);
    }

    .variant-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .variant-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .variant-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-1);
      font-size: 0.75rem;
    }

    .variant-price {
      font-weight: 500;
      color: var(--uui-color-text);
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
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

    .status.blocked {
      color: var(--uui-color-danger);
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

    .blocked-overlay {
      position: absolute;
      right: var(--uui-size-space-3);
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      background-color: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .blocked-overlay uui-icon {
      font-size: 0.75rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-picker-variant-row": MerchelloProductPickerVariantRowElement;
  }
}
