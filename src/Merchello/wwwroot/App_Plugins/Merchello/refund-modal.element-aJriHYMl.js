import { nothing as r, html as n, css as p, state as u, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-CzSx3Q3Y.js";
import { a as m, b as g } from "./formatting-CH1NCLNK.js";
var b = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, o = (e, a, i, l) => {
  for (var s = l > 1 ? void 0 : l ? _(a, i) : a, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (s = (l ? c(a, i, s) : c(s)) || s);
  return l && s && b(a, i, s), s;
};
let t = class extends h {
  constructor() {
    super(...arguments), this._amount = 0, this._reason = "", this._isManualRefund = !1, this._isSaving = !1, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._amount = this.data?.payment.refundableAmount ?? 0, this._isManualRefund = !this.data?.payment.paymentProviderAlias || this.data?.payment.paymentProviderAlias === "manual";
  }
  async _handleSave() {
    const e = this.data?.payment;
    if (!e) return;
    if (!this._reason.trim()) {
      this._errorMessage = "Refund reason is required";
      return;
    }
    if (this._amount <= 0) {
      this._errorMessage = "Amount must be greater than zero";
      return;
    }
    if (this._amount > e.refundableAmount) {
      this._errorMessage = `Amount cannot exceed ${m(e.refundableAmount)}`;
      return;
    }
    this._isSaving = !0, this._errorMessage = null;
    const { error: a } = await v.processRefund(e.id, {
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
    if (!e) return r;
    const a = e.paymentProviderAlias && e.paymentProviderAlias !== "manual";
    return n`
      <umb-body-layout headline="Process Refund">
        <div id="main">
          ${this._errorMessage ? n`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : r}

          <!-- Original Payment Info -->
          <div class="payment-info">
            <h3>Original Payment</h3>
            <div class="info-row">
              <span>Amount:</span>
              <strong>${m(e.amount)}</strong>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${g(e.dateCreated)}</span>
            </div>
            <div class="info-row">
              <span>Method:</span>
              <span>${e.paymentMethod ?? "N/A"}</span>
            </div>
            ${e.paymentProviderAlias ? n`
                  <div class="info-row">
                    <span>Provider:</span>
                    <span>${e.paymentProviderAlias}</span>
                  </div>
                ` : r}
            ${e.transactionId ? n`
                  <div class="info-row">
                    <span>Transaction ID:</span>
                    <span class="mono">${e.transactionId}</span>
                  </div>
                ` : r}
            <div class="info-row highlight">
              <span>Refundable Amount:</span>
              <strong>${m(e.refundableAmount)}</strong>
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
              @input=${(i) => {
      this._amount = parseFloat(i.target.value) || 0;
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
              <uui-button
                look="secondary"
                label="50%"
                compact
                @click=${() => this._amount = e.refundableAmount * 0.5}
              >
                50%
              </uui-button>
            </div>
          </div>

          <div class="form-field">
            <label for="reason">Reason for Refund *</label>
            <uui-textarea
              id="reason"
              .value=${this._reason}
              placeholder="Enter the reason for this refund..."
              required
              @input=${(i) => {
      this._reason = i.target.value;
    }}
            ></uui-textarea>
          </div>

          ${a ? n`
                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isManualRefund"
                    ?checked=${this._isManualRefund}
                    @change=${(i) => {
      this._isManualRefund = i.target.checked;
    }}
                  >
                    Manual refund (already processed externally)
                  </uui-checkbox>
                  <p class="field-description">
                    Check this if you have already processed the refund through ${e.paymentProviderAlias}
                    and just need to record it here.
                  </p>
                </div>
              ` : r}
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
            ${this._isSaving ? n`<uui-loader-circle></uui-loader-circle>` : r}
            Process Refund
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
t.styles = p`
    #main {
      padding: var(--uui-size-space-4);
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
o([
  u()
], t.prototype, "_amount", 2);
o([
  u()
], t.prototype, "_reason", 2);
o([
  u()
], t.prototype, "_isManualRefund", 2);
o([
  u()
], t.prototype, "_isSaving", 2);
o([
  u()
], t.prototype, "_errorMessage", 2);
t = o([
  f("merchello-refund-modal")
], t);
const z = t;
export {
  t as MerchelloRefundModalElement,
  z as default
};
//# sourceMappingURL=refund-modal.element-aJriHYMl.js.map
