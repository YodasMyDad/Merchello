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

  private _renderTabs() {
    return html`
      <div class="tabs">
        <button
          class="tab ${this._activeTab === "all" ? "active" : ""}"
          @click=${() => this._handleTabClick("all")}>
          All Outstanding
        </button>
        <button
          class="tab ${this._activeTab === "overdue" ? "active" : ""}"
          @click=${() => this._handleTabClick("overdue")}>
          Overdue
        </button>
        <button
          class="tab ${this._activeTab === "dueThisWeek" ? "active" : ""}"
          @click=${() => this._handleTabClick("dueThisWeek")}>
          Due This Week
        </button>
        <button
          class="tab ${this._activeTab === "dueThisMonth" ? "active" : ""}"
          @click=${() => this._handleTabClick("dueThisMonth")}>
          Due This Month
        </button>
      </div>
    `;
  }

  private _renderToolbar() {
    const hasSelection = this._selectedInvoices.size > 0;

    return html`
      <div class="toolbar">
        <div class="toolbar-left">
          <label class="account-toggle">
            <uui-toggle
              .checked=${this._accountCustomersOnly}
              @change=${this._handleAccountToggle}
              label="Account customers only">
            </uui-toggle>
            <span>Account customers only</span>
          </label>
        </div>
        <div class="toolbar-right">
          ${hasSelection
            ? html`
                <span class="selection-count">${this._selectedInvoices.size} selected</span>
                <uui-button
                  look="primary"
                  color="positive"
                  @click=${this._handleMarkAsPaid}>
                  Mark as Paid
                </uui-button>
              `
            : nothing}
        </div>
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
        <table>
          <thead>
            <tr>
              <th class="checkbox-col">
                <uui-checkbox
                  .checked=${allSelected}
                  @change=${this._handleSelectAll}
                  label="Select all outstanding invoices">
                </uui-checkbox>
              </th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this._invoices.map((invoice) => this._renderRow(invoice))}
          </tbody>
        </table>
      </div>
    `;
  }

  private _renderRow(invoice: OrderListItemDto) {
    const isSelected = this._selectedInvoices.has(invoice.id);
    const amount = invoice.balanceDue ?? invoice.total;

    return html`
      <tr
        class="${isSelected ? "selected" : ""} ${invoice.isOverdue ? "overdue" : ""}"
        tabindex="0"
        role="row"
        @click=${() => this._handleRowClick(invoice)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this._handleRowClick(invoice);
          }
        }}>
        <td class="checkbox-col" @click=${(e: Event) => e.stopPropagation()}>
          <uui-checkbox
            .checked=${isSelected}
            @change=${() => this._handleSelectInvoice(invoice.id)}
            label="Select ${invoice.invoiceNumber}">
          </uui-checkbox>
        </td>
        <td>
          <span class="invoice-number">${invoice.invoiceNumber}</span>
        </td>
        <td>
          <span class="customer-name">${invoice.customerName}</span>
        </td>
        <td>
          <span class="amount">${formatCurrency(amount, this._currencyCode)}</span>
        </td>
        <td>
          ${invoice.dueDate
            ? html`<span class="due-date ${invoice.isOverdue ? "overdue" : ""}">${formatRelativeDate(invoice.dueDate)}</span>`
            : html`<span class="no-due-date">-</span>`}
        </td>
        <td>
          ${invoice.isOverdue
            ? html`<span class="badge badge-danger">Overdue</span>`
            : invoice.daysUntilDue != null && invoice.daysUntilDue <= 7
              ? html`<span class="badge badge-warning">Due Soon</span>`
              : html`<span class="badge badge-default">Unpaid</span>`}
        </td>
      </tr>
    `;
  }

  override render() {
    return html`
      <div class="outstanding-list">
        ${this._renderTabs()}
        ${this._renderToolbar()}

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

    .tabs {
      display: flex;
      gap: var(--uui-size-space-2);
      border-bottom: 1px solid var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
    }

    .tab {
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      border-radius: var(--uui-border-radius);
      transition: all 0.15s ease;
    }

    .tab:hover {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
    }

    .tab.active {
      background: var(--uui-color-current);
      color: var(--uui-color-current-contrast);
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .account-toggle {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .selection-count {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
    }

    th {
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
    }

    .checkbox-col {
      width: 40px;
    }

    tr {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    tr:hover {
      background: var(--uui-color-surface-alt);
    }

    tr:focus-visible {
      outline: 2px solid var(--uui-color-current);
      outline-offset: -2px;
    }

    tr.selected {
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
    }

    tr.overdue {
      background: color-mix(in srgb, var(--uui-color-danger) 5%, transparent);
    }

    tr.overdue:hover {
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
