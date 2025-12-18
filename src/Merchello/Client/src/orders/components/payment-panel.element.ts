import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatShortDate } from "@shared/utils/formatting.js";
import type { PaymentDto, PaymentStatusDto, PaymentRecordedDetail, RefundProcessedDetail } from "@orders/types/order.types.js";
import { PaymentType, InvoicePaymentStatus } from "@orders/types/order.types.js";
import { MERCHELLO_MANUAL_PAYMENT_MODAL } from "@orders/modals/manual-payment-modal.token.js";
import { MERCHELLO_REFUND_MODAL } from "@orders/modals/refund-modal.token.js";

@customElement("merchello-payment-panel")
export class MerchelloPaymentPanelElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) invoiceId: string = "";

  @state() private _payments: PaymentDto[] = [];
  @state() private _status: PaymentStatusDto | null = null;
  @state() private _isLoading: boolean = true;
  @state() private _errorMessage: string | null = null;

  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    if (this.invoiceId) {
      this._loadPayments();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("invoiceId") && this.invoiceId) {
      this._loadPayments();
    }
  }

  private async _loadPayments(): Promise<void> {
    if (!this.invoiceId) return;

    this._isLoading = true;
    this._errorMessage = null;

    try {
      const [paymentsResult, statusResult] = await Promise.all([
        MerchelloApi.getInvoicePayments(this.invoiceId),
        MerchelloApi.getPaymentStatus(this.invoiceId),
      ]);

      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (paymentsResult.error) {
        this._errorMessage = paymentsResult.error.message;
        this._isLoading = false;
        return;
      }

      if (statusResult.error) {
        this._errorMessage = statusResult.error.message;
        this._isLoading = false;
        return;
      }

      this._payments = paymentsResult.data ?? [];
      this._status = statusResult.data ?? null;
    } catch (err) {
      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load payments";
    }

    this._isLoading = false;
  }

  private async _openManualPaymentModal(): Promise<void> {
    if (!this.#modalManager || !this._status) return;

    const modal = this.#modalManager.open(this, MERCHELLO_MANUAL_PAYMENT_MODAL, {
      data: {
        invoiceId: this.invoiceId,
        balanceDue: this._status.balanceDue,
        currencyCode: this._status.currencyCode,
        currencySymbol: this._status.currencySymbol,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.recorded) {
      await this._loadPayments();
      this.dispatchEvent(new CustomEvent<PaymentRecordedDetail>("payment-recorded", {
        detail: { invoiceId: this.invoiceId },
        bubbles: true,
        composed: true
      }));
    }
  }

  private async _openRefundModal(payment: PaymentDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_REFUND_MODAL, {
      data: { payment },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.refunded) {
      await this._loadPayments();
      this.dispatchEvent(new CustomEvent<RefundProcessedDetail>("refund-processed", {
        detail: { invoiceId: this.invoiceId },
        bubbles: true,
        composed: true
      }));
    }
  }


  private _getStatusBadgeClass(status: InvoicePaymentStatus): string {
    switch (status) {
      case InvoicePaymentStatus.Paid:
        return "paid";
      case InvoicePaymentStatus.PartiallyPaid:
        return "partial";
      case InvoicePaymentStatus.Refunded:
      case InvoicePaymentStatus.PartiallyRefunded:
        return "refunded";
      case InvoicePaymentStatus.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }

  private _getRiskLevelClass(score: number): string {
    if (score >= 75) return "high-risk";
    if (score >= 50) return "medium-risk";
    if (score >= 25) return "low-risk";
    return "minimal-risk";
  }

  private _renderPayment(payment: PaymentDto): unknown {
    const isRefund = payment.paymentType === PaymentType.Refund ||
                     payment.paymentType === PaymentType.PartialRefund;

    return html`
      <div class="payment-item ${isRefund ? 'refund' : ''}">
        <div class="payment-main">
          <div class="payment-info">
            <div class="payment-method">
              ${isRefund
                ? html`<uui-icon name="icon-undo"></uui-icon>`
                : html`<uui-icon name="icon-credit-card"></uui-icon>`}
              <span>${payment.paymentMethod ?? "Payment"}</span>
              ${payment.paymentProviderAlias
                ? html`<span class="provider-badge">${payment.paymentProviderAlias}</span>`
                : nothing}
            </div>
            <div class="payment-date">${formatShortDate(payment.dateCreated)}</div>
            ${payment.transactionId
              ? html`<div class="transaction-id">ID: ${payment.transactionId}</div>`
              : nothing}
            ${payment.riskScore != null
              ? html`<div class="risk-score ${this._getRiskLevelClass(payment.riskScore)}">
                  Risk: ${payment.riskScore}%
                  ${payment.riskScoreSource ? html`<span class="risk-source">(${payment.riskScoreSource})</span>` : nothing}
                </div>`
              : nothing}
            ${payment.description
              ? html`<div class="payment-description">${payment.description}</div>`
              : nothing}
            ${payment.refundReason
              ? html`<div class="refund-reason">Reason: ${payment.refundReason}</div>`
              : nothing}
          </div>
          <div class="payment-amount ${isRefund ? 'negative' : ''}">
            ${isRefund ? '-' : ''}${formatCurrency(Math.abs(payment.amount), payment.currencyCode, payment.currencySymbol)}
          </div>
          <div class="payment-actions">
            ${!isRefund && payment.refundableAmount > 0
              ? html`
                  <uui-button
                    look="secondary"
                    label="Refund"
                    @click=${() => this._openRefundModal(payment)}
                  >
                    Refund
                  </uui-button>
                `
              : nothing}
          </div>
        </div>
        ${payment.refunds && payment.refunds.length > 0
          ? html`
              <div class="refunds-list">
                ${payment.refunds.map((refund) => this._renderPayment(refund))}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    if (this._isLoading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    }

    if (this._errorMessage) {
      return html`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    }

    const status = this._status;

    return html`
      <div class="payment-panel">
        <!-- Payment Status Summary -->
        <div class="status-summary">
          <div class="status-header">
            <div class="status-badges">
              <span class="status-badge ${status ? this._getStatusBadgeClass(status.status) : 'unpaid'}">
                ${status?.statusDisplay ?? "Unknown"}
              </span>
              ${status?.maxRiskScore != null
                ? html`<span class="risk-badge ${this._getRiskLevelClass(status.maxRiskScore)}">
                    <uui-icon name="icon-alert"></uui-icon>
                    Risk: ${status.maxRiskScore}%
                  </span>`
                : nothing}
            </div>
            ${status && status.balanceDue > 0
              ? html`
                  <uui-button
                    look="primary"
                    label="Record Payment"
                    @click=${this._openManualPaymentModal}
                  >
                    <uui-icon name="icon-add"></uui-icon>
                    Record Payment
                  </uui-button>
                `
              : nothing}
          </div>

          ${status
            ? html`
                <div class="status-details">
                  <div class="status-row">
                    <span>Invoice Total</span>
                    <span>${formatCurrency(status.invoiceTotal, status.currencyCode, status.currencySymbol)}</span>
                  </div>
                  <div class="status-row">
                    <span>Total Paid</span>
                    <span class="positive">${formatCurrency(status.totalPaid, status.currencyCode, status.currencySymbol)}</span>
                  </div>
                  ${status.totalRefunded > 0
                    ? html`
                        <div class="status-row">
                          <span>Total Refunded</span>
                          <span class="negative">-${formatCurrency(status.totalRefunded, status.currencyCode, status.currencySymbol)}</span>
                        </div>
                      `
                    : nothing}
                  <div class="status-row total">
                    <span>Balance Due</span>
                    <span class="${status.balanceDue > 0 ? 'negative' : ''}">
                      ${formatCurrency(status.balanceDue, status.currencyCode, status.currencySymbol)}
                    </span>
                  </div>
                </div>
              `
            : nothing}
        </div>

        <!-- Payments List -->
        <div class="payments-section">
          <h3>Payment History</h3>
          ${this._payments.length === 0
            ? html`<p class="no-payments">No payments recorded yet.</p>`
            : html`
                <div class="payments-list">
                  ${this._payments.map((payment) => this._renderPayment(payment))}
                </div>
              `}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-1);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .payment-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .status-summary {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .status-badges {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-badge.paid {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .status-badge.partial {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .status-badge.unpaid {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .status-badge.awaiting {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .status-badge.refunded {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
    }

    .status-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .status-row.total {
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
      font-weight: 600;
    }

    .positive {
      color: var(--uui-color-positive);
    }

    .negative {
      color: var(--uui-color-danger);
    }

    .payments-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .no-payments {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .payments-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .payment-item {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .payment-item.refund {
      background: var(--uui-color-surface-alt);
      border-left: 3px solid var(--uui-color-warning);
    }

    .payment-main {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--uui-size-space-3);
      align-items: start;
    }

    .payment-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .payment-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 500;
    }

    .provider-badge {
      font-size: 0.75rem;
      padding: 1px 6px;
      background: var(--uui-color-surface-alt);
      border-radius: 8px;
      color: var(--uui-color-text-alt);
    }

    .payment-date,
    .transaction-id,
    .payment-description,
    .refund-reason {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .refund-reason {
      font-style: italic;
    }

    .risk-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .risk-score {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 8px;
    }

    .risk-source {
      opacity: 0.7;
    }

    .high-risk {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .medium-risk {
      background: #f97316;
      color: white;
    }

    .low-risk {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .minimal-risk {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .payment-amount {
      font-weight: 600;
      font-size: 1rem;
    }

    .payment-amount.negative {
      color: var(--uui-color-danger);
    }

    .refunds-list {
      margin-top: var(--uui-size-space-3);
      padding-left: var(--uui-size-space-4);
      border-left: 2px solid var(--uui-color-border);
    }

    .refunds-list .payment-item {
      margin-bottom: var(--uui-size-space-2);
    }

    .refunds-list .payment-item:last-child {
      margin-bottom: 0;
    }
  `;
}

export default MerchelloPaymentPanelElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-payment-panel": MerchelloPaymentPanelElement;
  }
}
