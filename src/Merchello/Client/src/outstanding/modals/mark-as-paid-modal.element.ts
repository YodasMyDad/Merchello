import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { MarkAsPaidModalData, MarkAsPaidModalValue } from "./mark-as-paid-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import { getCurrencyCode } from "@api/store-settings.js";

interface UuiSelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

@customElement("merchello-mark-as-paid-modal")
export class MerchelloMarkAsPaidModalElement extends UmbModalBaseElement<
  MarkAsPaidModalData,
  MarkAsPaidModalValue
> {
  @state() private _paymentMethod: string = "";
  @state() private _reference: string = "";
  @state() private _dateReceived: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _isLoadingOptions: boolean = true;
  @state() private _error: string | null = null;
  @state() private _paymentMethodOptions: UuiSelectOption[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    // Default date to today
    this._dateReceived = new Date().toISOString().split("T")[0];
    // Load payment method options from API
    this._loadPaymentMethodOptions();
  }

  private async _loadPaymentMethodOptions(): Promise<void> {
    this._isLoadingOptions = true;

    const { data, error } = await MerchelloApi.getManualPaymentFormFields();

    if (error || !data) {
      // Fallback to default options if API fails
      this._paymentMethodOptions = [
        { name: "Cash", value: "cash" },
        { name: "Check", value: "check" },
        { name: "Bank Transfer", value: "bank_transfer", selected: true },
        { name: "Other", value: "other" },
      ];
      this._paymentMethod = "bank_transfer";
      this._isLoadingOptions = false;
      return;
    }

    // Find the payment method field
    const paymentMethodField = data.find(f => f.key === "paymentMethod");
    if (paymentMethodField?.options?.length) {
      this._paymentMethodOptions = paymentMethodField.options.map((opt, index) => ({
        name: opt.label,
        value: opt.value,
        selected: index === 0, // Select first option by default
      }));
      this._paymentMethod = paymentMethodField.options[0].value;
    } else {
      // Fallback if no options
      this._paymentMethodOptions = [
        { name: "Cash", value: "cash" },
        { name: "Check", value: "check" },
        { name: "Bank Transfer", value: "bank_transfer", selected: true },
        { name: "Other", value: "other" },
      ];
      this._paymentMethod = "bank_transfer";
    }

    this._isLoadingOptions = false;
  }

  private get _totalAmount(): number {
    return (
      this.data?.invoices.reduce((sum, inv) => sum + (inv.balanceDue ?? inv.total), 0) ?? 0
    );
  }

  private async _handleConfirm(): Promise<void> {
    if (!this.data?.invoices.length) return;

    this._isSaving = true;
    this._error = null;

    const { data, error } = await MerchelloApi.batchMarkAsPaid({
      invoiceIds: this.data.invoices.map((i) => i.id),
      paymentMethod: this._paymentMethod,
      reference: this._reference || null,
      dateReceived: this._dateReceived || null,
    });

    this._isSaving = false;

    if (error) {
      this._error = error.message;
      return;
    }

    this.value = {
      successCount: data?.successCount ?? 0,
      changed: true,
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const invoices = this.data?.invoices ?? [];
    const currencyCode = this.data?.currencyCode ?? getCurrencyCode();

    return html`
      <umb-body-layout headline="Mark as Paid">
        <div id="main">
          ${this._error
            ? html`<div class="error-banner">${this._error}</div>`
            : nothing}

          <div class="summary-section">
            <p>You are marking <strong>${invoices.length}</strong> invoice${invoices.length === 1 ? "" : "s"} as paid.</p>
          </div>

          <div class="invoices-list">
            ${invoices.map(
              (inv) => html`
                <div class="invoice-row ${inv.isOverdue ? "overdue" : ""}">
                  <div class="invoice-info">
                    <span class="invoice-number">${inv.invoiceNumber}</span>
                    <span class="customer-name">${inv.customerName}</span>
                  </div>
                  <div class="invoice-amount">
                    ${formatCurrency(inv.balanceDue ?? inv.total, currencyCode)}
                    ${inv.isOverdue ? html`<span class="overdue-badge">Overdue</span>` : nothing}
                  </div>
                </div>
              `
            )}
          </div>

          <div class="total-row">
            <span>Total:</span>
            <strong>${formatCurrency(this._totalAmount, currencyCode)}</strong>
          </div>

          <div class="form-section">
            <h4>Payment Details</h4>

            <div class="form-row">
              <label for="payment-method">Method</label>
              <uui-select
                id="payment-method"
                .options=${this._paymentMethodOptions}
                ?disabled=${this._isLoadingOptions}
                @change=${(e: Event) => this._paymentMethod = (e.target as HTMLSelectElement).value}
                label="Payment method">
              </uui-select>
            </div>

            <div class="form-row">
              <label for="reference">Reference</label>
              <uui-input
                id="reference"
                .value=${this._reference}
                @input=${(e: Event) => this._reference = (e.target as HTMLInputElement).value}
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
                @input=${(e: Event) => this._dateReceived = (e.target as HTMLInputElement).value}
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
            ?disabled=${this._isSaving || invoices.length === 0}
            @click=${this._handleConfirm}>
            ${this._isSaving ? "Processing..." : "Mark as Paid"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
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
}

export default MerchelloMarkAsPaidModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-mark-as-paid-modal": MerchelloMarkAsPaidModalElement;
  }
}
