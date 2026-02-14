import { html as r, css as m, state as n, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as b } from "./merchello-api-DNSJzonx.js";
var v = Object.defineProperty, y = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, c = (e, t, s, i) => {
  for (var l = i > 1 ? void 0 : i ? y(t, s) : t, d = e.length - 1, u; d >= 0; d--)
    (u = e[d]) && (l = (i ? u(t, s, l) : u(l)) || l);
  return i && l && v(t, s, l), l;
}, _ = (e, t, s) => t.has(e) || p("Cannot " + s), x = (e, t, s) => (_(e, t, "read from private field"), t.get(e)), S = (e, t, s) => t.has(e) ? p("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, i) => (_(e, t, "write to private field"), t.set(e, s), s), o;
let a = class extends f {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._segments = [], this._isLoading = !0, this._errorMessage = null, S(this, o, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, o, !0), this._loadSegments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, o, !1);
  }
  async _loadSegments() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await b.getCustomerSegments();
    if (!x(this, o)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._segments = (e ?? []).filter(
      (i) => !s.includes(i.id) && i.isActive
    ), this._isLoading = !1;
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
  _renderSegmentRow(e) {
    const t = this._selectedIds.includes(e.id);
    return r`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            aria-label="Select ${e.name}"
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
o = /* @__PURE__ */ new WeakMap();
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
      color: var(--uui-color-selected-contrast, #fff);
      font-weight: 600;
    }

    uui-table-row[selected] uui-icon {
      color: var(--uui-color-selected-contrast, #fff);
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
c([
  n()
], a.prototype, "_selectedIds", 2);
c([
  n()
], a.prototype, "_selectedNames", 2);
c([
  n()
], a.prototype, "_segments", 2);
c([
  n()
], a.prototype, "_isLoading", 2);
c([
  n()
], a.prototype, "_errorMessage", 2);
a = c([
  g("merchello-segment-picker-modal")
], a);
const $ = a;
export {
  a as MerchelloSegmentPickerModalElement,
  $ as default
};
//# sourceMappingURL=segment-picker-modal.element-h-WW4zRi.js.map
