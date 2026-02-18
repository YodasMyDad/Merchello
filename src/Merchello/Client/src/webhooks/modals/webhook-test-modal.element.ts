import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  WebhookTestModalData,
  WebhookTestModalValue,
  OutboundDeliveryResultDto,
} from "@webhooks/types/webhooks.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-webhook-test-modal")
export class MerchelloWebhookTestModalElement extends UmbModalBaseElement<
  WebhookTestModalData,
  WebhookTestModalValue
> {
  @state() private _isTesting = false;
  @state() private _result: OutboundDeliveryResultDto | null = null;
  @state() private _errorMessage: string | null = null;

  private async _handleSendTest(): Promise<void> {
    const subscription = this.data?.subscription;
    if (!subscription) return;

    this._isTesting = true;
    this._result = null;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.testWebhookSubscription(subscription.id);

    this._isTesting = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    if (data) {
      this._result = data;
    }
  }

  private _handleClose(): void {
    this.value = { tested: this._result?.success ?? false };
    this.modalContext?.submit();
  }

  private _renderResult(): unknown {
    if (!this._result) return nothing;

    return html`
      <uui-box class="result ${this._result.success ? "success" : "failure"}">
        <div class="result-header">
          <uui-icon name=${this._result.success ? "icon-check" : "icon-wrong"}></uui-icon>
          <span class="result-title">${this._result.success ? "Test successful" : "Test failed"}</span>
        </div>

        <div class="result-details">
          ${this._result.statusCode !== null
            ? html`
                <div class="detail-row">
                  <span class="detail-label">Status Code:</span>
                  <span class="detail-value status-code-${Math.floor((this._result.statusCode ?? 0) / 100)}">
                    ${this._result.statusCode}
                  </span>
                </div>
              `
            : nothing}

          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${this._result.durationMs}ms</span>
          </div>

          ${this._result.errorMessage
            ? html`
                <div class="detail-row error-row">
                  <span class="detail-label">Error:</span>
                  <span class="detail-value error-message">${this._result.errorMessage}</span>
                </div>
              `
            : nothing}

          ${this._result.responseBody
            ? html`
                <div class="response-section">
                  <span class="detail-label">Response Body:</span>
                  <pre class="response-body">${this._formatJson(this._result.responseBody)}</pre>
                </div>
              `
            : nothing}
        </div>
      </uui-box>
    `;
  }

  private _formatJson(str: string): string {
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  }

  override render() {
    const subscription = this.data?.subscription;

    return html`
      <umb-body-layout headline="Test Webhook">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : nothing}

          <uui-box>
            <div class="subscription-info">
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${subscription?.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Topic:</span>
                <span class="info-value">${subscription?.topicDisplayName || subscription?.topic}</span>
              </div>
              <div class="info-row">
                <span class="info-label">URL:</span>
                <span class="info-value url">${subscription?.targetUrl}</span>
              </div>
            </div>
          </uui-box>

          <uui-box>
            <div class="test-section">
              <p class="description">
                Send a test webhook to verify your endpoint is configured correctly.
                A sample payload for the "${subscription?.topicDisplayName || subscription?.topic}" event will be sent.
              </p>

              <uui-button
                type="button"
                look="primary"
                color="positive"
                label="Send Test Webhook"
                ?disabled=${this._isTesting}
                @click=${this._handleSendTest}>
                ${this._isTesting
                  ? html`<uui-loader-bar></uui-loader-bar> Sending...`
                  : html`<uui-icon name="icon-flash" slot="icon"></uui-icon> Send Test Webhook`}
              </uui-button>
            </div>
          </uui-box>

          ${this._renderResult()}
        </div>

        <uui-button slot="actions" type="button" label="Close" look="secondary" @click=${this._handleClose}>
          Close
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .subscription-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .info-row {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-1) 0;
    }

    .info-label {
      font-weight: 600;
      min-width: 60px;
      color: var(--uui-color-text-alt);
    }

    .info-value {
      color: var(--uui-color-text);
    }

    .info-value.url {
      word-break: break-all;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .test-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
    }

    .description {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .result {
      border: 1px solid var(--uui-color-border);
    }

    .result.success {
      border-color: var(--uui-color-positive);
    }

    .result.failure {
      border-color: var(--uui-color-danger);
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
    }

    .result.success .result-header {
      color: var(--uui-color-positive);
    }

    .result.failure .result-header {
      color: var(--uui-color-danger);
    }

    .result-title {
      font-weight: 700;
      font-size: 1rem;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .result.success .result-details {
      color: var(--uui-color-text);
    }

    .result.failure .result-details {
      color: var(--uui-color-text);
    }

    .detail-row {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .detail-label {
      font-weight: 600;
      min-width: 100px;
    }

    .detail-value {
      font-family: monospace;
    }

    .status-code-2 {
      color: var(--uui-color-positive);
    }

    .status-code-4,
    .status-code-5 {
      color: var(--uui-color-danger);
    }

    .error-message {
      color: inherit;
    }

    .response-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      margin-top: var(--uui-size-space-2);
    }

    .response-body {
      background: rgba(0, 0, 0, 0.1);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-family: monospace;
      font-size: 0.75rem;
      overflow-x: auto;
      max-height: 200px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
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

  `;
}

export default MerchelloWebhookTestModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-webhook-test-modal": MerchelloWebhookTestModalElement;
  }
}

