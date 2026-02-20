import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import {
  DiscountStatus,
  type DiscountListItemDto,
  type DiscountQueryParams,
} from "@discounts/types/discount.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import "@discounts/components/discount-table.element.js";
import { MERCHELLO_SELECT_DISCOUNT_TYPE_MODAL } from "@discounts/modals/select-discount-type-modal.token.js";
import { navigateToDiscountDetail, navigateToDiscountCreate } from "@shared/utils/navigation.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-discounts-list")
export class MerchelloDiscountsListElement extends UmbElementMixin(LitElement) {
  @state() private _discounts: DiscountListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page: number = 1;
  @state() private _pageSize: number = 50;
  @state() private _totalItems: number = 0;
  @state() private _totalPages: number = 0;
  @state() private _activeTab: string = "all";
  @state() private _selectedDiscounts: Set<string> = new Set();
  @state() private _searchTerm: string = "";
  @state() private _isDeleting: boolean = false;

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

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;
    this._loadDiscounts();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _loadDiscounts(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: DiscountQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "dateCreated",
      sortDir: "desc",
    };

    // Apply search filter
    if (this._searchTerm.trim()) {
      params.search = this._searchTerm.trim();
    }

    // Apply tab filters
    if (this._activeTab === "active") {
      params.status = DiscountStatus.Active;
    } else if (this._activeTab === "scheduled") {
      params.status = DiscountStatus.Scheduled;
    } else if (this._activeTab === "expired") {
      params.status = DiscountStatus.Expired;
    } else if (this._activeTab === "draft") {
      params.status = DiscountStatus.Draft;
    }

    const { data, error } = await MerchelloApi.getDiscounts(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._discounts = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _handleTabClick(tab: string): void {
    this._activeTab = tab;
    this._page = 1;
    this._loadDiscounts();
  }

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const value = input.value;

    // Debounce search to avoid excessive API calls
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = value;
      this._page = 1;
      this._loadDiscounts();
    }, 300);
  }

  private _handleSearchClear(): void {
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
    this._searchTerm = "";
    this._page = 1;
    this._loadDiscounts();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadDiscounts();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _handleSelectionChange(e: CustomEvent<{ selectedIds: string[] }>): void {
    this._selectedDiscounts = new Set(e.detail.selectedIds);
    this.requestUpdate();
  }

  private async _handleDeleteSelected(): Promise<void> {
    const count = this._selectedDiscounts.size;
    if (count === 0) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete selected discounts",
        content: `Delete ${count} discount${count !== 1 ? "s" : ""}. This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._isDeleting = true;

    // Delete discounts one by one
    const ids = Array.from(this._selectedDiscounts);
    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      const { error } = await MerchelloApi.deleteDiscount(id);
      if (!this.#isConnected) return;
      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    this._isDeleting = false;

    if (errorCount > 0) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Partial success", message: `Deleted ${successCount} of ${count} discounts` }
      });
    } else {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Discounts deleted", message: `${count} discount${count !== 1 ? "s" : ""} deleted successfully` }
      });
    }

    // Clear selection and reload
    this._selectedDiscounts = new Set();
    this._loadDiscounts();
  }

  private async _handleCreateDiscount(): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SELECT_DISCOUNT_TYPE_MODAL, {
      data: {},
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.selectedCategory !== undefined) {
      // Navigate to create discount page with the selected category
      navigateToDiscountCreate(result.selectedCategory);
    }
  }

  private _handleDiscountClick(e: CustomEvent<{ discountId: string }>): void {
    navigateToDiscountDetail(e.detail.discountId);
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <uui-box class="error-box" headline="Could not load discounts">
        <div class="error-content">
          <p>${this._errorMessage}</p>
          <uui-button look="secondary" label="Retry" @click=${this._loadDiscounts}>Retry</uui-button>
        </div>
      </uui-box>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-tag"
        headline="No discounts found"
        message="Create your first discount to offer promotions to your customers.">
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label="Create discount"
          @click=${this._handleCreateDiscount}
        >
          Create discount
        </uui-button>
      </merchello-empty-state>
    `;
  }

  private _renderDiscountsTable(): unknown {
    return html`
      <merchello-discount-table
        .discounts=${this._discounts}
        .selectable=${true}
        .selectedIds=${Array.from(this._selectedDiscounts)}
        @selection-change=${this._handleSelectionChange}
        @discount-click=${this._handleDiscountClick}
      ></merchello-discount-table>

      <!-- Pagination -->
      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }

  private _renderDiscountsContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._discounts.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderDiscountsTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="discounts-container layout-container">
          <div class="filters">
            <div class="filters-top">
              <div class="search-box">
                <uui-input
                  type="text"
                  placeholder="Search discounts by name or code..."
                  .value=${this._searchTerm}
                  @input=${this._handleSearchInput}
                  label="Search discounts"
                >
                  <uui-icon name="icon-search" slot="prepend"></uui-icon>
                  ${this._searchTerm
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
                    : ""}
                </uui-input>
              </div>
              <div class="header-actions">
                ${this._selectedDiscounts.size > 0
                  ? html`
                      <uui-button
                        look="primary"
                        color="danger"
                        label="Delete"
                        ?disabled=${this._isDeleting}
                        @click=${this._handleDeleteSelected}
                      >
                        ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedDiscounts.size})`}
                      </uui-button>
                    `
                  : ""}
                <uui-button look="primary" color="positive" label="Create discount" @click=${this._handleCreateDiscount}>
                  Create discount
                </uui-button>
              </div>
            </div>

            <uui-tab-group class="tabs">
              <uui-tab
                label="All"
                ?active=${this._activeTab === "all"}
                @click=${() => this._handleTabClick("all")}
              >
                All
              </uui-tab>
              <uui-tab
                label="Active"
                ?active=${this._activeTab === "active"}
                @click=${() => this._handleTabClick("active")}
              >
                Active
              </uui-tab>
              <uui-tab
                label="Scheduled"
                ?active=${this._activeTab === "scheduled"}
                @click=${() => this._handleTabClick("scheduled")}
              >
                Scheduled
              </uui-tab>
              <uui-tab
                label="Expired"
                ?active=${this._activeTab === "expired"}
                @click=${() => this._handleTabClick("expired")}
              >
                Expired
              </uui-tab>
              <uui-tab
                label="Draft"
                ?active=${this._activeTab === "draft"}
                @click=${() => this._handleTabClick("draft")}
              >
                Draft
              </uui-tab>
            </uui-tab-group>
          </div>

          ${this._renderDiscountsContent()}
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

    .search-box {
      flex: 1;
      max-width: 520px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .search-box uui-icon[slot="prepend"] {
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-box {
      margin-bottom: var(--uui-size-space-4);
    }

    .error-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      color: var(--uui-color-danger);
    }

    .error-content p {
      margin: 0;
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `,
  ];
}

export default MerchelloDiscountsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discounts-list": MerchelloDiscountsListElement;
  }
}
