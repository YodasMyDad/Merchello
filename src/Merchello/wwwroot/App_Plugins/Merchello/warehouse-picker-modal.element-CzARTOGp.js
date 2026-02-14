import { html as r, css as b, state as d, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-DNSJzonx.js";
var g = Object.defineProperty, y = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, o = (e, t, s, a) => {
  for (var l = a > 1 ? void 0 : a ? y(t, s) : t, u = e.length - 1, n; u >= 0; u--)
    (n = e[u]) && (l = (a ? n(t, s, l) : n(l)) || l);
  return a && l && g(t, s, l), l;
}, _ = (e, t, s) => t.has(e) || p("Cannot " + s), x = (e, t, s) => (_(e, t, "read from private field"), t.get(e)), w = (e, t, s) => t.has(e) ? p("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, a) => (_(e, t, "write to private field"), t.set(e, s), s), c;
let i = class extends m {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._warehouses = [], this._isLoading = !0, this._errorMessage = null, w(this, c, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, c, !0), this._loadWarehouses();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, c, !1);
  }
  async _loadWarehouses() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await v.getWarehousesList();
    if (!x(this, c)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._warehouses = (e ?? []).filter((a) => !s.includes(a.id)), this._isLoading = !1;
  }
  _toggleSelection(e) {
    const t = this.data?.multiSelect !== !1;
    if (this._selectedIds.includes(e.id)) {
      const s = this._selectedIds.indexOf(e.id);
      this._selectedIds = this._selectedIds.filter((a, l) => l !== s), this._selectedNames = this._selectedNames.filter((a, l) => l !== s);
    } else
      t ? (this._selectedIds = [...this._selectedIds, e.id], this._selectedNames = [...this._selectedNames, e.name ?? ""]) : (this._selectedIds = [e.id], this._selectedNames = [e.name ?? ""]);
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
  _renderWarehouseRow(e) {
    const t = this._selectedIds.includes(e.id);
    return r`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            aria-label="Select ${e.name ?? "warehouse"}"
            .checked=${t}
            @change=${(s) => {
      s.stopPropagation(), this._toggleSelection(e);
    }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="warehouse-info">
            <uui-icon name="icon-inbox"></uui-icon>
            <span class="warehouse-name">${e.name ?? "Unnamed"}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell class="code">${e.code ?? "-"}</uui-table-cell>
        <uui-table-cell>${e.supplierName ?? "-"}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`<div class="error-banner">${this._errorMessage}</div>` : this._warehouses.length === 0 ? r`<p class="empty-state">No warehouses available.</p>` : r`
      <uui-table class="warehouses-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Code</uui-table-head-cell>
          <uui-table-head-cell>Supplier</uui-table-head-cell>
        </uui-table-head>
        ${this._warehouses.map((e) => this._renderWarehouseRow(e))}
      </uui-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return r`
      <umb-body-layout headline="Select Warehouses">
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
c = /* @__PURE__ */ new WeakMap();
i.styles = b`
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

    .warehouses-table {
      width: 100%;
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

    .warehouse-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .warehouse-name {
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
o([
  d()
], i.prototype, "_selectedIds", 2);
o([
  d()
], i.prototype, "_selectedNames", 2);
o([
  d()
], i.prototype, "_warehouses", 2);
o([
  d()
], i.prototype, "_isLoading", 2);
o([
  d()
], i.prototype, "_errorMessage", 2);
i = o([
  f("merchello-warehouse-picker-modal")
], i);
const S = i;
export {
  i as MerchelloWarehousePickerModalElement,
  S as default
};
//# sourceMappingURL=warehouse-picker-modal.element-CzARTOGp.js.map
