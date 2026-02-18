import { LitElement, html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  CheckoutPaymentPreviewDto,
  CheckoutMethodPreviewDto,
  PaymentMethodRegionDto,
} from "@payment-providers/types/payment-providers.types.js";
import { getBrandIconSvg } from "@payment-providers/utils/brand-icons.js";

@customElement("merchello-checkout-payment-preview")
export class MerchelloCheckoutPaymentPreviewElement extends UmbElementMixin(LitElement) {
  @state() private _preview: CheckoutPaymentPreviewDto | null = null;
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isCollapsed = false;

  @property({ type: Boolean, attribute: "auto-load" })
  autoLoad = true;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    if (this.autoLoad) {
      this.loadPreview();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  async loadPreview(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    try {
      const result = await MerchelloApi.getCheckoutPaymentPreview();

      if (!this.#isConnected) return;

      if (result.error) {
        this._errorMessage = result.error.message;
        this._isLoading = false;
        return;
      }

      this._preview = result.data ?? null;
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load preview";
    }

    this._isLoading = false;
  }

  private _toggleCollapsed(): void {
    this._isCollapsed = !this._isCollapsed;
  }

  private _renderMethodIcon(method: CheckoutMethodPreviewDto): unknown {
    // Prefer provider-defined iconHtml, fall back to hardcoded brand icons
    const svg = method.iconHtml ?? getBrandIconSvg(method.methodAlias);
    if (svg) {
      return html`<span class="method-icon-svg">${unsafeHTML(svg)}</span>`;
    }
    // Final fallback to UUI icon
    return html`<uui-icon name="${method.icon ?? 'icon-credit-card'}"></uui-icon>`;
  }

  private _renderRegionBadges(regions?: PaymentMethodRegionDto[]): unknown {
    if (!regions || regions.length === 0) return nothing;
    return html`
      ${regions.map(
        (r) => html`<span class="region-badge" title="${r.name}">${r.code}</span>`
      )}
    `;
  }

  private _renderMethod(method: CheckoutMethodPreviewDto, showOutranked = false): unknown {
    return html`
      <div class="method-row ${showOutranked ? 'outranked' : ''}">
        <div class="method-info">
          ${this._renderMethodIcon(method)}
          <span class="method-name">${method.displayName}</span>
          ${this._renderRegionBadges(method.supportedRegions)}
        </div>
        <div class="method-provider">
          ${showOutranked
            ? html`<span class="outranked-text">outranked by ${method.outrankedBy}</span>`
            : html`<span class="via-text">via ${method.providerDisplayName}</span>`
          }
        </div>
      </div>
    `;
  }

  private _renderSection(title: string, methods: CheckoutMethodPreviewDto[], showOutranked = false): unknown {
    if (methods.length === 0) return nothing;

    return html`
      <div class="preview-section">
        <h4 class="section-title">${title}</h4>
        <div class="methods-list">
          ${methods.map((m) => this._renderMethod(m, showOutranked))}
        </div>
      </div>
    `;
  }

  private _hasAnyMethods(): boolean {
    if (!this._preview) return false;
    return (
      this._preview.expressMethods.length > 0 ||
      this._preview.standardMethods.length > 0 ||
      this._preview.redirectMethods.length > 0 ||
      this._preview.hiddenMethods.length > 0
    );
  }

  override render() {
    if (this._isLoading) {
      return html`
        <div class="preview-box">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-loading">
            <uui-loader-bar></uui-loader-bar>
          </div>
        </div>
      `;
    }

    if (this._errorMessage) {
      return html`
        <div class="preview-box error">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._errorMessage}</span>
          </div>
        </div>
      `;
    }

    if (!this._hasAnyMethods()) {
      return html`
        <div class="preview-box empty">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-empty">
            <uui-icon name="icon-info"></uui-icon>
            <span>No payment methods are enabled for checkout.</span>
          </div>
        </div>
      `;
    }

    return html`
      <div class="preview-box">
        <div class="preview-header" @click=${this._toggleCollapsed}>
          <div class="header-left">
            <uui-icon name="${this._isCollapsed ? 'icon-navigation-right' : 'icon-navigation-down'}"></uui-icon>
            <span class="preview-title">Checkout Preview</span>
          </div>
          <span class="preview-subtitle">What customers will see at checkout</span>
        </div>
        ${this._isCollapsed
          ? nothing
          : html`
              <div class="preview-content">
                ${this._renderSection("Express Checkout", this._preview?.expressMethods ?? [])}
                ${this._renderSection("Standard Payment", this._preview?.standardMethods ?? [])}
                ${this._renderSection("Or Pay With", this._preview?.redirectMethods ?? [])}
                ${this._preview?.hiddenMethods.length
                  ? html`
                      <div class="hidden-section">
                        ${this._renderSection(
                          "Hidden (outranked by lower sort order)",
                          this._preview?.hiddenMethods ?? [],
                          true
                        )}
                      </div>
                    `
                  : nothing}
              </div>
            `}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .preview-box {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-layout-1);
    }

    .preview-box.error {
      border-color: var(--uui-color-danger);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      cursor: pointer;
      user-select: none;
    }

    .preview-header:hover {
      background: var(--uui-color-surface-alt);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .header-left > uui-icon {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .preview-title {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .preview-subtitle {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .preview-loading {
      padding: var(--uui-size-space-4);
    }

    .preview-error,
    .preview-empty {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .preview-error {
      color: var(--uui-color-danger);
    }

    .preview-content {
      padding: 0 var(--uui-size-space-4) var(--uui-size-space-4);
    }

    .preview-section {
      margin-bottom: var(--uui-size-space-4);
    }

    .preview-section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .methods-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .method-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .method-row.outranked {
      opacity: 0.6;
    }

    .method-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .method-info > uui-icon {
      font-size: 1rem;
      color: var(--uui-color-text-alt);
    }

    .method-icon-svg {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }

    .method-icon-svg svg {
      width: 100%;
      height: 100%;
    }

    .method-name {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .region-badge {
      font-size: 0.75rem;
      margin-left: var(--uui-size-space-1);
    }

    .method-provider {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .via-text {
      color: var(--uui-color-positive);
    }

    .outranked-text {
      font-style: italic;
    }

    .hidden-section {
      border-top: 1px dashed var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-2);
    }

    .hidden-section .section-title {
      color: var(--uui-color-text-alt);
    }
  `;
}

export default MerchelloCheckoutPaymentPreviewElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-checkout-payment-preview": MerchelloCheckoutPaymentPreviewElement;
  }
}
