import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CancelInvoiceModalData, CancelInvoiceModalValue } from "@orders/modals/cancel-invoice-modal.token.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-cancel-invoice-modal")
export class MerchelloCancelInvoiceModalElement extends UmbModalBaseElement<
  CancelInvoiceModalData,
  CancelInvoiceModalValue
> {
  @state() private _reason: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errorMessage: string | null = null;

  private async _handleConfirm(): Promise<void> {
    const invoiceId = this.data?.invoiceId;
    if (!invoiceId) return;

    if (!this._reason.trim()) {
      this._errorMessage = "Cancellation reason is required";
      return;
    }

    this._isSaving = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.cancelInvoice(invoiceId, this._reason);

    if (error) {
      this._errorMessage = error.message;
      this._isSaving = false;
      return;
    }

    if (data && !data.success) {
      this._errorMessage = data.errorMessage ?? "Failed to cancel invoice";
      this._isSaving = false;
      return;
    }

    this._isSaving = false;
    this.value = {
      cancelled: true,
      cancelledOrderCount: data?.cancelledOrderCount,
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const invoiceNumber = this.data?.invoiceNumber ?? "Invoice";

    return html`
      <umb-body-layout headline="Cancel Invoice">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

          <div class="warning-box">
            <uui-icon name="icon-alert"></uui-icon>
            <div>
              <strong>Are you sure you want to cancel ${invoiceNumber}?</strong>
              <p>This will:</p>
              <ul>
                <li>Mark the invoice as cancelled</li>
                <li>Cancel all unfulfilled orders</li>
                <li>Release reserved stock back to inventory</li>
              </ul>
              <p><strong>Note:</strong> Orders that are already shipped or completed will not be affected. Refunds must be processed separately.</p>
            </div>
          </div>

          <div class="form-field">
            <label for="reason">Reason for Cancellation *</label>
            <uui-textarea
              id="reason"
              label="Reason for cancellation"
              .value=${this._reason}
              placeholder="Enter the reason for cancelling this invoice..."
              required
              @input=${(e: Event) => {
                this._reason = (e.target as HTMLTextAreaElement).value;
              }}
            ></uui-textarea>
          </div>
        </div>

        <div slot="actions">
          <uui-button
            label="Keep Invoice"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Keep Invoice
          </uui-button>
          <uui-button
            label="Cancel Invoice"
            look="primary"
            color="danger"
            @click=${this._handleConfirm}
            ?disabled=${this._isSaving || !this._reason.trim()}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            Cancel Invoice
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
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

    .warning-box {
      display: flex;
      gap: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-5);
    }

    .warning-box uui-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-box p {
      margin: var(--uui-size-space-2) 0;
    }

    .warning-box ul {
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-5);
    }

    .warning-box li {
      margin: var(--uui-size-space-1) 0;
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    uui-textarea {
      width: 100%;
      min-height: 100px;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `,
  ];
}

export default MerchelloCancelInvoiceModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-cancel-invoice-modal": MerchelloCancelInvoiceModalElement;
  }
}

