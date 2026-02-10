import { nothing as c, html as l, css as v, state as n, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-BuImeZL2.js";
import { a as m } from "./formatting-DGOWmvpU.js";
import { a as g } from "./store-settings-ovrk2IWq.js";
var b = Object.defineProperty, y = Object.getOwnPropertyDescriptor, s = (a, i, e, r) => {
  for (var o = r > 1 ? void 0 : r ? y(i, e) : i, d = a.length - 1, u; d >= 0; d--)
    (u = a[d]) && (o = (r ? u(i, e, o) : u(o)) || o);
  return r && o && b(i, e, o), o;
};
let t = class extends f {
  constructor() {
    super(...arguments), this._paymentMethod = "", this._reference = "", this._dateReceived = "", this._isSaving = !1, this._isLoadingOptions = !0, this._error = null, this._paymentMethodOptions = [];
  }
  connectedCallback() {
    super.connectedCallback(), this._dateReceived = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], this._loadPaymentMethodOptions();
  }
  async _loadPaymentMethodOptions() {
    this._isLoadingOptions = !0;
    const { data: a, error: i } = await p.getManualPaymentFormFields();
    if (i || !a) {
      this._paymentMethodOptions = [
        { name: "Cash", value: "cash" },
        { name: "Check", value: "check" },
        { name: "Bank Transfer", value: "bank_transfer", selected: !0 },
        { name: "Other", value: "other" }
      ], this._paymentMethod = "bank_transfer", this._isLoadingOptions = !1;
      return;
    }
    const e = a.find((r) => r.key === "paymentMethod");
    e?.options?.length ? (this._paymentMethodOptions = e.options.map((r, o) => ({
      name: r.label,
      value: r.value,
      selected: o === 0
      // Select first option by default
    })), this._paymentMethod = e.options[0].value) : (this._paymentMethodOptions = [
      { name: "Cash", value: "cash" },
      { name: "Check", value: "check" },
      { name: "Bank Transfer", value: "bank_transfer", selected: !0 },
      { name: "Other", value: "other" }
    ], this._paymentMethod = "bank_transfer"), this._isLoadingOptions = !1;
  }
  get _totalAmount() {
    return this.data?.totalBalanceDue ?? 0;
  }
  async _handleConfirm() {
    if (!this.data?.invoices.length) return;
    this._isSaving = !0, this._error = null;
    const { data: a, error: i } = await p.batchMarkAsPaid({
      invoiceIds: this.data.invoices.map((e) => e.id),
      paymentMethod: this._paymentMethod,
      reference: this._reference || null,
      dateReceived: this._dateReceived || null
    });
    if (this._isSaving = !1, i) {
      this._error = i.message;
      return;
    }
    this.value = {
      successCount: a?.successCount ?? 0,
      changed: !0
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const a = this.data?.invoices ?? [], i = this.data?.currencyCode ?? g();
    return l`
      <umb-body-layout headline="Mark as Paid">
        <div id="main">
          ${this._error ? l`<div class="error-banner">${this._error}</div>` : c}

          <div class="summary-section">
            <p>You are marking <strong>${a.length}</strong> invoice${a.length === 1 ? "" : "s"} as paid.</p>
          </div>

          <div class="invoices-list">
            ${a.map(
      (e) => l`
                <div class="invoice-row ${e.isOverdue ? "overdue" : ""}">
                  <div class="invoice-info">
                    <span class="invoice-number">${e.invoiceNumber}</span>
                    <span class="customer-name">${e.customerName}</span>
                  </div>
                  <div class="invoice-amount">
                    ${m(e.balanceDue ?? e.total, i)}
                    ${e.isOverdue ? l`<span class="overdue-badge">Overdue</span>` : c}
                  </div>
                </div>
              `
    )}
          </div>

          <div class="total-row">
            <span>Total:</span>
            <strong>${m(this._totalAmount, i)}</strong>
          </div>

          <div class="form-section">
            <h4>Payment Details</h4>

            <div class="form-row">
              <label for="payment-method">Method</label>
              <uui-select
                id="payment-method"
                .options=${this._paymentMethodOptions}
                ?disabled=${this._isLoadingOptions}
                @change=${(e) => this._paymentMethod = e.target.value}
                label="Payment method">
              </uui-select>
            </div>

            <div class="form-row">
              <label for="reference">Reference</label>
              <uui-input
                id="reference"
                .value=${this._reference}
                @input=${(e) => this._reference = e.target.value}
                placeholder="e.g., BAC-2026-01-07"
                label="Payment reference">
              </uui-input>
            </div>

            <div class="form-row">
              <label for="date-received">Date Received</label>
              <uui-input
                id="date-received"
                type="date"
                .value=${this._dateReceived}
                @input=${(e) => this._dateReceived = e.target.value}
                label="Date payment received">
              </uui-input>
            </div>
          </div>

          <div class="info-note">
            <uui-icon name="icon-info"></uui-icon>
            <span>Each invoice will receive its own payment record matching its outstanding balance.</span>
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Mark as Paid"
            look="primary"
            color="positive"
            ?disabled=${this._isSaving || a.length === 0}
            @click=${this._handleConfirm}>
            ${this._isSaving ? "Processing..." : "Mark as Paid"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
t.styles = v`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .summary-section {
      font-size: 0.9375rem;
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
    }

    .invoice-row.overdue {
      background: color-mix(in srgb, var(--uui-color-danger) 10%, transparent);
    }

    .invoice-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .invoice-number {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .customer-name {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .invoice-amount {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
    }

    .overdue-badge {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 1rem;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .form-section h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .form-row label {
      font-weight: 600;
      font-size: 0.8125rem;
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

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
s([
  n()
], t.prototype, "_paymentMethod", 2);
s([
  n()
], t.prototype, "_reference", 2);
s([
  n()
], t.prototype, "_dateReceived", 2);
s([
  n()
], t.prototype, "_isSaving", 2);
s([
  n()
], t.prototype, "_isLoadingOptions", 2);
s([
  n()
], t.prototype, "_error", 2);
s([
  n()
], t.prototype, "_paymentMethodOptions", 2);
t = s([
  h("merchello-mark-as-paid-modal")
], t);
const O = t;
export {
  t as MerchelloMarkAsPaidModalElement,
  O as default
};
//# sourceMappingURL=mark-as-paid-modal.element-BsVseu0Q.js.map
