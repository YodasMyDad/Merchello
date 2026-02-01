import { nothing as c, html as l, css as h, state as r, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-BM4-Q40x.js";
import { a as y } from "./formatting-YtMaawx1.js";
var _ = Object.defineProperty, g = Object.getOwnPropertyDescriptor, o = (t, a, s, e) => {
  for (var n = e > 1 ? void 0 : e ? g(a, s) : a, u = t.length - 1, d; u >= 0; u--)
    (d = t[u]) && (n = (e ? d(a, s, n) : d(n)) || n);
  return e && n && _(a, s, n), n;
};
let i = class extends v {
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
    const s = t.find((e) => e.key === "paymentMethod");
    s?.options?.length ? (this._paymentMethodOptions = s.options.map((e, n) => ({
      name: e.label,
      value: e.value,
      selected: n === 0
      // Select first option by default
    })), this._paymentMethod = s.options[0].value) : (this._paymentMethodOptions = [
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
    const t = this.data?.balanceDue ?? 0, a = this.data?.currencyCode, s = this.data?.currencySymbol;
    return l`
      <umb-body-layout headline="Record Manual Payment">
        <div id="main">
          ${this._errorMessage ? l`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : c}

          <div class="balance-info">
            <span>Balance Due:</span>
            <strong>${y(t, a, s)}</strong>
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
            ${this._amount > t ? l`<small class="warning">Amount exceeds balance due</small>` : c}
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
            ${this._isSaving ? l`<uui-loader-circle></uui-loader-circle>` : c}
            Record Payment
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = h`
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
o([
  r()
], i.prototype, "_amount", 2);
o([
  r()
], i.prototype, "_paymentMethod", 2);
o([
  r()
], i.prototype, "_description", 2);
o([
  r()
], i.prototype, "_isSaving", 2);
o([
  r()
], i.prototype, "_isLoadingOptions", 2);
o([
  r()
], i.prototype, "_errorMessage", 2);
o([
  r()
], i.prototype, "_paymentMethodOptions", 2);
i = o([
  p("merchello-manual-payment-modal")
], i);
const C = i;
export {
  i as MerchelloManualPaymentModalElement,
  C as default
};
//# sourceMappingURL=manual-payment-modal.element-7BU4BBye.js.map
