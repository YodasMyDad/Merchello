import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import type {
  ManualPaymentModalData,
  ManualPaymentModalValue,
} from "./manual-payment-modal.token.js";

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Check", label: "Check" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Credit Card (Manual)", label: "Credit Card (Manual)" },
  { value: "PayPal (Manual)", label: "PayPal (Manual)" },
  { value: "Other", label: "Other" },
];

@customElement("merchello-manual-payment-modal")
export class MerchelloManualPaymentModalElement extends UmbModalBaseElement<
  ManualPaymentModalData,
  ManualPaymentModalValue
> {
  @state() private _amount: number = 0;
  @state() private _paymentMethod: string = "Cash";
  @state() private _description: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errorMessage: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // Default amount to balance due
    this._amount = this.data?.balanceDue ?? 0;
  }

  private async _handleSave(): Promise<void> {
    const invoiceId = this.data?.invoiceId;
    if (!invoiceId) return;

    // Validate
    if (this._amount <= 0) {
      this._errorMessage = "Amount must be greater than zero";
      return;
    }

    if (!this._paymentMethod) {
      this._errorMessage = "Payment method is required";
      return;
    }

    this._isSaving = true;
    this._errorMessage = null;

    const { error } = await MerchelloApi.recordManualPayment(invoiceId, {
      amount: this._amount,
      paymentMethod: this._paymentMethod,
      description: this._description || undefined,
    });

    if (error) {
      this._errorMessage = error.message;
      this._isSaving = false;
      return;
    }

    this._isSaving = false;
    this.value = { recorded: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  render() {
    const balanceDue = this.data?.balanceDue ?? 0;

    return html`
      <umb-body-layout headline="Record Manual Payment">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

          <div class="balance-info">
            <span>Balance Due:</span>
            <strong>${formatCurrency(balanceDue)}</strong>
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
              @input=${(e: Event) => {
                this._amount = parseFloat((e.target as HTMLInputElement).value) || 0;
              }}
            ></uui-input>
            ${this._amount > balanceDue
              ? html`<small class="warning">Amount exceeds balance due</small>`
              : nothing}
          </div>

          <div class="form-field">
            <label for="paymentMethod">Payment Method *</label>
            <uui-select
              id="paymentMethod"
              .value=${this._paymentMethod}
              required
              @change=${(e: Event) => {
                this._paymentMethod = (e.target as HTMLSelectElement).value;
              }}
            >
              ${PAYMENT_METHODS.map(
                (method) => html`
                  <option
                    value="${method.value}"
                    ?selected=${this._paymentMethod === method.value}
                  >
                    ${method.label}
                  </option>
                `
              )}
            </uui-select>
          </div>

          <div class="form-field">
            <label for="description">Description (Optional)</label>
            <uui-textarea
              id="description"
              .value=${this._description}
              placeholder="Add any notes about this payment..."
              @input=${(e: Event) => {
                this._description = (e.target as HTMLTextAreaElement).value;
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
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            Record Payment
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
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
}

export default MerchelloManualPaymentModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-manual-payment-modal": MerchelloManualPaymentModalElement;
  }
}
