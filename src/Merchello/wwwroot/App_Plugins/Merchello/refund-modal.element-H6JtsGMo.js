import { nothing as t, html as i, css as m, state as o, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-D-qg1PlO.js";
import { g } from "./store-settings-Silr5K1w.js";
import { a as p, b } from "./formatting-DC2_cf8C.js";
var y = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, s = (e, a, d, u) => {
  for (var r = u > 1 ? void 0 : u ? _(a, d) : a, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (r = (u ? c(a, d, r) : c(r)) || r);
  return u && r && y(a, d, r), r;
};
let n = class extends v {
  constructor() {
    super(...arguments), this._amount = 0, this._reason = "", this._isManualRefund = !1, this._isSaving = !1, this._errorMessage = null, this._quickAmountPercentages = [50];
  }
  connectedCallback() {
    super.connectedCallback(), this._amount = this.data?.payment.refundableAmount ?? 0;
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
    const e = await g();
    this._quickAmountPercentages = e.refundQuickAmountPercentages;
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
    const { error: a } = await h.processRefund(e.id, {
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
              ` : t}

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
                ` : t}
            ${e.transactionId ? i`
                  <div class="info-row">
                    <span>Transaction ID:</span>
                    <span class="mono">${e.transactionId}</span>
                  </div>
                ` : t}
            <div class="info-row highlight">
              <span>Refundable Amount:</span>
              <strong>${p(e.refundableAmount, e.currencyCode, e.currencySymbol)}</strong>
            </div>
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
            <!-- Quick amount buttons for UX convenience only.
                 Backend validates actual refund amount in processRefund API call. -->
            <div class="amount-buttons">
              <uui-button
                look="secondary"
                label="Full Refund"
                compact
                @click=${() => this._amount = e.refundableAmount}
              >
                Full Refund
              </uui-button>
              ${this._quickAmountPercentages.map(
      (a) => i`
                  <uui-button
                    look="secondary"
                    label="${a}%"
                    compact
                    @click=${() => this._amount = e.refundableAmount * (a / 100)}
                  >
                    ${a}%
                  </uui-button>
                `
    )}
            </div>
          </div>

          <div class="form-field">
            <label for="reason">Reason for Refund *</label>
            <uui-textarea
              id="reason"
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
                ${this._canRefundViaProvider ? t : i`
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
              ` : t}
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
            ${this._isSaving ? i`<uui-loader-circle></uui-loader-circle>` : t}
            Process Refund
          </uui-button>
        </div>
      </umb-body-layout>
    ` : t;
  }
};
n.styles = m`
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
  `;
s([
  o()
], n.prototype, "_amount", 2);
s([
  o()
], n.prototype, "_reason", 2);
s([
  o()
], n.prototype, "_isManualRefund", 2);
s([
  o()
], n.prototype, "_isSaving", 2);
s([
  o()
], n.prototype, "_errorMessage", 2);
s([
  o()
], n.prototype, "_quickAmountPercentages", 2);
n = s([
  f("merchello-refund-modal")
], n);
const k = n;
export {
  n as MerchelloRefundModalElement,
  k as default
};
//# sourceMappingURL=refund-modal.element-H6JtsGMo.js.map
