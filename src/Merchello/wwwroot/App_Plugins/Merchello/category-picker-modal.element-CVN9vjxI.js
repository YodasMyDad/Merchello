import { html as r, css as g, state as c, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-DXy2hS5y.js";
var b = Object.defineProperty, y = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, o = (e, t, s, a) => {
  for (var i = a > 1 ? void 0 : a ? y(t, s) : t, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (i = (a ? u(t, s, i) : u(i)) || i);
  return a && i && b(t, s, i), i;
}, p = (e, t, s) => t.has(e) || _("Cannot " + s), C = (e, t, s) => (p(e, t, "read from private field"), t.get(e)), x = (e, t, s) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, a) => (p(e, t, "write to private field"), t.set(e, s), s), d;
let l = class extends f {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._categories = [], this._isLoading = !0, this._errorMessage = null, x(this, d, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, d, !0), this._loadCategories();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, d, !1);
  }
  async _loadCategories() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await v.getProductCategories();
    if (!C(this, d)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._categories = (e ?? []).filter((a) => !s.includes(a.id)), this._isLoading = !1;
  }
  _toggleSelection(e) {
    const t = this.data?.multiSelect !== !1;
    if (this._selectedIds.includes(e.id)) {
      const s = this._selectedIds.indexOf(e.id);
      this._selectedIds = this._selectedIds.filter((a, i) => i !== s), this._selectedNames = this._selectedNames.filter((a, i) => i !== s);
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
  _renderCategoryRow(e) {
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
          <div class="category-info">
            <uui-icon name="icon-folder"></uui-icon>
            <span class="category-name">${e.name}</span>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`<div class="error-banner">${this._errorMessage}</div>` : this._categories.length === 0 ? r`<p class="empty-state">No categories available.</p>` : r`
      <uui-table class="categories-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Category</uui-table-head-cell>
        </uui-table-head>
        ${this._categories.map((e) => this._renderCategoryRow(e))}
      </uui-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return r`
      <umb-body-layout headline="Select Categories">
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
d = /* @__PURE__ */ new WeakMap();
l.styles = g`
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

    .categories-table {
      width: 100%;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
    }

    .category-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .category-name {
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
o([
  c()
], l.prototype, "_selectedIds", 2);
o([
  c()
], l.prototype, "_selectedNames", 2);
o([
  c()
], l.prototype, "_categories", 2);
o([
  c()
], l.prototype, "_isLoading", 2);
o([
  c()
], l.prototype, "_errorMessage", 2);
l = o([
  m("merchello-category-picker-modal")
], l);
const M = l;
export {
  l as MerchelloCategoryPickerModalElement,
  M as default
};
//# sourceMappingURL=category-picker-modal.element-CVN9vjxI.js.map
