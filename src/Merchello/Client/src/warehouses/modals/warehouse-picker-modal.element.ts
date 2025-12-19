import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { WarehousePickerModalData, WarehousePickerModalValue } from "./warehouse-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";

@customElement("merchello-warehouse-picker-modal")
export class MerchelloWarehousePickerModalElement extends UmbModalBaseElement<
  WarehousePickerModalData,
  WarehousePickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _selectedNames: string[] = [];
  @state() private _warehouses: WarehouseListDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadWarehouses();
  }

  disconnectedCallback(): void {
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
    this._warehouses = (data ?? []).filter((w) => !excludeIds.includes(w.id));
    this._isLoading = false;
  }

  private _toggleSelection(warehouse: WarehouseListDto): void {
    const multiSelect = this.data?.multiSelect !== false;

    if (this._selectedIds.includes(warehouse.id)) {
      // Remove from selection - find the index and remove from both arrays
      const index = this._selectedIds.indexOf(warehouse.id);
      this._selectedIds = this._selectedIds.filter((_, i) => i !== index);
      this._selectedNames = this._selectedNames.filter((_, i) => i !== index);
    } else {
      if (multiSelect) {
        this._selectedIds = [...this._selectedIds, warehouse.id];
        this._selectedNames = [...this._selectedNames, warehouse.name ?? ""];
      } else {
        this._selectedIds = [warehouse.id];
        this._selectedNames = [warehouse.name ?? ""];
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

  private _renderWarehouseRow(warehouse: WarehouseListDto): unknown {
    const isSelected = this._selectedIds.includes(warehouse.id);

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(warehouse)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            .checked=${isSelected}
            @change=${(e: Event) => {
              e.stopPropagation();
              this._toggleSelection(warehouse);
            }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="warehouse-info">
            <uui-icon name="icon-inbox"></uui-icon>
            <span class="warehouse-name">${warehouse.name ?? "Unnamed"}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell class="code">${warehouse.code ?? "-"}</uui-table-cell>
        <uui-table-cell>${warehouse.supplierName ?? "-"}</uui-table-cell>
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

    if (this._warehouses.length === 0) {
      return html`<p class="empty-state">No warehouses available.</p>`;
    }

    return html`
      <uui-table class="warehouses-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Code</uui-table-head-cell>
          <uui-table-head-cell>Supplier</uui-table-head-cell>
        </uui-table-head>
        ${this._warehouses.map((warehouse) => this._renderWarehouseRow(warehouse))}
      </uui-table>
    `;
  }

  render() {
    const selectedCount = this._selectedIds.length;

    return html`
      <umb-body-layout headline="Select Warehouses">
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

    .warehouses-table {
      width: 100%;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
    }

    .warehouse-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .warehouse-name {
      font-weight: 500;
    }

    .code {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
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

export default MerchelloWarehousePickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warehouse-picker-modal": MerchelloWarehousePickerModalElement;
  }
}
