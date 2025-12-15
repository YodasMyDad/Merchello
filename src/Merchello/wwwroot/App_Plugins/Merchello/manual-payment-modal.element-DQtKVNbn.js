import { nothing as d, html as l, css as m, state as o, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-Bc5VtWiv.js";
import { a as b } from "./formatting-DRS1Pp3F.js";
var y = Object.defineProperty, g = Object.getOwnPropertyDescriptor, s = (e, t, n, a) => {
  for (var r = a > 1 ? void 0 : a ? g(t, n) : t, u = e.length - 1, c; u >= 0; u--)
    (c = e[u]) && (r = (a ? c(t, n, r) : c(r)) || r);
  return a && r && y(t, n, r), r;
};
const _ = [
  { value: "Cash", label: "Cash" },
  { value: "Check", label: "Check" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Credit Card (Manual)", label: "Credit Card (Manual)" },
  { value: "PayPal (Manual)", label: "PayPal (Manual)" },
  { value: "Other", label: "Other" }
];
let i = class extends h {
  constructor() {
    super(...arguments), this._amount = 0, this._paymentMethod = "Cash", this._description = "", this._isSaving = !1, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._amount = this.data?.balanceDue ?? 0;
  }
  async _handleSave() {
    const e = this.data?.invoiceId;
    if (!e) return;
    if (this._amount <= 0) {
      this._errorMessage = "Amount must be greater than zero";
      return;
    }
    if (!this._paymentMethod) {
      this._errorMessage = "Payment method is required";
      return;
    }
    this._isSaving = !0, this._errorMessage = null;
    const { error: t } = await v.recordManualPayment(e, {
      amount: this._amount,
      paymentMethod: this._paymentMethod,
      description: this._description || void 0
    });
    if (t) {
      this._errorMessage = t.message, this._isSaving = !1;
      return;
    }
    this._isSaving = !1, this.value = { recorded: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getPaymentMethodOptions() {
    return _.map((e) => ({
      name: e.label,
      value: e.value,
      selected: this._paymentMethod === e.value
    }));
  }
  render() {
    const e = this.data?.balanceDue ?? 0, t = this.data?.currencyCode, n = this.data?.currencySymbol;
    return l`
      <umb-body-layout headline="Record Manual Payment">
        <div id="main">
          ${this._errorMessage ? l`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : d}

          <div class="balance-info">
            <span>Balance Due:</span>
            <strong>${b(e, t, n)}</strong>
          </div>

          <div class="form-field">
            <label for="amount">Amount *</label>
            <uui-input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              .value=${String(this._amount)}
              required
              @input=${(a) => {
      this._amount = parseFloat(a.target.value) || 0;
    }}
            ></uui-input>
            ${this._amount > e ? l`<small class="warning">Amount exceeds balance due</small>` : d}
          </div>

          <div class="form-field">
            <label for="paymentMethod">Payment Method *</label>
            <uui-select
              id="paymentMethod"
              .options=${this._getPaymentMethodOptions()}
              required
              @change=${(a) => {
      this._paymentMethod = a.target.value;
    }}
            ></uui-select>
          </div>

          <div class="form-field">
            <label for="description">Description (Optional)</label>
            <uui-textarea
              id="description"
              .value=${this._description}
              placeholder="Add any notes about this payment..."
              @input=${(a) => {
      this._description = a.target.value;
    }}
            ></uui-textarea>
          </div>
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
            label="Record Payment"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving || this._amount <= 0}
          >
            ${this._isSaving ? l`<uui-loader-circle></uui-loader-circle>` : d}
            Record Payment
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = m`
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

    .balance-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .balance-info strong {
      font-size: 1.25rem;
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    .warning {
      display: block;
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-warning);
      font-size: 0.75rem;
    }

    uui-input,
    uui-select,
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
], i.prototype, "_amount", 2);
s([
  o()
], i.prototype, "_paymentMethod", 2);
s([
  o()
], i.prototype, "_description", 2);
s([
  o()
], i.prototype, "_isSaving", 2);
s([
  o()
], i.prototype, "_errorMessage", 2);
i = s([
  p("merchello-manual-payment-modal")
], i);
const $ = i;
export {
  i as MerchelloManualPaymentModalElement,
  $ as default
};
//# sourceMappingURL=manual-payment-modal.element-DQtKVNbn.js.map
