import { LitElement as L, html as l, nothing as g, css as R, state as F, customElement as D } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as O } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as z, UMB_MODAL_MANAGER_CONTEXT as T, UMB_CONFIRM_MODAL as W } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as Q } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as C } from "@umbraco-cms/backoffice/sorter";
import { M as S } from "./merchello-api-B76CV0sD.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import { c as U } from "./collection-layout.styles-BLT_S_EA.js";
const G = new z("Merchello.FilterGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), M = new z("Merchello.Filter.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var I = Object.defineProperty, N = Object.getOwnPropertyDescriptor, A = (e) => {
  throw TypeError(e);
}, w = (e, i, r, s) => {
  for (var o = s > 1 ? void 0 : s ? N(i, r) : i, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (o = (s ? c(i, r, o) : c(o)) || o);
  return s && o && I(i, r, o), o;
}, E = (e, i, r) => i.has(e) || A("Cannot " + r), t = (e, i, r) => (E(e, i, "read from private field"), i.get(e)), p = (e, i, r) => i.has(e) ? A("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), a = (e, i, r, s) => (E(e, i, "write to private field"), i.set(e, r), r), v, u, n, $, _, f, k, b, m, x, y;
let h = class extends O(L) {
  constructor() {
    super(), this._filterGroups = [], this._isLoading = !0, this._errorMessage = null, this._isDeletingGroup = null, this._expandedGroups = /* @__PURE__ */ new Set(), this._searchQuery = "", p(this, v), p(this, u), p(this, n, !1), p(this, $, !1), p(this, _, null), p(this, f), p(this, k, !1), p(this, b, /* @__PURE__ */ new Map()), p(this, m), p(this, x, new C(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-group-id") ?? "",
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.FilterGroups.Sorter",
      itemSelector: ".filter-group-card",
      containerSelector: ".filter-groups-container",
      onChange: ({ model: e }) => {
        this._filterGroups = e, this._syncSortersWithCurrentView(), this._queueGroupReorder(e.map((i) => i.id));
      }
    })), p(this, y, /* @__PURE__ */ new Map()), this.consumeContext(T, (e) => {
      a(this, v, e);
    }), this.consumeContext(Q, (e) => {
      a(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), a(this, n, !0), this._loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), a(this, n, !1), t(this, f) !== void 0 && (window.clearTimeout(t(this, f)), a(this, f, void 0)), t(this, m) !== void 0 && (window.clearTimeout(t(this, m)), a(this, m, void 0)), a(this, _, null), t(this, b).clear(), t(this, x).disable();
    for (const e of t(this, y).values())
      e.disable();
    t(this, y).clear();
  }
  async _loadFilterGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await S.getFilterGroups();
    if (t(this, n)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      if (e) {
        this._filterGroups = e, this._expandedGroups = new Set(e.map((r) => r.id)), t(this, y).clear();
        for (const r of e)
          this._getOrCreateFilterSorter(r.id);
        this._syncSortersWithCurrentView();
      }
      this._isLoading = !1;
    }
  }
  _syncSortersWithCurrentView() {
    const e = !this._isSearchActive();
    e ? (t(this, x).enable(), t(this, x).setModel(this._filterGroups)) : t(this, x).disable();
    for (const i of this._filterGroups) {
      const r = this._getOrCreateFilterSorter(i.id);
      e && this._expandedGroups.has(i.id) ? (r.enable(), r.setModel(i.filters)) : r.disable();
    }
  }
  _queueGroupReorder(e) {
    a(this, _, [...new Set(e)]), t(this, f) !== void 0 && window.clearTimeout(t(this, f)), a(this, f, window.setTimeout(() => {
      a(this, f, void 0), this._flushGroupReorderQueue();
    }, 200));
  }
  async _flushGroupReorderQueue() {
    if (!t(this, $)) {
      a(this, $, !0);
      try {
        for (; t(this, _) && t(this, n); ) {
          const e = t(this, _);
          a(this, _, null);
          const { error: i } = await S.reorderFilterGroups(e);
          if (!t(this, n)) return;
          if (i) {
            t(this, u)?.peek("danger", {
              data: { headline: "Reorder failed", message: i.message }
            }), a(this, _, null), await this._loadFilterGroups();
            break;
          }
        }
      } finally {
        a(this, $, !1);
      }
    }
  }
  _getOrCreateFilterSorter(e) {
    let i = t(this, y).get(e);
    return i || (i = new C(this, {
      getUniqueOfElement: (r) => r.getAttribute("data-filter-id") ?? "",
      getUniqueOfModel: (r) => r.id,
      identifier: `Merchello.Filters.Sorter.${e}`,
      itemSelector: ".filter-item",
      containerSelector: `.filters-container[data-group-id="${e}"]`,
      onChange: ({ model: r }) => {
        this._filterGroups = this._filterGroups.map(
          (s) => s.id === e ? { ...s, filters: r } : s
        ), this._queueFilterReorder(e, r.map((s) => s.id));
      }
    }), t(this, y).set(e, i)), i;
  }
  _queueFilterReorder(e, i) {
    t(this, b).set(e, [...new Set(i)]), t(this, m) !== void 0 && window.clearTimeout(t(this, m)), a(this, m, window.setTimeout(() => {
      a(this, m, void 0), this._flushFilterReorderQueue();
    }, 200));
  }
  async _flushFilterReorderQueue() {
    if (!t(this, k)) {
      a(this, k, !0);
      try {
        for (; t(this, b).size > 0 && t(this, n); ) {
          const e = Array.from(t(this, b).entries());
          t(this, b).clear();
          for (const [i, r] of e) {
            const { error: s } = await S.reorderFilters(i, r);
            if (!t(this, n)) return;
            if (s) {
              t(this, u)?.peek("danger", {
                data: { headline: "Reorder failed", message: s.message }
              }), t(this, b).clear(), await this._loadFilterGroups();
              return;
            }
          }
        }
      } finally {
        a(this, k, !1);
      }
    }
  }
  async _handleAddFilterGroup() {
    const i = await t(this, v)?.open(this, G, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    t(this, n) && i?.isCreated && (t(this, u)?.peek("positive", {
      data: {
        headline: "Filter group created",
        message: `"${i.filterGroup?.name}" has been created successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleEditFilterGroup(e) {
    const r = await t(this, v)?.open(this, G, {
      data: { filterGroup: e }
    })?.onSubmit().catch(() => {
    });
    t(this, n) && r?.isUpdated && (t(this, u)?.peek("positive", {
      data: {
        headline: "Filter group updated",
        message: `"${r.filterGroup?.name}" has been updated successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleDeleteFilterGroup(e, i) {
    e.preventDefault(), e.stopPropagation();
    const r = i.filters?.length || 0, s = r > 0 ? ` This also deletes ${r} filter${r > 1 ? "s" : ""} in this group.` : "", o = t(this, v)?.open(this, W, {
      data: {
        headline: "Delete Filter Group",
        content: `Delete "${i.name}"?${s} This permanently removes the group and cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await o?.onSubmit();
    } catch {
      return;
    }
    if (!t(this, n)) return;
    this._isDeletingGroup = i.id;
    const { error: d } = await S.deleteFilterGroup(i.id);
    if (t(this, n)) {
      if (this._isDeletingGroup = null, d) {
        this._errorMessage = `Failed to delete filter group: ${d.message}`, t(this, u)?.peek("danger", {
          data: { headline: "Failed to delete", message: d.message }
        });
        return;
      }
      t(this, u)?.peek("positive", {
        data: { headline: "Filter group deleted", message: "The filter group has been deleted successfully" }
      }), this._loadFilterGroups();
    }
  }
  async _handleAddFilter(e) {
    const r = await t(this, v)?.open(this, M, {
      data: { filterGroupId: e.id }
    })?.onSubmit().catch(() => {
    });
    t(this, n) && r?.isCreated && (t(this, u)?.peek("positive", {
      data: {
        headline: "Filter created",
        message: `"${r.filter?.name}" has been created successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleEditFilter(e, i) {
    const s = await t(this, v)?.open(this, M, {
      data: { filterGroupId: e, filter: i }
    })?.onSubmit().catch(() => {
    });
    t(this, n) && (s?.isUpdated ? (t(this, u)?.peek("positive", {
      data: {
        headline: "Filter updated",
        message: `"${s.filter?.name}" has been updated successfully`
      }
    }), this._loadFilterGroups()) : s?.isDeleted && (t(this, u)?.peek("positive", {
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
      const s = i.filters.filter(
        (o) => o.name.toLowerCase().includes(e)
      );
      return s.length === 0 ? null : { ...i, filters: s };
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
    return l`
      <div class="loading" role="status" aria-live="polite" aria-label="Loading filter groups">
        <uui-loader></uui-loader>
      </div>
    `;
  }
  _renderErrorState() {
    return l`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return l`
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
    return l`
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
    return l`
      <div class="filter-item" data-filter-id=${e.id}>
        ${this._isSearchActive() ? g : l`
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
          ${e.hexColour ? l`<span class="filter-color-swatch" style="background: ${e.hexColour}"></span>` : g}
          <span class="filter-name">${e.name}</span>
          ${e.productCount > 0 ? l`<span class="filter-product-count">${e.productCount} product${e.productCount > 1 ? "s" : ""}</span>` : g}
        </button>
      </div>
    `;
  }
  _renderFilterGroupCard(e) {
    const i = this._expandedGroups.has(e.id), r = this._isDeletingGroup === e.id, s = e.filters?.length || 0, o = i ? `Collapse ${e.name}` : `Expand ${e.name}`, d = `filter-group-content-${e.id}`;
    return l`
      <div class="filter-group-card" data-group-id=${e.id}>
        <div class="filter-group-header">
          ${this._isSearchActive() ? g : l`
                <div class="filter-group-drag-handle">
                  <uui-icon name="icon-navigation"></uui-icon>
                </div>
              `}
          <button
            type="button"
            class="filter-group-toggle"
            @click=${() => this._toggleGroupExpanded(e.id)}
            aria-expanded=${i}
            aria-controls=${d}
            aria-label=${o}
            title=${o}>
            <uui-icon name=${i ? "icon-arrow-down" : "icon-arrow-right"}></uui-icon>
          </button>
          <button
            type="button"
            class="filter-group-info"
            @click=${() => this._toggleGroupExpanded(e.id)}
            aria-expanded=${i}
            aria-controls=${d}
            aria-label=${o}
            title=${o}>
            <span class="filter-group-name">${e.name}</span>
            <span class="filter-group-count">${s} filter${s !== 1 ? "s" : ""}</span>
          </button>
          <div class="filter-group-actions">
            <uui-button
              look="secondary"
              compact
              label="Add filter"
              @click=${(c) => {
      c.stopPropagation(), this._handleAddFilter(e);
    }}>
              <uui-icon name="icon-add"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Edit group"
              @click=${(c) => {
      c.stopPropagation(), this._handleEditFilterGroup(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              compact
              label="Delete group"
              ?disabled=${r}
              @click=${(c) => this._handleDeleteFilterGroup(c, e)}>
              <uui-icon name=${r ? "icon-hourglass" : "icon-trash"}></uui-icon>
            </uui-button>
          </div>
        </div>
        ${i ? l`
              <div class="filter-group-content" id=${d}>
                <div class="filters-container" data-group-id=${e.id}>
                  ${e.filters.length > 0 ? e.filters.map((c) => this._renderFilterItem(c, e.id)) : l`
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
            ` : g}
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : g;
  }
  render() {
    const e = this._getVisibleFilterGroups();
    return l`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="filters-container layout-container">
          <div class="filters">
            <div class="filters-top">
              <div class="search-box">
                <uui-input
                  type="search"
                  label="Search filter groups and filters"
                  placeholder="Search groups or filters"
                  .value=${this._searchQuery}
                  @input=${this._handleSearchInput}>
                  <uui-icon name="icon-search" slot="prepend"></uui-icon>
                  ${this._searchQuery ? l`
                        <uui-button
                          slot="append"
                          compact
                          look="secondary"
                          label="Clear search"
                          @click=${this._clearSearch}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      ` : g}
                </uui-input>
              </div>
              <div class="header-actions">
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
            </div>
          </div>

          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              Filter groups organize product attributes (like Color, Size, Material). Add filters to each group, then
              assign them to products. Drag to reorder groups or filters within a group.
            </span>
          </div>

          ${this._isSearchActive() ? l`
                <p class="search-summary">
                  Showing ${e.length} group${e.length === 1 ? "" : "s"} matching
                  "${this._searchQuery.trim()}". Reordering is paused while search is active.
                </p>
              ` : g}

          ${this._renderContent()}

          <div class="filter-groups-container">
            ${this._isLoading || this._errorMessage ? g : this._filterGroups.length === 0 ? this._renderEmptyState() : e.length === 0 ? this._renderNoSearchResults() : e.map((i) => this._renderFilterGroupCard(i))}
          </div>
        </div>
      </umb-body-layout>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
$ = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
k = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
h.styles = [
  U,
  R`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
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
  `
];
w([
  F()
], h.prototype, "_filterGroups", 2);
w([
  F()
], h.prototype, "_isLoading", 2);
w([
  F()
], h.prototype, "_errorMessage", 2);
w([
  F()
], h.prototype, "_isDeletingGroup", 2);
w([
  F()
], h.prototype, "_expandedGroups", 2);
w([
  F()
], h.prototype, "_searchQuery", 2);
h = w([
  D("merchello-filters-list")
], h);
const K = h;
export {
  h as MerchelloFiltersListElement,
  K as default
};
//# sourceMappingURL=filters-list.element-NDYSchBD.js.map
