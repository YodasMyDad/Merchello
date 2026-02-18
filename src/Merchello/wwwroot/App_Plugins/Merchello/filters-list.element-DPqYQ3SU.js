import { LitElement as S, html as o, nothing as p, css as G, state as v, customElement as M } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as z } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as w, UMB_MODAL_MANAGER_CONTEXT as E, UMB_CONFIRM_MODAL as A } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as L } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as x } from "@umbraco-cms/backoffice/sorter";
import { M as _ } from "./merchello-api-Dp_zU_yi.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
const $ = new w("Merchello.FilterGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), F = new w("Merchello.Filter.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var O = Object.defineProperty, D = Object.getOwnPropertyDescriptor, k = (e) => {
  throw TypeError(e);
}, f = (e, i, r, a) => {
  for (var s = a > 1 ? void 0 : a ? D(i, r) : i, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (s = (a ? u(i, r, s) : u(s)) || s);
  return a && s && O(i, r, s), s;
}, C = (e, i, r) => i.has(e) || k("Cannot " + r), t = (e, i, r) => (C(e, i, "read from private field"), r ? r.call(e) : i.get(e)), b = (e, i, r) => i.has(e) ? k("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), y = (e, i, r, a) => (C(e, i, "write to private field"), i.set(e, r), r), h, l, d, m, g;
let c = class extends z(S) {
  constructor() {
    super(), this._filterGroups = [], this._isLoading = !0, this._errorMessage = null, this._isDeletingGroup = null, this._expandedGroups = /* @__PURE__ */ new Set(), this._searchQuery = "", b(this, h), b(this, l), b(this, d, !1), b(this, m, new x(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-group-id") ?? "",
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.FilterGroups.Sorter",
      itemSelector: ".filter-group-card",
      containerSelector: ".filter-groups-container",
      onChange: ({ model: e }) => {
        this._filterGroups = e, this._syncSortersWithCurrentView(), this._handleGroupReorder(e.map((i) => i.id));
      }
    })), b(this, g, /* @__PURE__ */ new Map()), this.consumeContext(E, (e) => {
      y(this, h, e);
    }), this.consumeContext(L, (e) => {
      y(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), y(this, d, !0), this._loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), y(this, d, !1), t(this, m).disable();
    for (const e of t(this, g).values())
      e.disable();
    t(this, g).clear();
  }
  async _loadFilterGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await _.getFilterGroups();
    if (t(this, d)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      if (e) {
        this._filterGroups = e, this._expandedGroups = new Set(e.map((r) => r.id)), t(this, g).clear();
        for (const r of e)
          this._getOrCreateFilterSorter(r.id);
        this._syncSortersWithCurrentView();
      }
      this._isLoading = !1;
    }
  }
  _syncSortersWithCurrentView() {
    const e = !this._isSearchActive();
    e ? (t(this, m).enable(), t(this, m).setModel(this._filterGroups)) : t(this, m).disable();
    for (const i of this._filterGroups) {
      const r = this._getOrCreateFilterSorter(i.id);
      e && this._expandedGroups.has(i.id) ? (r.enable(), r.setModel(i.filters)) : r.disable();
    }
  }
  async _handleGroupReorder(e) {
    const { error: i } = await _.reorderFilterGroups(e);
    i && (t(this, l)?.peek("danger", {
      data: { headline: "Reorder failed", message: i.message }
    }), this._loadFilterGroups());
  }
  _getOrCreateFilterSorter(e) {
    let i = t(this, g).get(e);
    return i || (i = new x(this, {
      getUniqueOfElement: (r) => r.getAttribute("data-filter-id") ?? "",
      getUniqueOfModel: (r) => r.id,
      identifier: `Merchello.Filters.Sorter.${e}`,
      itemSelector: ".filter-item",
      containerSelector: `.filters-container[data-group-id="${e}"]`,
      onChange: ({ model: r }) => {
        this._filterGroups = this._filterGroups.map(
          (a) => a.id === e ? { ...a, filters: r } : a
        ), this._handleFilterReorder(e, r.map((a) => a.id));
      }
    }), t(this, g).set(e, i)), i;
  }
  async _handleFilterReorder(e, i) {
    const { error: r } = await _.reorderFilters(e, i);
    r && (t(this, l)?.peek("danger", {
      data: { headline: "Reorder failed", message: r.message }
    }), this._loadFilterGroups());
  }
  async _handleAddFilterGroup() {
    const i = await t(this, h)?.open(this, $, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    t(this, d) && i?.isCreated && (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter group created",
        message: `"${i.filterGroup?.name}" has been created successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleEditFilterGroup(e) {
    const r = await t(this, h)?.open(this, $, {
      data: { filterGroup: e }
    })?.onSubmit().catch(() => {
    });
    t(this, d) && r?.isUpdated && (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter group updated",
        message: `"${r.filterGroup?.name}" has been updated successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleDeleteFilterGroup(e, i) {
    e.preventDefault(), e.stopPropagation();
    const r = i.filters?.length || 0, a = r > 0 ? ` This also deletes ${r} filter${r > 1 ? "s" : ""} in this group.` : "", s = t(this, h)?.open(this, A, {
      data: {
        headline: "Delete Filter Group",
        content: `Delete "${i.name}"?${a} This permanently removes the group and cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await s?.onSubmit();
    } catch {
      return;
    }
    if (!t(this, d)) return;
    this._isDeletingGroup = i.id;
    const { error: n } = await _.deleteFilterGroup(i.id);
    if (t(this, d)) {
      if (this._isDeletingGroup = null, n) {
        this._errorMessage = `Failed to delete filter group: ${n.message}`, t(this, l)?.peek("danger", {
          data: { headline: "Failed to delete", message: n.message }
        });
        return;
      }
      t(this, l)?.peek("positive", {
        data: { headline: "Filter group deleted", message: "The filter group has been deleted successfully" }
      }), this._loadFilterGroups();
    }
  }
  async _handleAddFilter(e) {
    const r = await t(this, h)?.open(this, F, {
      data: { filterGroupId: e.id }
    })?.onSubmit().catch(() => {
    });
    t(this, d) && r?.isCreated && (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter created",
        message: `"${r.filter?.name}" has been created successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleEditFilter(e, i) {
    const a = await t(this, h)?.open(this, F, {
      data: { filterGroupId: e, filter: i }
    })?.onSubmit().catch(() => {
    });
    t(this, d) && (a?.isUpdated ? (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter updated",
        message: `"${a.filter?.name}" has been updated successfully`
      }
    }), this._loadFilterGroups()) : a?.isDeleted && (t(this, l)?.peek("positive", {
      data: { headline: "Filter deleted", message: "The filter has been deleted successfully" }
    }), this._loadFilterGroups()));
  }
  _toggleGroupExpanded(e) {
    const i = new Set(this._expandedGroups);
    i.has(e) ? i.delete(e) : i.add(e), this._expandedGroups = i, this._syncSortersWithCurrentView();
  }
  _isSearchActive() {
    return this._searchQuery.trim().length > 0;
  }
  _getVisibleFilterGroups() {
    const e = this._searchQuery.trim().toLowerCase();
    return e ? this._filterGroups.map((i) => {
      if (i.name.toLowerCase().includes(e))
        return i;
      const a = i.filters.filter(
        (s) => s.name.toLowerCase().includes(e)
      );
      return a.length === 0 ? null : { ...i, filters: a };
    }).filter((i) => i !== null) : this._filterGroups;
  }
  _handleSearchInput(e) {
    this._searchQuery = e.target.value, this._isSearchActive() && (this._expandedGroups = new Set(this._getVisibleFilterGroups().map((i) => i.id))), this._syncSortersWithCurrentView();
  }
  _clearSearch() {
    this._searchQuery && (this._searchQuery = "", this._syncSortersWithCurrentView());
  }
  _expandAllGroups() {
    this._expandedGroups = new Set(this._filterGroups.map((e) => e.id)), this._syncSortersWithCurrentView();
  }
  _collapseAllGroups() {
    this._expandedGroups = /* @__PURE__ */ new Set(), this._syncSortersWithCurrentView();
  }
  _renderLoadingState() {
    return o`
      <div class="loading" role="status" aria-live="polite" aria-label="Loading filter groups">
        <uui-loader></uui-loader>
      </div>
    `;
  }
  _renderErrorState() {
    return o`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return o`
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
  _renderNoSearchResults() {
    return o`
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
  _renderFilterItem(e, i) {
    const r = `Edit filter ${e.name}`;
    return o`
      <div class="filter-item" data-filter-id=${e.id}>
        ${this._isSearchActive() ? p : o`
              <div class="filter-item-drag-handle">
                <uui-icon name="icon-navigation"></uui-icon>
              </div>
            `}
        <button
          type="button"
          class="filter-item-content"
          aria-label=${r}
          title=${r}
          @click=${() => this._handleEditFilter(i, e)}>
          ${e.hexColour ? o`<span class="filter-color-swatch" style="background: ${e.hexColour}"></span>` : p}
          <span class="filter-name">${e.name}</span>
          ${e.productCount > 0 ? o`<span class="filter-product-count">${e.productCount} product${e.productCount > 1 ? "s" : ""}</span>` : p}
        </button>
      </div>
    `;
  }
  _renderFilterGroupCard(e) {
    const i = this._expandedGroups.has(e.id), r = this._isDeletingGroup === e.id, a = e.filters?.length || 0, s = i ? `Collapse ${e.name}` : `Expand ${e.name}`, n = `filter-group-content-${e.id}`;
    return o`
      <div class="filter-group-card" data-group-id=${e.id}>
        <div class="filter-group-header">
          ${this._isSearchActive() ? p : o`
                <div class="filter-group-drag-handle">
                  <uui-icon name="icon-navigation"></uui-icon>
                </div>
              `}
          <button
            type="button"
            class="filter-group-toggle"
            @click=${() => this._toggleGroupExpanded(e.id)}
            aria-expanded=${i}
            aria-controls=${n}
            aria-label=${s}
            title=${s}>
            <uui-icon name=${i ? "icon-arrow-down" : "icon-arrow-right"}></uui-icon>
          </button>
          <button
            type="button"
            class="filter-group-info"
            @click=${() => this._toggleGroupExpanded(e.id)}
            aria-expanded=${i}
            aria-controls=${n}
            aria-label=${s}
            title=${s}>
            <span class="filter-group-name">${e.name}</span>
            <span class="filter-group-count">${a} filter${a !== 1 ? "s" : ""}</span>
          </button>
          <div class="filter-group-actions">
            <uui-button
              look="secondary"
              compact
              label="Add filter"
              @click=${(u) => {
      u.stopPropagation(), this._handleAddFilter(e);
    }}>
              <uui-icon name="icon-add"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Edit group"
              @click=${(u) => {
      u.stopPropagation(), this._handleEditFilterGroup(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              compact
              label="Delete group"
              ?disabled=${r}
              @click=${(u) => this._handleDeleteFilterGroup(u, e)}>
              <uui-icon name=${r ? "icon-hourglass" : "icon-trash"}></uui-icon>
            </uui-button>
          </div>
        </div>
        ${i ? o`
              <div class="filter-group-content" id=${n}>
                <div class="filters-container" data-group-id=${e.id}>
                  ${e.filters.length > 0 ? e.filters.map((u) => this._renderFilterItem(u, e.id)) : o`
                        <div class="empty-filters">
                          <span>No filters in this group.</span>
                          <uui-button
                            look="placeholder"
                            label="Add your first filter"
                            @click=${() => this._handleAddFilter(e)}>
                            Add Filter
                          </uui-button>
                        </div>
                      `}
                </div>
              </div>
            ` : p}
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : p;
  }
  render() {
    const e = this._getVisibleFilterGroups();
    return o`
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
                ${this._searchQuery ? o`
                      <uui-button
                        slot="append"
                        compact
                        look="secondary"
                        label="Clear search"
                        @click=${this._clearSearch}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    ` : p}
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

          ${this._isSearchActive() ? o`
                <p class="search-summary">
                  Showing ${e.length} group${e.length === 1 ? "" : "s"} matching
                  "${this._searchQuery.trim()}". Reordering is paused while search is active.
                </p>
              ` : p}

          ${this._renderContent()}

          <div class="filter-groups-container">
            ${this._isLoading || this._errorMessage ? p : this._filterGroups.length === 0 ? this._renderEmptyState() : e.length === 0 ? this._renderNoSearchResults() : e.map((i) => this._renderFilterGroupCard(i))}
          </div>
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
c.styles = G`
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
f([
  v()
], c.prototype, "_filterGroups", 2);
f([
  v()
], c.prototype, "_isLoading", 2);
f([
  v()
], c.prototype, "_errorMessage", 2);
f([
  v()
], c.prototype, "_isDeletingGroup", 2);
f([
  v()
], c.prototype, "_expandedGroups", 2);
f([
  v()
], c.prototype, "_searchQuery", 2);
c = f([
  M("merchello-filters-list")
], c);
const P = c;
export {
  c as MerchelloFiltersListElement,
  P as default
};
//# sourceMappingURL=filters-list.element-DPqYQ3SU.js.map
