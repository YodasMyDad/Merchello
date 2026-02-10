import { html as r, nothing as a, css as f, state as d, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { O as p } from "./webhooks.types-BKPXEUdT.js";
import { M as v } from "./merchello-api-BuImeZL2.js";
var g = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, l = (e, s, t, n) => {
  for (var o = n > 1 ? void 0 : n ? _(s, t) : s, u = e.length - 1, c; u >= 0; u--)
    (c = e[u]) && (o = (n ? c(s, t, o) : c(o)) || o);
  return n && o && g(s, t, o), o;
};
let i = class extends y {
  constructor() {
    super(...arguments), this._isLoading = !0, this._isRetrying = !1, this._delivery = null, this._errorMessage = null, this._retried = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadDelivery();
  }
  async _loadDelivery() {
    const e = this.data?.deliveryId;
    if (!e) {
      this._errorMessage = "No delivery ID provided", this._isLoading = !1;
      return;
    }
    const { data: s, error: t } = await v.getDeliveryDetail(e);
    if (this._isLoading = !1, t) {
      this._errorMessage = t.message;
      return;
    }
    s && (this._delivery = s);
  }
  async _handleRetry() {
    if (!this._delivery) return;
    this._isRetrying = !0, this._errorMessage = null;
    const { error: e } = await v.retryDelivery(this._delivery.id);
    if (this._isRetrying = !1, e) {
      this._errorMessage = e.message;
      return;
    }
    this._retried = !0, await this._loadDelivery();
  }
  _handleClose() {
    this.value = { retried: this._retried }, this.modalContext?.submit();
  }
  _formatJson(e) {
    if (!e) return "";
    try {
      const s = JSON.parse(e);
      return JSON.stringify(s, null, 2);
    } catch {
      return e;
    }
  }
  _formatHeaders(e) {
    if (!e) return "";
    try {
      const s = JSON.parse(e);
      return Object.entries(s).map(([t, n]) => `${t}: ${n}`).join(`
`);
    } catch {
      return e;
    }
  }
  _formatDate(e) {
    return e ? new Date(e).toLocaleString() : "N/A";
  }
  _canRetry() {
    return this._delivery ? this._delivery.status === p.Failed || this._delivery.status === p.Abandoned : !1;
  }
  _renderLoading() {
    return r`
      <div class="loading-container">
        <uui-loader></uui-loader>
        <span>Loading delivery details...</span>
      </div>
    `;
  }
  _renderStatusBadge() {
    return this._delivery ? r`
      <span class="status-badge ${this._delivery.statusCssClass}">
        ${this._delivery.statusDisplay}
      </span>
    ` : a;
  }
  _renderDeliveryInfo() {
    return this._delivery ? r`
      <div class="info-section">
        <h4>Delivery Information</h4>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">${this._renderStatusBadge()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Target URL:</span>
            <span class="info-value url">${this._delivery.targetUrl ?? "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Topic:</span>
            <span class="info-value">${this._delivery.topic}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Response Code:</span>
            <span class="info-value ${this._getStatusCodeClass()}">
              ${this._delivery.responseStatusCode ?? "N/A"}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration:</span>
            <span class="info-value">${this._delivery.durationMs}ms</span>
          </div>
          <div class="info-row">
            <span class="info-label">Attempt:</span>
            <span class="info-value">#${this._delivery.attemptNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Created:</span>
            <span class="info-value">${this._formatDate(this._delivery.dateCreated)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Completed:</span>
            <span class="info-value">${this._formatDate(this._delivery.dateCompleted)}</span>
          </div>
          ${this._delivery.entityType ? r`
                <div class="info-row">
                  <span class="info-label">Entity:</span>
                  <span class="info-value">${this._delivery.entityType} (${this._delivery.entityId})</span>
                </div>
              ` : a}
        </div>
      </div>
    ` : a;
  }
  _getStatusCodeClass() {
    const e = this._delivery?.responseStatusCode;
    return e ? e >= 200 && e < 300 ? "status-success" : e >= 400 ? "status-error" : "" : "";
  }
  _renderErrorSection() {
    return this._delivery?.errorMessage ? r`
      <div class="error-section">
        <h4>Error Details</h4>
        <div class="error-content">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._delivery.errorMessage}</span>
        </div>
      </div>
    ` : a;
  }
  _renderRequestSection() {
    return !this._delivery?.requestHeaders && !this._delivery?.requestBody ? a : r`
      <div class="data-section">
        <h4>Request</h4>
        ${this._delivery.requestHeaders ? r`
              <div class="data-block">
                <span class="data-label">Headers:</span>
                <pre class="data-content">${this._formatHeaders(this._delivery.requestHeaders)}</pre>
              </div>
            ` : a}
        ${this._delivery.requestBody ? r`
              <div class="data-block">
                <span class="data-label">Body:</span>
                <pre class="data-content">${this._formatJson(this._delivery.requestBody)}</pre>
              </div>
            ` : a}
      </div>
    `;
  }
  _renderResponseSection() {
    return !this._delivery?.responseHeaders && !this._delivery?.responseBody ? a : r`
      <div class="data-section">
        <h4>Response</h4>
        ${this._delivery.responseHeaders ? r`
              <div class="data-block">
                <span class="data-label">Headers:</span>
                <pre class="data-content">${this._formatHeaders(this._delivery.responseHeaders)}</pre>
              </div>
            ` : a}
        ${this._delivery.responseBody ? r`
              <div class="data-block">
                <span class="data-label">Body:</span>
                <pre class="data-content">${this._formatJson(this._delivery.responseBody)}</pre>
              </div>
            ` : a}
      </div>
    `;
  }
  render() {
    return r`
      <umb-body-layout headline="Delivery Details">
        <div id="main">
          ${this._errorMessage ? r`<div class="error-banner">${this._errorMessage}</div>` : a}

          ${this._isLoading ? this._renderLoading() : r`
                ${this._renderDeliveryInfo()}
                ${this._renderErrorSection()}
                ${this._renderRequestSection()}
                ${this._renderResponseSection()}
              `}
        </div>

        <div slot="actions">
          ${this._canRetry() ? r`
                <uui-button
                  look="primary"
                  color="warning"
                  label="Retry Delivery"
                  ?disabled=${this._isRetrying}
                  @click=${this._handleRetry}>
                  ${this._isRetrying ? r`<uui-loader-bar></uui-loader-bar> Retrying...` : r`<uui-icon name="icon-refresh"></uui-icon> Retry`}
                </uui-button>
              ` : a}
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = f`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-6);
      color: var(--uui-color-text-alt);
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

    .info-section,
    .data-section,
    .error-section {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    h4 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--uui-color-text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .info-row {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
    }

    .info-label {
      font-weight: 600;
      min-width: 120px;
      color: var(--uui-color-text-alt);
      flex-shrink: 0;
    }

    .info-value {
      color: var(--uui-color-text);
    }

    .info-value.url {
      word-break: break-all;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .status-badge {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: var(--uui-border-radius);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-positive {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge-danger {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge-warning {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .badge-default {
      background: var(--uui-color-border);
      color: var(--uui-color-text);
    }

    .status-success {
      color: var(--uui-color-positive);
      font-weight: 600;
    }

    .status-error {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .error-section {
      background: var(--uui-color-danger-standalone);
    }

    .error-section h4 {
      color: var(--uui-color-danger-contrast);
    }

    .error-content {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-danger-contrast);
    }

    .error-content uui-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .data-block {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      margin-bottom: var(--uui-size-space-3);
    }

    .data-block:last-child {
      margin-bottom: 0;
    }

    .data-label {
      font-weight: 600;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
    }

    .data-content {
      background: rgba(0, 0, 0, 0.1);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-family: monospace;
      font-size: 0.75rem;
      overflow-x: auto;
      max-height: 300px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
l([
  d()
], i.prototype, "_isLoading", 2);
l([
  d()
], i.prototype, "_isRetrying", 2);
l([
  d()
], i.prototype, "_delivery", 2);
l([
  d()
], i.prototype, "_errorMessage", 2);
l([
  d()
], i.prototype, "_retried", 2);
i = l([
  h("merchello-delivery-detail-modal")
], i);
const w = i;
export {
  i as MerchelloDeliveryDetailModalElement,
  w as default
};
//# sourceMappingURL=delivery-detail-modal.element-CFPfEx1k.js.map
