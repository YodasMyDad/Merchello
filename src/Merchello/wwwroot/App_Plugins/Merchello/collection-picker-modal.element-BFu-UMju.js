import { html as o, css as m, state as c, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as C } from "./merchello-api-B1P1cUX9.js";
var b = Object.defineProperty, v = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, r = (e, t, l, i) => {
  for (var a = i > 1 ? void 0 : i ? v(t, l) : t, d = e.length - 1, u; d >= 0; d--)
    (u = e[d]) && (a = (i ? u(t, l, a) : u(a)) || a);
  return i && a && b(t, l, a), a;
}, _ = (e, t, l) => t.has(e) || p("Cannot " + l), y = (e, t, l) => (_(e, t, "read from private field"), t.get(e)), S = (e, t, l) => t.has(e) ? p("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, l), h = (e, t, l, i) => (_(e, t, "write to private field"), t.set(e, l), l), n;
let s = class extends f {
  constructor() {
    super(...arguments), this._selectedIds = [], this._collections = [], this._isLoading = !0, this._errorMessage = null, this._searchTerm = "", S(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, n, !0), this._loadCollections();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, n, !1);
  }
  async _loadCollections() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await C.getProductCollections();
    if (!y(this, n)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const l = this.data?.excludeIds ?? [];
    this._collections = (e ?? []).filter((i) => !l.includes(i.id)), this._isLoading = !1;
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _filteredCollections() {
    const e = [...this._collections].sort((l, i) => l.name.localeCompare(i.name));
    if (!this._searchTerm.trim())
      return e;
    const t = this._searchTerm.toLowerCase().trim();
    return e.filter((l) => l.name.toLowerCase().includes(t));
  }
  get _tableConfig() {
    return {
      allowSelection: !0
    };
  }
  get _tableColumns() {
    return [
      { name: "Collection", alias: "collectionName" },
      { name: "Products", alias: "productCount", width: "120px", align: "right" }
    ];
  }
  _createTableItems(e) {
    return e.map((t) => ({
      id: t.id,
      icon: "icon-folder",
      data: [
        {
          columnAlias: "collectionName",
          value: t.name
        },
        {
          columnAlias: "productCount",
          value: t.productCount
        }
      ]
    }));
  }
  _applySelection(e) {
    const t = new Set(this._collections.map((i) => i.id)), l = e.filter((i) => t.has(i));
    this._selectedIds = this._isMultiSelect ? l : l.slice(0, 1);
  }
  _handleTableSelected(e) {
    e.stopPropagation();
    const t = e.target;
    if (this._isMultiSelect) {
      this._applySelection(t.selection);
      return;
    }
    const l = t.selection.find((i) => !this._selectedIds.includes(i));
    if (l) {
      this._applySelection([l]);
      return;
    }
    this._applySelection(t.selection.slice(0, 1));
  }
  _handleTableDeselected(e) {
    e.stopPropagation();
    const t = e.target;
    this._applySelection(t.selection);
  }
  _handleSearchInput(e) {
    this._searchTerm = e.target.value;
  }
  _handleSearchClear() {
    this._searchTerm = "";
  }
  _handleSubmit() {
    const e = new Map(this._collections.map((l) => [l.id, l])), t = this._selectedIds.map((l) => e.get(l)).filter((l) => !!l);
    this.value = {
      selectedIds: t.map((l) => l.id),
      selectedNames: t.map((l) => l.name),
      selectedCounts: t.map((l) => l.productCount)
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderContent() {
    return this._isLoading ? o`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? o`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadCollections()}>
            Retry
          </uui-button>
        </div>
      ` : this._collections.length === 0 ? o`<p class="empty-state">No collections available.</p>` : this._filteredCollections.length === 0 ? o`<p class="empty-state">No collections match your search.</p>` : o`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredCollections)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return o`
      <umb-body-layout headline="Select Collections">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search collections"
              placeholder="Search collections"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? o`
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
          label="Add selected collections"
          look="primary"
          color="positive"
          ?disabled=${e === 0}
          @click=${this._handleSubmit}>
          Add Selected (${e})
        </uui-button>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
s.styles = m`
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
r([
  c()
], s.prototype, "_selectedIds", 2);
r([
  c()
], s.prototype, "_collections", 2);
r([
  c()
], s.prototype, "_isLoading", 2);
r([
  c()
], s.prototype, "_errorMessage", 2);
r([
  c()
], s.prototype, "_searchTerm", 2);
s = r([
  g("merchello-collection-picker-modal")
], s);
const I = s;
export {
  s as MerchelloCollectionPickerModalElement,
  I as default
};
//# sourceMappingURL=collection-picker-modal.element-BFu-UMju.js.map
