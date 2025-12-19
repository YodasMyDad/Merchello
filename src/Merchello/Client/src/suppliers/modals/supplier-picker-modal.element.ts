import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { SupplierPickerModalData, SupplierPickerModalValue } from "./supplier-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { SupplierListItemDto } from "@suppliers/types/suppliers.types.js";

@customElement("merchello-supplier-picker-modal")
export class MerchelloSupplierPickerModalElement extends UmbModalBaseElement<
  SupplierPickerModalData,
  SupplierPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _selectedNames: string[] = [];
  @state() private _suppliers: SupplierListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadSuppliers();
  }

  disconnectedCallback(): void {
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

  private _toggleSelection(supplier: SupplierListItemDto): void {
    const multiSelect = this.data?.multiSelect !== false;

    if (this._selectedIds.includes(supplier.id)) {
      // Remove from selection - find the index and remove from both arrays
      const index = this._selectedIds.indexOf(supplier.id);
      this._selectedIds = this._selectedIds.filter((_, i) => i !== index);
      this._selectedNames = this._selectedNames.filter((_, i) => i !== index);
    } else {
      if (multiSelect) {
        this._selectedIds = [...this._selectedIds, supplier.id];
        this._selectedNames = [...this._selectedNames, supplier.name];
      } else {
        this._selectedIds = [supplier.id];
        this._selectedNames = [supplier.name];
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

  private _renderSupplierRow(supplier: SupplierListItemDto): unknown {
    const isSelected = this._selectedIds.includes(supplier.id);

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(supplier)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            .checked=${isSelected}
            @change=${(e: Event) => {
              e.stopPropagation();
              this._toggleSelection(supplier);
            }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="supplier-info">
            <uui-icon name="icon-truck"></uui-icon>
            <span class="supplier-name">${supplier.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell class="code">${supplier.code ?? "-"}</uui-table-cell>
        <uui-table-cell class="center">${supplier.warehouseCount}</uui-table-cell>
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

    if (this._suppliers.length === 0) {
      return html`<p class="empty-state">No suppliers available.</p>`;
    }

    return html`
      <uui-table class="suppliers-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Code</uui-table-head-cell>
          <uui-table-head-cell class="center">Warehouses</uui-table-head-cell>
        </uui-table-head>
        ${this._suppliers.map((supplier) => this._renderSupplierRow(supplier))}
      </uui-table>
    `;
  }

  render() {
    const selectedCount = this._selectedIds.length;

    return html`
      <umb-body-layout headline="Select Suppliers">
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

    .suppliers-table {
      width: 100%;
    }

    uui-table-head-cell.center,
    uui-table-cell.center {
      text-align: center;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
    }

    .supplier-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .supplier-name {
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

export default MerchelloSupplierPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-supplier-picker-modal": MerchelloSupplierPickerModalElement;
  }
}
