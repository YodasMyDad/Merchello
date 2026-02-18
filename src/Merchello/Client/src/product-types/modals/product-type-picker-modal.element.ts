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
import type { ProductTypePickerModalData, ProductTypePickerModalValue } from "@product-types/modals/product-type-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductTypeDto } from "@product-types/types/product-types.types.js";

@customElement("merchello-product-type-picker-modal")
export class MerchelloProductTypePickerModalElement extends UmbModalBaseElement<
  ProductTypePickerModalData,
  ProductTypePickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _searchTerm = "";

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadProductTypes();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadProductTypes(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getProductTypes();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    const excludeIds = this.data?.excludeIds ?? [];
    this._productTypes = (data ?? []).filter((t) => !excludeIds.includes(t.id));
    this._isLoading = false;
  }

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _filteredProductTypes(): ProductTypeDto[] {
    const sorted = [...this._productTypes].sort((a, b) => a.name.localeCompare(b.name));
    const term = this._searchTerm.trim().toLowerCase();
    if (!term) {
      return sorted;
    }

    return sorted.filter((productType) =>
      [productType.name, productType.alias ?? ""].some((value) => value.toLowerCase().includes(term))
    );
  }

  private get _tableConfig(): UmbTableConfig {
    return {
      allowSelection: true,
    };
  }

  private get _tableColumns(): Array<UmbTableColumn> {
    return [
      { name: "Name", alias: "name" },
      { name: "Alias", alias: "alias", width: "240px" },
    ];
  }

  private _createTableItems(productTypes: ProductTypeDto[]): Array<UmbTableItem> {
    return productTypes.map((productType) => ({
      id: productType.id,
      icon: "icon-tag",
      data: [
        {
          columnAlias: "name",
          value: productType.name,
        },
        {
          columnAlias: "alias",
          value: productType.alias?.trim() || "Not set",
        },
      ],
    }));
  }

  private _applySelection(selectedIds: string[]): void {
    const availableIds = new Set(this._productTypes.map((productType) => productType.id));
    const nextSelection = selectedIds.filter((id) => availableIds.has(id));
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
    const productTypeById = new Map(this._productTypes.map((productType) => [productType.id, productType]));
    const selectedProductTypes = this._selectedIds
      .map((id) => productTypeById.get(id))
      .filter((productType): productType is ProductTypeDto => Boolean(productType));

    this.value = {
      selectedIds: selectedProductTypes.map((productType) => productType.id),
      selectedNames: selectedProductTypes.map((productType) => productType.name),
      selectedAliases: selectedProductTypes.map((productType) => productType.alias ?? null),
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
          <uui-button look="secondary" label="Retry" @click=${() => this._loadProductTypes()}>
            Retry
          </uui-button>
        </div>
      `;
    }

    if (this._productTypes.length === 0) {
      return html`<p class="empty-state">No product types available.</p>`;
    }

    if (this._filteredProductTypes.length === 0) {
      return html`<p class="empty-state">No product types match your search.</p>`;
    }

    return html`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredProductTypes)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedIds.length;
    const submitLabel = this._isMultiSelect ? `Add Selected (${selectedCount})` : "Add Product Type";

    return html`
      <umb-body-layout headline="Select Product Types">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search product types"
              placeholder="Search by name or alias"
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
          .label=${submitLabel}
          look="primary"
          color="positive"
          ?disabled=${selectedCount === 0}
          @click=${this._handleSubmit}>
          ${submitLabel}
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
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
      align-items: center;
      background: var(--uui-color-danger-standalone);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger-contrast);
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
      padding: var(--uui-size-space-3);
    }
  `;
}

export default MerchelloProductTypePickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-type-picker-modal": MerchelloProductTypePickerModalElement;
  }
}
