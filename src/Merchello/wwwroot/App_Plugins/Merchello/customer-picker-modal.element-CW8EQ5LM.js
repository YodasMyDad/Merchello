import { html as i, nothing as d, css as b, state as u, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as S } from "./merchello-api-Dp_zU_yi.js";
var v = Object.defineProperty, y = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, c = (e, t, s, r) => {
  for (var a = r > 1 ? void 0 : r ? y(t, s) : t, n = e.length - 1, h; n >= 0; n--)
    (h = e[n]) && (a = (r ? h(t, s, a) : h(a)) || a);
  return r && a && v(t, s, a), a;
}, p = (e, t, s) => t.has(e) || m("Cannot " + s), C = (e, t, s) => (p(e, t, "read from private field"), t.get(e)), $ = (e, t, s) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), _ = (e, t, s, r) => (p(e, t, "write to private field"), t.set(e, s), s), o;
let l = class extends f {
  constructor() {
    super(...arguments), this._selectedIds = [], this._customers = [], this._isLoading = !1, this._searchTerm = "", this._hasSearched = !1, this._errorMessage = null, this._searchDebounceTimer = null, $(this, o, !1);
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _selectedCount() {
    return this._selectedIds.length;
  }
  get _isAllVisibleSelected() {
    return this._customers.length ? this._customers.every((e) => this._selectedIds.includes(e.id)) : !1;
  }
  get _isPartiallySelected() {
    return this._selectedCount > 0 && !this._isAllVisibleSelected;
  }
  connectedCallback() {
    super.connectedCallback(), _(this, o, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, o, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  _handleSearchInput(e) {
    const t = e.target;
    if (this._searchTerm = t.value, this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchTerm.trim().length >= 2) {
      this._searchDebounceTimer = setTimeout(() => {
        this._performSearch();
      }, 300);
      return;
    }
    this._customers = [], this._hasSearched = !1, this._errorMessage = null;
  }
  _handleSearchClear() {
    this._searchTerm = "", this._customers = [], this._hasSearched = !1, this._errorMessage = null;
  }
  async _performSearch() {
    const e = this._searchTerm.trim();
    if (e.length < 2) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: s } = await S.searchCustomersForSegment(
      e,
      this.data?.excludeCustomerIds,
      50
    );
    if (C(this, o)) {
      if (s) {
        this._errorMessage = s.message, this._isLoading = !1, this._hasSearched = !0;
        return;
      }
      this._customers = t?.items ?? [], this._hasSearched = !0, this._isLoading = !1;
    }
  }
  _toggleSelection(e) {
    if (this._selectedIds.includes(e)) {
      this._selectedIds = this._selectedIds.filter((t) => t !== e);
      return;
    }
    if (this._isMultiSelect) {
      this._selectedIds = [...this._selectedIds, e];
      return;
    }
    this._selectedIds = [e];
  }
  _toggleSelectAll() {
    if (!this._isMultiSelect) return;
    const e = new Set(this._customers.map((s) => s.id));
    if (this._isAllVisibleSelected) {
      this._selectedIds = this._selectedIds.filter((s) => !e.has(s));
      return;
    }
    const t = new Set(this._selectedIds);
    this._customers.forEach((s) => t.add(s.id)), this._selectedIds = [...t];
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
  _getSelectionLabel(e) {
    const t = this._getCustomerName(e);
    return `${this._isMultiSelect ? "Select" : "Choose"} customer ${t}`;
  }
  _renderSelectionCell(e) {
    const t = this._selectedIds.includes(e.id), s = this._getSelectionLabel(e);
    return this._isMultiSelect ? i`
        <uui-checkbox
          aria-label=${s}
          .checked=${t}
          @click=${(r) => r.stopPropagation()}
          @change=${() => this._toggleSelection(e.id)}>
        </uui-checkbox>
      ` : i`
      <uui-radio
        aria-label=${s}
        .checked=${t}
        @click=${(r) => r.stopPropagation()}
        @change=${() => this._toggleSelection(e.id)}>
      </uui-radio>
    `;
  }
  _renderSearchBox() {
    return i`
      <uui-form-layout-item>
        <uui-label slot="label" for="search-input">Search customers</uui-label>
        <uui-input
          id="search-input"
          type="text"
          placeholder="Type at least 2 characters"
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search customers">
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
          ${this._searchTerm ? i`
                <uui-button
                  slot="append"
                  compact
                  look="secondary"
                  label="Clear search"
                  @click=${this._handleSearchClear}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              ` : d}
        </uui-input>
        <div slot="description" class="hint">Search by customer name or email.</div>
      </uui-form-layout-item>
    `;
  }
  _renderCustomerRow(e) {
    const t = this._selectedIds.includes(e.id);
    return i`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e.id)}>
        <uui-table-cell class="selection-cell">
          ${this._renderSelectionCell(e)}
        </uui-table-cell>
        <uui-table-cell>
          <span class="customer-name">${this._getCustomerName(e)}</span>
        </uui-table-cell>
        <uui-table-cell>${e.email}</uui-table-cell>
        <uui-table-cell class="center">${e.orderCount}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderCustomerList() {
    return this._customers.length === 0 ? i`<p class="empty-state">No customers found for "${this._searchTerm}".</p>` : i`
      <uui-table class="customers-table">
        <uui-table-head>
          <uui-table-head-cell class="selection-cell">
            ${this._isMultiSelect ? i`
                  <uui-checkbox
                    aria-label="Select all customers"
                    .checked=${this._isAllVisibleSelected}
                    .indeterminate=${this._isPartiallySelected}
                    @change=${() => this._toggleSelectAll()}>
                  </uui-checkbox>
                ` : d}
          </uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Email</uui-table-head-cell>
          <uui-table-head-cell class="center">Orders</uui-table-head-cell>
        </uui-table-head>
        ${this._customers.map((e) => this._renderCustomerRow(e))}
      </uui-table>
    `;
  }
  _renderContent() {
    return this._isLoading ? i`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? i`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      ` : this._hasSearched ? this._renderCustomerList() : i`<p class="hint-state">Search for customers to start selecting.</p>`;
  }
  _getPrimaryActionLabel() {
    return this._isMultiSelect ? `Add selected (${this._selectedCount})` : "Select customer";
  }
  render() {
    return i`
      <umb-body-layout headline="Select customers">
        <div id="main">
          <uui-box>
            ${this._renderSearchBox()}
          </uui-box>

          <uui-box>
            <div class="results-header">
              <span class="results-count">
                ${this._hasSearched ? `${this._customers.length} result${this._customers.length === 1 ? "" : "s"}` : "No search yet"}
              </span>
              <span class="selected-count">
                ${this._selectedCount} selected
              </span>
            </div>
            <div class="results-container">${this._renderContent()}</div>
          </uui-box>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label=${this._getPrimaryActionLabel()}
          look="primary"
          color="positive"
          ?disabled=${this._selectedCount === 0 || this._isLoading}
          @click=${this._handleSubmit}>
          ${this._getPrimaryActionLabel()}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
o = /* @__PURE__ */ new WeakMap();
l.styles = b`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    uui-input {
      width: 100%;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
      font-size: var(--uui-type-small-size);
    }

    .results-count {
      color: var(--uui-color-text-alt);
    }

    .selected-count {
      font-weight: 600;
    }

    .results-container {
      overflow-y: auto;
      min-height: 300px;
    }

    .customers-table {
      width: 100%;
    }

    .selection-cell {
      width: 44px;
      text-align: center;
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

    uui-table-row[selected] .customer-name {
      color: var(--uui-color-selected-contrast, #fff);
    }

    .customer-name {
      font-weight: 500;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .hint,
    .hint-state,
    .empty-state {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .hint-state,
    .empty-state {
      text-align: center;
      padding: var(--uui-size-space-6);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error-banner uui-icon {
      flex-shrink: 0;
    }
  `;
c([
  u()
], l.prototype, "_selectedIds", 2);
c([
  u()
], l.prototype, "_customers", 2);
c([
  u()
], l.prototype, "_isLoading", 2);
c([
  u()
], l.prototype, "_searchTerm", 2);
c([
  u()
], l.prototype, "_hasSearched", 2);
c([
  u()
], l.prototype, "_errorMessage", 2);
l = c([
  g("merchello-customer-picker-modal")
], l);
const M = l;
export {
  l as MerchelloCustomerPickerModalElement,
  M as default
};
//# sourceMappingURL=customer-picker-modal.element-CW8EQ5LM.js.map
