import { nothing as t, html as i, css as p, state as d, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-B1P1cUX9.js";
var b = Object.defineProperty, m = Object.getOwnPropertyDescriptor, u = (e, s, o, l) => {
  for (var r = l > 1 ? void 0 : l ? m(s, o) : s, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (r = (l ? c(s, o, r) : c(r)) || r);
  return l && r && b(s, o, r), r;
};
let a = class extends f {
  constructor() {
    super(...arguments), this._isTesting = !1, this._result = null, this._errorMessage = null;
  }
  async _handleSendTest() {
    const e = this.data?.subscription;
    if (!e) return;
    this._isTesting = !0, this._result = null, this._errorMessage = null;
    const { data: s, error: o } = await h.testWebhookSubscription(e.id);
    if (this._isTesting = !1, o) {
      this._errorMessage = o.message;
      return;
    }
    s && (this._result = s);
  }
  _handleClose() {
    this.value = { tested: this._result?.success ?? !1 }, this.modalContext?.submit();
  }
  _renderResult() {
    return this._result ? i`
      <uui-box class="result ${this._result.success ? "success" : "failure"}">
        <div class="result-header">
          <uui-icon name=${this._result.success ? "icon-check" : "icon-wrong"}></uui-icon>
          <span class="result-title">${this._result.success ? "Test successful" : "Test failed"}</span>
        </div>

        <div class="result-details">
          ${this._result.statusCode !== null ? i`
                <div class="detail-row">
                  <span class="detail-label">Status Code:</span>
                  <span class="detail-value status-code-${Math.floor((this._result.statusCode ?? 0) / 100)}">
                    ${this._result.statusCode}
                  </span>
                </div>
              ` : t}

          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${this._result.durationMs}ms</span>
          </div>

          ${this._result.errorMessage ? i`
                <div class="detail-row error-row">
                  <span class="detail-label">Error:</span>
                  <span class="detail-value error-message">${this._result.errorMessage}</span>
                </div>
              ` : t}

          ${this._result.responseBody ? i`
                <div class="response-section">
                  <span class="detail-label">Response Body:</span>
                  <pre class="response-body">${this._formatJson(this._result.responseBody)}</pre>
                </div>
              ` : t}
        </div>
      </uui-box>
    ` : t;
  }
  _formatJson(e) {
    try {
      const s = JSON.parse(e);
      return JSON.stringify(s, null, 2);
    } catch {
      return e;
    }
  }
  render() {
    const e = this.data?.subscription;
    return i`
      <umb-body-layout headline="Test Webhook">
        <div id="main">
          ${this._errorMessage ? i`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : t}

          <uui-box>
            <div class="subscription-info">
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${e?.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Topic:</span>
                <span class="info-value">${e?.topicDisplayName || e?.topic}</span>
              </div>
              <div class="info-row">
                <span class="info-label">URL:</span>
                <span class="info-value url">${e?.targetUrl}</span>
              </div>
            </div>
          </uui-box>

          <uui-box>
            <div class="test-section">
              <p class="description">
                Send a test webhook to verify your endpoint is configured correctly.
                A sample payload for the "${e?.topicDisplayName || e?.topic}" event will be sent.
              </p>

              <uui-button
                type="button"
                look="primary"
                color="positive"
                label="Send Test Webhook"
                ?disabled=${this._isTesting}
                @click=${this._handleSendTest}>
                ${this._isTesting ? i`<uui-loader-bar></uui-loader-bar> Sending...` : i`<uui-icon name="icon-flash" slot="icon"></uui-icon> Send Test Webhook`}
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
};
a.styles = p`
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
u([
  d()
], a.prototype, "_isTesting", 2);
u([
  d()
], a.prototype, "_result", 2);
u([
  d()
], a.prototype, "_errorMessage", 2);
a = u([
  v("merchello-webhook-test-modal")
], a);
const x = a;
export {
  a as MerchelloWebhookTestModalElement,
  x as default
};
//# sourceMappingURL=webhook-test-modal.element-x6ALj-n7.js.map
