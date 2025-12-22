import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { CollectionPickerModalData, CollectionPickerModalValue } from "./collection-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductCollectionDto } from "@products/types/product.types.js";

@customElement("merchello-collection-picker-modal")
export class MerchelloCollectionPickerModalElement extends UmbModalBaseElement<
  CollectionPickerModalData,
  CollectionPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _selectedNames: string[] = [];
  @state() private _collections: ProductCollectionDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

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

  private _toggleSelection(collection: ProductCollectionDto): void {
    const multiSelect = this.data?.multiSelect !== false; // default to true

    if (this._selectedIds.includes(collection.id)) {
      // Remove from selection - find the index and remove from both arrays
      const index = this._selectedIds.indexOf(collection.id);
      this._selectedIds = this._selectedIds.filter((_, i) => i !== index);
      this._selectedNames = this._selectedNames.filter((_, i) => i !== index);
    } else {
      if (multiSelect) {
        this._selectedIds = [...this._selectedIds, collection.id];
        this._selectedNames = [...this._selectedNames, collection.name];
      } else {
        this._selectedIds = [collection.id];
        this._selectedNames = [collection.name];
      }
    }
  }

  private _handleSubmit(): void {
    this.value = {
      selectedIds: this._selectedIds,
      selectedNames: this._selectedNames,
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderCollectionRow(collection: ProductCollectionDto): unknown {
    const isSelected = this._selectedIds.includes(collection.id);

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(collection)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            .checked=${isSelected}
            @change=${(e: Event) => {
              e.stopPropagation();
              this._toggleSelection(collection);
            }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="collection-info">
            <uui-icon name="icon-folder"></uui-icon>
            <span class="collection-name">${collection.name}</span>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`<div class="error-banner">${this._errorMessage}</div>`;
    }

    if (this._collections.length === 0) {
      return html`<p class="empty-state">No collections available.</p>`;
    }

    return html`
      <uui-table class="collections-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Collection</uui-table-head-cell>
        </uui-table-head>
        ${this._collections.map((collection) => this._renderCollectionRow(collection))}
      </uui-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedIds.length;

    return html`
      <umb-body-layout headline="Select Collections">
        <div id="main">
          <div class="results-container">${this._renderContent()}</div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Add Selected"
            look="primary"
            color="positive"
            ?disabled=${selectedCount === 0}
            @click=${this._handleSubmit}>
            Add Selected (${selectedCount})
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .collections-table {
      width: 100%;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
    }

    .collection-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .collection-name {
      font-weight: 500;
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
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloCollectionPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-collection-picker-modal": MerchelloCollectionPickerModalElement;
  }
}
