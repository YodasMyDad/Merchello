import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { CustomerPickerModalData, CustomerPickerModalValue } from "@customers/modals/customer-picker-modal.token.js";
import type { CustomerListItemDto } from "@customers/types/customer.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

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

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _selectedCount(): number {
    return this._selectedIds.length;
  }

  private get _isAllVisibleSelected(): boolean {
    if (!this._customers.length) return false;
    return this._customers.every((customer) => this._selectedIds.includes(customer.id));
  }

  private get _isPartiallySelected(): boolean {
    return this._selectedCount > 0 && !this._isAllVisibleSelected;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
  }

  override disconnectedCallback(): void {
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

    if (this._searchTerm.trim().length >= 2) {
      this._searchDebounceTimer = setTimeout(() => {
        this._performSearch();
      }, 300);
      return;
    }

    this._customers = [];
    this._hasSearched = false;
    this._errorMessage = null;
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
    this._customers = [];
    this._hasSearched = false;
    this._errorMessage = null;
  }

  private async _performSearch(): Promise<void> {
    const search = this._searchTerm.trim();
    if (search.length < 2) return;

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.searchCustomersForSegment(
      search,
      this.data?.excludeCustomerIds,
      50
    );

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      this._hasSearched = true;
      return;
    }

    this._customers = data?.items ?? [];
    this._hasSearched = true;
    this._isLoading = false;
  }

  private _toggleSelection(customerId: string): void {
    if (this._selectedIds.includes(customerId)) {
      this._selectedIds = this._selectedIds.filter((id) => id !== customerId);
      return;
    }

    if (this._isMultiSelect) {
      this._selectedIds = [...this._selectedIds, customerId];
      return;
    }

    this._selectedIds = [customerId];
  }

  private _toggleSelectAll(): void {
    if (!this._isMultiSelect) return;

    const visibleIds = new Set(this._customers.map((customer) => customer.id));

    if (this._isAllVisibleSelected) {
      this._selectedIds = this._selectedIds.filter((id) => !visibleIds.has(id));
      return;
    }

    const selectedIds = new Set(this._selectedIds);
    this._customers.forEach((customer) => selectedIds.add(customer.id));
    this._selectedIds = [...selectedIds];
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

  private _getSelectionLabel(customer: CustomerListItemDto): string {
    const name = this._getCustomerName(customer);
    return `${this._isMultiSelect ? "Select" : "Choose"} customer ${name}`;
  }

  private _renderSelectionCell(customer: CustomerListItemDto): unknown {
    const isSelected = this._selectedIds.includes(customer.id);
    const label = this._getSelectionLabel(customer);

    if (this._isMultiSelect) {
      return html`
        <uui-checkbox
          aria-label=${label}
          .checked=${isSelected}
          @click=${(e: Event) => e.stopPropagation()}
          @change=${() => this._toggleSelection(customer.id)}>
        </uui-checkbox>
      `;
    }

    return html`
      <uui-radio
        aria-label=${label}
        .checked=${isSelected}
        @click=${(e: Event) => e.stopPropagation()}
        @change=${() => this._toggleSelection(customer.id)}>
      </uui-radio>
    `;
  }

  private _renderSearchBox(): unknown {
    return html`
      <uui-form-layout-item>
        <uui-label slot="label" for="search-input">Search customers</uui-label>
        <uui-input
          id="search-input"
          type="text"
          placeholder="Type at least 2 characters"
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search customers">
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
        <div slot="description" class="hint">Search by customer name or email.</div>
      </uui-form-layout-item>
    `;
  }

  private _renderCustomerRow(customer: CustomerListItemDto): unknown {
    const isSelected = this._selectedIds.includes(customer.id);

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(customer.id)}>
        <uui-table-cell class="selection-cell">
          ${this._renderSelectionCell(customer)}
        </uui-table-cell>
        <uui-table-cell>
          <span class="customer-name">${this._getCustomerName(customer)}</span>
        </uui-table-cell>
        <uui-table-cell>${customer.email}</uui-table-cell>
        <uui-table-cell class="center">${customer.orderCount}</uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderCustomerList(): unknown {
    if (this._customers.length === 0) {
      return html`<p class="empty-state">No customers found for "${this._searchTerm}".</p>`;
    }

    return html`
      <uui-table class="customers-table">
        <uui-table-head>
          <uui-table-head-cell class="selection-cell">
            ${this._isMultiSelect
              ? html`
                  <uui-checkbox
                    aria-label="Select all customers"
                    .checked=${this._isAllVisibleSelected}
                    .indeterminate=${this._isPartiallySelected}
                    @change=${() => this._toggleSelectAll()}>
                  </uui-checkbox>
                `
              : nothing}
          </uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Email</uui-table-head-cell>
          <uui-table-head-cell class="center">Orders</uui-table-head-cell>
        </uui-table-head>
        ${this._customers.map((customer) => this._renderCustomerRow(customer))}
      </uui-table>
    `;
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
        </div>
      `;
    }

    if (!this._hasSearched) {
      return html`<p class="hint-state">Search for customers to start selecting.</p>`;
    }

    return this._renderCustomerList();
  }

  private _getPrimaryActionLabel(): string {
    if (this._isMultiSelect) {
      return `Add selected (${this._selectedCount})`;
    }

    return "Select customer";
  }

  override render() {
    return html`
      <umb-body-layout headline="Select customers">
        <div id="main">
          <uui-box>
            ${this._renderSearchBox()}
          </uui-box>

          <uui-box>
            <div class="results-header">
              <span class="results-count">
                ${this._hasSearched
                  ? `${this._customers.length} result${this._customers.length === 1 ? "" : "s"}`
                  : "No search yet"}
              </span>
              <span class="selected-count">
                ${this._selectedCount} selected
              </span>
            </div>
            <div class="results-container">${this._renderContent()}</div>
          </uui-box>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label=${this._getPrimaryActionLabel()}
          look="primary"
          color="positive"
          ?disabled=${this._selectedCount === 0 || this._isLoading}
          @click=${this._handleSubmit}>
          ${this._getPrimaryActionLabel()}
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

    uui-input {
      width: 100%;
    }

    uui-icon[slot="prepend"] {
      margin-left: 2px;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
      font-size: var(--uui-type-small-size);
    }

    .results-count {
      color: var(--uui-color-text-alt);
    }

    .selected-count {
      font-weight: 600;
    }

    .results-container {
      overflow-y: auto;
      min-height: 300px;
    }

    .customers-table {
      width: 100%;
    }

    .selection-cell {
      width: 44px;
      text-align: center;
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
      color: var(--uui-color-selected-contrast, #fff);
      font-weight: 600;
    }

    uui-table-row[selected] .customer-name {
      color: var(--uui-color-selected-contrast, #fff);
    }

    .customer-name {
      font-weight: 500;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .hint,
    .hint-state,
    .empty-state {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .hint-state,
    .empty-state {
      text-align: center;
      padding: var(--uui-size-space-6);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error-banner uui-icon {
      flex-shrink: 0;
    }
  `,
  ];
}

export default MerchelloCustomerPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-picker-modal": MerchelloCustomerPickerModalElement;
  }
}

