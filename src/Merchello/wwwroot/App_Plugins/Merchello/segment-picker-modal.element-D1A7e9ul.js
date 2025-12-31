import { html as r, css as m, state as d, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-B2ha_6NF.js";
var f = Object.defineProperty, y = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, n = (e, t, s, l) => {
  for (var i = l > 1 ? void 0 : l ? y(t, s) : t, o = e.length - 1, u; o >= 0; o--)
    (u = e[o]) && (i = (l ? u(t, s, i) : u(i)) || i);
  return l && i && f(t, s, i), i;
}, _ = (e, t, s) => t.has(e) || p("Cannot " + s), x = (e, t, s) => (_(e, t, "read from private field"), t.get(e)), S = (e, t, s) => t.has(e) ? p("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, l) => (_(e, t, "write to private field"), t.set(e, s), s), c;
let a = class extends b {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._segments = [], this._isLoading = !0, this._errorMessage = null, S(this, c, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, c, !0), this._loadSegments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, c, !1);
  }
  async _loadSegments() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await v.getCustomerSegments();
    if (!x(this, c)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._segments = (e ?? []).filter(
      (l) => !s.includes(l.id) && l.isActive
    ), this._isLoading = !1;
  }
  _toggleSelection(e) {
    const t = this.data?.multiSelect !== !1;
    if (this._selectedIds.includes(e.id)) {
      const s = this._selectedIds.indexOf(e.id);
      this._selectedIds = this._selectedIds.filter((l, i) => i !== s), this._selectedNames = this._selectedNames.filter((l, i) => i !== s);
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
  _renderSegmentRow(e) {
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
          <div class="segment-info">
            <uui-icon name="icon-users"></uui-icon>
            <div class="segment-details">
              <span class="segment-name">${e.name}</span>
              ${e.description ? r`<span class="segment-description">${e.description}</span>` : null}
            </div>
          </div>
        </uui-table-cell>
        <uui-table-cell class="center">${e.memberCount}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`<div class="error-banner">${this._errorMessage}</div>` : this._segments.length === 0 ? r`<p class="empty-state">No active segments available.</p>` : r`
      <uui-table class="segments-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Segment</uui-table-head-cell>
          <uui-table-head-cell class="center">Members</uui-table-head-cell>
        </uui-table-head>
        ${this._segments.map((e) => this._renderSegmentRow(e))}
      </uui-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return r`
      <umb-body-layout headline="Select Customer Segments">
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

    .segments-table {
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
    }

    .segment-info {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
    }

    .segment-details {
      display: flex;
      flex-direction: column;
    }

    .segment-name {
      font-weight: 500;
    }

    .segment-description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
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
n([
  d()
], a.prototype, "_selectedIds", 2);
n([
  d()
], a.prototype, "_selectedNames", 2);
n([
  d()
], a.prototype, "_segments", 2);
n([
  d()
], a.prototype, "_isLoading", 2);
n([
  d()
], a.prototype, "_errorMessage", 2);
a = n([
  g("merchello-segment-picker-modal")
], a);
const I = a;
export {
  a as MerchelloSegmentPickerModalElement,
  I as default
};
//# sourceMappingURL=segment-picker-modal.element-D1A7e9ul.js.map
