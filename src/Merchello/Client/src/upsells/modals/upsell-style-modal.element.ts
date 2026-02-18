import { css, html } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  UpsellDisplayStylesDto,
  UpsellElementStyleDto,
  UpsellSurfaceStyleDto,
} from "@upsells/types/upsell.types.js";
import type {
  UpsellStyleModalData,
  UpsellStyleModalValue,
} from "@upsells/modals/upsell-style-modal.token.js";

type UpsellSurfaceKey = keyof UpsellDisplayStylesDto;
type UpsellElementKey = keyof UpsellSurfaceStyleDto;

interface SurfaceDefinition {
  key: UpsellSurfaceKey;
  label: string;
  description: string;
}

interface ElementDefinition {
  key: UpsellElementKey;
  label: string;
}

const SURFACE_DEFINITIONS: SurfaceDefinition[] = [
  { key: "checkoutInline", label: "Checkout Inline", description: "Collapsed/expandable inline checkout offers." },
  { key: "checkoutInterstitial", label: "Checkout Interstitial", description: "Interstitial offer step before checkout form." },
  { key: "postPurchase", label: "Post-Purchase", description: "Offer page shown after payment before confirmation." },
  { key: "basket", label: "Basket", description: "Basket/cart recommendation surfaces." },
  { key: "productPage", label: "Product Page", description: "Recommendations shown on product detail pages." },
  { key: "confirmation", label: "Confirmation", description: "Recommendations shown on order confirmation." },
  { key: "email", label: "Email", description: "Transactional email recommendation blocks." },
];

const ELEMENT_DEFINITIONS: ElementDefinition[] = [
  { key: "container", label: "Container" },
  { key: "heading", label: "Heading" },
  { key: "message", label: "Message" },
  { key: "productCard", label: "Product Card" },
  { key: "productName", label: "Product Name" },
  { key: "productDescription", label: "Product Description" },
  { key: "productPrice", label: "Price" },
  { key: "badge", label: "Badge" },
  { key: "button", label: "Primary Button" },
  { key: "secondaryButton", label: "Secondary Button" },
  { key: "variantSelector", label: "Variant Selector" },
  { key: "statusText", label: "Status Text" },
];

const BORDER_STYLE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
];

@customElement("merchello-upsell-style-modal")
export class MerchelloUpsellStyleModalElement extends UmbModalBaseElement<
  UpsellStyleModalData,
  UpsellStyleModalValue
> {
  @state() private _styles: UpsellDisplayStylesDto = {};
  @state() private _activeSurface: UpsellSurfaceKey = "checkoutInline";
  @state() private _previewAddedState = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._styles = this._cloneStyles(this.data?.styles);
  }

  private _cloneStyles(styles?: UpsellDisplayStylesDto): UpsellDisplayStylesDto {
    if (!styles) return {};
    return JSON.parse(JSON.stringify(styles)) as UpsellDisplayStylesDto;
  }

  private _getSurfaceStyle(surfaceKey: UpsellSurfaceKey): UpsellSurfaceStyleDto {
    return (this._styles[surfaceKey] ?? {}) as UpsellSurfaceStyleDto;
  }

  private _getElementStyle(
    surfaceKey: UpsellSurfaceKey,
    elementKey: UpsellElementKey
  ): UpsellElementStyleDto {
    const surfaceStyle = this._getSurfaceStyle(surfaceKey);
    return (surfaceStyle[elementKey] ?? {}) as UpsellElementStyleDto;
  }

  private _setElementStyle(
    surfaceKey: UpsellSurfaceKey,
    elementKey: UpsellElementKey,
    updater: (style: UpsellElementStyleDto) => UpsellElementStyleDto
  ): void {
    const nextStyles = { ...this._styles };
    const currentSurface = { ...this._getSurfaceStyle(surfaceKey) };
    const currentElement = { ...this._getElementStyle(surfaceKey, elementKey) };
    const updatedElement = updater(currentElement);

    if (this._isElementStyleEmpty(updatedElement)) {
      delete currentSurface[elementKey];
    } else {
      currentSurface[elementKey] = updatedElement;
    }

    if (this._isSurfaceStyleEmpty(currentSurface)) {
      delete nextStyles[surfaceKey];
    } else {
      nextStyles[surfaceKey] = currentSurface;
    }

    this._styles = nextStyles;
  }

  private _handleColorChange(
    surfaceKey: UpsellSurfaceKey,
    elementKey: UpsellElementKey,
    field: keyof UpsellElementStyleDto,
    event: Event
  ): void {
    const target = event.target as HTMLInputElement;
    const value = target.value?.trim() ?? "";
    this._setElementStyle(surfaceKey, elementKey, (style) => ({
      ...style,
      [field]: value || undefined,
    }));
  }

  private _handleBorderStyleChange(
    surfaceKey: UpsellSurfaceKey,
    elementKey: UpsellElementKey,
    event: Event
  ): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value?.trim() ?? "";
    this._setElementStyle(surfaceKey, elementKey, (style) => ({
      ...style,
      borderStyle: value || undefined,
    }));
  }

  private _handleNumberChange(
    surfaceKey: UpsellSurfaceKey,
    elementKey: UpsellElementKey,
    field: "borderWidth" | "borderRadius",
    event: Event
  ): void {
    const target = event.target as HTMLInputElement;
    const rawValue = target.value?.trim();
    if (!rawValue) {
      this._setElementStyle(surfaceKey, elementKey, (style) => ({
        ...style,
        [field]: undefined,
      }));
      return;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return;
    }

    this._setElementStyle(surfaceKey, elementKey, (style) => ({
      ...style,
      [field]: Math.round(parsedValue),
    }));
  }

  private _clearElement(surfaceKey: UpsellSurfaceKey, elementKey: UpsellElementKey): void {
    this._setElementStyle(surfaceKey, elementKey, () => ({}));
  }

  private _clearSurface(surfaceKey: UpsellSurfaceKey): void {
    const nextStyles = { ...this._styles };
    delete nextStyles[surfaceKey];
    this._styles = nextStyles;
  }

  private _resetAllStyles(): void {
    this._styles = {};
    this._previewAddedState = false;
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _handleSave(): void {
    const normalized = this._normalizeStyles(this._styles);
    this.value = {
      styles: normalized ?? undefined,
    };
    this.modalContext?.submit();
  }

  private _normalizeStyles(styles: UpsellDisplayStylesDto): UpsellDisplayStylesDto | undefined {
    const normalized: UpsellDisplayStylesDto = {};

    for (const surface of SURFACE_DEFINITIONS) {
      const sourceSurface = styles[surface.key] as UpsellSurfaceStyleDto | undefined;
      if (!sourceSurface) continue;

      const nextSurface: UpsellSurfaceStyleDto = {};
      for (const element of ELEMENT_DEFINITIONS) {
        const sourceElement = sourceSurface[element.key] as UpsellElementStyleDto | undefined;
        if (!sourceElement) continue;

        const nextElement: UpsellElementStyleDto = {
          textColor: sourceElement.textColor?.trim() || undefined,
          backgroundColor: sourceElement.backgroundColor?.trim() || undefined,
          borderColor: sourceElement.borderColor?.trim() || undefined,
          borderStyle: sourceElement.borderStyle?.trim() || undefined,
          borderWidth: sourceElement.borderWidth,
          borderRadius: sourceElement.borderRadius,
        };

        if (this._isElementStyleEmpty(nextElement)) continue;
        nextSurface[element.key] = nextElement;
      }

      if (this._isSurfaceStyleEmpty(nextSurface)) continue;
      normalized[surface.key] = nextSurface;
    }

    return this._isDisplayStylesEmpty(normalized) ? undefined : normalized;
  }

  private _isElementStyleEmpty(style: UpsellElementStyleDto): boolean {
    return !style.textColor &&
      !style.backgroundColor &&
      !style.borderColor &&
      !style.borderStyle &&
      style.borderWidth == null &&
      style.borderRadius == null;
  }

  private _isSurfaceStyleEmpty(style: UpsellSurfaceStyleDto): boolean {
    return ELEMENT_DEFINITIONS.every((element) => !style[element.key]);
  }

  private _isDisplayStylesEmpty(styles: UpsellDisplayStylesDto): boolean {
    return SURFACE_DEFINITIONS.every((surface) => !styles[surface.key]);
  }

  private _toInlineStyle(style?: UpsellElementStyleDto): string {
    if (!style) return "";

    const styles: string[] = [];
    if (style.textColor) styles.push(`color: ${style.textColor}`);
    if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
    if (style.borderColor) styles.push(`border-color: ${style.borderColor}`);
    if (style.borderStyle) styles.push(`border-style: ${style.borderStyle}`);
    if (style.borderWidth != null) styles.push(`border-width: ${style.borderWidth}px`);
    if (style.borderRadius != null) styles.push(`border-radius: ${style.borderRadius}px`);
    return styles.join("; ");
  }

  private _renderColorPicker(
    surfaceKey: UpsellSurfaceKey,
    elementKey: UpsellElementKey,
    field: keyof UpsellElementStyleDto,
    label: string,
    value?: string
  ): unknown {
    return html`
      <div class="field-row">
        <label>${label}</label>
        <uui-color-picker
          label=${label}
          .value=${value ?? ""}
          @change=${(e: Event) => this._handleColorChange(surfaceKey, elementKey, field, e)}
        ></uui-color-picker>
      </div>
    `;
  }

  private _renderElementEditor(element: ElementDefinition): unknown {
    const surfaceKey = this._activeSurface;
    const style = this._getElementStyle(surfaceKey, element.key);

    return html`
      <uui-box headline=${element.label}>
        <div class="element-editor">
          <div class="element-grid">
            ${this._renderColorPicker(surfaceKey, element.key, "textColor", "Text color", style.textColor)}
            ${this._renderColorPicker(surfaceKey, element.key, "backgroundColor", "Background", style.backgroundColor)}
            ${this._renderColorPicker(surfaceKey, element.key, "borderColor", "Border color", style.borderColor)}
          </div>

          <div class="element-grid">
            <div class="field-row">
              <label>Border style</label>
              <uui-select
                label="Border style"
                .options=${BORDER_STYLE_OPTIONS.map((opt) => ({
                  name: opt.label,
                  value: opt.value,
                  selected: (style.borderStyle ?? "") === opt.value,
                }))}
                @change=${(e: Event) => this._handleBorderStyleChange(surfaceKey, element.key, e)}
              ></uui-select>
            </div>

            <div class="field-row">
              <label>Border width (px)</label>
              <uui-input
                type="number"
                min="0"
                max="12"
                label="Border width"
                .value=${style.borderWidth != null ? String(style.borderWidth) : ""}
                @input=${(e: Event) => this._handleNumberChange(surfaceKey, element.key, "borderWidth", e)}
              ></uui-input>
            </div>

            <div class="field-row">
              <label>Border radius (px)</label>
              <uui-input
                type="number"
                min="0"
                max="64"
                label="Border radius"
                .value=${style.borderRadius != null ? String(style.borderRadius) : ""}
                @input=${(e: Event) => this._handleNumberChange(surfaceKey, element.key, "borderRadius", e)}
              ></uui-input>
            </div>
          </div>

          <div class="element-actions">
            <uui-button
              look="secondary"
              compact
              label=${`Clear ${element.label}`}
              @click=${() => this._clearElement(surfaceKey, element.key)}
            >
              Clear ${element.label}
            </uui-button>
          </div>
        </div>
      </uui-box>
    `;
  }

  private _renderPreviewHeading(surfaceStyle: UpsellSurfaceStyleDto): unknown {
    const heading = this.data?.heading?.trim() || "Complete your order";
    return html`
      <h3
        class="preview-heading"
        style=${this._toInlineStyle(surfaceStyle.heading)}
      >${heading}</h3>
    `;
  }

  private _renderPreviewMessage(surfaceStyle: UpsellSurfaceStyleDto): unknown {
    const message = this.data?.message?.trim() || "Customers often add this item too.";
    return html`
      <p
        class="preview-message"
        style=${this._toInlineStyle(surfaceStyle.message)}
      >${message}</p>
    `;
  }

  private _renderPreviewProductCard(surfaceStyle: UpsellSurfaceStyleDto): unknown {
    return html`
      <div class="preview-card" style=${this._toInlineStyle(surfaceStyle.productCard)}>
        <div class="preview-image"></div>
        <div class="preview-content">
          <div class="preview-product-name" style=${this._toInlineStyle(surfaceStyle.productName)}>Premium Pillow Set</div>
          <div class="preview-product-description" style=${this._toInlineStyle(surfaceStyle.productDescription)}>
            Soft support with hotel-grade comfort.
          </div>
          <div class="preview-price-row">
            <span class="preview-price" style=${this._toInlineStyle(surfaceStyle.productPrice)}>$29.99</span>
            <span class="preview-badge" style=${this._toInlineStyle(surfaceStyle.badge)}>Top seller</span>
          </div>

          <div class="preview-variant-wrap">
            <select class="preview-select" style=${this._toInlineStyle(surfaceStyle.variantSelector)}>
              <option>Standard</option>
              <option>King</option>
            </select>
          </div>

          <div class="preview-buttons">
            <button class="preview-primary" style=${this._toInlineStyle(surfaceStyle.button)}>
              ${this._previewAddedState ? "Added" : "Add to Order"}
            </button>
            <button class="preview-secondary" style=${this._toInlineStyle(surfaceStyle.secondaryButton)}>No Thanks</button>
          </div>

          <p class="preview-status" style=${this._toInlineStyle(surfaceStyle.statusText)}>
            ${this._previewAddedState ? "Added to basket" : "Ready to add"}
          </p>
        </div>
      </div>
    `;
  }

  private _renderSurfacePreview(): unknown {
    const surfaceStyle = this._getSurfaceStyle(this._activeSurface);

    return html`
      <div class="preview-shell" style=${this._toInlineStyle(surfaceStyle.container)}>
        ${this._renderPreviewHeading(surfaceStyle)}
        ${this._renderPreviewMessage(surfaceStyle)}
        ${this._renderPreviewProductCard(surfaceStyle)}
      </div>
    `;
  }

  override render() {
    const activeSurfaceDefinition = SURFACE_DEFINITIONS.find((x) => x.key === this._activeSurface);

    return html`
      <umb-body-layout headline="Upsell Style Customization">
        <div id="main">
          <div class="surface-tabs">
            <uui-tab-group>
              ${SURFACE_DEFINITIONS.map((surface) => html`
                <uui-tab
                  label=${surface.label}
                  ?active=${surface.key === this._activeSurface}
                  @click=${() => { this._activeSurface = surface.key; }}
                >${surface.label}</uui-tab>
              `)}
            </uui-tab-group>
            <p class="surface-description">${activeSurfaceDefinition?.description}</p>
          </div>

          <div class="layout">
            <div class="controls-column">
              <div class="control-actions">
                <uui-button
                  look="secondary"
                  color="danger"
                  label="Clear active surface"
                  @click=${() => this._clearSurface(this._activeSurface)}
                >
                  Clear Surface
                </uui-button>
                <uui-button look="secondary" label="Reset all styles" @click=${this._resetAllStyles}>
                  Reset All
                </uui-button>
              </div>

              ${ELEMENT_DEFINITIONS.map((element) => this._renderElementEditor(element))}
            </div>

            <div class="preview-column">
              <uui-box headline="Live Preview">
                <div class="preview-wrapper">
                  ${this._renderSurfacePreview()}
                </div>
                <div class="preview-actions">
                  <uui-button
                    look="secondary"
                    compact
                    label=${this._previewAddedState ? "Show default state" : "Show added state"}
                    @click=${() => { this._previewAddedState = !this._previewAddedState; }}
                  >
                    ${this._previewAddedState ? "Show Default State" : "Show Added State"}
                  </uui-button>
                </div>
              </uui-box>
            </div>
          </div>
        </div>

        <uui-button slot="actions" look="secondary" label="Cancel" @click=${this._handleCancel}>Cancel</uui-button>
        <uui-button slot="actions" look="primary" color="positive" label="Apply styles" @click=${this._handleSave}>Apply Styles</uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      max-width: 100%;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      max-height: 82vh;
    }

    .surface-tabs {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .surface-description {
      margin: 0;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .layout {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: var(--uui-size-space-4);
      min-height: 0;
      overflow: hidden;
    }

    .controls-column {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      overflow: auto;
      padding-right: var(--uui-size-space-2);
    }

    .preview-column {
      position: sticky;
      top: 0;
      align-self: start;
    }

    .control-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
    }

    .element-editor {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .element-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
    }

    .field-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .field-row label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .element-actions {
      display: flex;
      justify-content: flex-end;
    }

    .preview-wrapper {
      background: linear-gradient(145deg, #f5f7fa, #eef2f8);
      border-radius: 12px;
      padding: var(--uui-size-space-4);
    }

    .preview-shell {
      border: 1px solid #d5dbe3;
      border-radius: 10px;
      background: white;
      padding: var(--uui-size-space-4);
      box-shadow: 0 10px 30px rgba(31, 42, 55, 0.08);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .preview-heading {
      margin: 0;
      font-size: 1.1rem;
    }

    .preview-message {
      margin: 0;
      font-size: 0.9rem;
      color: #556070;
    }

    .preview-card {
      border: 1px solid #d9dde3;
      border-radius: 10px;
      padding: var(--uui-size-space-3);
      display: grid;
      grid-template-columns: 84px 1fr;
      gap: var(--uui-size-space-3);
      background: #ffffff;
    }

    .preview-image {
      width: 84px;
      height: 84px;
      border-radius: 8px;
      background: linear-gradient(45deg, #dbe6f8, #f3f7ff);
      border: 1px solid #d4deef;
    }

    .preview-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .preview-product-name {
      font-weight: 600;
      color: #1d2733;
    }

    .preview-product-description {
      font-size: 0.82rem;
      color: #647487;
    }

    .preview-price-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .preview-price {
      font-weight: 700;
      color: #121923;
    }

    .preview-badge {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: #f0f4fa;
      color: #4d5f77;
      border: 1px solid #dae3ef;
    }

    .preview-variant-wrap {
      max-width: 180px;
    }

    .preview-select {
      width: 100%;
      border: 1px solid #cfd7e3;
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 0.82rem;
    }

    .preview-buttons {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .preview-primary,
    .preview-secondary {
      border: 1px solid #cfd7e3;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.82rem;
      cursor: default;
    }

    .preview-primary {
      background: #111827;
      color: white;
      border-color: #111827;
    }

    .preview-secondary {
      background: white;
      color: #3d4b60;
    }

    .preview-status {
      margin: 0;
      font-size: 0.75rem;
      color: #5f7088;
    }

    .preview-actions {
      margin-top: var(--uui-size-space-3);
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 1200px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .preview-column {
        position: static;
      }
    }

    @media (max-width: 768px) {
      #main {
        max-height: 78vh;
      }

      .control-actions {
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .element-grid {
        grid-template-columns: 1fr;
      }

      .preview-buttons {
        flex-wrap: wrap;
      }

      .preview-card {
        grid-template-columns: 1fr;
      }

      .preview-image {
        width: 100%;
        max-width: 120px;
      }
    }
  `;
}

export default MerchelloUpsellStyleModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-upsell-style-modal": MerchelloUpsellStyleModalElement;
  }
}
