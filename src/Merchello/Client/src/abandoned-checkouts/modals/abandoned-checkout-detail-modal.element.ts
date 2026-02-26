import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type {
  AbandonedCheckoutDetailModalData,
  AbandonedCheckoutDetailModalValue,
  AbandonedCheckoutDetailDto,
} from "@abandoned-checkouts/types/abandoned-checkout.types.js";
import type { AddressDto } from "@shared/types/address.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";
import { formatRelativeDate } from "@shared/utils/formatting.js";
import "@shared/components/merchello-status-badge.element.js";

const MAX_RECOVERY_EMAILS = 3;

@customElement("merchello-abandoned-checkout-detail-modal")
export class MerchelloAbandonedCheckoutDetailModalElement extends UmbModalBaseElement<
  AbandonedCheckoutDetailModalData,
  AbandonedCheckoutDetailModalValue
> {
  @state() private _isLoading = true;
  @state() private _detail: AbandonedCheckoutDetailDto | null = null;
  @state() private _errorMessage: string | null = null;
  @state() private _isCopyBusy = false;
  @state() private _isResendBusy = false;
  @state() private _resent = false;

  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => {
      this.#notificationContext = ctx;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadDetail();
  }

  private async _loadDetail(): Promise<void> {
    const checkoutId = this.data?.checkoutId;
    if (!checkoutId) {
      this._errorMessage = "No checkout ID provided";
      this._isLoading = false;
      return;
    }

    const { data, error } = await MerchelloApi.getAbandonedCheckoutById(checkoutId);
    this._isLoading = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    if (data) {
      this._detail = data;
    }
  }

  private async _handleCopyLink(): Promise<void> {
    if (!this._detail?.recoveryLink) return;

    this._isCopyBusy = true;
    try {
      await navigator.clipboard.writeText(this._detail.recoveryLink);
      this.#notificationContext?.peek("positive", {
        data: { headline: "Recovery link copied", message: "Link copied to clipboard" },
      });
    } catch {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Copy failed", message: "Could not copy link to clipboard" },
      });
    }
    this._isCopyBusy = false;
  }

  private async _handleResendEmail(): Promise<void> {
    if (!this._detail) return;

    this._isResendBusy = true;
    this._errorMessage = null;

    const { error } = await MerchelloApi.resendRecoveryEmail(this._detail.id);
    this._isResendBusy = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to send", message: error.message },
      });
      return;
    }

    this._resent = true;
    this.#notificationContext?.peek("positive", {
      data: { headline: "Email sent", message: "Recovery email sent successfully" },
    });

    await this._loadDetail();
  }

  private _handleClose(): void {
    this.value = { resent: this._resent };
    this.modalContext?.submit();
  }

  private _formatDate(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  private _formatAddress(address: AddressDto | null): string[] {
    if (!address) return [];
    const lines: string[] = [];
    if (address.name) lines.push(address.name);
    if (address.company) lines.push(address.company);
    if (address.addressOne) lines.push(address.addressOne);
    if (address.addressTwo) lines.push(address.addressTwo);
    const cityState = [address.townCity, address.countyState].filter(Boolean).join(", ");
    if (cityState) lines.push(cityState);
    if (address.postalCode) lines.push(address.postalCode);
    if (address.country) lines.push(address.country);
    if (address.phone) lines.push(`Phone: ${address.phone}`);
    return lines;
  }

  private _canResend(): boolean {
    if (!this._detail) return false;
    return (
      this._detail.status === "Abandoned" &&
      !!this._detail.customerEmail &&
      this._detail.recoveryEmailsSent < MAX_RECOVERY_EMAILS
    );
  }

  private _renderLoading(): unknown {
    return html`
      <div class="loading-container">
        <uui-loader></uui-loader>
        <span>Loading checkout details...</span>
      </div>
    `;
  }

  private _renderHeader(): unknown {
    if (!this._detail) return nothing;

    return html`
      <div class="header-section">
        <div class="header-row">
          <merchello-status-badge
            .cssClass=${this._detail.statusCssClass}
            .label=${this._detail.statusDisplay}
          ></merchello-status-badge>
          <span class="header-total">${this._detail.formattedTotal}</span>
          <span class="header-items">${this._detail.itemCount} item${this._detail.itemCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
    `;
  }

  private _renderCustomer(): unknown {
    if (!this._detail) return nothing;
    if (!this._detail.customerEmail && !this._detail.customerName) return nothing;

    return html`
      <div class="info-section">
        <h4>Customer</h4>
        <div class="info-grid">
          ${this._detail.customerName
            ? html`
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${this._detail.customerName}</span>
                </div>
              `
            : nothing}
          ${this._detail.customerEmail
            ? html`
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">
                    <a href="mailto:${this._detail.customerEmail}">${this._detail.customerEmail}</a>
                  </span>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderTimeline(): unknown {
    if (!this._detail) return nothing;

    const dates: { label: string; value: string | null }[] = [
      { label: "Created", value: this._detail.dateCreated },
      { label: "Last Activity", value: this._detail.lastActivityUtc },
      { label: "Abandoned", value: this._detail.dateAbandoned },
      { label: "Recovered", value: this._detail.dateRecovered },
      { label: "Converted", value: this._detail.dateConverted },
      { label: "Expired", value: this._detail.dateExpired },
    ];

    return html`
      <div class="info-section">
        <h4>Timeline</h4>
        <div class="info-grid">
          ${dates
            .filter((d) => d.value)
            .map(
              (d) => html`
                <div class="info-row">
                  <span class="info-label">${d.label}:</span>
                  <span class="info-value" title=${this._formatDate(d.value)}>
                    ${formatRelativeDate(d.value!)}
                  </span>
                </div>
              `,
            )}
        </div>
      </div>
    `;
  }

  private _renderAddress(title: string, address: AddressDto | null): unknown {
    if (!address) return nothing;
    const lines = this._formatAddress(address);
    if (lines.length === 0) return nothing;

    return html`
      <div class="info-section">
        <h4>${title}</h4>
        <div class="address-lines">
          ${lines.map((line) => html`<div>${line}</div>`)}
        </div>
      </div>
    `;
  }

  private _renderLineItems(): unknown {
    if (!this._detail) return nothing;

    if (this._detail.lineItems.length === 0) {
      return html`
        <div class="info-section">
          <h4>Basket Items</h4>
          <div class="empty-items">
            ${this._detail.basketId ? "No items found" : "Basket no longer available"}
          </div>
        </div>
      `;
    }

    return html`
      <div class="info-section">
        <h4>Basket Items</h4>
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Product</uui-table-head-cell>
            <uui-table-head-cell style="width:60px;text-align:right">Qty</uui-table-head-cell>
            <uui-table-head-cell style="width:100px;text-align:right">Price</uui-table-head-cell>
            <uui-table-head-cell style="width:100px;text-align:right">Total</uui-table-head-cell>
          </uui-table-head>
          ${this._detail.lineItems.map(
            (item) => html`
              <uui-table-row>
                <uui-table-cell>
                  <div class="line-item-identity">
                    ${item.imageUrl
                      ? html`<img src="${item.imageUrl}" alt="${item.productRootName}" class="line-item-img" />`
                      : nothing}
                    <div class="line-item-details">
                      <span class="line-item-name">${item.productRootName || item.name}</span>
                      ${item.selectedOptions.length
                        ? html`<span class="line-item-options">
                            ${item.selectedOptions.map((o) => `${o.optionName}: ${o.valueName}`).join(", ")}
                          </span>`
                        : nothing}
                      ${item.sku ? html`<span class="line-item-sku">${item.sku}</span>` : nothing}
                    </div>
                  </div>
                </uui-table-cell>
                <uui-table-cell style="text-align:right">${item.quantity}</uui-table-cell>
                <uui-table-cell style="text-align:right">${item.formattedUnitPrice}</uui-table-cell>
                <uui-table-cell style="text-align:right">${item.formattedLineTotal}</uui-table-cell>
              </uui-table-row>
            `,
          )}
          <uui-table-row class="total-row">
            <uui-table-cell colspan="3" style="text-align:right;font-weight:600">Total:</uui-table-cell>
            <uui-table-cell style="text-align:right;font-weight:600">${this._detail.formattedTotal}</uui-table-cell>
          </uui-table-row>
        </uui-table>
      </div>
    `;
  }

  private _renderRecoveryInfo(): unknown {
    if (!this._detail) return nothing;

    return html`
      <div class="info-section">
        <h4>Recovery</h4>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Emails Sent:</span>
            <span class="info-value">${this._detail.recoveryEmailsSent} / ${MAX_RECOVERY_EMAILS}</span>
          </div>
          ${this._detail.lastRecoveryEmailSentUtc
            ? html`
                <div class="info-row">
                  <span class="info-label">Last Email:</span>
                  <span class="info-value" title=${this._formatDate(this._detail.lastRecoveryEmailSentUtc)}>
                    ${formatRelativeDate(this._detail.lastRecoveryEmailSentUtc)}
                  </span>
                </div>
              `
            : nothing}
          ${this._detail.recoveryTokenExpiresUtc
            ? html`
                <div class="info-row">
                  <span class="info-label">Link Expires:</span>
                  <span class="info-value" title=${this._formatDate(this._detail.recoveryTokenExpiresUtc)}>
                    ${formatRelativeDate(this._detail.recoveryTokenExpiresUtc)}
                  </span>
                </div>
              `
            : nothing}
          ${this._detail.recoveredInvoiceId
            ? html`
                <div class="info-row">
                  <span class="info-label">Order:</span>
                  <span class="info-value">${this._detail.recoveredInvoiceId}</span>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  override render() {
    return html`
      <umb-body-layout headline="Abandoned Checkout">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : nothing}

          ${this._isLoading
            ? this._renderLoading()
            : html`
                ${this._renderHeader()}
                ${this._renderCustomer()}
                ${this._renderTimeline()}
                ${this._renderAddress("Billing Address", this._detail?.billingAddress ?? null)}
                ${this._renderAddress("Shipping Address", this._detail?.shippingAddress ?? null)}
                ${this._renderLineItems()}
                ${this._renderRecoveryInfo()}
              `}
        </div>

        <uui-button slot="actions" type="button" label="Close" look="secondary" @click=${this._handleClose}>
          Close
        </uui-button>
        ${this._detail?.recoveryLink && this._detail.status === "Abandoned"
          ? html`
              <uui-button
                slot="actions"
                type="button"
                look="secondary"
                label="Copy Recovery Link"
                ?disabled=${this._isCopyBusy}
                @click=${this._handleCopyLink}>
                <uui-icon name="icon-clipboard"></uui-icon> Copy Link
              </uui-button>
            `
          : nothing}
        ${this._canResend()
          ? html`
              <uui-button
                slot="actions"
                type="button"
                look="primary"
                color="positive"
                label="Resend Recovery Email"
                ?disabled=${this._isResendBusy}
                @click=${this._handleResendEmail}>
                ${this._isResendBusy
                  ? html`<uui-loader-bar></uui-loader-bar> Sending...`
                  : html`<uui-icon name="icon-message"></uui-icon> Resend Email`}
              </uui-button>
            `
          : nothing}
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

      .header-section {
        padding: var(--uui-size-space-3) 0;
      }

      .header-row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-4);
      }

      .header-total {
        font-size: 1.25rem;
        font-weight: 700;
      }

      .header-items {
        color: var(--uui-color-text-alt);
      }

      .info-section {
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

      .info-value a {
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .info-value a:hover {
        text-decoration: underline;
      }

      .address-lines {
        display: flex;
        flex-direction: column;
        gap: 2px;
        color: var(--uui-color-text);
        line-height: 1.5;
      }

      .empty-items {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }

      .line-item-identity {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .line-item-img {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: var(--uui-border-radius);
        flex-shrink: 0;
      }

      .line-item-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .line-item-name {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .line-item-options {
        font-size: 0.8rem;
        color: var(--uui-color-text-alt);
      }

      .line-item-sku {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
        font-family: monospace;
      }

      .total-row {
        border-top: 1px solid var(--uui-color-border);
      }
    `,
  ];
}

export default MerchelloAbandonedCheckoutDetailModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-abandoned-checkout-detail-modal": MerchelloAbandonedCheckoutDetailModalElement;
  }
}
