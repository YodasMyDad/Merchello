import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencyCode } from "@api/store-settings.js";
import type { OrderListItemDto } from "@orders/types/order.types.js";
import { COMPACT_ORDER_COLUMNS } from "@orders/types/order.types.js";
import "@orders/components/order-table.element.js";
import type { OrderClickEventDetail } from "@orders/components/order-table.element.js";
import "@shared/components/merchello-empty-state.element.js";
import { navigateToOrderDetail, navigateToOutstandingList } from "@shared/utils/navigation.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import type { CustomerSegmentBadgeDto } from "@customers/types/segment.types.js";
import type {
  CustomerOrdersModalData,
  CustomerOrdersModalValue,
} from "@orders/modals/customer-orders-modal.token.js";
import { MERCHELLO_GENERATE_STATEMENT_MODAL } from "@orders/modals/generate-statement-modal.token.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

interface OutstandingBalance {
  totalOutstanding: number;
  totalOverdue: number;
  invoiceCount: number;
  overdueCount: number;
  nextDueDate: string | null;
  currencyCode: string;
  creditLimit: number | null;
  creditLimitExceeded: boolean;
  availableCredit: number | null;
  creditUtilizationPercent: number | null;
}

@customElement("merchello-customer-orders-modal")
export class MerchelloCustomerOrdersModalElement extends UmbModalBaseElement<
  CustomerOrdersModalData,
  CustomerOrdersModalValue
> {
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  @state() private _orders: OrderListItemDto[] = [];
  @state() private _segments: CustomerSegmentBadgeDto[] = [];
  @state() private _outstandingBalance: OutstandingBalance | null = null;
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadData();
  }

  private async _loadData(): Promise<void> {
    const email = this.data?.email;
    if (!email) {
      this._errorMessage = "No customer email provided";
      this._isLoading = false;
      return;
    }

    this._isLoading = true;
    this._errorMessage = null;

    const hasAccountTerms = this.data?.hasAccountTerms;
    const customerId = this.data?.customerId;

    // Run all requests in parallel with proper typing
    const [ordersResult, segmentsResult, balanceResult] = await Promise.all([
      MerchelloApi.getCustomerOrders(email),
      MerchelloApi.getCustomerSegmentBadges(email),
      hasAccountTerms && customerId
        ? MerchelloApi.getCustomerOutstandingBalance(customerId)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (ordersResult.error) {
      this._errorMessage = ordersResult.error.message;
      this._isLoading = false;
      return;
    }

    this._orders = ordersResult.data ?? [];
    this._segments = segmentsResult.data ?? [];

    // Set outstanding balance if loaded
    if (balanceResult.data) {
      this._outstandingBalance = balanceResult.data;
    }

    this._isLoading = false;
  }

  private _handleOrderClick(e: CustomEvent<OrderClickEventDetail>): void {
    this.value = { navigatedToOrder: true };
    this.modalContext?.submit();
    // Navigate using SPA routing
    navigateToOrderDetail(e.detail.orderId);
  }

  private _handleClose(): void {
    this.value = { navigatedToOrder: false };
    this.modalContext?.reject();
  }

  private _handleViewOutstanding(): void {
    this.value = { navigatedToOrder: false };
    this.modalContext?.submit();
    navigateToOutstandingList();
  }

  private async _handleGenerateStatement(): Promise<void> {
    const customerId = this.data?.customerId;
    if (!customerId) return;

    const modalContext = this.#modalManager?.open(this, MERCHELLO_GENERATE_STATEMENT_MODAL, {
      data: {
        customerId,
        customerName: this.data?.customerName ?? "Customer",
        currencyCode: this._outstandingBalance?.currencyCode ?? getCurrencyCode(),
      },
    });

    await modalContext?.onSubmit();
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        ${this._errorMessage}
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="This customer has no orders.">
      </merchello-empty-state>
    `;
  }

  private _renderOrdersTable(): unknown {
    return html`
      <merchello-order-table
        .orders=${this._orders}
        .columns=${COMPACT_ORDER_COLUMNS}
        @order-click=${this._handleOrderClick}
      ></merchello-order-table>
    `;
  }

  private _getSegmentBadgeClass(segmentType: CustomerSegmentBadgeDto["segmentType"]): string {
    return segmentType === "Automated" ? "segment-badge--automated" : "segment-badge--manual";
  }

  private _renderSegmentBadges(): unknown {
    if (this._segments.length === 0) {
      return nothing;
    }

    return html`
      <section class="segment-strip" aria-label="Customer segments">
        <span class="segment-strip__label">
          <uui-icon name="icon-users"></uui-icon>
          Customer segments
        </span>
        <div class="segment-badges">
        ${this._segments.map(
          (segment) => html`
            <span
              class="segment-badge ${this._getSegmentBadgeClass(segment.segmentType)}"
            >
              ${segment.name}
            </span>
          `
        )}
        </div>
      </section>
    `;
  }

  private _renderAccountSummary(): unknown {
    if (!this.data?.hasAccountTerms || !this._outstandingBalance) {
      return nothing;
    }

    const balance = this._outstandingBalance;
    const hasOverdue = balance.overdueCount > 0;

    return html`
      <div class="account-summary">
        <div class="account-summary__header">
          <uui-icon name="icon-wallet"></uui-icon>
          <span>Account Customer</span>
        </div>
        <div class="account-summary__stats">
          <div class="account-stat">
            <span class="account-stat__label">Outstanding</span>
            <span class="account-stat__value ${hasOverdue ? 'has-overdue' : ''}">
              ${formatCurrency(balance.totalOutstanding, balance.currencyCode)}
            </span>
            ${balance.invoiceCount > 0
              ? html`<span class="account-stat__detail">${balance.invoiceCount} invoice${balance.invoiceCount !== 1 ? 's' : ''}</span>`
              : nothing}
          </div>
          ${hasOverdue
            ? html`
                <div class="account-stat account-stat--overdue">
                  <span class="account-stat__label">Overdue</span>
                  <span class="account-stat__value account-stat__value--danger">
                    ${formatCurrency(balance.totalOverdue, balance.currencyCode)}
                  </span>
                  <span class="account-stat__detail">${balance.overdueCount} invoice${balance.overdueCount !== 1 ? 's' : ''}</span>
                </div>
              `
            : nothing}
          ${balance.creditLimit != null
            ? html`
                <div class="account-stat">
                  <span class="account-stat__label">Credit Limit</span>
                  <span class="account-stat__value">
                    ${formatCurrency(balance.creditLimit, balance.currencyCode)}
                  </span>
                  ${balance.availableCredit != null
                    ? html`<span class="account-stat__detail ${balance.creditLimitExceeded ? 'exceeded' : ''}">${balance.creditLimitExceeded ? 'Exceeded' : `${formatCurrency(balance.availableCredit, balance.currencyCode)} available`}</span>`
                    : nothing}
                </div>
              `
            : nothing}
        </div>
        <div class="account-summary__actions">
          ${balance.invoiceCount > 0
            ? html`
                <uui-button
                  look="placeholder"
                  class="account-summary__action"
                  @click=${this._handleViewOutstanding}
                >
                  View Outstanding Invoices
                  <uui-icon name="icon-arrow-right"></uui-icon>
                </uui-button>
              `
            : nothing}
          <uui-button
            look="outline"
            class="account-summary__action"
            @click=${this._handleGenerateStatement}
          >
            <uui-icon name="icon-document"></uui-icon>
            Generate Statement
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._orders.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderOrdersTable();
  }

  override render() {
    const customerName = this.data?.customerName ?? "Customer";
    const orderCount = this._orders.length;

    return html`
      <umb-body-layout headline="Orders for ${customerName}">
        <div id="main">
          ${!this._isLoading ? this._renderSegmentBadges() : nothing}
          ${!this._isLoading ? this._renderAccountSummary() : nothing}
          ${!this._isLoading && !this._errorMessage && orderCount > 0
            ? html`
                <div class="summary">
                  ${orderCount} order${orderCount !== 1 ? "s" : ""} found
                </div>
              `
            : nothing}
          ${this._renderContent()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
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

    .summary {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-message {
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

    .segment-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
    }

    .segment-strip__label {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .segment-strip__label uui-icon {
      font-size: 0.875rem;
    }

    .segment-badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .segment-badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.4;
    }

    .segment-badge--manual {
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      border-color: var(--uui-color-border);
    }

    .segment-badge--automated {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .account-summary {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .account-summary__header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--uui-color-text);
      margin-bottom: var(--uui-size-space-3);
    }

    .account-summary__header uui-icon {
      color: var(--uui-color-warning);
    }

    .account-summary__stats {
      display: flex;
      gap: var(--uui-size-space-6);
      flex-wrap: wrap;
    }

    .account-stat {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .account-stat__label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .account-stat__value {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .account-stat__value.has-overdue {
      color: var(--uui-color-warning);
    }

    .account-stat__value--danger {
      color: var(--uui-color-danger);
    }

    .account-stat__detail {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .account-stat__detail.exceeded {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .account-summary__actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
    }

    .account-summary__action {
      flex: 1;
    }

    .account-summary__action uui-icon {
      margin-left: var(--uui-size-space-2);
    }

    .account-summary__action uui-icon:first-child {
      margin-left: 0;
      margin-right: var(--uui-size-space-2);
    }
  `,
  ];
}

export default MerchelloCustomerOrdersModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-orders-modal": MerchelloCustomerOrdersModalElement;
  }
}

