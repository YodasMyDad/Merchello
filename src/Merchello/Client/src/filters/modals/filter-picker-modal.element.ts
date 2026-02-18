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
import type { FilterPickerModalData, FilterPickerModalValue } from "@filters/modals/filter-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";

interface FilterOption {
  id: string;
  name: string;
  groupName: string;
  productCount: number;
  hexColour: string | null;
}

@customElement("merchello-filter-picker-modal")
export class MerchelloFilterPickerModalElement extends UmbModalBaseElement<
  FilterPickerModalData,
  FilterPickerModalValue
> {
  @state() private _filterGroups: ProductFilterGroupDto[] = [];
  @state() private _selectedFilterIds: string[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _searchTerm = "";

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadFilterGroups();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadFilterGroups(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getFilterGroups();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    const excludeFilterIds = this.data?.excludeFilterIds ?? [];
    const filterGroupId = this.data?.filterGroupId;
    let groups = data ?? [];

    if (filterGroupId) {
      groups = groups.filter((group) => group.id === filterGroupId);
    }

    this._filterGroups = groups
      .map((group) => ({
        ...group,
        filters: group.filters.filter((filter) => !excludeFilterIds.includes(filter.id)),
      }))
      .filter((group) => group.filters.length > 0);

    this._selectedFilterIds = this._selectedFilterIds.filter((id) =>
      this._filterOptions.some((option) => option.id === id)
    );
    this._isLoading = false;
  }

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _filterOptions(): Array<FilterOption> {
    const options: FilterOption[] = [];

    for (const group of this._filterGroups) {
      for (const filter of group.filters) {
        options.push({
          id: filter.id,
          name: filter.name,
          groupName: group.name,
          productCount: filter.productCount,
          hexColour: filter.hexColour,
        });
      }
    }

    return options.sort((a, b) => {
      const groupCompare = a.groupName.localeCompare(b.groupName);
      if (groupCompare !== 0) return groupCompare;
      return a.name.localeCompare(b.name);
    });
  }

  private get _filteredFilterOptions(): Array<FilterOption> {
    const term = this._searchTerm.trim().toLowerCase();
    if (!term) {
      return this._filterOptions;
    }

    return this._filterOptions.filter((option) =>
      [option.name, option.groupName, option.hexColour ?? ""].some((value) =>
        value.toLowerCase().includes(term)
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
      { name: "Filter", alias: "filterName" },
      { name: "Group", alias: "groupName", width: "200px" },
      { name: "Products", alias: "productCount", width: "120px", align: "right" },
    ];
  }

  private _createTableItems(options: Array<FilterOption>): Array<UmbTableItem> {
    return options.map((option) => ({
      id: option.id,
      icon: "icon-filter",
      data: [
        {
          columnAlias: "filterName",
          value: option.hexColour ? `${option.name} (${option.hexColour})` : option.name,
        },
        {
          columnAlias: "groupName",
          value: option.groupName,
        },
        {
          columnAlias: "productCount",
          value: option.productCount,
        },
      ],
    }));
  }

  private _applySelection(selectedIds: string[]): void {
    const availableIds = new Set(this._filterOptions.map((option) => option.id));
    const nextSelection = selectedIds.filter((id) => availableIds.has(id));
    this._selectedFilterIds = this._isMultiSelect ? nextSelection : nextSelection.slice(0, 1);
  }

  private _handleTableSelected(event: UmbTableSelectedEvent): void {
    event.stopPropagation();
    const table = event.target as UmbTableElement;

    if (this._isMultiSelect) {
      this._applySelection(table.selection);
      return;
    }

    const addedId = table.selection.find((id) => !this._selectedFilterIds.includes(id));
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
    const optionById = new Map(this._filterOptions.map((option) => [option.id, option]));
    const selectedOptions = this._selectedFilterIds
      .map((id) => optionById.get(id))
      .filter((option): option is FilterOption => Boolean(option));

    this.value = {
      selectedFilterIds: selectedOptions.map((option) => option.id),
      selectedFilterNames: selectedOptions.map((option) => `${option.groupName}: ${option.name}`),
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
          <uui-button look="secondary" label="Retry" @click=${() => this._loadFilterGroups()}>
            Retry
          </uui-button>
        </div>
      `;
    }

    if (this._filterOptions.length === 0) {
      return html`<p class="empty-state">No product filters available.</p>`;
    }

    if (this._filteredFilterOptions.length === 0) {
      return html`<p class="empty-state">No product filters match your search.</p>`;
    }

    return html`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredFilterOptions)}
        .selection=${this._selectedFilterIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedFilterIds.length;
    const submitLabel = this._isMultiSelect ? `Add Selected (${selectedCount})` : "Add Filter";

    return html`
      <umb-body-layout headline="Select Product Filters">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search filters"
              placeholder="Search by filter name, group, or color"
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
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }
  `;
}

export default MerchelloFilterPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-picker-modal": MerchelloFilterPickerModalElement;
  }
}
