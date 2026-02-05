import { html as r, css as p, state as c, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-DkRa4ImO.js";
var v = Object.defineProperty, y = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, l = (e, t, s, o) => {
  for (var i = o > 1 ? void 0 : o ? y(t, s) : t, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (i = (o ? d(t, s, i) : d(i)) || i);
  return o && i && v(t, s, i), i;
}, _ = (e, t, s) => t.has(e) || m("Cannot " + s), C = (e, t, s) => (_(e, t, "read from private field"), t.get(e)), S = (e, t, s) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, o) => (_(e, t, "write to private field"), t.set(e, s), s), u;
let a = class extends b {
  constructor() {
    super(...arguments), this._selectedIds = [], this._customers = [], this._isLoading = !1, this._searchTerm = "", this._hasSearched = !1, this._errorMessage = null, this._searchDebounceTimer = null, S(this, u, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, u, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, u, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  _handleSearchInput(e) {
    const t = e.target;
    this._searchTerm = t.value, this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchTerm.length >= 2 ? this._searchDebounceTimer = setTimeout(() => {
      this._performSearch();
    }, 300) : (this._customers = [], this._hasSearched = !1);
  }
  async _performSearch() {
    if (this._searchTerm.length < 2) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await g.searchCustomersForSegment(
      this._searchTerm,
      this.data?.excludeCustomerIds,
      50
    );
    if (C(this, u)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      this._customers = e?.items ?? [], this._hasSearched = !0, this._isLoading = !1;
    }
  }
  _toggleSelection(e) {
    const t = this.data?.multiSelect !== !1;
    this._selectedIds.includes(e) ? this._selectedIds = this._selectedIds.filter((s) => s !== e) : t ? this._selectedIds = [...this._selectedIds, e] : this._selectedIds = [e];
  }
  _handleSubmit() {
    this.value = { selectedCustomerIds: this._selectedIds }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getCustomerName(e) {
    return [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
  }
  _renderSearchBox() {
    return r`
      <div class="search-container">
        <uui-input
          id="search-input"
          type="text"
          placeholder="Search by name or email..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search customers">
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
        </uui-input>
        <span class="search-hint">Enter at least 2 characters to search</span>
      </div>
    `;
  }
  _renderCustomerRow(e) {
    const t = this._selectedIds.includes(e.id);
    return r`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e.id)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            label="Select"
            .checked=${t}
            @change=${(s) => {
      s.stopPropagation(), this._toggleSelection(e.id);
    }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="customer-info">
            <span class="customer-name">${this._getCustomerName(e)}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.email}</uui-table-cell>
        <uui-table-cell class="center">${e.orderCount}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderCustomerList() {
    return this._customers.length === 0 ? r`<p class="empty-state">No customers found matching "${this._searchTerm}"</p>` : r`
      <uui-table class="customers-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Email</uui-table-head-cell>
          <uui-table-head-cell class="center">Orders</uui-table-head-cell>
        </uui-table-head>
        ${this._customers.map((e) => this._renderCustomerRow(e))}
      </uui-table>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`<div class="error-banner">${this._errorMessage}</div>` : this._hasSearched ? this._renderCustomerList() : r`<p class="hint">Search for customers to add to the segment.</p>`;
  }
  render() {
    const e = this._selectedIds.length;
    return r`
      <umb-body-layout headline="Select Customers">
        <div id="main">
          ${this._renderSearchBox()}
          <div class="results-container">
            ${this._renderContent()}
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Add Selected"
            look="primary"
            color="positive"
            ?disabled=${e === 0}
            @click=${this._handleSubmit}>
            Add Selected (${e})
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
a.styles = p`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    .search-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    #search-input {
      width: 100%;
    }

    .search-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .customers-table {
      width: 100%;
    }

    uui-table-head-cell.center,
    uui-table-cell.center {
      text-align: center;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
      color: var(--uui-color-selected-contrast, #fff);
      font-weight: 600;
    }

    uui-table-row[selected] uui-icon {
      color: var(--uui-color-selected-contrast, #fff);
    }

    .customer-info {
      display: flex;
      flex-direction: column;
    }

    .customer-name {
      font-weight: 500;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .hint, .empty-state {
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
l([
  c()
], a.prototype, "_selectedIds", 2);
l([
  c()
], a.prototype, "_customers", 2);
l([
  c()
], a.prototype, "_isLoading", 2);
l([
  c()
], a.prototype, "_searchTerm", 2);
l([
  c()
], a.prototype, "_hasSearched", 2);
l([
  c()
], a.prototype, "_errorMessage", 2);
a = l([
  f("merchello-customer-picker-modal")
], a);
const $ = a;
export {
  a as MerchelloCustomerPickerModalElement,
  $ as default
};
//# sourceMappingURL=customer-picker-modal.element-oSKWq6yh.js.map
