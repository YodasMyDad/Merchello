import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  UmbTableColumn,
  UmbTableConfig,
  UmbTableDeselectedEvent,
  UmbTableElement,
  UmbTableItem,
  UmbTableSelectedEvent,
} from "@umbraco-cms/backoffice/components";
import type { CollectionPickerModalData, CollectionPickerModalValue } from "@collections/modals/collection-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductCollectionDto } from "@products/types/product.types.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-collection-picker-modal")
export class MerchelloCollectionPickerModalElement extends UmbModalBaseElement<
  CollectionPickerModalData,
  CollectionPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _collections: ProductCollectionDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _searchTerm = "";

  #isConnected = false;

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

    // Filter out excluded collections
    const excludeIds = this.data?.excludeIds ?? [];
    this._collections = (data ?? []).filter((c) => !excludeIds.includes(c.id));
    this._isLoading = false;
  }

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _filteredCollections(): ProductCollectionDto[] {
    const sortedCollections = [...this._collections].sort((a, b) => a.name.localeCompare(b.name));
    if (!this._searchTerm.trim()) {
      return sortedCollections;
    }
    const term = this._searchTerm.toLowerCase().trim();
    return sortedCollections.filter((collection) => collection.name.toLowerCase().includes(term));
  }

  private get _tableConfig(): UmbTableConfig {
    return {
      allowSelection: true,
    };
  }

  private get _tableColumns(): Array<UmbTableColumn> {
    return [
      { name: "Collection", alias: "collectionName" },
      { name: "Products", alias: "productCount", width: "120px", align: "right" },
    ];
  }

  private _createTableItems(collections: ProductCollectionDto[]): Array<UmbTableItem> {
    return collections.map((collection) => ({
      id: collection.id,
      icon: "icon-folder",
      data: [
        {
          columnAlias: "collectionName",
          value: collection.name,
        },
        {
          columnAlias: "productCount",
          value: collection.productCount,
        },
      ],
    }));
  }

  private _applySelection(selectedIds: string[]): void {
    const visibleCollectionIds = new Set(this._collections.map((collection) => collection.id));
    const nextSelection = selectedIds.filter((id) => visibleCollectionIds.has(id));
    this._selectedIds = this._isMultiSelect ? nextSelection : nextSelection.slice(0, 1);
  }

  private _handleTableSelected(event: UmbTableSelectedEvent): void {
    event.stopPropagation();
    const table = event.target as UmbTableElement;

    if (this._isMultiSelect) {
      this._applySelection(table.selection);
      return;
    }

    const addedId = table.selection.find((id) => !this._selectedIds.includes(id));
    if (addedId) {
      this._applySelection([addedId]);
      return;
    }

    this._applySelection(table.selection.slice(0, 1));
  }

  private _handleTableDeselected(event: UmbTableDeselectedEvent): void {
    event.stopPropagation();
    const table = event.target as UmbTableElement;
    this._applySelection(table.selection);
  }

  private _handleSearchInput(event: Event): void {
    this._searchTerm = (event.target as HTMLInputElement).value;
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
  }

  private _handleSubmit(): void {
    const collectionById = new Map(this._collections.map((collection) => [collection.id, collection]));
    const selectedCollections = this._selectedIds
      .map((id) => collectionById.get(id))
      .filter((collection): collection is ProductCollectionDto => Boolean(collection));

    this.value = {
      selectedIds: selectedCollections.map((collection) => collection.id),
      selectedNames: selectedCollections.map((collection) => collection.name),
      selectedCounts: selectedCollections.map((collection) => collection.productCount),
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadCollections()}>
            Retry
          </uui-button>
        </div>
      `;
    }

    if (this._collections.length === 0) {
      return html`<p class="empty-state">No collections available.</p>`;
    }

    if (this._filteredCollections.length === 0) {
      return html`<p class="empty-state">No collections match your search.</p>`;
    }

    return html`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredCollections)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedIds.length;

    return html`
      <umb-body-layout headline="Select Collections">
        <div id="main">
          <div class="toolbar">
            <uui-input
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
                : ""}
            </uui-input>
          </div>
          <div class="results-container">${this._renderContent()}</div>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label="Add selected collections"
          look="primary"
          color="positive"
          ?disabled=${selectedCount === 0}
          @click=${this._handleSubmit}>
          Add Selected (${selectedCount})
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    .toolbar uui-input {
      width: 100%;
    }

    .toolbar uui-icon[slot="prepend"] {
      margin-left: 2px;
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .empty-state {
      color: var(--uui-color-text-alt);
      text-align: center;
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

export default MerchelloCollectionPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-collection-picker-modal": MerchelloCollectionPickerModalElement;
  }
}

