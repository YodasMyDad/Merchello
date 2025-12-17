import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { TestPaymentProviderModalData, TestPaymentProviderModalValue } from "./test-provider-modal.token.js";
import type { TestPaymentProviderDto, TestPaymentProviderResultDto } from "./types.js";
import { PaymentIntegrationType } from "./types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencySymbol, getStoreSettings } from "@api/store-settings.js";

const STORAGE_KEY = "merchello-test-payment-provider-form";

interface SavedFormValues {
  amount?: number;
}

@customElement("merchello-test-payment-provider-modal")
export class MerchelloTestPaymentProviderModalElement extends UmbModalBaseElement<
  TestPaymentProviderModalData,
  TestPaymentProviderModalValue
> {
  // Form state
  @state() private _amount: number = 100.0;

  // UI state
  @state() private _isTesting = false;
  @state() private _testResult?: TestPaymentProviderResultDto;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._restoreSavedValues();
    // Preload store settings for currency symbol
    getStoreSettings();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private _restoreSavedValues(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const values: SavedFormValues = JSON.parse(saved);
        if (values.amount !== undefined) this._amount = values.amount;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private _saveFormValues(): void {
    try {
      const values: SavedFormValues = {
        amount: this._amount,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Ignore localStorage errors
    }
  }

  private async _handleTest(): Promise<void> {
    this._isTesting = true;
    this._errorMessage = null;
    this._testResult = undefined;
    this._saveFormValues();

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._errorMessage = "Setting ID missing.";
      this._isTesting = false;
      return;
    }

    const request: TestPaymentProviderDto = {
      amount: this._amount,
    };

    const { data, error } = await MerchelloApi.testPaymentProvider(settingId, request);

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

  private _getIntegrationTypeName(integrationType: PaymentIntegrationType): string {
    switch (integrationType) {
      case PaymentIntegrationType.Redirect: return "Redirect";
      case PaymentIntegrationType.HostedFields: return "Hosted Fields";
      case PaymentIntegrationType.Widget: return "Widget";
      case PaymentIntegrationType.DirectForm: return "Direct Form";
      default: return "Unknown";
    }
  }

  private _renderForm(): unknown {
    const currencySymbol = getCurrencySymbol();

    return html`
      <div class="form-section">
        <h3>Test Configuration</h3>
        <div class="form-row">
          <label>Test Amount (${currencySymbol})</label>
          <uui-input
            type="number"
            min="0.01"
            step="0.01"
            .value=${String(this._amount)}
            @input=${(e: Event) =>
              (this._amount = parseFloat((e.target as HTMLInputElement).value) || 100)}
          ></uui-input>
          <span class="hint">Amount used for the test payment session</span>
        </div>
      </div>
    `;
  }

  private _renderResults(): unknown {
    if (!this._testResult) return nothing;

    const { isSuccessful: success, integrationType, errorMessage, errorCode, sessionId, redirectUrl, clientToken, clientSecret, javaScriptSdkUrl, formFields } = this._testResult;

    return html`
      <div class="results-section">
        <h3>Results</h3>

        ${!success && errorMessage
          ? html`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${errorMessage}</p>
                  ${errorCode ? html`<p class="error-code">Error code: ${errorCode}</p>` : nothing}
                </div>
              </div>
            `
          : nothing}

        ${success
          ? html`
              <div class="result-card success">
                <div class="result-header">
                  <uui-icon name="icon-check"></uui-icon>
                  <span>Session created successfully</span>
                </div>
              </div>
            `
          : nothing}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Integration Type</span>
            <span class="detail-value">
              <span class="badge">${this._getIntegrationTypeName(integrationType)}</span>
            </span>
          </div>

          ${sessionId
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Session ID</span>
                  <span class="detail-value monospace">${sessionId}</span>
                </div>
              `
            : nothing}

          ${redirectUrl
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Redirect URL</span>
                  <span class="detail-value">
                    <a href="${redirectUrl}" target="_blank" rel="noopener noreferrer" class="url-link">
                      ${redirectUrl}
                      <uui-icon name="icon-out"></uui-icon>
                    </a>
                  </span>
                </div>
              `
            : nothing}

          ${clientToken
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Client Token</span>
                  <span class="detail-value monospace truncate" title="${clientToken}">${clientToken}</span>
                </div>
              `
            : nothing}

          ${clientSecret
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Client Secret</span>
                  <span class="detail-value monospace truncate" title="${clientSecret}">${clientSecret}</span>
                </div>
              `
            : nothing}

          ${javaScriptSdkUrl
            ? html`
                <div class="detail-row">
                  <span class="detail-label">JavaScript SDK URL</span>
                  <span class="detail-value">
                    <a href="${javaScriptSdkUrl}" target="_blank" rel="noopener noreferrer" class="url-link">
                      ${javaScriptSdkUrl}
                      <uui-icon name="icon-out"></uui-icon>
                    </a>
                  </span>
                </div>
              `
            : nothing}

          ${formFields && formFields.length > 0
            ? html`
                <div class="detail-section">
                  <span class="detail-label">Form Fields</span>
                  <div class="form-fields-list">
                    ${formFields.map(
                      (field) => html`
                        <div class="form-field-item">
                          <span class="field-label">${field.label}</span>
                          <span class="field-key">${field.key}</span>
                          <div class="field-meta">
                            <span class="field-type">${field.fieldType}</span>
                            ${field.isRequired ? html`<span class="field-required">Required</span>` : nothing}
                          </div>
                          ${field.description ? html`<span class="field-description">${field.description}</span>` : nothing}
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

  render() {
    const providerName = this.data?.setting.displayName ?? "Provider";

    return html`
      <umb-body-layout headline="Test ${providerName}">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => (this._errorMessage = null)}
                  >
                    Dismiss
                  </uui-button>
                </div>
              `
            : nothing}

          ${this._renderForm()}
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

    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .form-section h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      border-bottom: 1px solid var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-input {
      width: 100%;
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

    .error-code {
      font-size: 0.75rem;
      margin-top: var(--uui-size-space-2) !important;
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

    .detail-value.monospace {
      font-family: monospace;
      font-size: 0.8125rem;
    }

    .detail-value.truncate {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .url-link {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      color: var(--uui-color-interactive);
      text-decoration: none;
      word-break: break-all;
    }

    .url-link:hover {
      text-decoration: underline;
    }

    .url-link uui-icon {
      flex-shrink: 0;
    }

    .form-fields-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-field-item {
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .field-label {
      font-weight: 600;
      display: block;
    }

    .field-key {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .field-meta {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-1);
    }

    .field-type {
      font-size: 0.6875rem;
      padding: 1px 6px;
      background: var(--uui-color-border);
      border-radius: 4px;
    }

    .field-required {
      font-size: 0.6875rem;
      padding: 1px 6px;
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: 4px;
    }

    .field-description {
      display: block;
      margin-top: var(--uui-size-space-1);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloTestPaymentProviderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-test-payment-provider-modal": MerchelloTestPaymentProviderModalElement;
  }
}
