import { nothing as o, html as r, css as p, state as u, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-DPQ4r4XT.js";
import { g } from "./store-settings-BhzqJKNt.js";
import { a as m, b } from "./formatting-DYmyPQEL.js";
var y = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, n = (e, t, a, l) => {
  for (var s = l > 1 ? void 0 : l ? _(t, a) : t, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (s = (l ? c(t, a, s) : c(s)) || s);
  return l && s && y(t, a, s), s;
};
let i = class extends h {
  constructor() {
    super(...arguments), this._amount = 0, this._reason = "", this._isManualRefund = !1, this._isSaving = !1, this._errorMessage = null, this._quickAmountPercentages = [50];
  }
  connectedCallback() {
    super.connectedCallback(), this._amount = this.data?.payment.refundableAmount ?? 0, this._isManualRefund = !this.data?.payment.paymentProviderAlias || this.data?.payment.paymentProviderAlias === "manual", this._loadSettings();
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
    const { error: t } = await v.processRefund(e.id, {
      amount: this._amount,
      reason: this._reason,
      isManualRefund: this._isManualRefund
    });
    if (t) {
      this._errorMessage = t.message, this._isSaving = !1;
      return;
    }
    this._isSaving = !1, this.value = { refunded: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = this.data?.payment;
    if (!e) return o;
    const t = e.paymentProviderAlias && e.paymentProviderAlias !== "manual";
    return r`
      <umb-body-layout headline="Process Refund">
        <div id="main">
          ${this._errorMessage ? r`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : o}

          <!-- Original Payment Info -->
          <div class="payment-info">
            <h3>Original Payment</h3>
            <div class="info-row">
              <span>Amount:</span>
              <strong>${m(e.amount, e.currencyCode, e.currencySymbol)}</strong>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${b(e.dateCreated)}</span>
            </div>
            <div class="info-row">
              <span>Method:</span>
              <span>${e.paymentMethod ?? "N/A"}</span>
            </div>
            ${e.paymentProviderAlias ? r`
                  <div class="info-row">
                    <span>Provider:</span>
                    <span>${e.paymentProviderAlias}</span>
                  </div>
                ` : o}
            ${e.transactionId ? r`
                  <div class="info-row">
                    <span>Transaction ID:</span>
                    <span class="mono">${e.transactionId}</span>
                  </div>
                ` : o}
            <div class="info-row highlight">
              <span>Refundable Amount:</span>
              <strong>${m(e.refundableAmount, e.currencyCode, e.currencySymbol)}</strong>
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
      (a) => r`
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

          ${t ? r`
                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isManualRefund"
                    ?checked=${this._isManualRefund}
                    @change=${(a) => {
      this._isManualRefund = a.target.checked;
    }}
                  >
                    Manual refund (already processed externally)
                  </uui-checkbox>
                  <p class="field-description">
                    Check this if you have already processed the refund through ${e.paymentProviderAlias}
                    and just need to record it here.
                  </p>
                </div>
              ` : o}
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
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : o}
            Process Refund
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
n([
  u()
], i.prototype, "_amount", 2);
n([
  u()
], i.prototype, "_reason", 2);
n([
  u()
], i.prototype, "_isManualRefund", 2);
n([
  u()
], i.prototype, "_isSaving", 2);
n([
  u()
], i.prototype, "_errorMessage", 2);
n([
  u()
], i.prototype, "_quickAmountPercentages", 2);
i = n([
  f("merchello-refund-modal")
], i);
const R = i;
export {
  i as MerchelloRefundModalElement,
  R as default
};
//# sourceMappingURL=refund-modal.element-4MceWLTB.js.map
