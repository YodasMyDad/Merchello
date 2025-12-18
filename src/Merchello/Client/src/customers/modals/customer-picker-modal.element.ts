import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { CustomerPickerModalData, CustomerPickerModalValue } from "./customer-picker-modal.token.js";
import type { CustomerListItemDto } from "@customers/types/customer.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-customer-picker-modal")
export class MerchelloCustomerPickerModalElement extends UmbModalBaseElement<
  CustomerPickerModalData,
  CustomerPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _customers: CustomerListItemDto[] = [];
  @state() private _isLoading = false;
  @state() private _searchTerm = "";
  @state() private _hasSearched = false;
  @state() private _errorMessage: string | null = null;

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #isConnected = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this._searchTerm = input.value;

    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    if (this._searchTerm.length >= 2) {
      this._searchDebounceTimer = setTimeout(() => {
        this._performSearch();
      }, 300);
    } else {
      this._customers = [];
      this._hasSearched = false;
    }
  }

  private async _performSearch(): Promise<void> {
    if (this._searchTerm.length < 2) return;

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.searchCustomersForSegment(
      this._searchTerm,
      this.data?.excludeCustomerIds,
      50
    );

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._customers = data?.items ?? [];
    this._hasSearched = true;
    this._isLoading = false;
  }

  private _toggleSelection(customerId: string): void {
    const multiSelect = this.data?.multiSelect !== false; // default to true

    if (this._selectedIds.includes(customerId)) {
      this._selectedIds = this._selectedIds.filter(id => id !== customerId);
    } else {
      if (multiSelect) {
        this._selectedIds = [...this._selectedIds, customerId];
      } else {
        this._selectedIds = [customerId];
      }
    }
  }

  private _handleSubmit(): void {
    this.value = { selectedCustomerIds: this._selectedIds };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _getCustomerName(customer: CustomerListItemDto): string {
    const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
    return name || customer.email;
  }

  private _renderSearchBox(): unknown {
    return html`
      <div class="search-container">
        <uui-input
          id="search-input"
          type="text"
          placeholder="Search by name or email..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search customers">
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
        </uui-input>
        <span class="search-hint">Enter at least 2 characters to search</span>
      </div>
    `;
  }

  private _renderCustomerRow(customer: CustomerListItemDto): unknown {
    const isSelected = this._selectedIds.includes(customer.id);

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(customer.id)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            .checked=${isSelected}
            @change=${(e: Event) => {
              e.stopPropagation();
              this._toggleSelection(customer.id);
            }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="customer-info">
            <span class="customer-name">${this._getCustomerName(customer)}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>${customer.email}</uui-table-cell>
        <uui-table-cell class="center">${customer.orderCount}</uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderCustomerList(): unknown {
    if (this._customers.length === 0) {
      return html`<p class="empty-state">No customers found matching "${this._searchTerm}"</p>`;
    }

    return html`
      <uui-table class="customers-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Email</uui-table-head-cell>
          <uui-table-head-cell class="center">Orders</uui-table-head-cell>
        </uui-table-head>
        ${this._customers.map(customer => this._renderCustomerRow(customer))}
      </uui-table>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`<div class="error-banner">${this._errorMessage}</div>`;
    }

    if (!this._hasSearched) {
      return html`<p class="hint">Search for customers to add to the segment.</p>`;
    }

    return this._renderCustomerList();
  }

  render() {
    const selectedCount = this._selectedIds.length;

    return html`
      <umb-body-layout headline="Select Customers">
        <div id="main">
          ${this._renderSearchBox()}
          <div class="results-container">
            ${this._renderContent()}
          </div>
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

    .search-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    #search-input {
      width: 100%;
    }

    .search-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .customers-table {
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

    .customer-info {
      display: flex;
      flex-direction: column;
    }

    .customer-name {
      font-weight: 500;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .hint, .empty-state {
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

export default MerchelloCustomerPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-picker-modal": MerchelloCustomerPickerModalElement;
  }
}
