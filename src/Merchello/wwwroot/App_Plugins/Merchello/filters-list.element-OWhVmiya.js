import { LitElement as w, html as s, nothing as _, css as G, state as f, customElement as z } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as M, UMB_MODAL_MANAGER_CONTEXT as S, UMB_CONFIRM_MODAL as A } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as L } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as x } from "@umbraco-cms/backoffice/sorter";
import { M as v } from "./merchello-api-B1skiL_A.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const F = new M("Merchello.FilterGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), k = new M("Merchello.Filter.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var O = Object.defineProperty, D = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, h = (e, i, r, o) => {
  for (var a = o > 1 ? void 0 : o ? D(i, r) : i, m = e.length - 1, c; m >= 0; m--)
    (c = e[m]) && (a = (o ? c(i, r, a) : c(a)) || a);
  return o && a && O(i, r, a), a;
}, $ = (e, i, r) => i.has(e) || C("Cannot " + r), t = (e, i, r) => ($(e, i, "read from private field"), r ? r.call(e) : i.get(e)), g = (e, i, r) => i.has(e) ? C("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), b = (e, i, r, o) => ($(e, i, "write to private field"), i.set(e, r), r), u, l, n, y, p;
let d = class extends E(w) {
  constructor() {
    super(), this._filterGroups = [], this._isLoading = !0, this._errorMessage = null, this._isDeletingGroup = null, this._expandedGroups = /* @__PURE__ */ new Set(), g(this, u), g(this, l), g(this, n, !1), g(this, y, new x(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-group-id") ?? "",
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.FilterGroups.Sorter",
      itemSelector: ".filter-group-card",
      containerSelector: ".filter-groups-container",
      onChange: ({ model: e }) => {
        this._filterGroups = e, this._handleGroupReorder(e.map((i) => i.id));
      }
    })), g(this, p, /* @__PURE__ */ new Map()), this.consumeContext(S, (e) => {
      b(this, u, e);
    }), this.consumeContext(L, (e) => {
      b(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), b(this, n, !0), this._loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), b(this, n, !1), t(this, p).clear();
  }
  async _loadFilterGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await v.getFilterGroups();
    if (t(this, n)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      if (e) {
        this._filterGroups = e, t(this, y).setModel(this._filterGroups), this._expandedGroups = new Set(e.map((r) => r.id)), t(this, p).clear();
        for (const r of e)
          this._getOrCreateFilterSorter(r.id).setModel(r.filters);
      }
      this._isLoading = !1;
    }
  }
  async _handleGroupReorder(e) {
    const { error: i } = await v.reorderFilterGroups(e);
    i && (t(this, l)?.peek("danger", {
      data: { headline: "Reorder failed", message: i.message }
    }), this._loadFilterGroups());
  }
  _getOrCreateFilterSorter(e) {
    let i = t(this, p).get(e);
    return i || (i = new x(this, {
      getUniqueOfElement: (r) => r.getAttribute("data-filter-id") ?? "",
      getUniqueOfModel: (r) => r.id,
      identifier: "Merchello.Filters.Sorter",
      itemSelector: ".filter-item",
      containerSelector: `.filters-container[data-group-id="${e}"]`,
      onChange: ({ model: r }) => {
        const o = this._filterGroups.find((a) => a.id === e);
        o && (o.filters = r, this.requestUpdate()), this._handleFilterReorder(e, r.map((a) => a.id));
      }
    }), t(this, p).set(e, i)), i;
  }
  async _handleFilterReorder(e, i) {
    const { error: r } = await v.reorderFilters(e, i);
    r && (t(this, l)?.peek("danger", {
      data: { headline: "Reorder failed", message: r.message }
    }), this._loadFilterGroups());
  }
  async _handleAddFilterGroup() {
    const i = await t(this, u)?.open(this, F, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    t(this, n) && i?.isCreated && (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter group created",
        message: `"${i.filterGroup?.name}" has been created successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleEditFilterGroup(e) {
    const r = await t(this, u)?.open(this, F, {
      data: { filterGroup: e }
    })?.onSubmit().catch(() => {
    });
    t(this, n) && r?.isUpdated && (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter group updated",
        message: `"${r.filterGroup?.name}" has been updated successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleDeleteFilterGroup(e, i) {
    e.preventDefault(), e.stopPropagation();
    const r = i.filters?.length || 0, o = r > 0 ? ` This will also delete ${r} filter${r > 1 ? "s" : ""} in this group.` : "";
    if (!await t(this, u)?.open(this, A, {
      data: {
        headline: "Delete Filter Group",
        content: `Are you sure you want to delete filter group "${i.name}"?${o} This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !t(this, n)) return;
    this._isDeletingGroup = i.id;
    const { error: c } = await v.deleteFilterGroup(i.id);
    if (t(this, n)) {
      if (this._isDeletingGroup = null, c) {
        this._errorMessage = `Failed to delete filter group: ${c.message}`, t(this, l)?.peek("danger", {
          data: { headline: "Failed to delete", message: c.message }
        });
        return;
      }
      t(this, l)?.peek("positive", {
        data: { headline: "Filter group deleted", message: "The filter group has been deleted successfully" }
      }), this._loadFilterGroups();
    }
  }
  async _handleAddFilter(e) {
    const r = await t(this, u)?.open(this, k, {
      data: { filterGroupId: e.id }
    })?.onSubmit().catch(() => {
    });
    t(this, n) && r?.isCreated && (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter created",
        message: `"${r.filter?.name}" has been created successfully`
      }
    }), this._loadFilterGroups());
  }
  async _handleEditFilter(e, i) {
    const o = await t(this, u)?.open(this, k, {
      data: { filterGroupId: e, filter: i }
    })?.onSubmit().catch(() => {
    });
    t(this, n) && (o?.isUpdated ? (t(this, l)?.peek("positive", {
      data: {
        headline: "Filter updated",
        message: `"${o.filter?.name}" has been updated successfully`
      }
    }), this._loadFilterGroups()) : o?.isDeleted && (t(this, l)?.peek("positive", {
      data: { headline: "Filter deleted", message: "The filter has been deleted successfully" }
    }), this._loadFilterGroups()));
  }
  _toggleGroupExpanded(e) {
    const i = new Set(this._expandedGroups);
    i.has(e) ? i.delete(e) : i.add(e), this._expandedGroups = i;
  }
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return s`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return s`
      <merchello-empty-state
        icon="icon-filter"
        headline="No filter groups configured"
        message="Create filter groups to organize product attributes like Color, Size, or Material. Then add filter values that can be assigned to products.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button look="primary" color="positive" label="Add Filter Group" @click=${this._handleAddFilterGroup}>
          Add Filter Group
        </uui-button>
      </div>
    `;
  }
  _renderFilterItem(e, i) {
    return s`
      <div
        class="filter-item"
        data-filter-id=${e.id}
        @click=${() => this._handleEditFilter(i, e)}>
        <div class="filter-item-drag-handle">
          <uui-icon name="icon-navigation"></uui-icon>
        </div>
        <div class="filter-item-content">
          ${e.hexColour ? s`<span class="filter-color-swatch" style="background: ${e.hexColour}"></span>` : _}
          <span class="filter-name">${e.name}</span>
          ${e.productCount > 0 ? s`<span class="filter-product-count">${e.productCount} product${e.productCount > 1 ? "s" : ""}</span>` : _}
        </div>
        <div class="filter-item-actions">
          <uui-button
            look="secondary"
            compact
            label="Edit"
            @click=${(r) => {
      r.stopPropagation(), this._handleEditFilter(i, e);
    }}>
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderFilterGroupCard(e) {
    const i = this._expandedGroups.has(e.id), r = this._isDeletingGroup === e.id, o = e.filters?.length || 0;
    return s`
      <div class="filter-group-card" data-group-id=${e.id}>
        <div class="filter-group-header">
          <div class="filter-group-drag-handle">
            <uui-icon name="icon-navigation"></uui-icon>
          </div>
          <button
            class="filter-group-toggle"
            @click=${() => this._toggleGroupExpanded(e.id)}
            aria-expanded=${i}>
            <uui-icon name=${i ? "icon-arrow-down" : "icon-arrow-right"}></uui-icon>
          </button>
          <div class="filter-group-info" @click=${() => this._toggleGroupExpanded(e.id)}>
            <span class="filter-group-name">${e.name}</span>
            <span class="filter-group-count">${o} filter${o !== 1 ? "s" : ""}</span>
          </div>
          <div class="filter-group-actions">
            <uui-button
              look="secondary"
              compact
              label="Add Filter"
              @click=${(a) => {
      a.stopPropagation(), this._handleAddFilter(e);
    }}>
              <uui-icon name="icon-add"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(a) => {
      a.stopPropagation(), this._handleEditFilterGroup(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${r}
              @click=${(a) => this._handleDeleteFilterGroup(a, e)}>
              <uui-icon name=${r ? "icon-hourglass" : "icon-trash"}></uui-icon>
            </uui-button>
          </div>
        </div>
        ${i ? s`
              <div class="filter-group-content">
                ${e.filters && e.filters.length > 0 ? s`
                      <div class="filters-container" data-group-id=${e.id}>
                        ${e.filters.map((a) => this._renderFilterItem(a, e.id))}
                      </div>
                    ` : s`
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
            ` : _}
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._filterGroups.length === 0 ? this._renderEmptyState() : s`
      <div class="filter-groups-container">
        ${this._filterGroups.map((e) => this._renderFilterGroupCard(e))}
      </div>
    `;
  }
  render() {
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="filters-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button look="primary" color="positive" label="Add Filter Group" @click=${this._handleAddFilterGroup}>
              Add Filter Group
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              Filter groups organize product attributes (like Color, Size, Material). Add filters to each group, then
              assign them to products. Drag to reorder groups or filters within a group.
            </span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
d.styles = G`
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
      gap: var(--uui-size-space-2);
      align-items: center;
      justify-content: flex-end;
      margin-bottom: var(--uui-size-space-4);
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
      cursor: pointer;
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

    .filter-item-actions {
      display: flex;
      gap: var(--uui-size-space-1);
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
h([
  f()
], d.prototype, "_filterGroups", 2);
h([
  f()
], d.prototype, "_isLoading", 2);
h([
  f()
], d.prototype, "_errorMessage", 2);
h([
  f()
], d.prototype, "_isDeletingGroup", 2);
h([
  f()
], d.prototype, "_expandedGroups", 2);
d = h([
  z("merchello-filters-list")
], d);
const B = d;
export {
  d as MerchelloFiltersListElement,
  B as default
};
//# sourceMappingURL=filters-list.element-OWhVmiya.js.map
