import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { OrderListItemDto } from "@orders/types/order.types.js";
import type { OutstandingInvoicesQueryParams } from "@outstanding/types/outstanding.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { formatCurrency, formatRelativeDate } from "@shared/utils/formatting.js";
import type { PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MERCHELLO_MARK_AS_PAID_MODAL } from "@outstanding/modals/mark-as-paid-modal.token.js";
import { navigateToOrderDetail } from "@shared/utils/navigation.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

type FilterTab = "all" | "overdue" | "dueThisWeek" | "dueThisMonth";

@customElement("merchello-outstanding-list")
export class MerchelloOutstandingListElement extends UmbElementMixin(LitElement) {
  @state() private _invoices: OrderListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page: number = 1;
  @state() private _pageSize: number = 50;
  @state() private _totalItems: number = 0;
  @state() private _totalPages: number = 0;
  @state() private _activeTab: FilterTab = "all";
  @state() private _accountCustomersOnly: boolean = true;
  @state() private _selectedInvoices: Set<string> = new Set();
  @state() private _currencyCode: string = "USD";

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._initializeAndLoad();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;
    this._currencyCode = settings.currencyCode;
    this._loadInvoices();
  }

  private async _loadInvoices(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: OutstandingInvoicesQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
      accountCustomersOnly: this._accountCustomersOnly,
      sortBy: "dueDate",
      sortDir: "asc",
    };

    // Apply tab-specific filters using backend parameters
    if (this._activeTab === "overdue") {
      params.overdueOnly = true;
    } else if (this._activeTab === "dueThisWeek") {
      params.dueWithinDays = 7;
    } else if (this._activeTab === "dueThisMonth") {
      params.dueWithinDays = 30;
    }

    const { data, error } = await MerchelloApi.getOutstandingInvoices(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._invoices = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _handleTabClick(tab: FilterTab): void {
    this._activeTab = tab;
    this._page = 1;
    this._selectedInvoices = new Set();
    this._loadInvoices();
  }

  private _handleAccountToggle(): void {
    this._accountCustomersOnly = !this._accountCustomersOnly;
    this._page = 1;
    this._selectedInvoices = new Set();
    this._loadInvoices();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadInvoices();
  }

  private _handleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      this._selectedInvoices = new Set(this._invoices.map((i) => i.id));
    } else {
      this._selectedInvoices = new Set();
    }
    this.requestUpdate();
  }

  private _handleSelectInvoice(id: string): void {
    const newSet = new Set(this._selectedInvoices);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    this._selectedInvoices = newSet;
  }

  private _handleRowClick(invoice: OrderListItemDto): void {
    navigateToOrderDetail(invoice.id);
  }

  private async _handleMarkAsPaid(): Promise<void> {
    if (this._selectedInvoices.size === 0) return;

    const selectedInvoices = this._invoices.filter((i) =>
      this._selectedInvoices.has(i.id)
    );

    const result = await this.#modalManager?.open(this, MERCHELLO_MARK_AS_PAID_MODAL, {
      data: {
        invoices: selectedInvoices,
        currencyCode: this._currencyCode,
      },
    })?.onSubmit();

    if (result?.changed) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Payments Recorded",
          message: `Successfully marked ${result.successCount} invoice${result.successCount === 1 ? "" : "s"} as paid.`,
        },
      });
      this._selectedInvoices = new Set();
      this._loadInvoices();
    }
  }

  private _renderFilterRow() {
    return html`
      <div class="filter-row">
        <label class="account-toggle">
          <uui-toggle
            .checked=${this._accountCustomersOnly}
            @change=${this._handleAccountToggle}
            label="Account customers only">
          </uui-toggle>
          <span>Account customers only</span>
        </label>
        <uui-tab-group>
          <uui-tab
            label="All Outstanding"
            ?active=${this._activeTab === "all"}
            @click=${() => this._handleTabClick("all")}>
            All Outstanding
          </uui-tab>
          <uui-tab
            label="Overdue"
            ?active=${this._activeTab === "overdue"}
            @click=${() => this._handleTabClick("overdue")}>
            Overdue
          </uui-tab>
          <uui-tab
            label="Due This Week"
            ?active=${this._activeTab === "dueThisWeek"}
            @click=${() => this._handleTabClick("dueThisWeek")}>
            Due This Week
          </uui-tab>
          <uui-tab
            label="Due This Month"
            ?active=${this._activeTab === "dueThisMonth"}
            @click=${() => this._handleTabClick("dueThisMonth")}>
            Due This Month
          </uui-tab>
        </uui-tab-group>
      </div>
    `;
  }

  private _renderActionBar() {
    const hasSelection = this._selectedInvoices.size > 0;
    if (!hasSelection) return nothing;

    return html`
      <div class="action-bar">
        <span class="selection-count">${this._selectedInvoices.size} selected</span>
        <uui-button
          look="primary"
          color="positive"
          @click=${this._handleMarkAsPaid}>
          Mark as Paid
        </uui-button>
      </div>
    `;
  }

  private _renderTable() {
    if (this._invoices.length === 0) {
      return html`
        <merchello-empty-state
          icon="icon-check"
          headline="No Outstanding Invoices"
          message="All invoices have been paid.">
        </merchello-empty-state>
      `;
    }

    const allSelected =
      this._invoices.length > 0 &&
      this._invoices.every((i) => this._selectedInvoices.has(i.id));

    return html`
      <div class="table-container">
        <uui-table class="outstanding-table">
          <uui-table-head>
            <uui-table-head-cell class="checkbox-col">
              <uui-checkbox
                .checked=${allSelected}
                @change=${this._handleSelectAll}
                label="Select all outstanding invoices">
              </uui-checkbox>
            </uui-table-head-cell>
            <uui-table-head-cell>Invoice</uui-table-head-cell>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Amount</uui-table-head-cell>
            <uui-table-head-cell>Due Date</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
          </uui-table-head>
          ${this._invoices.map((invoice) => this._renderRow(invoice))}
        </uui-table>
      </div>
    `;
  }

  private _renderRow(invoice: OrderListItemDto) {
    const isSelected = this._selectedInvoices.has(invoice.id);
    const amount = invoice.balanceDue ?? invoice.total;

    return html`
      <uui-table-row
        class="clickable ${isSelected ? "selected" : ""} ${invoice.isOverdue ? "overdue" : ""}"
        @click=${() => this._handleRowClick(invoice)}>
        <uui-table-cell class="checkbox-col" @click=${(e: Event) => e.stopPropagation()}>
          <uui-checkbox
            .checked=${isSelected}
            @change=${() => this._handleSelectInvoice(invoice.id)}
            label="Select ${invoice.invoiceNumber}">
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <span class="invoice-number">${invoice.invoiceNumber}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="customer-name">${invoice.customerName}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="amount">${formatCurrency(amount, this._currencyCode)}</span>
        </uui-table-cell>
        <uui-table-cell>
          ${invoice.dueDate
            ? html`<span class="due-date ${invoice.isOverdue ? "overdue" : ""}">${formatRelativeDate(invoice.dueDate)}</span>`
            : html`<span class="no-due-date">-</span>`}
        </uui-table-cell>
        <uui-table-cell>
          ${invoice.isOverdue
            ? html`<span class="badge badge-danger">Overdue</span>`
            : invoice.daysUntilDue != null && invoice.daysUntilDue <= 7
              ? html`<span class="badge badge-warning">Due Soon</span>`
              : html`<span class="badge badge-default">Unpaid</span>`}
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  override render() {
    return html`
      <div class="outstanding-list">
        ${this._renderFilterRow()}
        ${this._renderActionBar()}

        ${this._errorMessage
          ? html`<div class="error-banner">${this._errorMessage}</div>`
          : nothing}

        ${this._isLoading
          ? html`<div class="loading" role="status" aria-label="Loading outstanding invoices"><uui-loader></uui-loader></div>`
          : this._renderTable()}

        ${this._totalPages > 1
          ? html`
              <merchello-pagination
                .page=${this._page}
                .pageSize=${this._pageSize}
                .totalItems=${this._totalItems}
                .totalPages=${this._totalPages}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            `
          : nothing}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .outstanding-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .account-toggle {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .action-bar {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .selection-count {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .outstanding-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    .checkbox-col {
      width: 40px;
    }

    uui-table-row.clickable {
      cursor: pointer;
    }

    uui-table-row.clickable:hover {
      background: var(--uui-color-surface-emphasis);
    }

    uui-table-row.selected {
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
    }

    uui-table-row.overdue {
      background: color-mix(in srgb, var(--uui-color-danger) 5%, transparent);
    }

    uui-table-row.overdue:hover {
      background: color-mix(in srgb, var(--uui-color-danger) 10%, transparent);
    }

    .invoice-number {
      font-weight: 600;
    }

    .customer-name {
      color: var(--uui-color-text-alt);
    }

    .amount {
      font-weight: 600;
    }

    .due-date {
      font-size: 0.875rem;
    }

    .due-date.overdue {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .no-due-date {
      color: var(--uui-color-text-alt);
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: var(--uui-border-radius);
    }

    .badge-danger {
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
    }

    .badge-warning {
      background: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
    }

    .badge-default {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }
  `;
}

export default MerchelloOutstandingListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-outstanding-list": MerchelloOutstandingListElement;
  }
}
