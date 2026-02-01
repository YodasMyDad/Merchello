import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import {
  UpsellStatus,
  UpsellDisplayLocation,
  UpsellOrderBy,
  CheckoutUpsellMode,
  type UpsellListItemDto,
  type UpsellQueryParams,
} from "@upsells/types/upsell.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import { MERCHELLO_CREATE_UPSELL_MODAL } from "@upsells/modals/create-upsell-modal.token.js";
import { navigateToUpsellDetail } from "@shared/utils/navigation.js";
import { formatCurrency, formatNumber } from "@shared/utils/formatting.js";

@customElement("merchello-upsells-list")
export class MerchelloUpsellsListElement extends UmbElementMixin(LitElement) {
  @state() private _upsells: UpsellListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _activeTab = "all";
  @state() private _selectedUpsells: Set<string> = new Set();
  @state() private _searchTerm = "";
  @state() private _isDeleting = false;

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;
  #currencyCode?: string;
  #currencySymbol?: string;

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
    this.#currencyCode = settings.currencyCode;
    this.#currencySymbol = settings.currencySymbol;
    this._loadUpsells();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _loadUpsells(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: UpsellQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
      orderBy: UpsellOrderBy.DateCreated,
      descending: true,
    };

    if (this._searchTerm.trim()) {
      params.search = this._searchTerm.trim();
    }

    if (this._activeTab === "active") {
      params.status = UpsellStatus.Active;
    } else if (this._activeTab === "scheduled") {
      params.status = UpsellStatus.Scheduled;
    } else if (this._activeTab === "expired") {
      params.status = UpsellStatus.Expired;
    } else if (this._activeTab === "draft") {
      params.status = UpsellStatus.Draft;
    } else if (this._activeTab === "disabled") {
      params.status = UpsellStatus.Disabled;
    }

    const { data, error } = await MerchelloApi.getUpsells(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._upsells = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _handleTabClick(tab: string): void {
    this._activeTab = tab;
    this._page = 1;
    this._loadUpsells();
  }

  private _handleSearchInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
    this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = value;
      this._page = 1;
      this._loadUpsells();
    }, 300);
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
    this._page = 1;
    this._loadUpsells();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadUpsells();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _handleRowClick(upsell: UpsellListItemDto): void {
    navigateToUpsellDetail(upsell.id);
  }

  private _handleCheckboxChange(upsellId: string, checked: boolean): void {
    const newSet = new Set(this._selectedUpsells);
    if (checked) {
      newSet.add(upsellId);
    } else {
      newSet.delete(upsellId);
    }
    this._selectedUpsells = newSet;
  }

  private _handleSelectAll(checked: boolean): void {
    if (checked) {
      this._selectedUpsells = new Set(this._upsells.map((u) => u.id));
    } else {
      this._selectedUpsells = new Set();
    }
  }

  private async _handleDeleteSelected(): Promise<void> {
    const count = this._selectedUpsells.size;
    if (count === 0) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Upsells",
        content: `Are you sure you want to delete ${count} upsell${count !== 1 ? "s" : ""}? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }
    if (!this.#isConnected) return;

    this._isDeleting = true;

    let successCount = 0;
    let errorCount = 0;

    for (const id of this._selectedUpsells) {
      const { error } = await MerchelloApi.deleteUpsell(id);
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
        data: { headline: "Partial success", message: `Deleted ${successCount} of ${count} upsells` },
      });
    } else {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Upsells deleted", message: `${count} upsell${count !== 1 ? "s" : ""} deleted successfully` },
      });
    }

    this._selectedUpsells = new Set();
    this._loadUpsells();
  }

  private async _handleActivateSelected(): Promise<void> {
    for (const id of this._selectedUpsells) {
      await MerchelloApi.activateUpsell(id);
      if (!this.#isConnected) return;
    }
    this.#notificationContext?.peek("positive", {
      data: { headline: "Upsells activated", message: `${this._selectedUpsells.size} upsell(s) activated` },
    });
    this._selectedUpsells = new Set();
    this._loadUpsells();
  }

  private async _handleDeactivateSelected(): Promise<void> {
    for (const id of this._selectedUpsells) {
      await MerchelloApi.deactivateUpsell(id);
      if (!this.#isConnected) return;
    }
    this.#notificationContext?.peek("positive", {
      data: { headline: "Upsells deactivated", message: `${this._selectedUpsells.size} upsell(s) deactivated` },
    });
    this._selectedUpsells = new Set();
    this._loadUpsells();
  }

  private async _handleCreateUpsell(): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_CREATE_UPSELL_MODAL, {
      data: {},
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.id) {
      navigateToUpsellDetail(result.id);
    }
  }

  private _getDisplayLocationIcons(location: number): string[] {
    const icons: string[] = [];
    if (location & UpsellDisplayLocation.Checkout) icons.push("icon-credit-card");
    if (location & UpsellDisplayLocation.Basket) icons.push("icon-shopping-basket");
    if (location & UpsellDisplayLocation.ProductPage) icons.push("icon-box");
    if (location & UpsellDisplayLocation.Email) icons.push("icon-mailbox");
    if (location & UpsellDisplayLocation.Confirmation) icons.push("icon-check");
    return icons;
  }

  private _getCheckoutModeLabel(mode: CheckoutUpsellMode): string {
    switch (mode) {
      case CheckoutUpsellMode.Inline: return "Inline";
      case CheckoutUpsellMode.Interstitial: return "Interstitial";
      case CheckoutUpsellMode.OrderBump: return "Order Bump";
      case CheckoutUpsellMode.PostPurchase: return "Post Purchase";
      default: return mode;
    }
  }

  private _formatCtr(impressions: number, clicks: number): string {
    if (impressions === 0) return "0%";
    return `${formatNumber((clicks / impressions) * 100, 1)}%`;
  }

  private _renderTable(): unknown {
    const allSelected = this._upsells.length > 0 && this._upsells.every((u) => this._selectedUpsells.has(u.id));

    return html`
      <uui-table>
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;">
            <uui-checkbox
              .checked=${allSelected}
              @change=${(e: Event) => this._handleSelectAll((e.target as HTMLInputElement).checked)}
            ></uui-checkbox>
          </uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
          <uui-table-head-cell>Display</uui-table-head-cell>
          <uui-table-head-cell>Rules</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">Impressions</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">CTR</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">Conversions</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">Revenue</uui-table-head-cell>
        </uui-table-head>

        ${this._upsells.map(
          (upsell) => html`
            <uui-table-row
              @click=${() => this._handleRowClick(upsell)}
              style="cursor: pointer;"
            >
              <uui-table-cell @click=${(e: Event) => e.stopPropagation()}>
                <uui-checkbox
                  .checked=${this._selectedUpsells.has(upsell.id)}
                  @change=${(e: Event) =>
                    this._handleCheckboxChange(upsell.id, (e.target as HTMLInputElement).checked)}
                ></uui-checkbox>
              </uui-table-cell>
              <uui-table-cell>
                <div class="name-cell">
                  <strong>${upsell.name}</strong>
                  ${upsell.heading ? html`<small class="heading-preview">${upsell.heading}</small>` : nothing}
                </div>
              </uui-table-cell>
              <uui-table-cell>
                <uui-tag look="secondary" color=${upsell.statusColor}>${upsell.statusLabel}</uui-tag>
              </uui-table-cell>
              <uui-table-cell>
                <div class="display-cell">
                  <span class="checkout-mode-label">${this._getCheckoutModeLabel(upsell.checkoutMode)}</span>
                  <div class="display-icons">
                    ${this._getDisplayLocationIcons(upsell.displayLocation).map(
                      (icon) => html`<uui-icon name=${icon}></uui-icon>`
                    )}
                  </div>
                </div>
              </uui-table-cell>
              <uui-table-cell>
                <span class="rules-summary">
                  ${upsell.triggerRuleCount} trigger${upsell.triggerRuleCount !== 1 ? "s" : ""}
                  &rarr;
                  ${upsell.recommendationRuleCount} rec${upsell.recommendationRuleCount !== 1 ? "s" : ""}
                </span>
              </uui-table-cell>
              <uui-table-cell style="text-align: right;">${formatNumber(upsell.totalImpressions)}</uui-table-cell>
              <uui-table-cell style="text-align: right;">${this._formatCtr(upsell.totalImpressions, upsell.totalClicks)}</uui-table-cell>
              <uui-table-cell style="text-align: right;">${formatNumber(upsell.totalConversions)}</uui-table-cell>
              <uui-table-cell style="text-align: right;">${formatCurrency(upsell.totalRevenue, this.#currencyCode, this.#currencySymbol)}</uui-table-cell>
            </uui-table-row>
          `
        )}
      </uui-table>

      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }
    if (this._errorMessage) {
      return html`<div class="error">${this._errorMessage}</div>`;
    }
    if (this._upsells.length === 0) {
      return html`
        <merchello-empty-state
          icon="icon-trending-up"
          headline="No upsells found"
          message="Create your first upsell rule to recommend products to your customers.">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label="Create upsell"
            @click=${this._handleCreateUpsell}
          >Create upsell</uui-button>
        </merchello-empty-state>
      `;
    }
    return this._renderTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="upsells-container">
          <div class="header-actions">
            ${this._selectedUpsells.size > 0
              ? html`
                  <uui-button look="primary" color="positive" label="Activate" @click=${this._handleActivateSelected}>
                    Activate (${this._selectedUpsells.size})
                  </uui-button>
                  <uui-button look="secondary" label="Deactivate" @click=${this._handleDeactivateSelected}>
                    Deactivate (${this._selectedUpsells.size})
                  </uui-button>
                  <uui-button
                    look="primary"
                    color="danger"
                    label="Delete"
                    ?disabled=${this._isDeleting}
                    @click=${this._handleDeleteSelected}
                  >
                    ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedUpsells.size})`}
                  </uui-button>
                `
              : nothing}
            <uui-button look="primary" color="positive" label="Create upsell" @click=${this._handleCreateUpsell}>
              Create upsell
            </uui-button>
          </div>

          <div class="search-tabs-row">
            <div class="search-box">
              <uui-input
                type="text"
                placeholder="Search upsells by name..."
                .value=${this._searchTerm}
                @input=${this._handleSearchInput}
                label="Search upsells"
              >
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm
                  ? html`
                      <uui-button slot="append" compact look="secondary" label="Clear search" @click=${this._handleSearchClear}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    `
                  : nothing}
              </uui-input>
            </div>

            <uui-tab-group>
              <uui-tab label="All" ?active=${this._activeTab === "all"} @click=${() => this._handleTabClick("all")}>All</uui-tab>
              <uui-tab label="Active" ?active=${this._activeTab === "active"} @click=${() => this._handleTabClick("active")}>Active</uui-tab>
              <uui-tab label="Scheduled" ?active=${this._activeTab === "scheduled"} @click=${() => this._handleTabClick("scheduled")}>Scheduled</uui-tab>
              <uui-tab label="Draft" ?active=${this._activeTab === "draft"} @click=${() => this._handleTabClick("draft")}>Draft</uui-tab>
              <uui-tab label="Disabled" ?active=${this._activeTab === "disabled"} @click=${() => this._handleTabClick("disabled")}>Disabled</uui-tab>
              <uui-tab label="Expired" ?active=${this._activeTab === "expired"} @click=${() => this._handleTabClick("expired")}>Expired</uui-tab>
            </uui-tab-group>
          </div>

          ${this._renderContent()}
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

    .upsells-container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      justify-content: flex-end;
      margin-bottom: var(--uui-size-space-4);
    }

    .search-tabs-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    @media (min-width: 768px) {
      .search-tabs-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .search-box {
      flex: 1;
      max-width: 400px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .search-box uui-icon[slot="prepend"] {
      color: var(--uui-color-text-alt);
    }

    .name-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .heading-preview {
      color: var(--uui-color-text-alt);
      font-size: 0.85em;
    }

    .display-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .checkout-mode-label {
      font-size: 0.85em;
      font-weight: 600;
    }

    .display-icons {
      display: flex;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
    }

    .rules-summary {
      font-size: 0.9em;
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `;
}

export default MerchelloUpsellsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-upsells-list": MerchelloUpsellsListElement;
  }
}
