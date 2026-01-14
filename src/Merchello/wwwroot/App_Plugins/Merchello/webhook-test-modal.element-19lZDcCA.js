import { nothing as o, html as a, css as p, state as d, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-BAKL0aIE.js";
var b = Object.defineProperty, g = Object.getOwnPropertyDescriptor, u = (s, e, t, l) => {
  for (var r = l > 1 ? void 0 : l ? g(e, t) : e, n = s.length - 1, c; n >= 0; n--)
    (c = s[n]) && (r = (l ? c(e, t, r) : c(r)) || r);
  return l && r && b(e, t, r), r;
};
let i = class extends f {
  constructor() {
    super(...arguments), this._isTesting = !1, this._result = null, this._errorMessage = null;
  }
  async _handleSendTest() {
    const s = this.data?.subscription;
    if (!s) return;
    this._isTesting = !0, this._result = null, this._errorMessage = null;
    const { data: e, error: t } = await h.testWebhookSubscription(s.id);
    if (this._isTesting = !1, t) {
      this._errorMessage = t.message;
      return;
    }
    e && (this._result = e);
  }
  _handleClose() {
    this.value = { tested: this._result?.success ?? !1 }, this.modalContext?.submit();
  }
  _renderResult() {
    return this._result ? a`
      <div class="result ${this._result.success ? "success" : "failure"}">
        <div class="result-header">
          <uui-icon name=${this._result.success ? "icon-check" : "icon-wrong"}></uui-icon>
          <span class="result-title">${this._result.success ? "Test Successful" : "Test Failed"}</span>
        </div>

        <div class="result-details">
          ${this._result.statusCode !== null ? a`
                <div class="detail-row">
                  <span class="detail-label">Status Code:</span>
                  <span class="detail-value status-code-${Math.floor((this._result.statusCode ?? 0) / 100)}">
                    ${this._result.statusCode}
                  </span>
                </div>
              ` : o}

          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${this._result.durationMs}ms</span>
          </div>

          ${this._result.errorMessage ? a`
                <div class="detail-row error-row">
                  <span class="detail-label">Error:</span>
                  <span class="detail-value error-message">${this._result.errorMessage}</span>
                </div>
              ` : o}

          ${this._result.responseBody ? a`
                <div class="response-section">
                  <span class="detail-label">Response Body:</span>
                  <pre class="response-body">${this._formatJson(this._result.responseBody)}</pre>
                </div>
              ` : o}
        </div>
      </div>
    ` : o;
  }
  _formatJson(s) {
    try {
      const e = JSON.parse(s);
      return JSON.stringify(e, null, 2);
    } catch {
      return s;
    }
  }
  render() {
    const s = this.data?.subscription;
    return a`
      <umb-body-layout headline="Test Webhook">
        <div id="main">
          ${this._errorMessage ? a`<div class="error-banner">${this._errorMessage}</div>` : o}

          <div class="subscription-info">
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${s?.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Topic:</span>
              <span class="info-value">${s?.topicDisplayName || s?.topic}</span>
            </div>
            <div class="info-row">
              <span class="info-label">URL:</span>
              <span class="info-value url">${s?.targetUrl}</span>
            </div>
          </div>

          <div class="test-section">
            <p class="description">
              Send a test webhook to verify your endpoint is configured correctly.
              A sample payload for the "${s?.topicDisplayName || s?.topic}" event will be sent.
            </p>

            <uui-button
              look="primary"
              label="Send Test Webhook"
              ?disabled=${this._isTesting}
              @click=${this._handleSendTest}>
              ${this._isTesting ? a`<uui-loader-bar></uui-loader-bar> Sending...` : a`<uui-icon name="icon-flash" slot="icon"></uui-icon> Send Test Webhook`}
            </uui-button>
          </div>

          ${this._renderResult()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = p`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .subscription-info {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
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
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .result.success {
      background: var(--uui-color-positive-standalone);
    }

    .result.failure {
      background: var(--uui-color-danger-standalone);
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
    }

    .result.success .result-header {
      color: var(--uui-color-positive-contrast);
    }

    .result.failure .result-header {
      color: var(--uui-color-danger-contrast);
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
      color: var(--uui-color-positive-contrast);
    }

    .result.failure .result-details {
      color: var(--uui-color-danger-contrast);
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

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
u([
  d()
], i.prototype, "_isTesting", 2);
u([
  d()
], i.prototype, "_result", 2);
u([
  d()
], i.prototype, "_errorMessage", 2);
i = u([
  v("merchello-webhook-test-modal")
], i);
const w = i;
export {
  i as MerchelloWebhookTestModalElement,
  w as default
};
//# sourceMappingURL=webhook-test-modal.element-19lZDcCA.js.map
