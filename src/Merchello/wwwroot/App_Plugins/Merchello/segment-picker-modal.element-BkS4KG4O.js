import { html as l, nothing as h, css as m, state as o, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-B1P1cUX9.js";
var S = Object.defineProperty, y = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, c = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? y(t, s) : t, u = e.length - 1, d; u >= 0; u--)
    (d = e[u]) && (r = (i ? d(t, s, r) : d(r)) || r);
  return i && r && S(t, s, r), r;
}, p = (e, t, s) => t.has(e) || g("Cannot " + s), x = (e, t, s) => (p(e, t, "read from private field"), t.get(e)), $ = (e, t, s) => t.has(e) ? g("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), _ = (e, t, s, i) => (p(e, t, "write to private field"), t.set(e, s), s), n;
let a = class extends f {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._segments = [], this._isLoading = !0, this._errorMessage = null, $(this, n, !1);
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _selectedCount() {
    return this._selectedIds.length;
  }
  get _isAllVisibleSelected() {
    return this._segments.length ? this._segments.every((e) => this._selectedIds.includes(e.id)) : !1;
  }
  get _isPartiallySelected() {
    return this._selectedCount > 0 && !this._isAllVisibleSelected;
  }
  connectedCallback() {
    super.connectedCallback(), _(this, n, !0), this._loadSegments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, n, !1);
  }
  async _loadSegments() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await v.getCustomerSegments();
    if (!x(this, n)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._segments = (e ?? []).filter((i) => !s.includes(i.id) && i.isActive), this._isLoading = !1;
  }
  _toggleSelection(e) {
    const t = this._selectedIds.indexOf(e.id);
    if (t !== -1) {
      this._selectedIds = this._selectedIds.filter((s) => s !== e.id), this._selectedNames = this._selectedNames.filter((s, i) => i !== t);
      return;
    }
    if (this._isMultiSelect) {
      this._selectedIds = [...this._selectedIds, e.id], this._selectedNames = [...this._selectedNames, e.name];
      return;
    }
    this._selectedIds = [e.id], this._selectedNames = [e.name];
  }
  _toggleSelectAll() {
    if (this._isMultiSelect) {
      if (this._isAllVisibleSelected) {
        this._selectedIds = [], this._selectedNames = [];
        return;
      }
      this._selectedIds = this._segments.map((e) => e.id), this._selectedNames = this._segments.map((e) => e.name);
    }
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
  _getSelectionLabel(e) {
    return `${this._isMultiSelect ? "Select" : "Choose"} segment ${e.name}`;
  }
  _renderSelectionCell(e) {
    const t = this._selectedIds.includes(e.id), s = this._getSelectionLabel(e);
    return this._isMultiSelect ? l`
        <uui-checkbox
          aria-label=${s}
          .checked=${t}
          @click=${(i) => i.stopPropagation()}
          @change=${() => this._toggleSelection(e)}>
        </uui-checkbox>
      ` : l`
      <uui-radio
        aria-label=${s}
        .checked=${t}
        @click=${(i) => i.stopPropagation()}
        @change=${() => this._toggleSelection(e)}>
      </uui-radio>
    `;
  }
  _renderSegmentRow(e) {
    const t = this._selectedIds.includes(e.id);
    return l`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e)}>
        <uui-table-cell class="selection-cell">
          ${this._renderSelectionCell(e)}
        </uui-table-cell>
        <uui-table-cell>
          <div class="segment-info">
            <uui-icon name="icon-users"></uui-icon>
            <div class="segment-details">
              <span class="segment-name">${e.name}</span>
              ${e.description ? l`<span class="segment-description">${e.description}</span>` : h}
            </div>
          </div>
        </uui-table-cell>
        <uui-table-cell class="center">${e.memberCount}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? l`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? l`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      ` : this._segments.length === 0 ? l`<p class="empty-state">No active segments are available.</p>` : l`
      <uui-table class="segments-table">
        <uui-table-head>
          <uui-table-head-cell class="selection-cell">
            ${this._isMultiSelect ? l`
                  <uui-checkbox
                    aria-label="Select all segments"
                    .checked=${this._isAllVisibleSelected}
                    .indeterminate=${this._isPartiallySelected}
                    @change=${() => this._toggleSelectAll()}>
                  </uui-checkbox>
                ` : h}
          </uui-table-head-cell>
          <uui-table-head-cell>Segment</uui-table-head-cell>
          <uui-table-head-cell class="center">Members</uui-table-head-cell>
        </uui-table-head>
        ${this._segments.map((e) => this._renderSegmentRow(e))}
      </uui-table>
    `;
  }
  _getPrimaryActionLabel() {
    return this._isMultiSelect ? `Add selected (${this._selectedCount})` : "Select segment";
  }
  render() {
    return l`
      <umb-body-layout headline="Select customer segments">
        <div id="main">
          <uui-box>
            <p class="hint">Only active segments are shown.</p>
            <div class="results-header">
              <span class="results-count">${this._segments.length} available</span>
              <span class="selected-count">${this._selectedCount} selected</span>
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
n = /* @__PURE__ */ new WeakMap();
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

    .hint {
      margin: 0 0 var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .segments-table {
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

    uui-table-row[selected] .segment-description,
    uui-table-row[selected] .segment-name,
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
      gap: 2px;
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
      font-size: var(--uui-type-small-size);
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
  o()
], a.prototype, "_selectedIds", 2);
c([
  o()
], a.prototype, "_selectedNames", 2);
c([
  o()
], a.prototype, "_segments", 2);
c([
  o()
], a.prototype, "_isLoading", 2);
c([
  o()
], a.prototype, "_errorMessage", 2);
a = c([
  b("merchello-segment-picker-modal")
], a);
const M = a;
export {
  a as MerchelloSegmentPickerModalElement,
  M as default
};
//# sourceMappingURL=segment-picker-modal.element-BkS4KG4O.js.map
