import { html as r, css as b, state as u, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-BAKL0aIE.js";
var g = Object.defineProperty, y = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, c = (e, t, s, i) => {
  for (var l = i > 1 ? void 0 : i ? y(t, s) : t, d = e.length - 1, n; d >= 0; d--)
    (n = e[d]) && (l = (i ? n(t, s, l) : n(l)) || l);
  return i && l && g(t, s, l), l;
}, _ = (e, t, s) => t.has(e) || p("Cannot " + s), x = (e, t, s) => (_(e, t, "read from private field"), t.get(e)), S = (e, t, s) => t.has(e) ? p("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, i) => (_(e, t, "write to private field"), t.set(e, s), s), o;
let a = class extends v {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._suppliers = [], this._isLoading = !0, this._errorMessage = null, S(this, o, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, o, !0), this._loadSuppliers();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, o, !1);
  }
  async _loadSuppliers() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await m.getSuppliers();
    if (!x(this, o)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._suppliers = (e ?? []).filter((i) => !s.includes(i.id)), this._isLoading = !1;
  }
  _toggleSelection(e) {
    const t = this.data?.multiSelect !== !1;
    if (this._selectedIds.includes(e.id)) {
      const s = this._selectedIds.indexOf(e.id);
      this._selectedIds = this._selectedIds.filter((i, l) => l !== s), this._selectedNames = this._selectedNames.filter((i, l) => l !== s);
    } else
      t ? (this._selectedIds = [...this._selectedIds, e.id], this._selectedNames = [...this._selectedNames, e.name]) : (this._selectedIds = [e.id], this._selectedNames = [e.name]);
  }
  _handleSubmit() {
    this.value = {
      selectedIds: this._selectedIds,
      selectedNames: this._selectedNames
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderSupplierRow(e) {
    const t = this._selectedIds.includes(e.id);
    return r`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            .checked=${t}
            @change=${(s) => {
      s.stopPropagation(), this._toggleSelection(e);
    }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="supplier-info">
            <uui-icon name="icon-truck"></uui-icon>
            <span class="supplier-name">${e.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell class="code">${e.code ?? "-"}</uui-table-cell>
        <uui-table-cell class="center">${e.warehouseCount}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`<div class="error-banner">${this._errorMessage}</div>` : this._suppliers.length === 0 ? r`<p class="empty-state">No suppliers available.</p>` : r`
      <uui-table class="suppliers-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Code</uui-table-head-cell>
          <uui-table-head-cell class="center">Warehouses</uui-table-head-cell>
        </uui-table-head>
        ${this._suppliers.map((e) => this._renderSupplierRow(e))}
      </uui-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return r`
      <umb-body-layout headline="Select Suppliers">
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
            ?disabled=${e === 0}
            @click=${this._handleSubmit}>
            Add Selected (${e})
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
o = /* @__PURE__ */ new WeakMap();
a.styles = b`
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

    .suppliers-table {
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

    .supplier-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .supplier-name {
      font-weight: 500;
    }

    .code {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
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
c([
  u()
], a.prototype, "_selectedIds", 2);
c([
  u()
], a.prototype, "_selectedNames", 2);
c([
  u()
], a.prototype, "_suppliers", 2);
c([
  u()
], a.prototype, "_isLoading", 2);
c([
  u()
], a.prototype, "_errorMessage", 2);
a = c([
  f("merchello-supplier-picker-modal")
], a);
const I = a;
export {
  a as MerchelloSupplierPickerModalElement,
  I as default
};
//# sourceMappingURL=supplier-picker-modal.element-B6tjKqq6.js.map
