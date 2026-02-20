import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { ProductCollectionDto } from '@products/types/product.types.js';
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_COLLECTION_MODAL } from "@collections/modals/collection-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-collections-workspace")
export class MerchelloCollectionsWorkspaceElement extends UmbElementMixin(LitElement) {
  @state() private _collections: ProductCollectionDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isDeletingCollectionId: string | null = null;
  @state() private _searchTerm: string = "";

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
    this._loadCollections();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadCollections(showLoading = true): Promise<void> {
    if (showLoading) {
      this._isLoading = true;
    }
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getProductCollections();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._collections = data ?? [];

    this._isLoading = false;
  }

  private get _filteredCollections(): ProductCollectionDto[] {
    const sortedCollections = [...this._collections].sort((a, b) => a.name.localeCompare(b.name));
    if (!this._searchTerm.trim()) {
      return sortedCollections;
    }

    const term = this._searchTerm.toLowerCase().trim();
    return sortedCollections.filter((collection) =>
      collection.name.toLowerCase().includes(term),
    );
  }

  private _handleSearchInput(event: Event): void {
    this._searchTerm = (event.target as HTMLInputElement).value;
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
  }

  private async _handleAddCollection(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_COLLECTION_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;

    if (result?.isCreated) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Collection created", message: "The collection has been created." },
      });
      await this._loadCollections(false);
    }
  }

  private async _handleEditCollection(collection: ProductCollectionDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_COLLECTION_MODAL, {
      data: { collection },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;

    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Collection updated", message: "The collection has been updated." },
      });
      await this._loadCollections(false);
    }
  }

  private async _handleDelete(event: Event, collection: ProductCollectionDto): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const usageMessage = collection.productCount > 0
      ? ` It is currently assigned to ${collection.productCount} product${collection.productCount === 1 ? "" : "s"} and will be removed from those products.`
      : "";

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete collection",
        content: `Delete "${collection.name}"?${usageMessage} This action cannot be undone.`,
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

    this._isDeletingCollectionId = collection.id;

    const { error } = await MerchelloApi.deleteProductCollection(collection.id);

    if (!this.#isConnected) return;

    this._isDeletingCollectionId = null;

    if (error) {
      this._errorMessage = `Failed to delete collection: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Delete failed", message: error.message || "Could not delete collection." },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Collection deleted", message: "The collection has been deleted." },
    });
    await this._loadCollections(false);
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <uui-box>
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadCollections()}>
            Retry
          </uui-button>
        </div>
      </uui-box>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-tag"
        headline="No collections yet"
        message="Create collections to organize and group your products.">
        <uui-button slot="actions" look="primary" color="positive" label="Add collection" @click=${this._handleAddCollection}>
          Add Collection
        </uui-button>
      </merchello-empty-state>
    `;
  }

  private _renderNoResultsState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-search"
        headline="No matching collections"
        message="Try a different search term or clear the current filter.">
        <uui-button slot="actions" look="secondary" label="Clear search" @click=${this._handleSearchClear}>
          Clear Search
        </uui-button>
      </merchello-empty-state>
    `;
  }

  private _renderCollectionsTable(): unknown {
    const filteredCollections = this._filteredCollections;

    return html`
      <uui-box class="table-box">
        <div class="table-scroll">
          <uui-table class="collection-table">
            <uui-table-head>
              <uui-table-head-cell>Collection</uui-table-head-cell>
              <uui-table-head-cell class="numeric-col">Products</uui-table-head-cell>
              <uui-table-head-cell class="actions-col">Actions</uui-table-head-cell>
            </uui-table-head>
            ${filteredCollections.map((collection) => this._renderCollectionRow(collection))}
          </uui-table>
        </div>
      </uui-box>
    `;
  }

  private _renderCollectionRow(collection: ProductCollectionDto): unknown {
    const isDeleting = this._isDeletingCollectionId === collection.id;

    return html`
      <uui-table-row class="clickable" @click=${() => this._handleEditCollection(collection)}>
        <uui-table-cell>
          <span class="collection-name">${collection.name}</span>
        </uui-table-cell>
        <uui-table-cell class="numeric-col">${collection.productCount}</uui-table-cell>
        <uui-table-cell class="actions-col">
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label=${`Edit collection ${collection.name}`}
              @click=${(event: Event) => {
                event.stopPropagation();
                this._handleEditCollection(collection);
              }}>
              Edit
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              compact
              label=${`Delete collection ${collection.name}`}
              ?disabled=${isDeleting}
              @click=${(event: Event) => this._handleDelete(event, collection)}>
              ${isDeleting ? "Deleting..." : "Delete"}
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._collections.length === 0) {
      return this._renderEmptyState();
    }
    if (this._filteredCollections.length === 0) {
      return this._renderNoResultsState();
    }
    return this._renderCollectionsTable();
  }

  override render() {
    const showSearch = this._collections.length > 0 && !this._isLoading;

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="collections-container layout-container">
          <div class="filters">
            <div class="filters-top">
              ${showSearch
                ? html`
                    <div class="search-box">
                      <uui-input
                        id="search-input"
                        type="search"
                        label="Search collections"
                        placeholder="Search collections"
                        .value=${this._searchTerm}
                        @input=${this._handleSearchInput}>
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
                  `
                : nothing}
              <div class="header-actions">
                <uui-button look="primary" color="positive" label="Add collection" @click=${this._handleAddCollection}>
                  Add Collection
                </uui-button>
              </div>
            </div>
          </div>

          <uui-box>
            <p class="helper-text">
              Collections group products for merchandising, filtering, and storefront browsing.
            </p>
          </uui-box>

          ${this._renderContent()}
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

      .helper-text {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .table-box {
        --uui-box-default-padding: 0;
        overflow: hidden;
      }

      .table-scroll {
        overflow-x: auto;
      }

      .collection-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .collection-name {
        color: var(--uui-color-interactive);
        font-weight: 600;
      }

      .numeric-col {
        text-align: right;
      }

      .actions-col {
        text-align: right;
        white-space: nowrap;
      }

      .actions-cell {
        display: inline-flex;
        gap: var(--uui-size-space-2);
        justify-content: flex-end;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex-wrap: wrap;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }
    `,
  ];
}

export default MerchelloCollectionsWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-collections-workspace": MerchelloCollectionsWorkspaceElement;
  }
}
