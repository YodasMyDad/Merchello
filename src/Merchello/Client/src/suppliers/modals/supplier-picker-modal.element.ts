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
import type { SupplierPickerModalData, SupplierPickerModalValue } from "@suppliers/modals/supplier-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { SupplierListItemDto } from "@suppliers/types/suppliers.types.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-supplier-picker-modal")
export class MerchelloSupplierPickerModalElement extends UmbModalBaseElement<
  SupplierPickerModalData,
  SupplierPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _suppliers: SupplierListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _searchTerm = "";

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadSuppliers();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadSuppliers(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getSuppliers();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    const excludeIds = this.data?.excludeIds ?? [];
    this._suppliers = (data ?? []).filter((s) => !excludeIds.includes(s.id));
    this._isLoading = false;
  }

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _sortedSuppliers(): SupplierListItemDto[] {
    return [...this._suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }

  private get _filteredSuppliers(): SupplierListItemDto[] {
    const normalizedSearch = this._searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return this._sortedSuppliers;
    }

    return this._sortedSuppliers.filter((supplier) =>
      [supplier.name, supplier.code ?? ""].some((value) =>
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
      { name: "Supplier", alias: "supplierName" },
      { name: "Code", alias: "supplierCode", width: "180px" },
      { name: "Warehouses", alias: "warehouseCount", width: "130px", align: "right" },
    ];
  }

  private _createTableItems(suppliers: SupplierListItemDto[]): Array<UmbTableItem> {
    return suppliers.map((supplier) => ({
      id: supplier.id,
      icon: "icon-truck",
      data: [
        {
          columnAlias: "supplierName",
          value: supplier.name,
        },
        {
          columnAlias: "supplierCode",
          value: supplier.code ?? "-",
        },
        {
          columnAlias: "warehouseCount",
          value: supplier.warehouseCount,
        },
      ],
    }));
  }

  private _applySelection(selectedIds: string[]): void {
    const availableIds = new Set(this._suppliers.map((supplier) => supplier.id));
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
    const supplierById = new Map(this._suppliers.map((supplier) => [supplier.id, supplier]));
    const selectedSuppliers = this._selectedIds
      .map((id) => supplierById.get(id))
      .filter((supplier): supplier is SupplierListItemDto => Boolean(supplier));

    this.value = {
      selectedIds: selectedSuppliers.map((supplier) => supplier.id),
      selectedNames: selectedSuppliers.map((supplier) => supplier.name),
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
          <uui-button look="secondary" label="Retry loading suppliers" @click=${() => this._loadSuppliers()}>
            Retry
          </uui-button>
        </div>
      `;
    }

    if (this._suppliers.length === 0) {
      return html`<p class="empty-state">No suppliers available.</p>`;
    }

    if (this._filteredSuppliers.length === 0) {
      return html`<p class="empty-state">No suppliers match your search.</p>`;
    }

    return html`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredSuppliers)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedIds.length;
    const submitLabel = this._isMultiSelect ? `Add Selected (${selectedCount})` : "Add Supplier";

    return html`
      <umb-body-layout headline="Select Suppliers">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search suppliers"
              placeholder="Search by supplier name or code"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm
                ? html`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear supplier search"
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

export default MerchelloSupplierPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-supplier-picker-modal": MerchelloSupplierPickerModalElement;
  }
}

