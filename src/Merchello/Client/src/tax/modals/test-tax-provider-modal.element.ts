import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  TestTaxProviderModalData,
  TestTaxProviderModalValue,
} from "@tax/modals/test-tax-provider-modal.token.js";
import type { TestTaxProviderResultDto } from "@tax/types/tax.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-test-tax-provider-modal")
export class MerchelloTestTaxProviderModalElement extends UmbModalBaseElement<
  TestTaxProviderModalData,
  TestTaxProviderModalValue
> {
  @state() private _isTesting = false;
  @state() private _testResult?: TestTaxProviderResultDto;
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

    const { data, error } = await MerchelloApi.testTaxProvider(provider.alias);

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

  private _renderProviderInfo(): unknown {
    const provider = this.data?.provider;
    if (!provider) return nothing;

    return html`
      <div class="provider-info">
        <div class="provider-header">
          ${provider.icon
            ? html`<uui-icon name="${provider.icon}"></uui-icon>`
            : html`<uui-icon name="icon-calculator"></uui-icon>`}
          <div class="provider-details">
            <span class="provider-name">${provider.displayName}</span>
            <span class="provider-alias">${provider.alias}</span>
          </div>
        </div>
        ${provider.description
          ? html`<p class="provider-description">${provider.description}</p>`
          : nothing}
        <div class="provider-features">
          ${provider.supportsRealTimeCalculation
            ? html`<span class="feature-badge">Real-time Calculation</span>`
            : html`<span class="feature-badge">Manual Rates</span>`}
          ${provider.requiresApiCredentials
            ? html`<span class="feature-badge">API Credentials Required</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderResults(): unknown {
    if (!this._testResult) return nothing;

    const { isSuccessful, errorMessage, details } = this._testResult;

    return html`
      <div class="results-section">
        <h3>Test Results</h3>

        ${!isSuccessful && errorMessage
          ? html`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${errorMessage}</p>
                </div>
              </div>
            `
          : nothing}

        ${isSuccessful
          ? html`
              <div class="result-card success">
                <div class="result-header">
                  <uui-icon name="icon-check"></uui-icon>
                  <span>Provider configuration validated successfully</span>
                </div>
              </div>
            `
          : nothing}

        ${details && Object.keys(details).length > 0
          ? html`
              <div class="result-details">
                ${Object.entries(details).map(
                  ([key, value]) => html`
                    <div class="detail-row">
                      <span class="detail-label">${key}</span>
                      <span class="detail-value">${value}</span>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}
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
                  <uui-button look="secondary" compact label="Dismiss" @click=${() => (this._errorMessage = null)}>
                    Dismiss
                  </uui-button>
                </div>
              `
            : nothing}

          ${this._renderProviderInfo()}

          <div class="instructions">
            <p>
              Click "Test Provider" to validate this tax provider's configuration.
              This will verify that the provider can calculate tax rates correctly.
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

  static override readonly styles = [
    modalLayoutStyles,
    css`
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
      text-transform: uppercase;
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

    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
    }

    .detail-value {
      word-break: break-all;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `,
  ];
}

export default MerchelloTestTaxProviderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-test-tax-provider-modal": MerchelloTestTaxProviderModalElement;
  }
}

