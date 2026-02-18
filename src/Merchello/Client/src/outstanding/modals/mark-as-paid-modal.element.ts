import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { MarkAsPaidModalData, MarkAsPaidModalValue } from "@outstanding/modals/mark-as-paid-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import { getCurrencyCode } from "@api/store-settings.js";

interface UuiSelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

const MARK_AS_PAID_FORM_ID = "MerchelloMarkAsPaidForm";

@customElement("merchello-mark-as-paid-modal")
export class MerchelloMarkAsPaidModalElement extends UmbModalBaseElement<
  MarkAsPaidModalData,
  MarkAsPaidModalValue
> {
  @state() private _paymentMethod = "";
  @state() private _reference = "";
  @state() private _dateReceived = "";
  @state() private _isSaving = false;
  @state() private _isLoadingOptions = true;
  @state() private _error: string | null = null;
  @state() private _paymentMethodOptions: UuiSelectOption[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this._dateReceived = new Date().toISOString().split("T")[0];
    this._loadPaymentMethodOptions();
  }

  private async _loadPaymentMethodOptions(): Promise<void> {
    this._isLoadingOptions = true;

    const { data, error } = await MerchelloApi.getManualPaymentFormFields();

    if (error || !data) {
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

    const paymentMethodField = data.find((field) => field.key === "paymentMethod");

    if (!paymentMethodField?.options?.length) {
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

    this._paymentMethodOptions = paymentMethodField.options.map((option, index) => ({
      name: option.label,
      value: option.value,
      selected: index === 0,
    }));
    this._paymentMethod = paymentMethodField.options[0].value;
    this._isLoadingOptions = false;
  }

  private get _totalAmount(): number {
    return this.data?.totalBalanceDue ?? 0;
  }

  private _parseApiErrorMessage(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as { messages?: string[] };
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return parsed.messages[0];
      }
    } catch {
      // Fall back to raw error message.
    }

    return raw;
  }

  private async _handleConfirm(): Promise<void> {
    if (!this.data?.invoices.length) return;

    if (!this._paymentMethod.trim()) {
      this._error = "Payment method is required.";
      return;
    }

    this._isSaving = true;
    this._error = null;

    const { data, error } = await MerchelloApi.batchMarkAsPaid({
      invoiceIds: this.data.invoices.map((invoice) => invoice.id),
      paymentMethod: this._paymentMethod,
      reference: this._reference || null,
      dateReceived: this._dateReceived || null,
    });

    this._isSaving = false;

    if (error) {
      this._error = this._parseApiErrorMessage(error.message);
      return;
    }

    const successCount = data?.successCount ?? 0;
    if (successCount <= 0) {
      this._error = data?.messages?.[0] ?? "No invoices were marked as paid.";
      return;
    }

    this.value = {
      successCount,
      changed: true,
    };
    this.modalContext?.submit();
  }

  private async _handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    await this._handleConfirm();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const invoices = this.data?.invoices ?? [];
    const currencyCode = this.data?.currencyCode ?? getCurrencyCode();

    return html`
      <umb-body-layout headline="Mark as paid">
        <div id="main">
          ${this._error
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._error}</span>
                </div>
              `
            : nothing}

          <uui-box>
            <div class="summary-section">
              <p>
                You are marking <strong>${invoices.length}</strong> invoice${invoices.length === 1 ? "" : "s"}
                as paid.
              </p>
            </div>

            <div class="invoices-list">
              ${invoices.map(
                (invoice) => html`
                  <div class="invoice-row ${invoice.isOverdue ? "overdue" : ""}">
                    <div class="invoice-info">
                      <span class="invoice-number">${invoice.invoiceNumber}</span>
                      <span class="customer-name">${invoice.customerName}</span>
                    </div>
                    <div class="invoice-amount">
                      ${formatCurrency(invoice.balanceDue ?? invoice.total, currencyCode)}
                      ${invoice.isOverdue ? html`<span class="overdue-badge">Overdue</span>` : nothing}
                    </div>
                  </div>
                `
              )}
            </div>

            <div class="total-row">
              <span>Total</span>
              <strong>${formatCurrency(this._totalAmount, currencyCode)}</strong>
            </div>
          </uui-box>

          <uui-box>
            <uui-form>
              <form id=${MARK_AS_PAID_FORM_ID} @submit=${this._handleSubmit}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="payment-method" required>Method</uui-label>
                  <uui-select
                    id="payment-method"
                    name="payment-method"
                    label="Payment method"
                    .options=${this._paymentMethodOptions}
                    ?disabled=${this._isLoadingOptions}
                    required
                    @change=${(e: Event) => {
                      this._paymentMethod = (e.target as HTMLSelectElement).value;
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
                    @input=${(e: Event) => {
                      this._reference = (e.target as HTMLInputElement).value;
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
                    @input=${(e: Event) => {
                      this._dateReceived = (e.target as HTMLInputElement).value;
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
          form=${MARK_AS_PAID_FORM_ID}
          type="submit"
          ?disabled=${this._isSaving || invoices.length === 0 || this._isLoadingOptions}
        >
          ${this._isSaving ? "Processing..." : "Mark as paid"}
        </uui-button>
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
}

export default MerchelloMarkAsPaidModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-mark-as-paid-modal": MerchelloMarkAsPaidModalElement;
  }
}
