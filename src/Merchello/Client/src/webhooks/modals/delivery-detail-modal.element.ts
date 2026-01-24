import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  DeliveryDetailModalData,
  DeliveryDetailModalValue,
  OutboundDeliveryDetailDto,
} from "@webhooks/types/webhooks.types.js";
import { OutboundDeliveryStatus } from "@webhooks/types/webhooks.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-delivery-detail-modal")
export class MerchelloDeliveryDetailModalElement extends UmbModalBaseElement<
  DeliveryDetailModalData,
  DeliveryDetailModalValue
> {
  @state() private _isLoading = true;
  @state() private _isRetrying = false;
  @state() private _delivery: OutboundDeliveryDetailDto | null = null;
  @state() private _errorMessage: string | null = null;
  @state() private _retried = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadDelivery();
  }

  private async _loadDelivery(): Promise<void> {
    const deliveryId = this.data?.deliveryId;
    if (!deliveryId) {
      this._errorMessage = "No delivery ID provided";
      this._isLoading = false;
      return;
    }

    const { data, error } = await MerchelloApi.getDeliveryDetail(deliveryId);

    this._isLoading = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    if (data) {
      this._delivery = data;
    }
  }

  private async _handleRetry(): Promise<void> {
    if (!this._delivery) return;

    this._isRetrying = true;
    this._errorMessage = null;

    const { error } = await MerchelloApi.retryDelivery(this._delivery.id);

    this._isRetrying = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    this._retried = true;
    // Reload delivery to get updated status
    await this._loadDelivery();
  }

  private _handleClose(): void {
    this.value = { retried: this._retried };
    this.modalContext?.submit();
  }

  private _formatJson(str: string | null): string {
    if (!str) return "";
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  }

  private _formatHeaders(str: string | null): string {
    if (!str) return "";
    try {
      const parsed = JSON.parse(str);
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    } catch {
      return str;
    }
  }

  private _formatDate(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  private _canRetry(): boolean {
    if (!this._delivery) return false;
    return (
      this._delivery.status === OutboundDeliveryStatus.Failed ||
      this._delivery.status === OutboundDeliveryStatus.Abandoned
    );
  }

  private _renderLoading(): unknown {
    return html`
      <div class="loading-container">
        <uui-loader></uui-loader>
        <span>Loading delivery details...</span>
      </div>
    `;
  }

  private _renderStatusBadge(): unknown {
    if (!this._delivery) return nothing;

    return html`
      <span class="status-badge ${this._delivery.statusCssClass}">
        ${this._delivery.statusDisplay}
      </span>
    `;
  }

  private _renderDeliveryInfo(): unknown {
    if (!this._delivery) return nothing;

    return html`
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
          ${this._delivery.entityType
            ? html`
                <div class="info-row">
                  <span class="info-label">Entity:</span>
                  <span class="info-value">${this._delivery.entityType} (${this._delivery.entityId})</span>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _getStatusCodeClass(): string {
    const code = this._delivery?.responseStatusCode;
    if (!code) return "";
    if (code >= 200 && code < 300) return "status-success";
    if (code >= 400) return "status-error";
    return "";
  }

  private _renderErrorSection(): unknown {
    if (!this._delivery?.errorMessage) return nothing;

    return html`
      <div class="error-section">
        <h4>Error Details</h4>
        <div class="error-content">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._delivery.errorMessage}</span>
        </div>
      </div>
    `;
  }

  private _renderRequestSection(): unknown {
    if (!this._delivery?.requestHeaders && !this._delivery?.requestBody) return nothing;

    return html`
      <div class="data-section">
        <h4>Request</h4>
        ${this._delivery.requestHeaders
          ? html`
              <div class="data-block">
                <span class="data-label">Headers:</span>
                <pre class="data-content">${this._formatHeaders(this._delivery.requestHeaders)}</pre>
              </div>
            `
          : nothing}
        ${this._delivery.requestBody
          ? html`
              <div class="data-block">
                <span class="data-label">Body:</span>
                <pre class="data-content">${this._formatJson(this._delivery.requestBody)}</pre>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderResponseSection(): unknown {
    if (!this._delivery?.responseHeaders && !this._delivery?.responseBody) return nothing;

    return html`
      <div class="data-section">
        <h4>Response</h4>
        ${this._delivery.responseHeaders
          ? html`
              <div class="data-block">
                <span class="data-label">Headers:</span>
                <pre class="data-content">${this._formatHeaders(this._delivery.responseHeaders)}</pre>
              </div>
            `
          : nothing}
        ${this._delivery.responseBody
          ? html`
              <div class="data-block">
                <span class="data-label">Body:</span>
                <pre class="data-content">${this._formatJson(this._delivery.responseBody)}</pre>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <umb-body-layout headline="Delivery Details">
        <div id="main">
          ${this._errorMessage
            ? html`<div class="error-banner">${this._errorMessage}</div>`
            : nothing}

          ${this._isLoading
            ? this._renderLoading()
            : html`
                ${this._renderDeliveryInfo()}
                ${this._renderErrorSection()}
                ${this._renderRequestSection()}
                ${this._renderResponseSection()}
              `}
        </div>

        <div slot="actions">
          ${this._canRetry()
            ? html`
                <uui-button
                  look="primary"
                  color="warning"
                  label="Retry Delivery"
                  ?disabled=${this._isRetrying}
                  @click=${this._handleRetry}>
                  ${this._isRetrying
                    ? html`<uui-loader-bar></uui-loader-bar> Retrying...`
                    : html`<uui-icon name="icon-refresh"></uui-icon> Retry`}
                </uui-button>
              `
            : nothing}
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
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
}

export default MerchelloDeliveryDetailModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-delivery-detail-modal": MerchelloDeliveryDetailModalElement;
  }
}
