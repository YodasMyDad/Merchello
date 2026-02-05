import { html as c, css as f, state as d, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-DkRa4ImO.js";
var g = Object.defineProperty, y = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, r = (e, t, s, i) => {
  for (var l = i > 1 ? void 0 : i ? y(t, s) : t, u = e.length - 1, n; u >= 0; u--)
    (n = e[u]) && (l = (i ? n(t, s, l) : n(l)) || l);
  return i && l && g(t, s, l), l;
}, p = (e, t, s) => t.has(e) || _("Cannot " + s), x = (e, t, s) => (p(e, t, "read from private field"), t.get(e)), w = (e, t, s) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, i) => (p(e, t, "write to private field"), t.set(e, s), s), o;
let a = class extends v {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._selectedAliases = [], this._productTypes = [], this._isLoading = !0, this._errorMessage = null, w(this, o, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, o, !0), this._loadProductTypes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, o, !1);
  }
  async _loadProductTypes() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await m.getProductTypes();
    if (!x(this, o)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._productTypes = (e ?? []).filter((i) => !s.includes(i.id)), this._isLoading = !1;
  }
  _toggleSelection(e) {
    const t = this.data?.multiSelect !== !1;
    if (this._selectedIds.includes(e.id)) {
      const s = this._selectedIds.indexOf(e.id);
      this._selectedIds = this._selectedIds.filter((i, l) => l !== s), this._selectedNames = this._selectedNames.filter((i, l) => l !== s), this._selectedAliases = this._selectedAliases.filter((i, l) => l !== s);
    } else
      t ? (this._selectedIds = [...this._selectedIds, e.id], this._selectedNames = [...this._selectedNames, e.name], this._selectedAliases = [...this._selectedAliases, e.alias]) : (this._selectedIds = [e.id], this._selectedNames = [e.name], this._selectedAliases = [e.alias]);
  }
  _handleSubmit() {
    this.value = {
      selectedIds: this._selectedIds,
      selectedNames: this._selectedNames,
      selectedAliases: this._selectedAliases
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderProductTypeRow(e) {
    const t = this._selectedIds.includes(e.id);
    return c`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            label="Select"
            .checked=${t}
            @change=${(s) => {
      s.stopPropagation(), this._toggleSelection(e);
    }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="type-info">
            <uui-icon name="icon-box"></uui-icon>
            <span class="type-name">${e.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell class="alias">${e.alias ?? "-"}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? c`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? c`<div class="error-banner">${this._errorMessage}</div>` : this._productTypes.length === 0 ? c`<p class="empty-state">No product types available.</p>` : c`
      <uui-table class="types-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Alias</uui-table-head-cell>
        </uui-table-head>
        ${this._productTypes.map((e) => this._renderProductTypeRow(e))}
      </uui-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return c`
      <umb-body-layout headline="Select Product Types">
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
a.styles = f`
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

    .types-table {
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

    .type-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .type-name {
      font-weight: 500;
    }

    .alias {
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
r([
  d()
], a.prototype, "_selectedIds", 2);
r([
  d()
], a.prototype, "_selectedNames", 2);
r([
  d()
], a.prototype, "_selectedAliases", 2);
r([
  d()
], a.prototype, "_productTypes", 2);
r([
  d()
], a.prototype, "_isLoading", 2);
r([
  d()
], a.prototype, "_errorMessage", 2);
a = r([
  b("merchello-product-type-picker-modal")
], a);
const P = a;
export {
  a as MerchelloProductTypePickerModalElement,
  P as default
};
//# sourceMappingURL=product-type-picker-modal.element-Bv8AbVmO.js.map
