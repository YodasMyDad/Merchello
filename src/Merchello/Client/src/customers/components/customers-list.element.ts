import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { CustomerListItemDto, CustomerListParams } from "@customers/types/customer.types.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { MERCHELLO_CUSTOMER_EDIT_MODAL } from "@customers/modals/customer-edit-modal.token.js";
import { MERCHELLO_CUSTOMER_ORDERS_MODAL } from "@orders/modals/customer-orders-modal.token.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-customers-list")
export class MerchelloCustomersListElement extends UmbElementMixin(LitElement) {
  @state() private _customers: CustomerListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _searchTerm = "";

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;

    this._pageSize = settings.defaultPaginationPageSize;
    this._loadCustomers();
  }

  private async _loadCustomers(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: CustomerListParams = {
      page: this._page,
      pageSize: this._pageSize,
    };

    if (this._searchTerm.trim()) {
      params.search = this._searchTerm.trim();
    }

    const { data, error } = await MerchelloApi.getCustomers(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._customers = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const value = input.value;

    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = value;
      this._page = 1;
      this._loadCustomers();
    }, 300);
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
    this._page = 1;
    this._loadCustomers();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadCustomers();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _handleViewOrders(customer: CustomerListItemDto): void {
    if (!customer.email) return;

    const customerName = [customer.firstName, customer.lastName]
      .filter(Boolean)
      .join(" ") || customer.email;

    this.#modalManager?.open(this, MERCHELLO_CUSTOMER_ORDERS_MODAL, {
      data: {
        email: customer.email,
        customerName,
        customerId: customer.id,
        hasAccountTerms: customer.hasAccountTerms,
      },
    });
  }

  private async _handleEditCustomer(customer: CustomerListItemDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_CUSTOMER_EDIT_MODAL, {
      data: { customer },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;

    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Customer updated", message: "Customer details have been updated." }
      });
      this._loadCustomers();
    }
  }

  private _formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  private _getCustomerName(customer: CustomerListItemDto): string {
    const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
    return name || "N/A";
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading" role="status"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button
          look="secondary"
          label="Retry loading customers"
          @click=${() => this._loadCustomers()}>
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    if (this._searchTerm.trim()) {
      return html`
        <merchello-empty-state
          icon="icon-search"
          headline="No customers found"
          message="Try adjusting your search term.">
        </merchello-empty-state>
      `;
    }

    return html`
      <merchello-empty-state
        icon="icon-users"
        headline="No customers yet"
        message="Customers are created automatically when orders are placed.">
      </merchello-empty-state>
    `;
  }

  private _renderSearchBox(): unknown {
    return html`
      <div class="filters">
        <div class="filters-top">
          <div class="search-box">
            <uui-input
              type="text"
              placeholder="Search by name or email"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}
              label="Search customers">
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm
                ? html`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  `
                : nothing}
            </uui-input>
          </div>
        </div>
      </div>
    `;
  }

  private _renderCustomerRow(customer: CustomerListItemDto): unknown {
    const customerName = this._getCustomerName(customer);

    return html`
      <uui-table-row>
        <uui-table-cell>
          <div class="customer-info">
            <uui-button
              class="customer-name-link"
              look="placeholder"
              compact
              label=${`View orders for ${customerName}`}
              @click=${() => this._handleViewOrders(customer)}>
              ${customerName}
            </uui-button>
          </div>
        </uui-table-cell>
        <uui-table-cell>${customer.email}</uui-table-cell>
        <uui-table-cell class="center">${customer.orderCount}</uui-table-cell>
        <uui-table-cell>${this._formatDate(customer.dateCreated)}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label=${`Edit ${customerName}`}
              @click=${() => this._handleEditCustomer(customer)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label=${`View orders for ${customerName}`}
              @click=${() => this._handleViewOrders(customer)}>
              <uui-icon name="icon-receipt-dollar"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderCustomersTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="customers-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Email</uui-table-head-cell>
            <uui-table-head-cell class="center">Orders</uui-table-head-cell>
            <uui-table-head-cell>Created</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._customers.map((customer) => this._renderCustomerRow(customer))}
        </uui-table>
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
    if (this._customers.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderCustomersTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="customers-container layout-container">
          ${this._renderSearchBox()}

          ${this._renderContent()}

          ${this._customers.length > 0 && !this._isLoading
            ? html`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}>
                </merchello-pagination>
              `
            : nothing}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    collectionLayoutStyles,
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .search-box uui-input {
        max-width: 420px;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }

      .customers-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-head-cell.center,
      uui-table-cell.center {
        text-align: center;
      }

      .customer-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .customer-name-link {
        justify-content: flex-start;
        padding: 0;
        font-weight: 500;
        color: var(--uui-color-interactive);
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .error-banner uui-icon {
        flex-shrink: 0;
      }
    `,
  ];
}

export default MerchelloCustomersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customers-list": MerchelloCustomersListElement;
  }
}
