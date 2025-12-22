import { html as o, css as m, state as d, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-B1skiL_A.js";
var b = Object.defineProperty, y = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, r = (e, t, s, i) => {
  for (var l = i > 1 ? void 0 : i ? y(t, s) : t, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (l = (i ? u(t, s, l) : u(l)) || l);
  return i && l && b(t, s, l), l;
}, p = (e, t, s) => t.has(e) || _("Cannot " + s), C = (e, t, s) => (p(e, t, "read from private field"), t.get(e)), x = (e, t, s) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, i) => (p(e, t, "write to private field"), t.set(e, s), s), c;
let a = class extends g {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._collections = [], this._isLoading = !0, this._errorMessage = null, x(this, c, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, c, !0), this._loadCollections();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, c, !1);
  }
  async _loadCollections() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await v.getProductCollections();
    if (!C(this, c)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._collections = (e ?? []).filter((i) => !s.includes(i.id)), this._isLoading = !1;
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
  _renderCollectionRow(e) {
    const t = this._selectedIds.includes(e.id);
    return o`
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
          <div class="collection-info">
            <uui-icon name="icon-folder"></uui-icon>
            <span class="collection-name">${e.name}</span>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? o`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? o`<div class="error-banner">${this._errorMessage}</div>` : this._collections.length === 0 ? o`<p class="empty-state">No collections available.</p>` : o`
      <uui-table class="collections-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Collection</uui-table-head-cell>
        </uui-table-head>
        ${this._collections.map((e) => this._renderCollectionRow(e))}
      </uui-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return o`
      <umb-body-layout headline="Select Collections">
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
a.styles = m`
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

    .collections-table {
      width: 100%;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
    }

    .collection-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .collection-name {
      font-weight: 500;
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
], a.prototype, "_collections", 2);
r([
  d()
], a.prototype, "_isLoading", 2);
r([
  d()
], a.prototype, "_errorMessage", 2);
a = r([
  f("merchello-collection-picker-modal")
], a);
const M = a;
export {
  a as MerchelloCollectionPickerModalElement,
  M as default
};
//# sourceMappingURL=collection-picker-modal.element-Ct6jRxej.js.map
