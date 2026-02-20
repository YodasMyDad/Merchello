import { LitElement, css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_CONFIRM_MODAL, UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { ProductFeedListItemDto } from "@product-feed/types/product-feed.types.js";
import { MERCHELLO_PRODUCT_FEED_VALIDATION_MODAL } from "@product-feed/modals/product-feed-validation-modal.token.js";
import type { PageChangeEventDetail, PaginationState } from "@shared/types/pagination.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { formatRelativeDate } from "@shared/utils/formatting.js";
import { getProductFeedCreateHref, getProductFeedDetailHref } from "@shared/utils/navigation.js";
import "@shared/components/merchello-empty-state.element.js";
import "@shared/components/pagination.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

type FeedFilterTab = "all" | "enabled" | "disabled";
type FeedHealthStatus = {
  label: string;
  color: "positive" | "warning" | "danger" | "default";
  title: string;
};

@customElement("merchello-product-feeds-list")
export class MerchelloProductFeedsListElement extends UmbElementMixin(LitElement) {
  @state() private _feeds: ProductFeedListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _search = "";
  @state() private _filterTab: FeedFilterTab = "all";
  @state() private _page = 1;
  @state() private _pageSize = 25;
  @state() private _isRebuildingId: string | null = null;
  @state() private _isDeletingId: string | null = null;

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });

    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._initialize();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
  }

  private async _initialize(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;

    this._pageSize = settings.defaultPaginationPageSize;
    await this._loadFeeds();
  }

  private async _loadFeeds(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getProductFeeds();
    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._feeds = data ?? [];
    this._isLoading = false;
  }

  private _onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    this._searchDebounceTimer = setTimeout(() => {
      this._search = value;
      this._page = 1;
    }, 250);
  }

  private _clearSearch(): void {
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
    this._search = "";
    this._page = 1;
  }

  private _setFilter(tab: FeedFilterTab): void {
    this._filterTab = tab;
    this._page = 1;
  }

  private _onPageChange(event: CustomEvent<PageChangeEventDetail>): void {
    this._page = event.detail.page;
  }

  private _getFilteredFeeds(): ProductFeedListItemDto[] {
    const search = this._search.trim().toLowerCase();

    return this._feeds.filter((feed) => {
      if (this._filterTab === "enabled" && !feed.isEnabled) return false;
      if (this._filterTab === "disabled" && feed.isEnabled) return false;

      if (!search) return true;

      return (
        feed.name.toLowerCase().includes(search) ||
        feed.slug.toLowerCase().includes(search) ||
        feed.countryCode.toLowerCase().includes(search) ||
        feed.currencyCode.toLowerCase().includes(search)
      );
    });
  }

  private _getPagedFeeds(): ProductFeedListItemDto[] {
    const filtered = this._getFilteredFeeds();
    const start = (this._page - 1) * this._pageSize;
    return filtered.slice(start, start + this._pageSize);
  }

  private _getPaginationState(): PaginationState {
    const totalItems = this._getFilteredFeeds().length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this._pageSize));

    if (this._page > totalPages) {
      this._page = totalPages;
    }

    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems,
      totalPages,
    };
  }

  private async _rebuildFeed(feed: ProductFeedListItemDto, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    this._isRebuildingId = feed.id;
    const { data, error } = await MerchelloApi.rebuildProductFeed(feed.id);
    if (!this.#isConnected) return;

    this._isRebuildingId = null;

    if (error || !data) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Rebuild failed",
          message: error?.message ?? "Unable to rebuild feed.",
        },
      });
      return;
    }

    if (!data.success) {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Rebuild completed with error",
          message: data.error ?? "Feed rebuild failed.",
        },
      });
    } else {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${data.productItemCount} products and ${data.promotionCount} promotions generated.`,
        },
      });
    }

    await this._loadFeeds();
  }

  private async _deleteFeed(feed: ProductFeedListItemDto, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = await this._confirmDeleteFeed(feed);
    if (!confirmed) {
      return;
    }

    this._isDeletingId = feed.id;
    const { error } = await MerchelloApi.deleteProductFeed(feed.id);
    if (!this.#isConnected) return;

    this._isDeletingId = null;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Delete failed",
          message: error.message,
        },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Feed deleted",
        message: `"${feed.name}" was deleted.`,
      },
    });

    await this._loadFeeds();
  }

  private async _confirmDeleteFeed(feed: ProductFeedListItemDto): Promise<boolean> {
    if (!this.#modalManager) {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Action unavailable",
          message: "Delete confirmation is not available right now. Refresh and try again.",
        },
      });
      return false;
    }

    const modalContext = this.#modalManager.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Product Feed",
        content: `Delete "${feed.name}"? This cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext.onSubmit();
      return true;
    } catch {
      return false;
    }
  }

  private async _validateFeed(feed: ProductFeedListItemDto, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.#modalManager) {
      return;
    }

    const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_FEED_VALIDATION_MODAL, {
      data: {
        feedId: feed.id,
        feedName: feed.name,
      },
    });

    await modal.onSubmit().catch(() => undefined);
  }

  private _renderLoading(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderError(): unknown {
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderEmpty(): unknown {
    const hasFilters = this._search.trim().length > 0 || this._filterTab !== "all";

    if (hasFilters) {
      return html`
        <merchello-empty-state
          icon="icon-search"
          headline="No matching feeds"
          message="Try adjusting your search or filters.">
        </merchello-empty-state>
      `;
    }

    return html`
      <merchello-empty-state
        icon="icon-rss"
        headline="No product feeds created"
        message="Create a feed to publish Google Shopping product and promotion XML.">
        <uui-button slot="action" look="primary" color="positive" href=${getProductFeedCreateHref()}>
          Create Feed
        </uui-button>
      </merchello-empty-state>
    `;
  }

  private _getFeedEndpointPath(feed: ProductFeedListItemDto): string {
    return `/api/merchello/feeds/${feed.slug}.xml`;
  }

  private _getFeedHealthStatus(feed: ProductFeedListItemDto): FeedHealthStatus {
    if (feed.lastGenerationError) {
      return {
        label: "Error",
        color: "danger",
        title: feed.lastGenerationError,
      };
    }

    if (!feed.lastGeneratedUtc) {
      return {
        label: "Not Generated",
        color: "default",
        title: "No generation run has completed yet.",
      };
    }

    return {
      label: "Healthy",
      color: "positive",
      title: "Last generation completed without recorded errors.",
    };
  }

  private _renderFeedRow(feed: ProductFeedListItemDto): unknown {
    const isRebuilding = this._isRebuildingId === feed.id;
    const isDeleting = this._isDeletingId === feed.id;
    const healthStatus = this._getFeedHealthStatus(feed);
    const feedPath = this._getFeedEndpointPath(feed);

    return html`
      <uui-table-row class="clickable" href=${getProductFeedDetailHref(feed.id)}>
        <uui-table-cell>
          <div class="feed-name-block">
            <a class="feed-name" href=${getProductFeedDetailHref(feed.id)}>${feed.name}</a>
            <span class="feed-slug">${feedPath}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>${feed.countryCode}</uui-table-cell>
        <uui-table-cell>${feed.currencyCode}</uui-table-cell>
        <uui-table-cell>${feed.languageCode}</uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${feed.isEnabled ? "positive" : "default"}>
            ${feed.isEnabled ? "Enabled" : "Disabled"}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell>
          ${feed.lastGeneratedUtc ? formatRelativeDate(feed.lastGeneratedUtc) : "Never"}
        </uui-table-cell>
        <uui-table-cell>
          <div class="snapshot-tags">
            <uui-tag
              color=${feed.hasProductSnapshot ? "positive" : "default"}
              title="Products XML snapshot">
              ${feed.hasProductSnapshot ? "Products Ready" : "Products Missing"}
            </uui-tag>
            <uui-tag
              color=${feed.hasPromotionsSnapshot ? "positive" : "default"}
              title="Promotions XML snapshot">
              ${feed.hasPromotionsSnapshot ? "Promotions Ready" : "Promotions Missing"}
            </uui-tag>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${healthStatus.color} title=${healthStatus.title}>
            ${healthStatus.label}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions">
            <uui-button
              compact
              look="secondary"
              href=${getProductFeedDetailHref(feed.id)}
              label="Edit">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              ?disabled=${isRebuilding}
              @click=${(event: Event) => this._rebuildFeed(feed, event)}
              label="Rebuild">
              <uui-icon name=${isRebuilding ? "icon-hourglass" : "icon-sync"}></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              @click=${(event: Event) => this._validateFeed(feed, event)}
              label="Validate">
              <uui-icon name="icon-search"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              color="danger"
              ?disabled=${isDeleting}
              @click=${(event: Event) => this._deleteFeed(feed, event)}
              label="Delete">
              <uui-icon name=${isDeleting ? "icon-hourglass" : "icon-trash"}></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderTable(): unknown {
    const pageFeeds = this._getPagedFeeds();

    if (pageFeeds.length === 0) {
      return this._renderEmpty();
    }

    return html`
      <div class="table-container">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Country</uui-table-head-cell>
            <uui-table-head-cell>Currency</uui-table-head-cell>
            <uui-table-head-cell>Lang</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Last Generated</uui-table-head-cell>
            <uui-table-head-cell>Snapshots</uui-table-head-cell>
            <uui-table-head-cell>Health</uui-table-head-cell>
            <uui-table-head-cell>Actions</uui-table-head-cell>
          </uui-table-head>
          ${pageFeeds.map((feed) => this._renderFeedRow(feed))}
        </uui-table>
      </div>
    `;
  }

  override render() {
    const pagination = this._getPaginationState();

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="product-feeds-container layout-container">
          <div class="filters">
            <div class="filters-top">
              <div class="search-box">
                <uui-input
                  type="text"
                  label="Search feeds"
                  .value=${this._search}
                  placeholder="Search by name, slug, country, or currency"
                  @input=${this._onSearchInput}>
                  <uui-icon slot="prepend" name="icon-search"></uui-icon>
                  ${this._search
                    ? html`
                        <uui-button
                          slot="append"
                          compact
                          look="secondary"
                          label="Clear search"
                          @click=${this._clearSearch}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      `
                    : nothing}
                </uui-input>
              </div>
              <div class="header-actions">
                <uui-button look="primary" color="positive" href=${getProductFeedCreateHref()}>
                  <uui-icon name="icon-add" slot="icon"></uui-icon>
                  Create Feed
                </uui-button>
              </div>
            </div>

            <uui-tab-group class="tabs">
              <uui-tab
                label="All"
                ?active=${this._filterTab === "all"}
                @click=${() => this._setFilter("all")}>
                All
              </uui-tab>
              <uui-tab
                label="Enabled"
                ?active=${this._filterTab === "enabled"}
                @click=${() => this._setFilter("enabled")}>
                Enabled
              </uui-tab>
              <uui-tab
                label="Disabled"
                ?active=${this._filterTab === "disabled"}
                @click=${() => this._setFilter("disabled")}>
                Disabled
              </uui-tab>
            </uui-tab-group>
          </div>

          ${this._isLoading
            ? this._renderLoading()
            : this._errorMessage
              ? this._renderError()
              : this._renderTable()}

          ${!this._isLoading && pagination.totalItems > 0
            ? html`
                <merchello-pagination
                  .state=${pagination}
                  @page-change=${this._onPageChange}>
                </merchello-pagination>
              `
            : nothing}
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = [
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

    .table-container {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
      margin-bottom: var(--uui-size-space-4);
    }

    uui-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
      vertical-align: middle;
    }

    .feed-name-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .feed-name {
      color: var(--uui-color-interactive);
      font-weight: 600;
      text-decoration: none;
    }

    .feed-slug {
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .snapshot-tags {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      flex-wrap: wrap;
    }

    .snapshot-tags uui-tag {
      white-space: nowrap;
    }

    .actions {
      display: flex;
      gap: 4px;
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
    }

    @media (max-width: 900px) {
      .header-actions {
        justify-content: flex-start;
      }
    }
  `,
  ];
}

export default MerchelloProductFeedsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-feeds-list": MerchelloProductFeedsListElement;
  }
}
