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
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MERCHELLO_MARK_AS_PAID_MODAL } from "@outstanding/modals/mark-as-paid-modal.token.js";
import { getOrderDetailHref, navigateToOrderDetail } from "@shared/utils/navigation.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

type FilterTab = "all" | "overdue" | "dueThisWeek" | "dueThisMonth";

@customElement("merchello-outstanding-list")
export class MerchelloOutstandingListElement extends UmbElementMixin(LitElement) {
  @state() private _invoices: OrderListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _activeTab: FilterTab = "all";
  @state() private _accountCustomersOnly = true;
  @state() private _selectedInvoiceIds: Set<string> = new Set();
  @state() private _currencyCode = "USD";
  @state() private _searchTerm = "";
  @state() private _pendingSearchTerm = "";

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;
  #searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
    }
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;
    this._currencyCode = settings.currencyCode;
    this._loadInvoices();
  }

  private _buildQueryParams(): OutstandingInvoicesQueryParams {
    const params: OutstandingInvoicesQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
      accountCustomersOnly: this._accountCustomersOnly,
      sortBy: "dueDate",
      sortDir: "asc",
    };

    const search = this._searchTerm.trim();
    if (search.length > 0) {
      params.search = search;
    }

    if (this._activeTab === "overdue") {
      params.overdueOnly = true;
    } else if (this._activeTab === "dueThisWeek") {
      // "Due this week" should not include already overdue invoices.
      params.overdueOnly = false;
      params.dueWithinDays = 7;
    } else if (this._activeTab === "dueThisMonth") {
      // "Due this month" should not include already overdue invoices.
      params.overdueOnly = false;
      params.dueWithinDays = 30;
    }

    return params;
  }

  private async _loadInvoices(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getOutstandingInvoices(this._buildQueryParams());

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

      const visibleIds = new Set(data.items.map((invoice) => invoice.id));
      this._selectedInvoiceIds = new Set(
        Array.from(this._selectedInvoiceIds).filter((id) => visibleIds.has(id))
      );
    }

    this._isLoading = false;
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _hasActiveFilters(): boolean {
    return (
      this._activeTab !== "all" ||
      this._searchTerm.trim().length > 0 ||
      !this._accountCustomersOnly
    );
  }

  private _isInteractiveClick(e: Event): boolean {
    const interactiveTags = new Set(["A", "BUTTON", "UUI-BUTTON", "INPUT", "UUI-CHECKBOX"]);
    return e
      .composedPath()
      .some((node) => node instanceof HTMLElement && interactiveTags.has(node.tagName));
  }

  private _handleTabClick(tab: FilterTab): void {
    if (this._activeTab === tab) return;
    this._activeTab = tab;
    this._page = 1;
    this._selectedInvoiceIds = new Set();
    this._loadInvoices();
  }

  private _handleAccountToggle(e: Event): void {
    const checked = Boolean((e.target as HTMLInputElement).checked);
    if (this._accountCustomersOnly === checked) return;
    this._accountCustomersOnly = checked;
    this._page = 1;
    this._selectedInvoiceIds = new Set();
    this._loadInvoices();
  }

  private _handleSearchInput(e: Event): void {
    this._pendingSearchTerm = (e.target as HTMLInputElement).value;

    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
    }

    this.#searchDebounceTimer = setTimeout(() => {
      this._searchTerm = this._pendingSearchTerm;
      this._page = 1;
      this._selectedInvoiceIds = new Set();
      this._loadInvoices();
    }, 300);
  }

  private _handleSearchClear(): void {
    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
      this.#searchDebounceTimer = null;
    }
    this._pendingSearchTerm = "";
    this._searchTerm = "";
    this._page = 1;
    this._selectedInvoiceIds = new Set();
    this._loadInvoices();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._selectedInvoiceIds = new Set();
    this._loadInvoices();
  }

  private _handleRetry(): void {
    this._loadInvoices();
  }

  private _handleSelectAll(e: Event): void {
    const checked = Boolean((e.target as HTMLInputElement).checked);
    this._selectedInvoiceIds = checked
      ? new Set(this._invoices.map((invoice) => invoice.id))
      : new Set();
  }

  private _handleSelectInvoice(invoiceId: string, e: Event): void {
    e.stopPropagation();
    const checked = Boolean((e.target as HTMLInputElement).checked);
    const next = new Set(this._selectedInvoiceIds);
    if (checked) {
      next.add(invoiceId);
    } else {
      next.delete(invoiceId);
    }
    this._selectedInvoiceIds = next;
  }

  private _handleRowClick(e: Event, invoice: OrderListItemDto): void {
    if (this._isInteractiveClick(e)) return;
    navigateToOrderDetail(invoice.id);
  }

  private _handleRowKeyDown(e: KeyboardEvent, invoice: OrderListItemDto): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    navigateToOrderDetail(invoice.id);
  }

  private _getSelectedInvoices(): OrderListItemDto[] {
    return this._invoices.filter((invoice) => this._selectedInvoiceIds.has(invoice.id));
  }

  private _getSelectedTotal(): number {
    return this._getSelectedInvoices().reduce(
      (sum, invoice) => sum + (invoice.balanceDue ?? invoice.total),
      0
    );
  }

  private async _handleMarkAsPaid(): Promise<void> {
    if (this._selectedInvoiceIds.size === 0) return;

    const selectedInvoices = this._getSelectedInvoices();
    const totalBalanceDue = this._getSelectedTotal();

    const result = await this.#modalManager
      ?.open(this, MERCHELLO_MARK_AS_PAID_MODAL, {
        data: {
          invoices: selectedInvoices,
          currencyCode: this._currencyCode,
          totalBalanceDue,
        },
      })
      ?.onSubmit();

    if (!result?.changed) return;

    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Payments recorded",
        message: `Successfully marked ${result.successCount} invoice${result.successCount === 1 ? "" : "s"} as paid.`,
      },
    });

    this._selectedInvoiceIds = new Set();
    this._loadInvoices();
  }

  private _renderFilterSection(): unknown {
    return html`
      <uui-box>
        <div class="filters">
          <div class="filters-top">
            <div class="search-box">
              <uui-input
                type="text"
                .value=${this._pendingSearchTerm}
                placeholder="Search by invoice number, customer name, or email..."
                label="Search outstanding invoices"
                @input=${this._handleSearchInput}
              >
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._pendingSearchTerm
                  ? html`
                      <uui-button
                        slot="append"
                        compact
                        look="secondary"
                        label="Clear search"
                        @click=${this._handleSearchClear}
                      >
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    `
                  : nothing}
              </uui-input>
            </div>

            <uui-toggle
              label="Account customers only"
              .checked=${this._accountCustomersOnly}
              @change=${this._handleAccountToggle}
            >
              Account customers only
            </uui-toggle>
          </div>

          <uui-tab-group>
            <uui-tab
              label="All outstanding"
              ?active=${this._activeTab === "all"}
              @click=${() => this._handleTabClick("all")}
            >
              All outstanding
            </uui-tab>
            <uui-tab
              label="Overdue"
              ?active=${this._activeTab === "overdue"}
              @click=${() => this._handleTabClick("overdue")}
            >
              Overdue
            </uui-tab>
            <uui-tab
              label="Due this week"
              ?active=${this._activeTab === "dueThisWeek"}
              @click=${() => this._handleTabClick("dueThisWeek")}
            >
              Due this week
            </uui-tab>
            <uui-tab
              label="Due this month"
              ?active=${this._activeTab === "dueThisMonth"}
              @click=${() => this._handleTabClick("dueThisMonth")}
            >
              Due this month
            </uui-tab>
          </uui-tab-group>
        </div>
      </uui-box>
    `;
  }

  private _renderSelectionBar(): unknown {
    if (this._selectedInvoiceIds.size === 0) return nothing;

    return html`
      <uui-box>
        <div class="selection-bar">
          <div class="selection-meta">
            <span class="selection-count">${this._selectedInvoiceIds.size} selected</span>
            <span class="selection-total"
              >${formatCurrency(this._getSelectedTotal(), this._currencyCode)} total</span
            >
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Mark selected invoices as paid"
            @click=${this._handleMarkAsPaid}
          >
            Mark as paid
          </uui-button>
        </div>
      </uui-box>
    `;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-state" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" label="Retry loading outstanding invoices" @click=${this._handleRetry}>
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    if (this._hasActiveFilters()) {
      return html`
        <merchello-empty-state
          icon="icon-search"
          headline="No invoices match these filters"
          message="Try changing search or filters to find outstanding invoices."
        ></merchello-empty-state>
      `;
    }

    return html`
      <merchello-empty-state
        icon="icon-check"
        headline="No outstanding invoices"
        message="All invoices are currently paid."
      ></merchello-empty-state>
    `;
  }

  private _renderStatus(invoice: OrderListItemDto): unknown {
    if (invoice.isOverdue) {
      return html`<span class="badge badge-danger">Overdue</span>`;
    }

    if (invoice.daysUntilDue != null && invoice.daysUntilDue >= 0 && invoice.daysUntilDue <= 7) {
      return html`<span class="badge badge-warning">Due soon</span>`;
    }

    return html`<span class="badge badge-default">Unpaid</span>`;
  }

  private _renderRow(invoice: OrderListItemDto): unknown {
    const isSelected = this._selectedInvoiceIds.has(invoice.id);
    const amount = invoice.balanceDue ?? invoice.total;

    return html`
      <uui-table-row
        class="clickable ${isSelected ? "selected" : ""} ${invoice.isOverdue ? "overdue" : ""}"
        tabindex="0"
        @click=${(e: Event) => this._handleRowClick(e, invoice)}
        @keydown=${(e: KeyboardEvent) => this._handleRowKeyDown(e, invoice)}
      >
        <uui-table-cell class="checkbox-col" @click=${(e: Event) => e.stopPropagation()}>
          <uui-checkbox
            aria-label="Select invoice ${invoice.invoiceNumber || invoice.id}"
            ?checked=${isSelected}
            @change=${(e: Event) => this._handleSelectInvoice(invoice.id, e)}
          ></uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <a class="invoice-link" href=${getOrderDetailHref(invoice.id)}>
            ${invoice.invoiceNumber || invoice.id}
          </a>
        </uui-table-cell>
        <uui-table-cell>${invoice.customerName || "Unknown customer"}</uui-table-cell>
        <uui-table-cell class="amount-cell">
          ${formatCurrency(amount, this._currencyCode)}
        </uui-table-cell>
        <uui-table-cell>
          ${invoice.dueDate
            ? html`<span class=${invoice.isOverdue ? "due-date overdue" : "due-date"}
                >${formatRelativeDate(invoice.dueDate)}</span
              >`
            : html`<span class="no-due-date">No due date</span>`}
        </uui-table-cell>
        <uui-table-cell>${this._renderStatus(invoice)}</uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderTable(): unknown {
    const allSelected =
      this._invoices.length > 0 &&
      this._invoices.every((invoice) => this._selectedInvoiceIds.has(invoice.id));
    const someSelected = this._selectedInvoiceIds.size > 0 && !allSelected;

    return html`
      <div class="table-container">
        <uui-table class="outstanding-table">
          <uui-table-head>
            <uui-table-head-cell class="checkbox-col">
              <uui-checkbox
                aria-label="Select all outstanding invoices"
                ?checked=${allSelected}
                .indeterminate=${someSelected}
                @change=${this._handleSelectAll}
              ></uui-checkbox>
            </uui-table-head-cell>
            <uui-table-head-cell>Invoice</uui-table-head-cell>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Amount due</uui-table-head-cell>
            <uui-table-head-cell>Due date</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
          </uui-table-head>
          ${this._invoices.map((invoice) => this._renderRow(invoice))}
        </uui-table>
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`
        <div class="loading" role="status" aria-label="Loading outstanding invoices">
          <uui-loader></uui-loader>
        </div>
      `;
    }

    if (this._errorMessage) {
      return this._renderErrorState();
    }

    if (this._invoices.length === 0) {
      return this._renderEmptyState();
    }

    return this._renderTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="outstanding-container">
          ${this._renderFilterSection()} ${this._renderSelectionBar()} ${this._renderContent()}

          <merchello-pagination
            .state=${this._getPaginationState()}
            .disabled=${this._isLoading}
            @page-change=${this._handlePageChange}
          ></merchello-pagination>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .outstanding-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-layout-1);
    }

    .filters {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .filters-top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
    }

    .search-box {
      flex: 1;
      min-width: 260px;
      max-width: 520px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .selection-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
    }

    .selection-meta {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      font-size: 0.875rem;
    }

    .selection-count {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .selection-total {
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-state {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .error-state span {
      flex: 1;
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

    uui-table-row.clickable:focus-visible {
      outline: 2px solid var(--uui-color-interactive);
      outline-offset: -2px;
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

    .invoice-link {
      color: var(--uui-color-interactive);
      text-decoration: none;
      font-weight: 600;
    }

    .invoice-link:hover {
      text-decoration: underline;
    }

    .amount-cell {
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
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-danger {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge-warning {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge-default {
      background: var(--uui-color-text-alt);
      color: #fff;
    }
  `;
}

export default MerchelloOutstandingListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-outstanding-list": MerchelloOutstandingListElement;
  }
}
