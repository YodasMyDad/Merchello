import { html as n, css as _, state as d, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as b } from "./merchello-api-B76CV0sD.js";
import { m as v } from "./modal-layout.styles-C2OaUji5.js";
var C = Object.defineProperty, y = Object.getOwnPropertyDescriptor, h = (t) => {
  throw TypeError(t);
}, c = (t, e, r, i) => {
  for (var s = i > 1 ? void 0 : i ? y(e, r) : e, l = t.length - 1, o; l >= 0; l--)
    (o = t[l]) && (s = (i ? o(e, r, s) : o(s)) || s);
  return i && s && C(e, r, s), s;
}, m = (t, e, r) => e.has(t) || h("Cannot " + r), S = (t, e, r) => (m(t, e, "read from private field"), e.get(t)), F = (t, e, r) => e.has(t) ? h("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r), p = (t, e, r, i) => (m(t, e, "write to private field"), e.set(t, r), r), u;
let a = class extends g {
  constructor() {
    super(...arguments), this._filterGroups = [], this._selectedFilterIds = [], this._isLoading = !0, this._errorMessage = null, this._searchTerm = "", F(this, u, !1);
  }
  connectedCallback() {
    super.connectedCallback(), p(this, u, !0), this._loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, u, !1);
  }
  async _loadFilterGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: e } = await b.getFilterGroups();
    if (!S(this, u)) return;
    if (e) {
      this._errorMessage = e.message, this._isLoading = !1;
      return;
    }
    const r = this.data?.excludeFilterIds ?? [], i = this.data?.filterGroupId;
    let s = t ?? [];
    i && (s = s.filter((l) => l.id === i)), this._filterGroups = s.map((l) => ({
      ...l,
      filters: l.filters.filter((o) => !r.includes(o.id))
    })).filter((l) => l.filters.length > 0), this._selectedFilterIds = this._selectedFilterIds.filter(
      (l) => this._filterOptions.some((o) => o.id === l)
    ), this._isLoading = !1;
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _filterOptions() {
    const t = [];
    for (const e of this._filterGroups)
      for (const r of e.filters)
        t.push({
          id: r.id,
          name: r.name,
          groupName: e.name,
          productCount: r.productCount,
          hexColour: r.hexColour
        });
    return t.sort((e, r) => {
      const i = e.groupName.localeCompare(r.groupName);
      return i !== 0 ? i : e.name.localeCompare(r.name);
    });
  }
  get _filteredFilterOptions() {
    const t = this._searchTerm.trim().toLowerCase();
    return t ? this._filterOptions.filter(
      (e) => [e.name, e.groupName, e.hexColour ?? ""].some(
        (r) => r.toLowerCase().includes(t)
      )
    ) : this._filterOptions;
  }
  get _tableConfig() {
    return {
      allowSelection: !0
    };
  }
  get _tableColumns() {
    return [
      { name: "Filter", alias: "filterName" },
      { name: "Group", alias: "groupName", width: "200px" },
      { name: "Products", alias: "productCount", width: "120px", align: "right" }
    ];
  }
  _createTableItems(t) {
    return t.map((e) => ({
      id: e.id,
      icon: "icon-filter",
      data: [
        {
          columnAlias: "filterName",
          value: e.hexColour ? `${e.name} (${e.hexColour})` : e.name
        },
        {
          columnAlias: "groupName",
          value: e.groupName
        },
        {
          columnAlias: "productCount",
          value: e.productCount
        }
      ]
    }));
  }
  _applySelection(t) {
    const e = new Set(this._filterOptions.map((i) => i.id)), r = t.filter((i) => e.has(i));
    this._selectedFilterIds = this._isMultiSelect ? r : r.slice(0, 1);
  }
  _handleTableSelected(t) {
    t.stopPropagation();
    const e = t.target;
    if (this._isMultiSelect) {
      this._applySelection(e.selection);
      return;
    }
    const r = e.selection.find((i) => !this._selectedFilterIds.includes(i));
    if (r) {
      this._applySelection([r]);
      return;
    }
    this._applySelection(e.selection.slice(0, 1));
  }
  _handleTableDeselected(t) {
    t.stopPropagation();
    const e = t.target;
    this._applySelection(e.selection);
  }
  _handleSearchInput(t) {
    this._searchTerm = t.target.value;
  }
  _handleSearchClear() {
    this._searchTerm = "";
  }
  _handleSubmit() {
    const t = new Map(this._filterOptions.map((r) => [r.id, r])), e = this._selectedFilterIds.map((r) => t.get(r)).filter((r) => !!r);
    this.value = {
      selectedFilterIds: e.map((r) => r.id),
      selectedFilterNames: e.map((r) => `${r.groupName}: ${r.name}`)
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderContent() {
    return this._isLoading ? n`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? n`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadFilterGroups()}>
            Retry
          </uui-button>
        </div>
      ` : this._filterOptions.length === 0 ? n`<p class="empty-state">No product filters available.</p>` : this._filteredFilterOptions.length === 0 ? n`<p class="empty-state">No product filters match your search.</p>` : n`
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
  render() {
    const t = this._selectedFilterIds.length, e = this._isMultiSelect ? `Add Selected (${t})` : "Add Filter";
    return n`
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
              ${this._searchTerm ? n`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : ""}
            </uui-input>
          </div>
          <div class="results-container">${this._renderContent()}</div>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          .label=${e}
          look="primary"
          color="positive"
          ?disabled=${t === 0}
          @click=${this._handleSubmit}>
          ${e}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
a.styles = [
  v,
  _`
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
  `
];
c([
  d()
], a.prototype, "_filterGroups", 2);
c([
  d()
], a.prototype, "_selectedFilterIds", 2);
c([
  d()
], a.prototype, "_isLoading", 2);
c([
  d()
], a.prototype, "_errorMessage", 2);
c([
  d()
], a.prototype, "_searchTerm", 2);
a = c([
  f("merchello-filter-picker-modal")
], a);
const w = a;
export {
  a as MerchelloFilterPickerModalElement,
  w as default
};
//# sourceMappingURL=filter-picker-modal.element-uSzJHkIL.js.map
