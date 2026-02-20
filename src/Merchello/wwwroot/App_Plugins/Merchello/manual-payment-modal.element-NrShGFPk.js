import { nothing as c, html as u, css as h, state as r, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-B76CV0sD.js";
import { a as p } from "./formatting-MfE1tvkN.js";
import { m as y } from "./modal-layout.styles-C2OaUji5.js";
var _ = Object.defineProperty, f = Object.getOwnPropertyDescriptor, s = (t, a, n, e) => {
  for (var o = e > 1 ? void 0 : e ? f(a, n) : a, l = t.length - 1, d; l >= 0; l--)
    (d = t[l]) && (o = (e ? d(a, n, o) : d(o)) || o);
  return e && o && _(a, n, o), o;
};
let i = class extends g {
  constructor() {
    super(...arguments), this._amount = 0, this._paymentMethod = "", this._description = "", this._isSaving = !1, this._isLoadingOptions = !0, this._errorMessage = null, this._paymentMethodOptions = [];
  }
  connectedCallback() {
    super.connectedCallback(), this._amount = this.data?.balanceDue ?? 0, this._loadPaymentMethodOptions();
  }
  async _loadPaymentMethodOptions() {
    this._isLoadingOptions = !0;
    const { data: t, error: a } = await m.getManualPaymentFormFields();
    if (a || !t) {
      this._paymentMethodOptions = [
        { name: "Cash", value: "cash", selected: !0 },
        { name: "Check", value: "check" },
        { name: "Bank Transfer", value: "bank_transfer" },
        { name: "Other", value: "other" }
      ], this._paymentMethod = "cash", this._isLoadingOptions = !1;
      return;
    }
    const n = t.find((e) => e.key === "paymentMethod");
    n?.options?.length ? (this._paymentMethodOptions = n.options.map((e, o) => ({
      name: e.label,
      value: e.value,
      selected: o === 0
      // Select first option by default
    })), this._paymentMethod = n.options[0].value) : (this._paymentMethodOptions = [
      { name: "Cash", value: "cash", selected: !0 },
      { name: "Check", value: "check" },
      { name: "Bank Transfer", value: "bank_transfer" },
      { name: "Other", value: "other" }
    ], this._paymentMethod = "cash"), this._isLoadingOptions = !1;
  }
  async _handleSave() {
    const t = this.data?.invoiceId;
    if (!t) return;
    if (this._amount <= 0) {
      this._errorMessage = "Amount must be greater than zero";
      return;
    }
    if (!this._paymentMethod) {
      this._errorMessage = "Payment method is required";
      return;
    }
    this._isSaving = !0, this._errorMessage = null;
    const { error: a } = await m.recordManualPayment(t, {
      amount: this._amount,
      paymentMethod: this._paymentMethod,
      description: this._description || void 0
    });
    if (a) {
      this._errorMessage = a.message, this._isSaving = !1;
      return;
    }
    this._isSaving = !1, this.value = { recorded: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const t = this.data?.balanceDue ?? 0, a = this.data?.currencyCode, n = this.data?.currencySymbol;
    return u`
      <umb-body-layout headline="Record Manual Payment">
        <div id="main">
          ${this._errorMessage ? u`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : c}

          <div class="balance-info">
            <span>Balance Due:</span>
            <strong>${p(t, a, n)}</strong>
          </div>

          <div class="form-field">
            <label for="amount">Amount *</label>
            <uui-input
              id="amount"
              type="number"
              min="0.01"
              max="${t}"
              step="0.01"
              .value=${String(this._amount)}
              required
              @input=${(e) => {
      this._amount = parseFloat(e.target.value) || 0;
    }}
            ></uui-input>
            ${this._amount > t ? u`
                  <div class="amount-warning" role="status" aria-live="polite">
                    <uui-icon name="icon-alert"></uui-icon>
                    <div class="amount-warning-content">
                      <strong>Amount exceeds balance due.</strong>
                      <p>Enter an amount up to ${p(t, a, n)}.</p>
                    </div>
                  </div>
                ` : c}
          </div>

          <div class="form-field">
            <label for="paymentMethod">Payment Method *</label>
            <uui-select
              id="paymentMethod"
              .options=${this._paymentMethodOptions}
              ?disabled=${this._isLoadingOptions}
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
              label="Description"
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
            ${this._isSaving ? u`<uui-loader-circle></uui-loader-circle>` : c}
            Record Payment
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = [
  y,
  h`
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

    .amount-warning {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
    }

    .amount-warning uui-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .amount-warning-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .amount-warning-content strong {
      font-size: 0.875rem;
      line-height: 1.3;
    }

    .amount-warning-content p {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.4;
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
  `
];
s([
  r()
], i.prototype, "_amount", 2);
s([
  r()
], i.prototype, "_paymentMethod", 2);
s([
  r()
], i.prototype, "_description", 2);
s([
  r()
], i.prototype, "_isSaving", 2);
s([
  r()
], i.prototype, "_isLoadingOptions", 2);
s([
  r()
], i.prototype, "_errorMessage", 2);
s([
  r()
], i.prototype, "_paymentMethodOptions", 2);
i = s([
  v("merchello-manual-payment-modal")
], i);
const k = i;
export {
  i as MerchelloManualPaymentModalElement,
  k as default
};
//# sourceMappingURL=manual-payment-modal.element-NrShGFPk.js.map
