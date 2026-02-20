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
import type { FilterGroupPickerModalData, FilterGroupPickerModalValue } from "@filters/modals/filter-group-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-filter-group-picker-modal")
export class MerchelloFilterGroupPickerModalElement extends UmbModalBaseElement<
  FilterGroupPickerModalData,
  FilterGroupPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _filterGroups: ProductFilterGroupDto[] = [];
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

    const excludeIds = this.data?.excludeIds ?? [];
    this._filterGroups = (data ?? []).filter((group) => !excludeIds.includes(group.id));
    this._selectedIds = this._selectedIds.filter((id) => this._filterGroups.some((group) => group.id === id));
    this._isLoading = false;
  }

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _filteredFilterGroups(): ProductFilterGroupDto[] {
    const sortedGroups = [...this._filterGroups].sort((a, b) => a.name.localeCompare(b.name));
    const term = this._searchTerm.trim().toLowerCase();

    if (!term) {
      return sortedGroups;
    }

    return sortedGroups.filter((group) => group.name.toLowerCase().includes(term));
  }

  private get _tableConfig(): UmbTableConfig {
    return {
      allowSelection: true,
    };
  }

  private get _tableColumns(): Array<UmbTableColumn> {
    return [
      { name: "Filter Group", alias: "groupName" },
      { name: "Filters", alias: "filterCount", width: "120px", align: "right" },
    ];
  }

  private _createTableItems(groups: ProductFilterGroupDto[]): Array<UmbTableItem> {
    return groups.map((group) => ({
      id: group.id,
      icon: "icon-filter",
      data: [
        {
          columnAlias: "groupName",
          value: group.name,
        },
        {
          columnAlias: "filterCount",
          value: group.filters?.length ?? 0,
        },
      ],
    }));
  }

  private _applySelection(selectedIds: string[]): void {
    const availableIds = new Set(this._filterGroups.map((group) => group.id));
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
    const groupById = new Map(this._filterGroups.map((group) => [group.id, group]));
    const selectedGroups = this._selectedIds
      .map((id) => groupById.get(id))
      .filter((group): group is ProductFilterGroupDto => Boolean(group));

    this.value = {
      selectedIds: selectedGroups.map((group) => group.id),
      selectedNames: selectedGroups.map((group) => group.name),
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

    if (this._filterGroups.length === 0) {
      return html`<p class="empty-state">No filter groups available.</p>`;
    }

    if (this._filteredFilterGroups.length === 0) {
      return html`<p class="empty-state">No filter groups match your search.</p>`;
    }

    return html`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredFilterGroups)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedIds.length;
    const submitLabel = this._isMultiSelect ? `Add Selected (${selectedCount})` : "Add Filter Group";

    return html`
      <umb-body-layout headline="Select Filter Groups">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search filter groups"
              placeholder="Search filter groups"
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

export default MerchelloFilterGroupPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-group-picker-modal": MerchelloFilterGroupPickerModalElement;
  }
}

