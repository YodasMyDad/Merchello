import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  TestExchangeRateProviderModalData,
  TestExchangeRateProviderModalValue,
} from "./test-provider-modal.token.js";
import type { TestExchangeRateProviderResultDto } from '@exchange-rate-providers/types/exchange-rate-providers.types.js';
import { MerchelloApi } from "@api/merchello-api.js";
import { formatNumber } from "@shared/utils/formatting.js";

@customElement("merchello-exchange-rate-provider-test-modal")
export class MerchelloExchangeRateProviderTestModalElement extends UmbModalBaseElement<
  TestExchangeRateProviderModalData,
  TestExchangeRateProviderModalValue
> {
  @state() private _isTesting = false;
  @state() private _testResult?: TestExchangeRateProviderResultDto;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _handleTest(): Promise<void> {
    const provider = this.data?.provider;
    if (!provider) {
      this._errorMessage = "No provider specified";
      return;
    }

    this._isTesting = true;
    this._errorMessage = null;
    this._testResult = undefined;

    const { data, error } = await MerchelloApi.testExchangeRateProvider(provider.alias);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isTesting = false;
      return;
    }

    this._testResult = data;
    this._isTesting = false;
  }

  private _handleClose(): void {
    this.modalContext?.reject();
  }

  private _formatDate(dateString?: string): string {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  private _formatRate(rate: number): string {
    // Format to reasonable precision with thousand separators
    if (rate >= 100) {
      return formatNumber(rate, 2);
    } else if (rate >= 1) {
      return formatNumber(rate, 4);
    } else {
      return formatNumber(rate, 6);
    }
  }

  private _renderProviderInfo(): unknown {
    const provider = this.data?.provider;
    if (!provider) return nothing;

    return html`
      <div class="provider-info">
        <div class="provider-header">
          ${provider.icon
            ? html`<uui-icon name="${provider.icon}"></uui-icon>`
            : html`<uui-icon name="icon-globe"></uui-icon>`}
          <div class="provider-details">
            <span class="provider-name">${provider.displayName}</span>
            <span class="provider-alias">${provider.alias}</span>
          </div>
        </div>
        ${provider.description
          ? html`<p class="provider-description">${provider.description}</p>`
          : nothing}
        <div class="provider-features">
          ${provider.supportsHistoricalRates
            ? html`<span class="feature-badge">Supports Historical Rates</span>`
            : nothing}
          ${provider.supportedCurrencies.length > 0
            ? html`<span class="feature-badge">${provider.supportedCurrencies.length} Currencies</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderResults(): unknown {
    if (!this._testResult) return nothing;

    const { isSuccessful: success, errorMessage, baseCurrency, sampleRates, rateTimestamp, totalRatesCount } =
      this._testResult;

    return html`
      <div class="results-section">
        <h3>Test Results</h3>

        ${!success && errorMessage
          ? html`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${errorMessage}</p>
                </div>
              </div>
            `
          : nothing}

        ${success
          ? html`
              <div class="result-card success">
                <div class="result-header">
                  <uui-icon name="icon-check"></uui-icon>
                  <span>Successfully fetched exchange rates</span>
                </div>
              </div>
            `
          : nothing}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Base Currency</span>
            <span class="detail-value">
              <span class="badge">${baseCurrency}</span>
            </span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Total Rates Available</span>
            <span class="detail-value">${totalRatesCount} currencies</span>
          </div>

          ${rateTimestamp
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Rate Timestamp</span>
                  <span class="detail-value">${this._formatDate(rateTimestamp)}</span>
                </div>
              `
            : nothing}

          ${sampleRates && Object.keys(sampleRates).length > 0
            ? html`
                <div class="detail-section">
                  <span class="detail-label">Sample Rates (1 ${baseCurrency} =)</span>
                  <div class="rates-table">
                    ${Object.entries(sampleRates).map(
                      ([currency, rate]) => html`
                        <div class="rate-row">
                          <span class="rate-currency">${currency}</span>
                          <span class="rate-value">${this._formatRate(rate)}</span>
                        </div>
                      `
                    )}
                  </div>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  override render() {
    const providerName = this.data?.provider?.displayName ?? "Provider";

    return html`
      <umb-body-layout headline="Test ${providerName}">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button look="secondary" compact @click=${() => (this._errorMessage = null)}>
                    Dismiss
                  </uui-button>
                </div>
              `
            : nothing}

          ${this._renderProviderInfo()}

          <div class="instructions">
            <p>
              Click "Test Provider" to fetch exchange rates from this provider. This will validate
              that the provider is configured correctly and can retrieve rates.
            </p>
          </div>

          ${this._renderResults()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
          <uui-button
            label="Test Provider"
            look="primary"
            color="positive"
            ?disabled=${this._isTesting}
            @click=${this._handleTest}
          >
            ${this._isTesting ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${this._isTesting ? "Testing..." : "Test Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error-banner span {
      flex: 1;
    }

    .provider-info {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .provider-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .provider-header > uui-icon {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
    }

    .provider-details {
      display: flex;
      flex-direction: column;
    }

    .provider-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .provider-alias {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .provider-description {
      margin: var(--uui-size-space-3) 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
    }

    .feature-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .instructions {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .instructions p {
      margin: 0;
    }

    .results-section {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .results-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .result-errors {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .result-errors p {
      margin: 0;
    }

    .result-card {
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .result-card.success {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
    }

    .detail-value {
      word-break: break-all;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .rates-table {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--uui-size-space-2);
    }

    .rate-row {
      display: flex;
      justify-content: space-between;
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .rate-currency {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .rate-value {
      font-family: monospace;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloExchangeRateProviderTestModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-exchange-rate-provider-test-modal": MerchelloExchangeRateProviderTestModalElement;
  }
}
