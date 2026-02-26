import { html as t, nothing as s, css as g, state as u, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as x } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-NdGX4WPd.js";
import { m as k } from "./modal-layout.styles-C2OaUji5.js";
import { d as v } from "./formatting-DU6_gkL3.js";
import "./merchello-status-badge.element-DZtAtyQ1.js";
var w = Object.defineProperty, C = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, d = (e, i, a, o) => {
  for (var r = o > 1 ? void 0 : o ? C(i, a) : i, h = e.length - 1, p; h >= 0; h--)
    (p = e[h]) && (r = (o ? p(i, a, r) : p(r)) || r);
  return o && r && w(i, a, r), r;
}, y = (e, i, a) => i.has(e) || _("Cannot " + a), c = (e, i, a) => (y(e, i, "read from private field"), a ? a.call(e) : i.get(e)), E = (e, i, a) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), R = (e, i, a, o) => (y(e, i, "write to private field"), i.set(e, a), a), n;
const f = 3;
let l = class extends $ {
  constructor() {
    super(), this._isLoading = !0, this._detail = null, this._errorMessage = null, this._isCopyBusy = !1, this._isResendBusy = !1, this._resent = !1, E(this, n), this.consumeContext(x, (e) => {
      R(this, n, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadDetail();
  }
  async _loadDetail() {
    const e = this.data?.checkoutId;
    if (!e) {
      this._errorMessage = "No checkout ID provided", this._isLoading = !1;
      return;
    }
    const { data: i, error: a } = await m.getAbandonedCheckoutById(e);
    if (this._isLoading = !1, a) {
      this._errorMessage = a.message;
      return;
    }
    i && (this._detail = i);
  }
  async _handleCopyLink() {
    if (this._detail?.recoveryLink) {
      this._isCopyBusy = !0;
      try {
        await navigator.clipboard.writeText(this._detail.recoveryLink), c(this, n)?.peek("positive", {
          data: { headline: "Recovery link copied", message: "Link copied to clipboard" }
        });
      } catch {
        c(this, n)?.peek("danger", {
          data: { headline: "Copy failed", message: "Could not copy link to clipboard" }
        });
      }
      this._isCopyBusy = !1;
    }
  }
  async _handleResendEmail() {
    if (!this._detail) return;
    this._isResendBusy = !0, this._errorMessage = null;
    const { error: e } = await m.resendRecoveryEmail(this._detail.id);
    if (this._isResendBusy = !1, e) {
      c(this, n)?.peek("danger", {
        data: { headline: "Failed to send", message: e.message }
      });
      return;
    }
    this._resent = !0, c(this, n)?.peek("positive", {
      data: { headline: "Email sent", message: "Recovery email sent successfully" }
    }), await this._loadDetail();
  }
  _handleClose() {
    this.value = { resent: this._resent }, this.modalContext?.submit();
  }
  _formatDate(e) {
    return e ? new Date(e).toLocaleString() : "N/A";
  }
  _formatAddress(e) {
    if (!e) return [];
    const i = [];
    e.name && i.push(e.name), e.company && i.push(e.company), e.addressOne && i.push(e.addressOne), e.addressTwo && i.push(e.addressTwo);
    const a = [e.townCity, e.countyState].filter(Boolean).join(", ");
    return a && i.push(a), e.postalCode && i.push(e.postalCode), e.country && i.push(e.country), e.phone && i.push(`Phone: ${e.phone}`), i;
  }
  _canResend() {
    return this._detail ? this._detail.status === "Abandoned" && !!this._detail.customerEmail && this._detail.recoveryEmailsSent < f : !1;
  }
  _renderLoading() {
    return t`
      <div class="loading-container">
        <uui-loader></uui-loader>
        <span>Loading checkout details...</span>
      </div>
    `;
  }
  _renderHeader() {
    return this._detail ? t`
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
    ` : s;
  }
  _renderCustomer() {
    return this._detail ? !this._detail.customerEmail && !this._detail.customerName ? s : t`
      <div class="info-section">
        <h4>Customer</h4>
        <div class="info-grid">
          ${this._detail.customerName ? t`
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${this._detail.customerName}</span>
                </div>
              ` : s}
          ${this._detail.customerEmail ? t`
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">
                    <a href="mailto:${this._detail.customerEmail}">${this._detail.customerEmail}</a>
                  </span>
                </div>
              ` : s}
        </div>
      </div>
    ` : s;
  }
  _renderTimeline() {
    if (!this._detail) return s;
    const e = [
      { label: "Created", value: this._detail.dateCreated },
      { label: "Last Activity", value: this._detail.lastActivityUtc },
      { label: "Abandoned", value: this._detail.dateAbandoned },
      { label: "Recovered", value: this._detail.dateRecovered },
      { label: "Converted", value: this._detail.dateConverted },
      { label: "Expired", value: this._detail.dateExpired }
    ];
    return t`
      <div class="info-section">
        <h4>Timeline</h4>
        <div class="info-grid">
          ${e.filter((i) => i.value).map(
      (i) => t`
                <div class="info-row">
                  <span class="info-label">${i.label}:</span>
                  <span class="info-value" title=${this._formatDate(i.value)}>
                    ${v(i.value)}
                  </span>
                </div>
              `
    )}
        </div>
      </div>
    `;
  }
  _renderAddress(e, i) {
    if (!i) return s;
    const a = this._formatAddress(i);
    return a.length === 0 ? s : t`
      <div class="info-section">
        <h4>${e}</h4>
        <div class="address-lines">
          ${a.map((o) => t`<div>${o}</div>`)}
        </div>
      </div>
    `;
  }
  _renderLineItems() {
    return this._detail ? this._detail.lineItems.length === 0 ? t`
        <div class="info-section">
          <h4>Basket Items</h4>
          <div class="empty-items">
            ${this._detail.basketId ? "No items found" : "Basket no longer available"}
          </div>
        </div>
      ` : t`
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
      (e) => t`
              <uui-table-row>
                <uui-table-cell>
                  <div class="line-item-identity">
                    ${e.imageUrl ? t`<img src="${e.imageUrl}" alt="${e.productRootName}" class="line-item-img" />` : s}
                    <div class="line-item-details">
                      <span class="line-item-name">${e.productRootName || e.name}</span>
                      ${e.selectedOptions.length ? t`<span class="line-item-options">
                            ${e.selectedOptions.map((i) => `${i.optionName}: ${i.valueName}`).join(", ")}
                          </span>` : s}
                      ${e.sku ? t`<span class="line-item-sku">${e.sku}</span>` : s}
                    </div>
                  </div>
                </uui-table-cell>
                <uui-table-cell style="text-align:right">${e.quantity}</uui-table-cell>
                <uui-table-cell style="text-align:right">${e.formattedUnitPrice}</uui-table-cell>
                <uui-table-cell style="text-align:right">${e.formattedLineTotal}</uui-table-cell>
              </uui-table-row>
            `
    )}
          <uui-table-row class="total-row">
            <uui-table-cell colspan="3" style="text-align:right;font-weight:600">Total:</uui-table-cell>
            <uui-table-cell style="text-align:right;font-weight:600">${this._detail.formattedTotal}</uui-table-cell>
          </uui-table-row>
        </uui-table>
      </div>
    ` : s;
  }
  _renderRecoveryInfo() {
    return this._detail ? t`
      <div class="info-section">
        <h4>Recovery</h4>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Emails Sent:</span>
            <span class="info-value">${this._detail.recoveryEmailsSent} / ${f}</span>
          </div>
          ${this._detail.lastRecoveryEmailSentUtc ? t`
                <div class="info-row">
                  <span class="info-label">Last Email:</span>
                  <span class="info-value" title=${this._formatDate(this._detail.lastRecoveryEmailSentUtc)}>
                    ${v(this._detail.lastRecoveryEmailSentUtc)}
                  </span>
                </div>
              ` : s}
          ${this._detail.recoveryTokenExpiresUtc ? t`
                <div class="info-row">
                  <span class="info-label">Link Expires:</span>
                  <span class="info-value" title=${this._formatDate(this._detail.recoveryTokenExpiresUtc)}>
                    ${v(this._detail.recoveryTokenExpiresUtc)}
                  </span>
                </div>
              ` : s}
          ${this._detail.recoveredInvoiceId ? t`
                <div class="info-row">
                  <span class="info-label">Order:</span>
                  <span class="info-value">${this._detail.recoveredInvoiceId}</span>
                </div>
              ` : s}
        </div>
      </div>
    ` : s;
  }
  render() {
    return t`
      <umb-body-layout headline="Abandoned Checkout">
        <div id="main">
          ${this._errorMessage ? t`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : s}

          ${this._isLoading ? this._renderLoading() : t`
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
        ${this._detail?.recoveryLink && this._detail.status === "Abandoned" ? t`
              <uui-button
                slot="actions"
                type="button"
                look="secondary"
                label="Copy Recovery Link"
                ?disabled=${this._isCopyBusy}
                @click=${this._handleCopyLink}>
                <uui-icon name="icon-clipboard"></uui-icon> Copy Link
              </uui-button>
            ` : s}
        ${this._canResend() ? t`
              <uui-button
                slot="actions"
                type="button"
                look="primary"
                color="positive"
                label="Resend Recovery Email"
                ?disabled=${this._isResendBusy}
                @click=${this._handleResendEmail}>
                ${this._isResendBusy ? t`<uui-loader-bar></uui-loader-bar> Sending...` : t`<uui-icon name="icon-message"></uui-icon> Resend Email`}
              </uui-button>
            ` : s}
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
l.styles = [
  k,
  g`
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
    `
];
d([
  u()
], l.prototype, "_isLoading", 2);
d([
  u()
], l.prototype, "_detail", 2);
d([
  u()
], l.prototype, "_errorMessage", 2);
d([
  u()
], l.prototype, "_isCopyBusy", 2);
d([
  u()
], l.prototype, "_isResendBusy", 2);
d([
  u()
], l.prototype, "_resent", 2);
l = d([
  b("merchello-abandoned-checkout-detail-modal")
], l);
const D = l;
export {
  l as MerchelloAbandonedCheckoutDetailModalElement,
  D as default
};
//# sourceMappingURL=abandoned-checkout-detail-modal.element-KgJHhOBk.js.map
