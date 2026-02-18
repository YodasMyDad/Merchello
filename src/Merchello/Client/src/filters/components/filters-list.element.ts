import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import type { ProductFilterGroupDto, ProductFilterDto } from "@filters/types/filters.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_FILTER_GROUP_MODAL } from "@filters/modals/filter-group-modal.token.js";
import { MERCHELLO_FILTER_MODAL } from "@filters/modals/filter-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-filters-list")
export class MerchelloFiltersListElement extends UmbElementMixin(LitElement) {
  @state() private _filterGroups: ProductFilterGroupDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isDeletingGroup: string | null = null;
  @state() private _expandedGroups: Set<string> = new Set();
  @state() private _searchQuery = "";

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  // Sorter for filter groups.
  #groupSorter = new UmbSorterController<ProductFilterGroupDto>(this, {
    getUniqueOfElement: (element) => element.getAttribute("data-group-id") ?? "",
    getUniqueOfModel: (model) => model.id,
    identifier: "Merchello.FilterGroups.Sorter",
    itemSelector: ".filter-group-card",
    containerSelector: ".filter-groups-container",
    onChange: ({ model }) => {
      this._filterGroups = model;
      this._syncSortersWithCurrentView();
      this._handleGroupReorder(model.map((g) => g.id));
    },
  });

  // Map of filter sorters keyed by group ID.
  #filterSorters: Map<string, UmbSorterController<ProductFilterDto>> = new Map();

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadFilterGroups();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    this.#groupSorter.disable();
    for (const sorter of this.#filterSorters.values()) {
      sorter.disable();
    }
    this.#filterSorters.clear();
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

    if (data) {
      this._filterGroups = data;
      this._expandedGroups = new Set(data.map((g) => g.id));
      this.#filterSorters.clear();
      for (const group of data) {
        this._getOrCreateFilterSorter(group.id);
      }
      this._syncSortersWithCurrentView();
    }

    this._isLoading = false;
  }

  private _syncSortersWithCurrentView(): void {
    const sortingEnabled = !this._isSearchActive();

    if (sortingEnabled) {
      this.#groupSorter.enable();
      this.#groupSorter.setModel(this._filterGroups);
    } else {
      this.#groupSorter.disable();
    }

    for (const group of this._filterGroups) {
      const sorter = this._getOrCreateFilterSorter(group.id);
      if (sortingEnabled && this._expandedGroups.has(group.id)) {
        sorter.enable();
        sorter.setModel(group.filters);
      } else {
        sorter.disable();
      }
    }
  }

  private async _handleGroupReorder(orderedIds: string[]): Promise<void> {
    const { error } = await MerchelloApi.reorderFilterGroups(orderedIds);
    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Reorder failed", message: error.message },
      });
      this._loadFilterGroups();
    }
  }

  private _getOrCreateFilterSorter(groupId: string): UmbSorterController<ProductFilterDto> {
    let sorter = this.#filterSorters.get(groupId);
    if (!sorter) {
      sorter = new UmbSorterController<ProductFilterDto>(this, {
        getUniqueOfElement: (element) => element.getAttribute("data-filter-id") ?? "",
        getUniqueOfModel: (model) => model.id,
        identifier: `Merchello.Filters.Sorter.${groupId}`,
        itemSelector: ".filter-item",
        containerSelector: `.filters-container[data-group-id="${groupId}"]`,
        onChange: ({ model }) => {
          this._filterGroups = this._filterGroups.map((group) =>
            group.id === groupId
              ? { ...group, filters: model }
              : group
          );
          this._handleFilterReorder(groupId, model.map((f) => f.id));
        },
      });
      this.#filterSorters.set(groupId, sorter);
    }
    return sorter;
  }

  private async _handleFilterReorder(groupId: string, orderedIds: string[]): Promise<void> {
    const { error } = await MerchelloApi.reorderFilters(groupId, orderedIds);
    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Reorder failed", message: error.message },
      });
      this._loadFilterGroups();
    }
  }

  private async _handleAddFilterGroup(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_FILTER_GROUP_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isCreated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Filter group created",
          message: `"${result.filterGroup?.name}" has been created successfully`,
        },
      });
      this._loadFilterGroups();
    }
  }

  private async _handleEditFilterGroup(filterGroup: ProductFilterGroupDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_FILTER_GROUP_MODAL, {
      data: { filterGroup },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Filter group updated",
          message: `"${result.filterGroup?.name}" has been updated successfully`,
        },
      });
      this._loadFilterGroups();
    }
  }

  private async _handleDeleteFilterGroup(e: Event, filterGroup: ProductFilterGroupDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const filterCount = filterGroup.filters?.length || 0;
    const warningText = filterCount > 0
      ? ` This also deletes ${filterCount} filter${filterCount > 1 ? "s" : ""} in this group.`
      : "";

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Filter Group",
        content: `Delete "${filterGroup.name}"?${warningText} This permanently removes the group and cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }
    if (!this.#isConnected) return;

    this._isDeletingGroup = filterGroup.id;

    const { error } = await MerchelloApi.deleteFilterGroup(filterGroup.id);

    if (!this.#isConnected) return;

    this._isDeletingGroup = null;

    if (error) {
      this._errorMessage = `Failed to delete filter group: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Filter group deleted", message: "The filter group has been deleted successfully" },
    });
    this._loadFilterGroups();
  }

  private async _handleAddFilter(filterGroup: ProductFilterGroupDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_FILTER_MODAL, {
      data: { filterGroupId: filterGroup.id },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isCreated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Filter created",
          message: `"${result.filter?.name}" has been created successfully`,
        },
      });
      this._loadFilterGroups();
    }
  }

  private async _handleEditFilter(filterGroupId: string, filter: ProductFilterDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_FILTER_MODAL, {
      data: { filterGroupId, filter },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Filter updated",
          message: `"${result.filter?.name}" has been updated successfully`,
        },
      });
      this._loadFilterGroups();
    } else if (result?.isDeleted) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Filter deleted", message: "The filter has been deleted successfully" },
      });
      this._loadFilterGroups();
    }
  }

  private _toggleGroupExpanded(groupId: string): void {
    const expanded = new Set(this._expandedGroups);
    if (expanded.has(groupId)) {
      expanded.delete(groupId);
    } else {
      expanded.add(groupId);
    }
    this._expandedGroups = expanded;
    this._syncSortersWithCurrentView();
  }

  private _isSearchActive(): boolean {
    return this._searchQuery.trim().length > 0;
  }

  private _getVisibleFilterGroups(): ProductFilterGroupDto[] {
    const query = this._searchQuery.trim().toLowerCase();
    if (!query) {
      return this._filterGroups;
    }

    return this._filterGroups
      .map((group) => {
        const groupMatches = group.name.toLowerCase().includes(query);
        if (groupMatches) {
          return group;
        }

        const matchingFilters = group.filters.filter((filter) =>
          filter.name.toLowerCase().includes(query)
        );

        if (matchingFilters.length === 0) {
          return null;
        }

        return { ...group, filters: matchingFilters };
      })
      .filter((group): group is ProductFilterGroupDto => group !== null);
  }

  private _handleSearchInput(event: Event): void {
    this._searchQuery = (event.target as HTMLInputElement).value;

    if (this._isSearchActive()) {
      this._expandedGroups = new Set(this._getVisibleFilterGroups().map((group) => group.id));
    }

    this._syncSortersWithCurrentView();
  }

  private _clearSearch(): void {
    if (!this._searchQuery) return;
    this._searchQuery = "";
    this._syncSortersWithCurrentView();
  }

  private _expandAllGroups(): void {
    this._expandedGroups = new Set(this._filterGroups.map((group) => group.id));
    this._syncSortersWithCurrentView();
  }

  private _collapseAllGroups(): void {
    this._expandedGroups = new Set();
    this._syncSortersWithCurrentView();
  }

  private _renderLoadingState(): unknown {
    return html`
      <div class="loading" role="status" aria-live="polite" aria-label="Loading filter groups">
        <uui-loader></uui-loader>
      </div>
    `;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-filter"
        headline="No filter groups configured"
        message="Create filter groups to organize product attributes like Color, Size, or Material. Then add filter values that can be assigned to products.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button look="primary" color="positive" label="Add filter group" @click=${this._handleAddFilterGroup}>
          Add Filter Group
        </uui-button>
      </div>
    `;
  }

  private _renderNoSearchResults(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-search"
        headline="No filters match your search"
        message="Try a different search term or clear the search to view all filter groups.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button look="secondary" label="Clear search" @click=${this._clearSearch}>
          Clear search
        </uui-button>
      </div>
    `;
  }

  private _renderFilterItem(filter: ProductFilterDto, filterGroupId: string): unknown {
    const editLabel = `Edit filter ${filter.name}`;

    return html`
      <div class="filter-item" data-filter-id=${filter.id}>
        ${this._isSearchActive()
          ? nothing
          : html`
              <div class="filter-item-drag-handle">
                <uui-icon name="icon-navigation"></uui-icon>
              </div>
            `}
        <button
          type="button"
          class="filter-item-content"
          aria-label=${editLabel}
          title=${editLabel}
          @click=${() => this._handleEditFilter(filterGroupId, filter)}>
          ${filter.hexColour
            ? html`<span class="filter-color-swatch" style="background: ${filter.hexColour}"></span>`
            : nothing}
          <span class="filter-name">${filter.name}</span>
          ${filter.productCount > 0
            ? html`<span class="filter-product-count">${filter.productCount} product${filter.productCount > 1 ? "s" : ""}</span>`
            : nothing}
        </button>
      </div>
    `;
  }

  private _renderFilterGroupCard(filterGroup: ProductFilterGroupDto): unknown {
    const isExpanded = this._expandedGroups.has(filterGroup.id);
    const isDeletingGroup = this._isDeletingGroup === filterGroup.id;
    const filterCount = filterGroup.filters?.length || 0;
    const toggleLabel = isExpanded
      ? `Collapse ${filterGroup.name}`
      : `Expand ${filterGroup.name}`;
    const groupContentId = `filter-group-content-${filterGroup.id}`;

    return html`
      <div class="filter-group-card" data-group-id=${filterGroup.id}>
        <div class="filter-group-header">
          ${this._isSearchActive()
            ? nothing
            : html`
                <div class="filter-group-drag-handle">
                  <uui-icon name="icon-navigation"></uui-icon>
                </div>
              `}
          <button
            type="button"
            class="filter-group-toggle"
            @click=${() => this._toggleGroupExpanded(filterGroup.id)}
            aria-expanded=${isExpanded}
            aria-controls=${groupContentId}
            aria-label=${toggleLabel}
            title=${toggleLabel}>
            <uui-icon name=${isExpanded ? "icon-arrow-down" : "icon-arrow-right"}></uui-icon>
          </button>
          <button
            type="button"
            class="filter-group-info"
            @click=${() => this._toggleGroupExpanded(filterGroup.id)}
            aria-expanded=${isExpanded}
            aria-controls=${groupContentId}
            aria-label=${toggleLabel}
            title=${toggleLabel}>
            <span class="filter-group-name">${filterGroup.name}</span>
            <span class="filter-group-count">${filterCount} filter${filterCount !== 1 ? "s" : ""}</span>
          </button>
          <div class="filter-group-actions">
            <uui-button
              look="secondary"
              compact
              label="Add filter"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._handleAddFilter(filterGroup);
              }}>
              <uui-icon name="icon-add"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Edit group"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._handleEditFilterGroup(filterGroup);
              }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              compact
              label="Delete group"
              ?disabled=${isDeletingGroup}
              @click=${(e: Event) => this._handleDeleteFilterGroup(e, filterGroup)}>
              <uui-icon name=${isDeletingGroup ? "icon-hourglass" : "icon-trash"}></uui-icon>
            </uui-button>
          </div>
        </div>
        ${isExpanded
          ? html`
              <div class="filter-group-content" id=${groupContentId}>
                <div class="filters-container" data-group-id=${filterGroup.id}>
                  ${filterGroup.filters.length > 0
                    ? filterGroup.filters.map((filter) => this._renderFilterItem(filter, filterGroup.id))
                    : html`
                        <div class="empty-filters">
                          <span>No filters in this group.</span>
                          <uui-button
                            look="placeholder"
                            label="Add your first filter"
                            @click=${() => this._handleAddFilter(filterGroup)}>
                            Add Filter
                          </uui-button>
                        </div>
                      `}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    return nothing;
  }

  override render() {
    const visibleFilterGroups = this._getVisibleFilterGroups();

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="filters-container">
          <div class="header-actions">
            <div class="search-box">
              <uui-input
                type="search"
                label="Search filter groups and filters"
                placeholder="Search groups or filters"
                .value=${this._searchQuery}
                @input=${this._handleSearchInput}>
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchQuery
                  ? html`
                      <uui-button
                        slot="append"
                        compact
                        look="secondary"
                        label="Clear search"
                        @click=${this._clearSearch}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    `
                  : nothing}
              </uui-input>
            </div>
            <uui-button look="secondary" label="Expand all groups" @click=${this._expandAllGroups}>
              Expand all
            </uui-button>
            <uui-button look="secondary" label="Collapse all groups" @click=${this._collapseAllGroups}>
              Collapse all
            </uui-button>
            <uui-button look="primary" color="positive" label="Add filter group" @click=${this._handleAddFilterGroup}>
              Add Filter Group
            </uui-button>
          </div>

          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              Filter groups organize product attributes (like Color, Size, Material). Add filters to each group, then
              assign them to products. Drag to reorder groups or filters within a group.
            </span>
          </div>

          ${this._isSearchActive()
            ? html`
                <p class="search-summary">
                  Showing ${visibleFilterGroups.length} group${visibleFilterGroups.length === 1 ? "" : "s"} matching
                  "${this._searchQuery.trim()}". Reordering is paused while search is active.
                </p>
              `
            : nothing}

          ${this._renderContent()}

          <div class="filter-groups-container">
            ${this._isLoading || this._errorMessage
              ? nothing
              : this._filterGroups.length === 0
                ? this._renderEmptyState()
                : visibleFilterGroups.length === 0
                  ? this._renderNoSearchResults()
                  : visibleFilterGroups.map((group) => this._renderFilterGroupCard(group))}
          </div>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .filters-container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
    }

    .header-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .search-box {
      flex: 1;
      min-width: 240px;
      max-width: 520px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .info-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .info-banner uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
    }

    .search-summary {
      margin: 0 0 var(--uui-size-space-3);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .filter-groups-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .filter-group-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .filter-group-card.--umb-sorter-placeholder {
      visibility: hidden;
      position: relative;
    }

    .filter-group-card.--umb-sorter-placeholder::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: var(--uui-color-surface-alt);
    }

    .filter-group-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface-emphasis);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .filter-group-drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
      display: flex;
      align-items: center;
    }

    .filter-group-drag-handle:active {
      cursor: grabbing;
    }

    .filter-group-toggle {
      background: none;
      border: none;
      padding: var(--uui-size-space-1);
      cursor: pointer;
      color: var(--uui-color-text-alt);
      display: flex;
      align-items: center;
    }

    .filter-group-toggle:hover {
      color: var(--uui-color-text);
    }

    .filter-group-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font: inherit;
      text-align: left;
    }

    .filter-group-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .filter-group-count {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .filter-group-actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .filter-group-content {
      padding: var(--uui-size-space-3);
    }

    .filters-container[data-group-id] {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      transition: background 0.15s ease;
    }

    .filter-item:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .filter-item.--umb-sorter-placeholder {
      visibility: hidden;
      position: relative;
    }

    .filter-item.--umb-sorter-placeholder::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: var(--uui-color-surface-alt);
    }

    .filter-item-drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
      display: flex;
      align-items: center;
    }

    .filter-item-drag-handle:active {
      cursor: grabbing;
    }

    .filter-item-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      background: none;
      border: none;
      padding: 0;
      text-align: left;
      color: inherit;
      font: inherit;
      cursor: pointer;
      min-width: 0;
    }

    .filter-color-swatch {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
      flex-shrink: 0;
    }

    .filter-name {
      font-weight: 500;
    }

    .filter-product-count {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-left: auto;
    }

    .empty-filters {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-action {
      display: flex;
      justify-content: center;
      margin-top: var(--uui-size-space-4);
    }
  `;
}

export default MerchelloFiltersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filters-list": MerchelloFiltersListElement;
  }
}
