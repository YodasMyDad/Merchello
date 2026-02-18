import { nothing as c, html as u, css as v, state as n, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-Dp_zU_yi.js";
import { a as m } from "./formatting-B_f6AiQh.js";
import { a as b } from "./store-settings-CHgA9WE7.js";
var y = Object.defineProperty, _ = Object.getOwnPropertyDescriptor, s = (i, a, e, t) => {
  for (var o = t > 1 ? void 0 : t ? _(a, e) : a, l = i.length - 1, d; l >= 0; l--)
    (d = i[l]) && (o = (t ? d(a, e, o) : d(o)) || o);
  return t && o && y(a, e, o), o;
};
const h = "MerchelloMarkAsPaidForm";
let r = class extends g {
  constructor() {
    super(...arguments), this._paymentMethod = "", this._reference = "", this._dateReceived = "", this._isSaving = !1, this._isLoadingOptions = !0, this._error = null, this._paymentMethodOptions = [];
  }
  connectedCallback() {
    super.connectedCallback(), this._dateReceived = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], this._loadPaymentMethodOptions();
  }
  async _loadPaymentMethodOptions() {
    this._isLoadingOptions = !0;
    const { data: i, error: a } = await p.getManualPaymentFormFields();
    if (a || !i) {
      this._paymentMethodOptions = [
        { name: "Cash", value: "cash" },
        { name: "Check", value: "check" },
        { name: "Bank Transfer", value: "bank_transfer", selected: !0 },
        { name: "Other", value: "other" }
      ], this._paymentMethod = "bank_transfer", this._isLoadingOptions = !1;
      return;
    }
    const e = i.find((t) => t.key === "paymentMethod");
    if (!e?.options?.length) {
      this._paymentMethodOptions = [
        { name: "Cash", value: "cash" },
        { name: "Check", value: "check" },
        { name: "Bank Transfer", value: "bank_transfer", selected: !0 },
        { name: "Other", value: "other" }
      ], this._paymentMethod = "bank_transfer", this._isLoadingOptions = !1;
      return;
    }
    this._paymentMethodOptions = e.options.map((t, o) => ({
      name: t.label,
      value: t.value,
      selected: o === 0
    })), this._paymentMethod = e.options[0].value, this._isLoadingOptions = !1;
  }
  get _totalAmount() {
    return this.data?.totalBalanceDue ?? 0;
  }
  _parseApiErrorMessage(i) {
    try {
      const a = JSON.parse(i);
      if (Array.isArray(a.messages) && a.messages.length > 0)
        return a.messages[0];
    } catch {
    }
    return i;
  }
  async _handleConfirm() {
    if (!this.data?.invoices.length) return;
    if (!this._paymentMethod.trim()) {
      this._error = "Payment method is required.";
      return;
    }
    this._isSaving = !0, this._error = null;
    const { data: i, error: a } = await p.batchMarkAsPaid({
      invoiceIds: this.data.invoices.map((t) => t.id),
      paymentMethod: this._paymentMethod,
      reference: this._reference || null,
      dateReceived: this._dateReceived || null
    });
    if (this._isSaving = !1, a) {
      this._error = this._parseApiErrorMessage(a.message);
      return;
    }
    const e = i?.successCount ?? 0;
    if (e <= 0) {
      this._error = i?.messages?.[0] ?? "No invoices were marked as paid.";
      return;
    }
    this.value = {
      successCount: e,
      changed: !0
    }, this.modalContext?.submit();
  }
  async _handleSubmit(i) {
    i.preventDefault();
    const a = i.currentTarget;
    if (!a.checkValidity()) {
      a.reportValidity();
      return;
    }
    await this._handleConfirm();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const i = this.data?.invoices ?? [], a = this.data?.currencyCode ?? b();
    return u`
      <umb-body-layout headline="Mark as paid">
        <div id="main">
          ${this._error ? u`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._error}</span>
                </div>
              ` : c}

          <uui-box>
            <div class="summary-section">
              <p>
                You are marking <strong>${i.length}</strong> invoice${i.length === 1 ? "" : "s"}
                as paid.
              </p>
            </div>

            <div class="invoices-list">
              ${i.map(
      (e) => u`
                  <div class="invoice-row ${e.isOverdue ? "overdue" : ""}">
                    <div class="invoice-info">
                      <span class="invoice-number">${e.invoiceNumber}</span>
                      <span class="customer-name">${e.customerName}</span>
                    </div>
                    <div class="invoice-amount">
                      ${m(e.balanceDue ?? e.total, a)}
                      ${e.isOverdue ? u`<span class="overdue-badge">Overdue</span>` : c}
                    </div>
                  </div>
                `
    )}
            </div>

            <div class="total-row">
              <span>Total</span>
              <strong>${m(this._totalAmount, a)}</strong>
            </div>
          </uui-box>

          <uui-box>
            <uui-form>
              <form id=${h} @submit=${this._handleSubmit}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="payment-method" required>Method</uui-label>
                  <uui-select
                    id="payment-method"
                    name="payment-method"
                    label="Payment method"
                    .options=${this._paymentMethodOptions}
                    ?disabled=${this._isLoadingOptions}
                    required
                    @change=${(e) => {
      this._paymentMethod = e.target.value;
    }}
                  ></uui-select>
                  <div slot="description">Used for each payment record created for this batch.</div>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="reference">Reference</uui-label>
                  <uui-input
                    id="reference"
                    name="reference"
                    label="Payment reference"
                    .value=${this._reference}
                    placeholder="e.g., BAC-2026-01-07"
                    @input=${(e) => {
      this._reference = e.target.value;
    }}
                  ></uui-input>
                  <div slot="description">Optional memo shown in payment details.</div>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="date-received" required>Date received</uui-label>
                  <uui-input
                    id="date-received"
                    name="date-received"
                    type="date"
                    label="Date payment received"
                    .value=${this._dateReceived}
                    required
                    @input=${(e) => {
      this._dateReceived = e.target.value;
    }}
                  ></uui-input>
                </uui-form-layout-item>
              </form>
            </uui-form>
          </uui-box>

          <div class="info-note">
            <uui-icon name="icon-info"></uui-icon>
            <span>Each invoice receives a payment record matching its outstanding balance.</span>
          </div>
        </div>

        <uui-button
          slot="actions"
          label="Cancel"
          look="secondary"
          ?disabled=${this._isSaving}
          @click=${this._handleCancel}
        >
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label="Mark as paid"
          look="primary"
          color="positive"
          form=${h}
          type="submit"
          ?disabled=${this._isSaving || i.length === 0 || this._isLoadingOptions}
        >
          ${this._isSaving ? "Processing..." : "Mark as paid"}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
r.styles = v`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .summary-section {
      margin-bottom: var(--uui-size-space-3);
      font-size: 0.9375rem;
    }

    .summary-section p {
      margin: 0;
    }

    .invoices-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      max-height: 250px;
      overflow-y: auto;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .invoice-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      gap: var(--uui-size-space-3);
    }

    .invoice-row.overdue {
      background: color-mix(in srgb, var(--uui-color-danger) 10%, transparent);
    }

    .invoice-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .invoice-number {
      font-weight: 600;
      font-size: 0.875rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .customer-name {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .invoice-amount {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
      flex-shrink: 0;
    }

    .overdue-badge {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 1rem;
    }

    uui-input,
    uui-select {
      width: 100%;
    }

    .info-note {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .info-note uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-current);
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

    .error-banner span {
      flex: 1;
    }

    @media (max-width: 600px) {
      .invoice-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .invoice-amount {
        align-self: flex-end;
      }
    }
  `;
s([
  n()
], r.prototype, "_paymentMethod", 2);
s([
  n()
], r.prototype, "_reference", 2);
s([
  n()
], r.prototype, "_dateReceived", 2);
s([
  n()
], r.prototype, "_isSaving", 2);
s([
  n()
], r.prototype, "_isLoadingOptions", 2);
s([
  n()
], r.prototype, "_error", 2);
s([
  n()
], r.prototype, "_paymentMethodOptions", 2);
r = s([
  f("merchello-mark-as-paid-modal")
], r);
const $ = r;
export {
  r as MerchelloMarkAsPaidModalElement,
  $ as default
};
//# sourceMappingURL=mark-as-paid-modal.element-CeSiv0_M.js.map
