import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatShortDate } from "@shared/utils/formatting.js";
import type { RefundModalData, RefundModalValue } from "./refund-modal.token.js";

@customElement("merchello-refund-modal")
export class MerchelloRefundModalElement extends UmbModalBaseElement<
  RefundModalData,
  RefundModalValue
> {
  @state() private _amount: number = 0;
  @state() private _reason: string = "";
  @state() private _isManualRefund: boolean = false;
  @state() private _isSaving: boolean = false;
  @state() private _errorMessage: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // Default to full refundable amount
    this._amount = this.data?.payment.refundableAmount ?? 0;

    // Default to manual refund if the payment was manual
    this._isManualRefund = !this.data?.payment.paymentProviderAlias ||
                           this.data?.payment.paymentProviderAlias === "manual";
  }


  private async _handleSave(): Promise<void> {
    const payment = this.data?.payment;
    if (!payment) return;

    // UX validation only - business rules (amount <= refundable) are validated by backend
    if (!this._reason.trim()) {
      this._errorMessage = "Refund reason is required";
      return;
    }

    if (this._amount <= 0) {
      this._errorMessage = "Please enter a refund amount";
      return;
    }

    // Note: Backend validates that amount doesn't exceed refundable amount
    // and will return appropriate error message if exceeded

    this._isSaving = true;
    this._errorMessage = null;

    const { error } = await MerchelloApi.processRefund(payment.id, {
      amount: this._amount,
      reason: this._reason,
      isManualRefund: this._isManualRefund,
    });

    if (error) {
      this._errorMessage = error.message;
      this._isSaving = false;
      return;
    }

    this._isSaving = false;
    this.value = { refunded: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const payment = this.data?.payment;
    if (!payment) return nothing;

    const hasProvider = payment.paymentProviderAlias && payment.paymentProviderAlias !== "manual";

    return html`
      <umb-body-layout headline="Process Refund">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

          <!-- Original Payment Info -->
          <div class="payment-info">
            <h3>Original Payment</h3>
            <div class="info-row">
              <span>Amount:</span>
              <strong>${formatCurrency(payment.amount, payment.currencyCode, payment.currencySymbol)}</strong>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${formatShortDate(payment.dateCreated)}</span>
            </div>
            <div class="info-row">
              <span>Method:</span>
              <span>${payment.paymentMethod ?? "N/A"}</span>
            </div>
            ${payment.paymentProviderAlias
              ? html`
                  <div class="info-row">
                    <span>Provider:</span>
                    <span>${payment.paymentProviderAlias}</span>
                  </div>
                `
              : nothing}
            ${payment.transactionId
              ? html`
                  <div class="info-row">
                    <span>Transaction ID:</span>
                    <span class="mono">${payment.transactionId}</span>
                  </div>
                `
              : nothing}
            <div class="info-row highlight">
              <span>Refundable Amount:</span>
              <strong>${formatCurrency(payment.refundableAmount, payment.currencyCode, payment.currencySymbol)}</strong>
            </div>
          </div>

          <!-- Refund Form -->
          <div class="form-field">
            <label for="amount">Refund Amount *</label>
            <uui-input
              id="amount"
              type="number"
              min="0.01"
              max="${payment.refundableAmount}"
              step="0.01"
              .value=${String(this._amount)}
              required
              @input=${(e: Event) => {
                this._amount = parseFloat((e.target as HTMLInputElement).value) || 0;
              }}
            ></uui-input>
            <div class="amount-buttons">
              <uui-button
                look="secondary"
                label="Full Refund"
                compact
                @click=${() => (this._amount = payment.refundableAmount)}
              >
                Full Refund
              </uui-button>
              <uui-button
                look="secondary"
                label="50%"
                compact
                @click=${() => (this._amount = payment.refundableAmount * 0.5)}
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
              @input=${(e: Event) => {
                this._reason = (e.target as HTMLTextAreaElement).value;
              }}
            ></uui-textarea>
          </div>

          ${hasProvider
            ? html`
                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isManualRefund"
                    ?checked=${this._isManualRefund}
                    @change=${(e: Event) => {
                      this._isManualRefund = (e.target as HTMLInputElement).checked;
                    }}
                  >
                    Manual refund (already processed externally)
                  </uui-checkbox>
                  <p class="field-description">
                    Check this if you have already processed the refund through ${payment.paymentProviderAlias}
                    and just need to record it here.
                  </p>
                </div>
              `
            : nothing}
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
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            Process Refund
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
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
}

export default MerchelloRefundModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-refund-modal": MerchelloRefundModalElement;
  }
}
