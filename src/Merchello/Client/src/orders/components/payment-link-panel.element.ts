import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatShortDate } from "@shared/utils/formatting.js";
import type { PaymentLinkInfoDto, PaymentLinkProviderDto } from "@payment-providers/types/payment-providers.types.js";

/**
 * Payment link panel for generating and managing shareable payment links.
 * Allows staff to create payment links for invoices using Stripe or PayPal.
 */
@customElement("merchello-payment-link-panel")
export class MerchelloPaymentLinkPanelElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) invoiceId: string = "";

  @state() private _providers: PaymentLinkProviderDto[] = [];
  @state() private _linkInfo: PaymentLinkInfoDto | null = null;
  @state() private _selectedProvider: string = "";
  @state() private _isLoading: boolean = true;
  @state() private _isGenerating: boolean = false;
  @state() private _isDeactivating: boolean = false;
  @state() private _errorMessage: string | null = null;
  @state() private _copySuccess: boolean = false;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    if (this.invoiceId) {
      this._loadData();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("invoiceId") && this.invoiceId) {
      this._loadData();
    }
  }

  private async _loadData(): Promise<void> {
    if (!this.invoiceId) return;

    this._isLoading = true;
    this._errorMessage = null;

    try {
      const [providersResult, linkResult] = await Promise.all([
        MerchelloApi.getPaymentLinkProviders(),
        MerchelloApi.getPaymentLink(this.invoiceId),
      ]);

      if (!this.#isConnected) return;

      if (providersResult.error) {
        this._errorMessage = providersResult.error.message;
        this._isLoading = false;
        return;
      }

      this._providers = providersResult.data ?? [];

      // Set default selected provider to first one
      if (this._providers.length > 0 && !this._selectedProvider) {
        this._selectedProvider = this._providers[0].alias;
      }

      // Link might not exist (404), that's okay
      if (!linkResult.error) {
        this._linkInfo = linkResult.data ?? null;
      } else {
        this._linkInfo = null;
      }
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load data";
    }

    this._isLoading = false;
  }

  private async _generateLink(): Promise<void> {
    if (!this.invoiceId || !this._selectedProvider) return;

    this._isGenerating = true;
    this._errorMessage = null;

    try {
      const result = await MerchelloApi.createPaymentLink({
        invoiceId: this.invoiceId,
        providerAlias: this._selectedProvider,
      });

      if (!this.#isConnected) return;

      if (result.error) {
        this._errorMessage = result.error.message;
      } else if (result.data) {
        this._linkInfo = result.data;
        this.dispatchEvent(new CustomEvent("payment-link-created", {
          detail: { invoiceId: this.invoiceId, link: result.data },
          bubbles: true,
          composed: true
        }));
      }
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to generate link";
    }

    this._isGenerating = false;
  }

  private async _deactivateLink(): Promise<void> {
    if (!this.invoiceId) return;

    this._isDeactivating = true;
    this._errorMessage = null;

    try {
      const result = await MerchelloApi.deactivatePaymentLink(this.invoiceId);

      if (!this.#isConnected) return;

      if (result.error) {
        this._errorMessage = result.error.message;
      } else {
        this._linkInfo = null;
        this.dispatchEvent(new CustomEvent("payment-link-deactivated", {
          detail: { invoiceId: this.invoiceId },
          bubbles: true,
          composed: true
        }));
      }
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to deactivate link";
    }

    this._isDeactivating = false;
  }

  private async _copyLink(): Promise<void> {
    if (!this._linkInfo?.paymentUrl) return;

    try {
      await navigator.clipboard.writeText(this._linkInfo.paymentUrl);
      this._copySuccess = true;
      setTimeout(() => {
        this._copySuccess = false;
      }, 2000);
    } catch (err) {
      this._errorMessage = "Failed to copy to clipboard";
    }
  }

  private _onProviderChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this._selectedProvider = target.value;
  }

  private _renderActiveLink(): unknown {
    if (!this._linkInfo?.hasActiveLink) return nothing;

    return html`
      <div class="active-link">
        <div class="link-header">
          <span class="link-status active">
            <uui-icon name="icon-check"></uui-icon>
            Active Payment Link
          </span>
          ${this._linkInfo.providerDisplayName
            ? html`<span class="link-provider">${this._linkInfo.providerDisplayName}</span>`
            : nothing}
        </div>

        <div class="link-url-container">
          <input
            type="text"
            readonly
            class="link-url"
            .value=${this._linkInfo.paymentUrl ?? ""}
          />
          <uui-button
            look="secondary"
            compact
            @click=${this._copyLink}
            ?disabled=${!this._linkInfo.paymentUrl}
          >
            ${this._copySuccess
              ? html`<uui-icon name="icon-check"></uui-icon> Copied!`
              : html`<uui-icon name="icon-documents"></uui-icon> Copy`}
          </uui-button>
        </div>

        <div class="link-meta">
          ${this._linkInfo.createdBy
            ? html`<span>Created by ${this._linkInfo.createdBy}</span>`
            : nothing}
          ${this._linkInfo.createdAt
            ? html`<span>${formatShortDate(this._linkInfo.createdAt)}</span>`
            : nothing}
        </div>

        <uui-button
          look="secondary"
          color="danger"
          @click=${this._deactivateLink}
          ?disabled=${this._isDeactivating}
        >
          ${this._isDeactivating
            ? html`<uui-loader-bar></uui-loader-bar>`
            : html`<uui-icon name="icon-delete"></uui-icon> Deactivate Link`}
        </uui-button>
      </div>
    `;
  }

  private _renderPaidStatus(): unknown {
    if (!this._linkInfo?.isPaid) return nothing;

    return html`
      <div class="paid-status">
        <uui-icon name="icon-check"></uui-icon>
        <span>Payment received ${this._linkInfo.providerDisplayName ? `via ${this._linkInfo.providerDisplayName}` : ""}</span>
        ${this._linkInfo.createdAt
          ? html`<span class="paid-date">${formatShortDate(this._linkInfo.createdAt)}</span>`
          : nothing}
      </div>
    `;
  }

  private _renderGenerator(): unknown {
    // Don't show generator if already have an active link or invoice is paid
    if (this._linkInfo?.hasActiveLink || this._linkInfo?.isPaid) return nothing;

    // Don't show if no providers support payment links
    if (this._providers.length === 0) {
      return html`
        <div class="no-providers">
          <uui-icon name="icon-info"></uui-icon>
          <span>No payment providers configured that support payment links. Enable Stripe or PayPal to use this feature.</span>
        </div>
      `;
    }

    return html`
      <div class="generator">
        <div class="generator-row">
          <uui-select
            label="Payment Provider"
            .value=${this._selectedProvider}
            @change=${this._onProviderChange}
            ?disabled=${this._isGenerating}
          >
            ${this._providers.map(p => html`
              <uui-select-option value=${p.alias}>
                ${p.displayName}
              </uui-select-option>
            `)}
          </uui-select>

          <uui-button
            look="primary"
            @click=${this._generateLink}
            ?disabled=${this._isGenerating || !this._selectedProvider}
          >
            ${this._isGenerating
              ? html`<uui-loader-bar></uui-loader-bar>`
              : html`<uui-icon name="icon-link"></uui-icon> Generate Link`}
          </uui-button>
        </div>
      </div>
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    }

    return html`
      <div class="payment-link-panel">
        <h3>Payment Link</h3>

        ${this._errorMessage
          ? html`
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="secondary" compact @click=${() => this._errorMessage = null}>
                  Dismiss
                </uui-button>
              </div>
            `
          : nothing}

        ${this._renderPaidStatus()}
        ${this._renderActiveLink()}
        ${this._renderGenerator()}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-1);
    }

    .payment-link-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .error span {
      flex: 1;
    }

    .no-providers {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .generator {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .generator-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: stretch;
    }

    .generator-row uui-select {
      flex: 1;
    }

    .active-link {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
    }

    .link-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .link-status {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-weight: 500;
    }

    .link-status.active {
      color: var(--uui-color-positive);
    }

    .link-provider {
      font-size: 0.875rem;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 8px;
      color: var(--uui-color-text-alt);
    }

    .link-url-container {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .link-url {
      flex: 1;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-family: monospace;
      font-size: 0.875rem;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
    }

    .link-meta {
      display: flex;
      gap: var(--uui-size-space-3);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .paid-status {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: var(--uui-border-radius);
    }

    .paid-date {
      margin-left: auto;
      opacity: 0.8;
    }

    .provider-icon {
      display: flex;
      align-items: center;
    }

    .provider-icon :deep(svg) {
      height: 20px;
      width: auto;
    }
  `;
}

export default MerchelloPaymentLinkPanelElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-payment-link-panel": MerchelloPaymentLinkPanelElement;
  }
}
