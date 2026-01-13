import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { ProductCollectionDto } from '@products/types/product.types.js';
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_COLLECTION_MODAL } from "../modals/collection-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-collections-workspace")
export class MerchelloCollectionsWorkspaceElement extends UmbElementMixin(LitElement) {
  @state() private _collections: ProductCollectionDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isDeleting: string | null = null;
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

  private async _loadCollections(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getProductCollections();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._collections = data;
    }

    this._isLoading = false;
  }

  private get _filteredCollections(): ProductCollectionDto[] {
    if (!this._searchTerm.trim()) {
      return this._collections;
    }
    const term = this._searchTerm.toLowerCase().trim();
    return this._collections.filter(c =>
      c.name.toLowerCase().includes(term)
    );
  }

  private _handleSearchInput(e: Event): void {
    this._searchTerm = (e.target as HTMLInputElement).value;
  }

  private async _handleAddCollection(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_COLLECTION_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isCreated) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Collection created", message: "The collection has been created successfully" }
      });
      this._loadCollections();
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
        data: { headline: "Collection updated", message: "The collection has been updated successfully" }
      });
      this._loadCollections();
    }
  }

  private async _handleDelete(e: Event, collection: ProductCollectionDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    // Build confirmation message based on product count
    let content = `Are you sure you want to delete the collection "${collection.name}"?`;
    if (collection.productCount > 0) {
      content = `This collection is used by ${collection.productCount} product${collection.productCount === 1 ? '' : 's'}. Deleting it will remove the collection from all these products. Are you sure you want to delete "${collection.name}"?`;
    }

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Collection",
        content,
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

    this._isDeleting = collection.id;

    const { error } = await MerchelloApi.deleteProductCollection(collection.id);

    if (!this.#isConnected) return;

    this._isDeleting = null;

    if (error) {
      this._errorMessage = `Failed to delete collection: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete collection" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Collection deleted", message: "The collection has been deleted successfully" }
    });
    this._loadCollections();
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-tag"
        headline="No collections yet"
        message="Create collections to organize and group your products for easier management and customer browsing.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Collection"
          @click=${this._handleAddCollection}>
          Add Collection
        </uui-button>
      </div>
    `;
  }

  private _renderCollectionRow(collection: ProductCollectionDto): unknown {
    const isDeleting = this._isDeleting === collection.id;

    return html`
      <uui-table-row class="clickable" @click=${() => this._handleEditCollection(collection)}>
        <uui-table-cell>
          <div class="collection-info">
            <span class="collection-name">${collection.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>${collection.productCount}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(e: Event) => { e.stopPropagation(); this._handleEditCollection(collection); }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${isDeleting}
              @click=${(e: Event) => this._handleDelete(e, collection)}>
              <uui-icon name="${isDeleting ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderCollectionsTable(): unknown {
    const filtered = this._filteredCollections;

    if (filtered.length === 0 && this._searchTerm.trim()) {
      return html`
        <div class="no-results">
          <uui-icon name="icon-search"></uui-icon>
          <span>No collections match "${this._searchTerm}"</span>
        </div>
      `;
    }

    return html`
      <div class="table-container">
        <uui-table class="collection-table">
          <uui-table-head>
            <uui-table-head-cell>Collection</uui-table-head-cell>
            <uui-table-head-cell>Products</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${filtered.map((c) => this._renderCollectionRow(c))}
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
    if (this._collections.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderCollectionsTable();
  }

  override render() {
    const showSearch = this._collections.length > 0 && !this._isLoading;

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="collections-container">
          <!-- Header Actions -->
          <div class="header-actions">
            ${showSearch ? html`
              <uui-input
                id="search-input"
                type="search"
                placeholder="Search collections..."
                .value=${this._searchTerm}
                @input=${this._handleSearchInput}>
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
              </uui-input>
            ` : nothing}
            <uui-button
              look="primary"
              color="positive"
              label="Add Collection"
              @click=${this._handleAddCollection}>
              Add Collection
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Collections help you organize products into groups for easier management and can be used for filtering in your storefront.</span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .collections-container {
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

      #search-input {
        width: 300px;
      }

      .info-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: flex-start;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .info-banner uui-icon {
        flex-shrink: 0;
        color: var(--uui-color-interactive);
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .collection-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .collection-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .collection-name {
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
      }

      .empty-action {
        display: flex;
        justify-content: center;
        margin-top: var(--uui-size-space-4);
      }

      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .no-results uui-icon {
        font-size: 2rem;
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
