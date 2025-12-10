import { nothing as c, html as o, css as m, state as s, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-gshzVGsw.js";
import { a as b } from "./formatting-DJ1nSxNW.js";
var g = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, r = (a, e, l, n) => {
  for (var i = n > 1 ? void 0 : n ? _(e, l) : e, u = a.length - 1, d; u >= 0; u--)
    (d = a[u]) && (i = (n ? d(e, l, i) : d(i)) || i);
  return n && i && g(e, l, i), i;
};
const f = [
  { value: "Cash", label: "Cash" },
  { value: "Check", label: "Check" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Credit Card (Manual)", label: "Credit Card (Manual)" },
  { value: "PayPal (Manual)", label: "PayPal (Manual)" },
  { value: "Other", label: "Other" }
];
let t = class extends h {
  constructor() {
    super(...arguments), this._amount = 0, this._paymentMethod = "Cash", this._description = "", this._isSaving = !1, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._amount = this.data?.balanceDue ?? 0;
  }
  async _handleSave() {
    const a = this.data?.invoiceId;
    if (!a) return;
    if (this._amount <= 0) {
      this._errorMessage = "Amount must be greater than zero";
      return;
    }
    if (!this._paymentMethod) {
      this._errorMessage = "Payment method is required";
      return;
    }
    this._isSaving = !0, this._errorMessage = null;
    const { error: e } = await v.recordManualPayment(a, {
      amount: this._amount,
      paymentMethod: this._paymentMethod,
      description: this._description || void 0
    });
    if (e) {
      this._errorMessage = e.message, this._isSaving = !1;
      return;
    }
    this._isSaving = !1, this.value = { recorded: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getPaymentMethodOptions() {
    return f.map((a) => ({
      name: a.label,
      value: a.value,
      selected: this._paymentMethod === a.value
    }));
  }
  render() {
    const a = this.data?.balanceDue ?? 0;
    return o`
      <umb-body-layout headline="Record Manual Payment">
        <div id="main">
          ${this._errorMessage ? o`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : c}

          <div class="balance-info">
            <span>Balance Due:</span>
            <strong>${b(a)}</strong>
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
              @input=${(e) => {
      this._amount = parseFloat(e.target.value) || 0;
    }}
            ></uui-input>
            ${this._amount > a ? o`<small class="warning">Amount exceeds balance due</small>` : c}
          </div>

          <div class="form-field">
            <label for="paymentMethod">Payment Method *</label>
            <uui-select
              id="paymentMethod"
              .options=${this._getPaymentMethodOptions()}
              required
              @change=${(e) => {
      this._paymentMethod = e.target.value;
    }}
            ></uui-select>
          </div>

          <div class="form-field">
            <label for="description">Description (Optional)</label>
            <uui-textarea
              id="description"
              .value=${this._description}
              placeholder="Add any notes about this payment..."
              @input=${(e) => {
      this._description = e.target.value;
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
            ${this._isSaving ? o`<uui-loader-circle></uui-loader-circle>` : c}
            Record Payment
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
t.styles = m`
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
r([
  s()
], t.prototype, "_amount", 2);
r([
  s()
], t.prototype, "_paymentMethod", 2);
r([
  s()
], t.prototype, "_description", 2);
r([
  s()
], t.prototype, "_isSaving", 2);
r([
  s()
], t.prototype, "_errorMessage", 2);
t = r([
  p("merchello-manual-payment-modal")
], t);
const $ = t;
export {
  t as MerchelloManualPaymentModalElement,
  $ as default
};
//# sourceMappingURL=manual-payment-modal.element-5SF9j3Ic.js.map
