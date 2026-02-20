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
import type { WarehousePickerModalData, WarehousePickerModalValue } from "@warehouses/modals/warehouse-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-warehouse-picker-modal")
export class MerchelloWarehousePickerModalElement extends UmbModalBaseElement<
  WarehousePickerModalData,
  WarehousePickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _warehouses: WarehouseListDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _searchTerm = "";

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadWarehouses();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadWarehouses(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getWarehousesList();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    const excludeIds = this.data?.excludeIds ?? [];
    this._warehouses = (data ?? []).filter((warehouse) => !excludeIds.includes(warehouse.id));
    this._isLoading = false;
  }

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _sortedWarehouses(): WarehouseListDto[] {
    return [...this._warehouses].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }

  private get _filteredWarehouses(): WarehouseListDto[] {
    const normalizedSearch = this._searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return this._sortedWarehouses;
    }

    return this._sortedWarehouses.filter((warehouse) =>
      [warehouse.name ?? "", warehouse.code ?? "", warehouse.supplierName ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    );
  }

  private get _tableConfig(): UmbTableConfig {
    return {
      allowSelection: true,
    };
  }

  private get _tableColumns(): Array<UmbTableColumn> {
    return [
      { name: "Warehouse", alias: "warehouseName" },
      { name: "Code", alias: "warehouseCode", width: "150px" },
      { name: "Supplier", alias: "supplierName", width: "220px" },
      { name: "Regions", alias: "serviceRegionCount", width: "110px", align: "right" },
      { name: "Options", alias: "shippingOptionCount", width: "110px", align: "right" },
    ];
  }

  private _createTableItems(warehouses: WarehouseListDto[]): Array<UmbTableItem> {
    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      icon: "icon-box",
      data: [
        {
          columnAlias: "warehouseName",
          value: warehouse.name ?? "Unnamed Warehouse",
        },
        {
          columnAlias: "warehouseCode",
          value: warehouse.code ?? "-",
        },
        {
          columnAlias: "supplierName",
          value: warehouse.supplierName ?? "-",
        },
        {
          columnAlias: "serviceRegionCount",
          value: warehouse.serviceRegionCount,
        },
        {
          columnAlias: "shippingOptionCount",
          value: warehouse.shippingOptionCount,
        },
      ],
    }));
  }

  private _applySelection(selectedIds: string[]): void {
    const availableIds = new Set(this._warehouses.map((warehouse) => warehouse.id));
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
    const warehouseById = new Map(this._warehouses.map((warehouse) => [warehouse.id, warehouse]));
    const selectedWarehouses = this._selectedIds
      .map((id) => warehouseById.get(id))
      .filter((warehouse): warehouse is WarehouseListDto => Boolean(warehouse));

    this.value = {
      selectedIds: selectedWarehouses.map((warehouse) => warehouse.id),
      selectedNames: selectedWarehouses.map((warehouse) => warehouse.name ?? "Unnamed Warehouse"),
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
          <uui-button look="secondary" label="Retry loading warehouses" @click=${() => this._loadWarehouses()}>
            Retry
          </uui-button>
        </div>
      `;
    }

    if (this._warehouses.length === 0) {
      return html`<p class="empty-state">No warehouses available.</p>`;
    }

    if (this._filteredWarehouses.length === 0) {
      return html`<p class="empty-state">No warehouses match your search.</p>`;
    }

    return html`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredWarehouses)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedIds.length;
    const submitLabel = this._isMultiSelect ? `Add Selected (${selectedCount})` : "Add Warehouse";

    return html`
      <umb-body-layout headline="Select Warehouses">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search warehouses"
              placeholder="Search by warehouse name, code, or supplier"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm
                ? html`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear warehouse search"
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
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }
  `,
  ];
}

export default MerchelloWarehousePickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warehouse-picker-modal": MerchelloWarehousePickerModalElement;
  }
}

