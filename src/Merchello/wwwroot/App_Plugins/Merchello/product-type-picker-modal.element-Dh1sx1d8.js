import { html as l, css as m, state as c, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-NdGX4WPd.js";
import { m as f } from "./modal-layout.styles-C2OaUji5.js";
var v = Object.defineProperty, T = Object.getOwnPropertyDescriptor, h = (t) => {
  throw TypeError(t);
}, o = (t, e, a, s) => {
  for (var r = s > 1 ? void 0 : s ? T(e, a) : e, d = t.length - 1, u; d >= 0; d--)
    (u = t[d]) && (r = (s ? u(e, a, r) : u(r)) || r);
  return s && r && v(e, a, r), r;
}, _ = (t, e, a) => e.has(t) || h("Cannot " + a), C = (t, e, a) => (_(t, e, "read from private field"), e.get(t)), S = (t, e, a) => e.has(t) ? h("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), p = (t, e, a, s) => (_(t, e, "write to private field"), e.set(t, a), a), n;
let i = class extends b {
  constructor() {
    super(...arguments), this._selectedIds = [], this._productTypes = [], this._isLoading = !0, this._errorMessage = null, this._searchTerm = "", S(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), p(this, n, !0), this._loadProductTypes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, n, !1);
  }
  async _loadProductTypes() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: e } = await g.getProductTypes();
    if (!C(this, n)) return;
    if (e) {
      this._errorMessage = e.message, this._isLoading = !1;
      return;
    }
    const a = this.data?.excludeIds ?? [];
    this._productTypes = (t ?? []).filter((s) => !a.includes(s.id)), this._isLoading = !1;
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _filteredProductTypes() {
    const t = [...this._productTypes].sort((a, s) => a.name.localeCompare(s.name)), e = this._searchTerm.trim().toLowerCase();
    return e ? t.filter(
      (a) => [a.name, a.alias ?? ""].some((s) => s.toLowerCase().includes(e))
    ) : t;
  }
  get _tableConfig() {
    return {
      allowSelection: !0
    };
  }
  get _tableColumns() {
    return [
      { name: "Name", alias: "name" },
      { name: "Alias", alias: "alias", width: "240px" }
    ];
  }
  _createTableItems(t) {
    return t.map((e) => ({
      id: e.id,
      icon: "icon-tag",
      data: [
        {
          columnAlias: "name",
          value: e.name
        },
        {
          columnAlias: "alias",
          value: e.alias?.trim() || "Not set"
        }
      ]
    }));
  }
  _applySelection(t) {
    const e = new Set(this._productTypes.map((s) => s.id)), a = t.filter((s) => e.has(s));
    this._selectedIds = this._isMultiSelect ? a : a.slice(0, 1);
  }
  _handleTableSelected(t) {
    t.stopPropagation();
    const e = t.target;
    if (this._isMultiSelect) {
      this._applySelection(e.selection);
      return;
    }
    const a = e.selection.find((s) => !this._selectedIds.includes(s));
    if (a) {
      this._applySelection([a]);
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
    const t = new Map(this._productTypes.map((a) => [a.id, a])), e = this._selectedIds.map((a) => t.get(a)).filter((a) => !!a);
    this.value = {
      selectedIds: e.map((a) => a.id),
      selectedNames: e.map((a) => a.name),
      selectedAliases: e.map((a) => a.alias ?? null)
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderContent() {
    return this._isLoading ? l`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? l`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadProductTypes()}>
            Retry
          </uui-button>
        </div>
      ` : this._productTypes.length === 0 ? l`<p class="empty-state">No product types available.</p>` : this._filteredProductTypes.length === 0 ? l`<p class="empty-state">No product types match your search.</p>` : l`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredProductTypes)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }
  render() {
    const t = this._selectedIds.length, e = this._isMultiSelect ? `Add Selected (${t})` : "Add Product Type";
    return l`
      <umb-body-layout headline="Select Product Types">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search product types"
              placeholder="Search by name or alias"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? l`
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
n = /* @__PURE__ */ new WeakMap();
i.styles = [
  f,
  m`
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
      align-items: center;
      background: var(--uui-color-danger-standalone);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger-contrast);
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
      padding: var(--uui-size-space-3);
    }
  `
];
o([
  c()
], i.prototype, "_selectedIds", 2);
o([
  c()
], i.prototype, "_productTypes", 2);
o([
  c()
], i.prototype, "_isLoading", 2);
o([
  c()
], i.prototype, "_errorMessage", 2);
o([
  c()
], i.prototype, "_searchTerm", 2);
i = o([
  y("merchello-product-type-picker-modal")
], i);
const w = i;
export {
  i as MerchelloProductTypePickerModalElement,
  w as default
};
//# sourceMappingURL=product-type-picker-modal.element-Dh1sx1d8.js.map
