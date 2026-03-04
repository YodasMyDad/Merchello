import { nothing as n, html as i, css as m, state as d, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as f } from "./merchello-api-BtThjGiA.js";
import { g as h } from "./store-settings-D6IgcgHv.js";
import { a as p, f as b } from "./formatting-SQYZJ8LX.js";
import { m as y } from "./modal-layout.styles-C2OaUji5.js";
var _ = Object.defineProperty, R = Object.getOwnPropertyDescriptor, t = (e, a, o, u) => {
  for (var s = u > 1 ? void 0 : u ? R(a, o) : a, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (s = (u ? c(a, o, s) : c(s)) || s);
  return u && s && _(a, o, s), s;
};
let r = class extends g {
  constructor() {
    super(...arguments), this._amount = 0, this._reason = "", this._isManualRefund = !1, this._isSaving = !1, this._errorMessage = null, this._quickAmountPercentages = [50];
  }
  connectedCallback() {
    super.connectedCallback(), this._amount = this.data?.suggestedRefundAmount ?? this.data?.payment.refundableAmount ?? 0;
    const e = this.data?.payment;
    this._isManualRefund = !e?.paymentProviderAlias || e.paymentProviderAlias === "manual" || !e.canRefundViaProvider, this._loadSettings();
  }
  /** Whether the payment has a non-manual provider alias */
  get _hasProviderAlias() {
    const e = this.data?.payment;
    return !!e?.paymentProviderAlias && e.paymentProviderAlias !== "manual";
  }
  /** Whether provider-based refund is available */
  get _canRefundViaProvider() {
    return this.data?.payment?.canRefundViaProvider ?? !1;
  }
  async _loadSettings() {
    const e = await h();
    this._quickAmountPercentages = e.refundQuickAmountPercentages;
  }
  /**
   * Preview refund calculation using backend API for proper currency rounding.
   */
  async _previewRefund(e, a) {
    const { data: o, error: u } = await f.previewRefund(e, { percentage: a });
    if (u || !o) {
      this._errorMessage = "Unable to preview refund amount. Please enter an amount manually.";
      return;
    }
    this._errorMessage = null, this._amount = o.requestedAmount;
  }
  async _handleSave() {
    const e = this.data?.payment;
    if (!e) return;
    if (!this._reason.trim()) {
      this._errorMessage = "Refund reason is required";
      return;
    }
    if (this._amount <= 0) {
      this._errorMessage = "Please enter a refund amount";
      return;
    }
    this._isSaving = !0, this._errorMessage = null;
    const { error: a } = await f.processRefund(e.id, {
      amount: this._amount,
      reason: this._reason,
      isManualRefund: this._isManualRefund
    });
    if (a) {
      this._errorMessage = a.message, this._isSaving = !1;
      return;
    }
    this._isSaving = !1, this.value = { refunded: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = this.data?.payment;
    return e ? i`
      <umb-body-layout headline="Process Refund">
        <div id="main">
          ${this._errorMessage ? i`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : n}

          ${this.data?.suggestedRefundAmount != null && this.data.suggestedRefundAmount > 0 ? i`
                <div class="suggested-amount-info">
                  <uui-icon name="icon-info"></uui-icon>
                  <span>Suggested refund of ${p(
      this.data.suggestedRefundAmount,
      e.currencyCode,
      e.currencySymbol
    )} based on the overpayment amount on this invoice.</span>
                </div>
              ` : n}

          <!-- Original Payment Info -->
          <div class="payment-info">
            <h3>Original Payment</h3>
            <div class="info-row">
              <span>Amount:</span>
              <strong>${p(e.amount, e.currencyCode, e.currencySymbol)}</strong>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${b(e.dateCreated)}</span>
            </div>
            <div class="info-row">
              <span>Method:</span>
              <span>${e.paymentMethod ?? "N/A"}</span>
            </div>
            ${e.paymentProviderAlias ? i`
                  <div class="info-row">
                    <span>Provider:</span>
                    <span>${e.paymentProviderAlias}</span>
                  </div>
                ` : n}
            ${e.transactionId ? i`
                  <div class="info-row">
                    <span>Transaction ID:</span>
                    <span class="mono">${e.transactionId}</span>
                  </div>
                ` : n}
            <div class="info-row highlight">
              <span>Refundable Amount:</span>
              <strong>${p(e.refundableAmount, e.currencyCode, e.currencySymbol)}</strong>
            </div>
            ${e.canRefundViaProvider && !e.supportsPartialRefunds ? i`
                  <div class="info-row">
                    <span class="full-refund-only">This provider only supports full refunds</span>
                  </div>
                ` : n}
          </div>

          <!-- Refund Form -->
          <div class="form-field">
            <label for="amount">Refund Amount *</label>
            <uui-input
              id="amount"
              type="number"
              min="0.01"
              max="${e.refundableAmount}"
              step="0.01"
              .value=${String(this._amount)}
              required
              @input=${(a) => {
      this._amount = parseFloat(a.target.value) || 0;
    }}
            ></uui-input>
            <!-- Quick amount buttons use backend preview API for proper currency rounding.
                 Backend validates actual refund amount in processRefund API call. -->
            <div class="amount-buttons">
              <uui-button
                look="secondary"
                label="Full Refund"
                compact
                @click=${() => this._previewRefund(e.id)}
              >
                Full Refund
              </uui-button>
              ${e.supportsPartialRefunds || this._isManualRefund ? this._quickAmountPercentages.map(
      (a) => i`
                      <uui-button
                        look="secondary"
                        label="${a}%"
                        compact
                        @click=${() => this._previewRefund(e.id, a)}
                      >
                        ${a}%
                      </uui-button>
                    `
    ) : n}
            </div>
          </div>

          <div class="form-field">
            <label for="reason">Reason for Refund *</label>
            <uui-textarea
              id="reason"
              label="Reason for refund"
              .value=${this._reason}
              placeholder="Enter the reason for this refund..."
              required
              @input=${(a) => {
      this._reason = a.target.value;
    }}
            ></uui-textarea>
          </div>

          ${this._hasProviderAlias ? i`
                <!-- Show warning if provider refund is not available -->
                ${this._canRefundViaProvider ? n : i`
                      <div class="provider-warning">
                        <uui-icon name="icon-alert"></uui-icon>
                        <div class="warning-content">
                          <strong>Provider refund not available</strong>
                          <p>${e.cannotRefundViaProviderReason}</p>
                        </div>
                      </div>
                    `}
                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isManualRefund"
                    label="Manual refund"
                    ?checked=${this._isManualRefund}
                    ?disabled=${!this._canRefundViaProvider}
                    @change=${(a) => {
      this._canRefundViaProvider && (this._isManualRefund = a.target.checked);
    }}
                  >
                    Manual refund (already processed externally)
                  </uui-checkbox>
                  <p class="field-description">
                    ${this._canRefundViaProvider ? i`Check this if you have already processed the refund through ${e.paymentProviderAlias}
                             and just need to record it here.` : i`This refund will be recorded as manual. You must process the actual refund
                             directly with ${e.paymentProviderAlias}.`}
                  </p>
                </div>
              ` : n}
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Process Refund"
            look="primary"
            color="danger"
            @click=${this._handleSave}
            ?disabled=${this._isSaving || this._amount <= 0 || !this._reason.trim()}
          >
            ${this._isSaving ? i`<uui-loader-circle></uui-loader-circle>` : n}
            Process Refund
          </uui-button>
        </div>
      </umb-body-layout>
    ` : n;
  }
};
r.styles = [
  y,
  m`
    :host {
      display: block;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .suggested-amount-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
    }

    .payment-info {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-5);
    }

    .payment-info h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: var(--uui-size-space-1) 0;
      font-size: 0.875rem;
    }

    .info-row.highlight {
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .mono {
      font-family: monospace;
      font-size: 0.75rem;
    }

    .full-refund-only {
      color: var(--uui-color-warning);
      font-size: 0.75rem;
      font-style: italic;
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    .amount-buttons {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
    }

    .checkbox-field .field-description {
      margin: var(--uui-size-space-1) 0 0 var(--uui-size-space-5);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .checkbox-field uui-checkbox[disabled] {
      opacity: 0.7;
    }

    .provider-warning {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .provider-warning .warning-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .provider-warning .warning-content strong {
      font-weight: 600;
    }

    .provider-warning .warning-content p {
      margin: 0;
      font-size: 0.875rem;
    }

    uui-input,
    uui-textarea {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `
];
t([
  d()
], r.prototype, "_amount", 2);
t([
  d()
], r.prototype, "_reason", 2);
t([
  d()
], r.prototype, "_isManualRefund", 2);
t([
  d()
], r.prototype, "_isSaving", 2);
t([
  d()
], r.prototype, "_errorMessage", 2);
t([
  d()
], r.prototype, "_quickAmountPercentages", 2);
r = t([
  v("merchello-refund-modal")
], r);
const x = r;
export {
  r as MerchelloRefundModalElement,
  x as default
};
//# sourceMappingURL=refund-modal.element-Dh9E-Rd7.js.map
