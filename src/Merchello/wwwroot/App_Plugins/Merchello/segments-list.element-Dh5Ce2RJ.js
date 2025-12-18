import { LitElement as C, html as i, nothing as h, css as w, state as c, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as k } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-CCwReUh_.js";
import { e as _, f } from "./navigation-m-idaC9i.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var M = Object.defineProperty, E = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, d = (e, t, a, o) => {
  for (var n = o > 1 ? void 0 : o ? E(t, a) : t, g = e.length - 1, m; g >= 0; g--)
    (m = e[g]) && (n = (o ? m(t, a, n) : m(n)) || n);
  return o && n && M(t, a, n), n;
}, S = (e, t, a) => t.has(e) || y("Cannot " + a), u = (e, t, a) => (S(e, t, "read from private field"), t.get(e)), v = (e, t, a) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), p = (e, t, a, o) => (S(e, t, "write to private field"), t.set(e, a), a), l, s;
let r = class extends x(C) {
  constructor() {
    super(), this._segments = [], this._isLoading = !0, this._errorMessage = null, this._deletingId = null, v(this, l), v(this, s, !1), this.consumeContext(k, (e) => {
      p(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, s, !0), this._loadSegments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, s, !1);
  }
  async _loadSegments() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await b.getCustomerSegments();
    if (u(this, s)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._segments = e), this._isLoading = !1;
    }
  }
  async _handleDelete(e) {
    if (e.isSystemSegment) {
      u(this, l)?.peek("warning", {
        data: { headline: "Cannot delete", message: "System segments cannot be deleted." }
      });
      return;
    }
    if (!confirm(`Are you sure you want to delete "${e.name}"?`))
      return;
    this._deletingId = e.id;
    const { error: t } = await b.deleteCustomerSegment(e.id);
    if (u(this, s)) {
      if (this._deletingId = null, t) {
        u(this, l)?.peek("danger", {
          data: { headline: "Delete failed", message: t.message }
        });
        return;
      }
      u(this, l)?.peek("positive", {
        data: { headline: "Segment deleted", message: `"${e.name}" has been deleted.` }
      }), this._loadSegments();
    }
  }
  _formatDate(e) {
    return new Date(e).toLocaleDateString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
  _getSegmentTypeBadgeColor(e) {
    return e === "Automated" ? "positive" : "default";
  }
  _renderLoadingState() {
    return i`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return i`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return i`
      <merchello-empty-state
        icon="icon-users"
        headline="No segments yet"
        message="Create segments to group customers for targeted marketing and pricing.">
        <uui-button
          slot="action"
          look="primary"
          href=${_()}
          label="Create Segment">
          Create Segment
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderSegmentRow(e) {
    const t = this._deletingId === e.id;
    return i`
      <uui-table-row>
        <uui-table-cell>
          <div class="segment-name-cell">
            <a href=${f(e.id)} class="segment-name">
              ${e.name}
            </a>
            ${e.isSystemSegment ? i`<uui-tag look="secondary" class="system-badge">System</uui-tag>` : h}
            ${e.description ? i`<span class="segment-description">${e.description}</span>` : h}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${this._getSegmentTypeBadgeColor(e.segmentType)}>
            ${e.segmentType}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell class="center">${e.memberCount}</uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${e.isActive ? "positive" : "warning"}>
            ${e.isActive ? "Active" : "Inactive"}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell>${this._formatDate(e.dateCreated)}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              href=${f(e.id)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            ${e.isSystemSegment ? h : i`
                  <uui-button
                    look="secondary"
                    compact
                    label="Delete"
                    ?disabled=${t}
                    @click=${() => this._handleDelete(e)}>
                    ${t ? i`<uui-loader-circle></uui-loader-circle>` : i`<uui-icon name="icon-delete"></uui-icon>`}
                  </uui-button>
                `}
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderSegmentsTable() {
    return i`
      <div class="table-container">
        <uui-table class="segments-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Type</uui-table-head-cell>
            <uui-table-head-cell class="center">Members</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Created</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._segments.map((e) => this._renderSegmentRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._segments.length === 0 ? this._renderEmptyState() : this._renderSegmentsTable();
  }
  render() {
    return i`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="segments-container">
          <!-- Header with create button -->
          <div class="header-actions">
            <uui-button
              look="primary"
              href=${_()}
              label="Create Segment">
              <uui-icon name="icon-add"></uui-icon>
              Create Segment
            </uui-button>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakMap();
r.styles = [
  w`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .segments-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .header-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: var(--uui-size-space-4);
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .segments-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-head-cell.center,
      uui-table-cell.center {
        text-align: center;
      }

      .segment-name-cell {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .segment-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .segment-name:hover {
        text-decoration: underline;
      }

      .segment-description {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .system-badge {
        font-size: 10px;
        margin-left: var(--uui-size-space-2);
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }
    `
];
d([
  c()
], r.prototype, "_segments", 2);
d([
  c()
], r.prototype, "_isLoading", 2);
d([
  c()
], r.prototype, "_errorMessage", 2);
d([
  c()
], r.prototype, "_deletingId", 2);
r = d([
  $("merchello-segments-list")
], r);
const O = r;
export {
  r as MerchelloSegmentsListElement,
  O as default
};
//# sourceMappingURL=segments-list.element-Dh5Ce2RJ.js.map
