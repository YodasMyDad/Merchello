import { LitElement as w, html as i, nothing as b, css as x, state as h, customElement as M } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as k } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT as D, UMB_CONFIRM_MODAL as E } from "@umbraco-cms/backoffice/modal";
import { M as f } from "./merchello-api-B2ha_6NF.js";
import { e as v, f as y } from "./navigation-m-G5wLvz.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var L = Object.defineProperty, T = Object.getOwnPropertyDescriptor, S = (e) => {
  throw TypeError(e);
}, d = (e, t, a, r) => {
  for (var l = r > 1 ? void 0 : r ? T(t, a) : t, g = e.length - 1, p; g >= 0; g--)
    (p = e[g]) && (l = (r ? p(t, a, l) : p(l)) || l);
  return r && l && L(t, a, l), l;
}, C = (e, t, a) => t.has(e) || S("Cannot " + a), s = (e, t, a) => (C(e, t, "read from private field"), t.get(e)), _ = (e, t, a) => t.has(e) ? S("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), c = (e, t, a, r) => (C(e, t, "write to private field"), t.set(e, a), a), u, m, o;
let n = class extends $(w) {
  constructor() {
    super(), this._segments = [], this._isLoading = !0, this._errorMessage = null, this._deletingId = null, _(this, u), _(this, m), _(this, o, !1), this.consumeContext(k, (e) => {
      c(this, u, e);
    }), this.consumeContext(D, (e) => {
      c(this, m, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), c(this, o, !0), this._loadSegments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), c(this, o, !1);
  }
  async _loadSegments() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await f.getCustomerSegments();
    if (s(this, o)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._segments = e), this._isLoading = !1;
    }
  }
  async _handleDelete(e) {
    if (e.isSystemSegment) {
      s(this, u)?.peek("warning", {
        data: { headline: "Cannot delete", message: "System segments cannot be deleted." }
      });
      return;
    }
    if (!await s(this, m)?.open(this, E, {
      data: {
        headline: "Delete Segment",
        content: `Are you sure you want to delete "${e.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !s(this, o)) return;
    this._deletingId = e.id;
    const { error: r } = await f.deleteCustomerSegment(e.id);
    if (s(this, o)) {
      if (this._deletingId = null, r) {
        s(this, u)?.peek("danger", {
          data: { headline: "Delete failed", message: r.message }
        });
        return;
      }
      s(this, u)?.peek("positive", {
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
          href=${v()}
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
            <a href=${y(e.id)} class="segment-name">
              ${e.name}
            </a>
            ${e.isSystemSegment ? i`<uui-tag look="secondary" class="system-badge">System</uui-tag>` : b}
            ${e.description ? i`<span class="segment-description">${e.description}</span>` : b}
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
              href=${y(e.id)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            ${e.isSystemSegment ? b : i`
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
              href=${v()}
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
u = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
n.styles = [
  x`
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
  h()
], n.prototype, "_segments", 2);
d([
  h()
], n.prototype, "_isLoading", 2);
d([
  h()
], n.prototype, "_errorMessage", 2);
d([
  h()
], n.prototype, "_deletingId", 2);
n = d([
  M("merchello-segments-list")
], n);
const R = n;
export {
  n as MerchelloSegmentsListElement,
  R as default
};
//# sourceMappingURL=segments-list.element-Cy9OrXBC.js.map
