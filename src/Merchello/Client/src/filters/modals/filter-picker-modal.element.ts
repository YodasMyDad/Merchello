import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { FilterPickerModalData, FilterPickerModalValue } from "./filter-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductFilterGroupDto, ProductFilterDto } from "@filters/types/filters.types.js";

@customElement("merchello-filter-picker-modal")
export class MerchelloFilterPickerModalElement extends UmbModalBaseElement<
  FilterPickerModalData,
  FilterPickerModalValue
> {
  @state() private _filterGroups: ProductFilterGroupDto[] = [];
  @state() private _selectedFilterIds: string[] = [];
  @state() private _selectedFilterNames: string[] = [];
  @state() private _expandedGroups: Set<string> = new Set();
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

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

    // Filter to specific group if specified, then exclude already-selected filter IDs
    let groups = data ?? [];
    if (filterGroupId) {
      groups = groups.filter((g) => g.id === filterGroupId);
    }

    // Filter out excluded filter IDs from each group's filters
    this._filterGroups = groups
      .map((group) => ({
        ...group,
        filters: group.filters.filter((f) => !excludeFilterIds.includes(f.id)),
      }))
      .filter((group) => group.filters.length > 0); // Only show groups with available filters

    // Expand all groups by default
    this._expandedGroups = new Set(this._filterGroups.map((g) => g.id));
    this._isLoading = false;
  }

  private _toggleGroupExpanded(groupId: string): void {
    const newSet = new Set(this._expandedGroups);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    this._expandedGroups = newSet;
  }

  private _toggleFilterSelection(group: ProductFilterGroupDto, filter: ProductFilterDto): void {
    const multiSelect = this.data?.multiSelect !== false;
    const displayName = `${group.name}: ${filter.name}`;

    if (this._selectedFilterIds.includes(filter.id)) {
      // Remove from selection - find the index and remove from both arrays
      const index = this._selectedFilterIds.indexOf(filter.id);
      this._selectedFilterIds = this._selectedFilterIds.filter((_, i) => i !== index);
      this._selectedFilterNames = this._selectedFilterNames.filter((_, i) => i !== index);
    } else {
      if (multiSelect) {
        this._selectedFilterIds = [...this._selectedFilterIds, filter.id];
        this._selectedFilterNames = [...this._selectedFilterNames, displayName];
      } else {
        this._selectedFilterIds = [filter.id];
        this._selectedFilterNames = [displayName];
      }
    }
  }

  private _handleSubmit(): void {
    this.value = {
      selectedFilterIds: this._selectedFilterIds,
      selectedFilterNames: this._selectedFilterNames,
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderColorSwatch(hexColour: string | null): unknown {
    if (!hexColour) return null;
    return html`
      <span
        class="color-swatch"
        style="background-color: ${hexColour};"
        title="${hexColour}">
      </span>
    `;
  }

  private _renderFilterRow(group: ProductFilterGroupDto, filter: ProductFilterDto): unknown {
    const isSelected = this._selectedFilterIds.includes(filter.id);

    return html`
      <div
        class="filter-row ${isSelected ? "selected" : ""}"
        @click=${() => this._toggleFilterSelection(group, filter)}>
        <uui-checkbox
          .checked=${isSelected}
          @change=${(e: Event) => {
            e.stopPropagation();
            this._toggleFilterSelection(group, filter);
          }}>
        </uui-checkbox>
        <div class="filter-info">
          ${this._renderColorSwatch(filter.hexColour)}
          <span class="filter-name">${filter.name}</span>
        </div>
        <span class="product-count">${filter.productCount} products</span>
      </div>
    `;
  }

  private _renderFilterGroup(group: ProductFilterGroupDto): unknown {
    const isExpanded = this._expandedGroups.has(group.id);
    const filterCount = group.filters.length;
    const selectedInGroup = group.filters.filter((f) =>
      this._selectedFilterIds.includes(f.id)
    ).length;

    return html`
      <div class="filter-group">
        <div
          class="group-header"
          @click=${() => this._toggleGroupExpanded(group.id)}>
          <uui-symbol-expand ?open=${isExpanded}></uui-symbol-expand>
          <span class="group-name">${group.name}</span>
          <span class="group-count">
            ${selectedInGroup > 0
              ? html`<strong>${selectedInGroup}/</strong>`
              : ""}${filterCount} filters
          </span>
        </div>
        ${isExpanded
          ? html`
              <div class="group-filters">
                ${group.filters.map((filter) => this._renderFilterRow(group, filter))}
              </div>
            `
          : null}
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`<div class="error-banner">${this._errorMessage}</div>`;
    }

    if (this._filterGroups.length === 0) {
      return html`<p class="empty-state">No product filters available.</p>`;
    }

    return html`
      <div class="filter-groups">
        ${this._filterGroups.map((group) => this._renderFilterGroup(group))}
      </div>
    `;
  }

  override render() {
    const selectedCount = this._selectedFilterIds.length;

    return html`
      <umb-body-layout headline="Select Product Filters">
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

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .filter-groups {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .filter-group {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      cursor: pointer;
      user-select: none;
    }

    .group-header:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .group-name {
      font-weight: 600;
      flex: 1;
    }

    .group-count {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .group-filters {
      border-top: 1px solid var(--uui-color-border);
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      padding-left: var(--uui-size-space-6);
      cursor: pointer;
      border-bottom: 1px solid var(--uui-color-border-standalone);
    }

    .filter-row:last-child {
      border-bottom: none;
    }

    .filter-row:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .filter-row.selected {
      background: var(--uui-color-selected);
    }

    .filter-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex: 1;
    }

    .filter-name {
      font-weight: 500;
    }

    .color-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 2px;
      border: 1px solid var(--uui-color-border);
    }

    .product-count {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
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

export default MerchelloFilterPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-picker-modal": MerchelloFilterPickerModalElement;
  }
}
