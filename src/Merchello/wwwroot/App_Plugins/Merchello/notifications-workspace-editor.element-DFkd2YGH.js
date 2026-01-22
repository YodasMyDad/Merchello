import { html as r, nothing as d, css as T, state as f, customElement as P } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as L } from "@umbraco-cms/backoffice/lit-element";
import { UMB_WORKSPACE_CONTEXT as A } from "@umbraco-cms/backoffice/workspace";
function y(i) {
  switch (i) {
    case "Validation":
      return "priority-validation";
    case "Early":
      return "priority-early";
    case "Default":
      return "priority-default";
    case "Processing":
      return "priority-processing";
    case "Business Logic":
      return "priority-business";
    case "External Sync":
      return "priority-external";
    default:
      return "priority-default";
  }
}
const H = [
  { category: "Validation", range: "<500", description: "Validation and pre-checks" },
  { category: "Early", range: "500-999", description: "Early processing" },
  { category: "Default", range: "1000", description: "Default priority" },
  { category: "Processing", range: "1001-1499", description: "Main processing" },
  { category: "Business Logic", range: "1500-1999", description: "Business logic" },
  { category: "External Sync", range: "2000+", description: "External integrations (email, webhooks)" }
];
var O = Object.defineProperty, W = Object.getOwnPropertyDescriptor, x = (i) => {
  throw TypeError(i);
}, u = (i, e, a, o) => {
  for (var n = o > 1 ? void 0 : o ? W(e, a) : e, g = i.length - 1, v; g >= 0; g--)
    (v = i[g]) && (n = (o ? v(e, a, n) : v(n)) || n);
  return o && n && O(e, a, n), n;
}, h = (i, e, a) => e.has(i) || x("Cannot " + a), p = (i, e, a) => (h(i, e, "read from private field"), a ? a.call(i) : e.get(i)), m = (i, e, a) => e.has(i) ? x("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, a), M = (i, e, a, o) => (h(i, e, "write to private field"), e.set(i, a), a), s = (i, e, a) => (h(i, e, "access private method"), a), c, t, b, _, w, z, k, $, C, E, N, D, S;
let l = class extends L {
  constructor() {
    super(), m(this, t), this._loading = !0, this._searchTerm = "", this._expandedDomains = /* @__PURE__ */ new Set(), m(this, c), this.consumeContext(A, (i) => {
      M(this, c, i), this.observe(p(this, c).data, (e) => this._data = e, "_data"), this.observe(p(this, c).loading, (e) => this._loading = e, "_loading"), this.observe(p(this, c).searchTerm, (e) => this._searchTerm = e, "_searchTerm");
    });
  }
  render() {
    return r`
      <umb-workspace-editor headline="Notifications">
        <div id="main" slot="main">
          ${this._loading ? s(this, t, $).call(this) : s(this, t, C).call(this)}
        </div>
      </umb-workspace-editor>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
t = /* @__PURE__ */ new WeakSet();
b = function(i) {
  const e = i.target;
  p(this, c)?.setSearchTerm(e.value);
};
_ = function(i) {
  const e = new Set(this._expandedDomains);
  e.has(i) ? e.delete(i) : e.add(i), this._expandedDomains = e;
};
w = function() {
  this._data && (this._expandedDomains = new Set(this._data.domains.map((i) => i.domain)));
};
z = function() {
  this._expandedDomains = /* @__PURE__ */ new Set();
};
k = function(i) {
  if (!this._searchTerm) return i.notifications;
  const e = this._searchTerm.toLowerCase();
  return i.notifications.filter(
    (a) => a.typeName.toLowerCase().includes(e) || a.handlers.some((o) => o.typeName.toLowerCase().includes(e))
  );
};
$ = function() {
  return r`
      <div class="loading-container">
        <uui-loader></uui-loader>
        <p>Discovering notifications and handlers...</p>
      </div>
    `;
};
C = function() {
  return this._data ? r`
      <!-- Summary Stats -->
      <div class="summary-cards">
        <div class="stat-card">
          <div class="stat-value">${this._data.totalNotifications}</div>
          <div class="stat-label">Notifications</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this._data.totalHandlers}</div>
          <div class="stat-label">Handler Registrations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this._data.domains.length}</div>
          <div class="stat-label">Domains</div>
        </div>
      </div>

      <!-- Search and Controls -->
      <div class="controls-row">
        <uui-input
          placeholder="Search notifications or handlers..."
          @input=${s(this, t, b)}
          .value=${this._searchTerm}
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
        </uui-input>
        <div class="control-buttons">
          <uui-button look="secondary" @click=${s(this, t, w)} label="Expand All">
            <uui-icon name="icon-navigation-down"></uui-icon> Expand All
          </uui-button>
          <uui-button look="secondary" @click=${s(this, t, z)} label="Collapse All">
            <uui-icon name="icon-navigation-right"></uui-icon> Collapse All
          </uui-button>
        </div>
      </div>

      <!-- Priority Legend -->
      <div class="priority-legend">
        <span class="legend-title">Priority ranges:</span>
        ${H.map(
    (i) => r`
            <span class="legend-item ${y(i.category)}" title=${i.description}>
              ${i.range} ${i.category}
            </span>
          `
  )}
      </div>

      <!-- Domain Groups -->
      <div class="domains">
        ${this._data.domains.map((i) => s(this, t, E).call(this, i))}
      </div>
    ` : r`<uui-box><p>No data available</p></uui-box>`;
};
E = function(i) {
  const e = s(this, t, k).call(this, i);
  if (this._searchTerm && e.length === 0) return d;
  const a = this._expandedDomains.has(i.domain), o = i.notifications.filter((n) => !n.hasHandlers).length;
  return r`
      <uui-box>
        <div class="domain-header" @click=${() => s(this, t, _).call(this, i.domain)}>
          <uui-icon name=${a ? "icon-navigation-down" : "icon-navigation-right"}></uui-icon>
          <span class="domain-name">${i.domain}</span>
          <span class="domain-stats">
            ${i.notificationCount} notifications, ${i.handlerCount} handlers
            ${o > 0 ? r`<span class="warning">(${o} unhandled)</span>` : d}
          </span>
        </div>
        ${a ? s(this, t, N).call(this, e) : d}
      </uui-box>
    `;
};
N = function(i) {
  return r`
      <div class="notifications-list">
        ${i.map((e) => s(this, t, D).call(this, e))}
      </div>
    `;
};
D = function(i) {
  return r`
      <div class="notification-item ${i.hasHandlers ? "" : "no-handlers"}">
        <div class="notification-header">
          <span class="notification-name">${i.typeName}</span>
          ${i.isCancelable ? r`<uui-tag look="secondary" color="warning">Cancelable</uui-tag>` : d}
          ${i.hasHandlers ? d : r`<uui-tag look="secondary" color="default">No handlers</uui-tag>`}
        </div>
        ${i.hasHandlers ? s(this, t, S).call(this, i.handlers) : d}
      </div>
    `;
};
S = function(i) {
  return r`
      <div class="handlers-list">
        ${i.map(
    (e) => r`
            <div class="handler-item">
              <span class="execution-order">${e.executionOrder}</span>
              <span class="handler-name">${e.typeName}</span>
              <span class="priority-badge ${y(e.priorityCategory)}">
                ${e.priority}
              </span>
              <span class="priority-category">${e.priorityCategory}</span>
              ${e.assemblyName ? r`<span class="assembly-name">${e.assemblyName}</span>` : d}
            </div>
          `
  )}
      </div>
    `;
};
l.styles = [
  T`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      #main {
        padding: var(--uui-size-layout-1);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-3);
        gap: var(--uui-size-space-3);
      }

      .summary-cards {
        display: flex;
        gap: var(--uui-size-space-4);
      }

      .stat-card {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
        text-align: center;
        min-width: 140px;
      }

      .stat-value {
        font-size: var(--uui-type-h2-size);
        font-weight: bold;
        color: var(--uui-color-interactive);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .controls-row {
        display: flex;
        gap: var(--uui-size-space-4);
        align-items: center;
        flex-wrap: wrap;
      }

      .controls-row uui-input {
        flex: 1;
        min-width: 250px;
        max-width: 400px;
      }

      .control-buttons {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .priority-legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
        font-size: var(--uui-type-small-size);
        align-items: center;
      }

      .legend-title {
        font-weight: 600;
      }

      .legend-item {
        padding: 2px 8px;
        border-radius: var(--uui-border-radius);
      }

      .legend-item.priority-validation { background: #e8f5e9; color: #2e7d32; }
      .legend-item.priority-early { background: #e3f2fd; color: #1565c0; }
      .legend-item.priority-default { background: #f5f5f5; color: #616161; }
      .legend-item.priority-processing { background: #fff3e0; color: #e65100; }
      .legend-item.priority-business { background: #fce4ec; color: #c2185b; }
      .legend-item.priority-external { background: #ede7f6; color: #512da8; }

      .domains {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .domain-header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        cursor: pointer;
        padding: var(--uui-size-space-2);
        margin: calc(-1 * var(--uui-size-space-2));
        border-radius: var(--uui-border-radius);
      }

      .domain-header:hover {
        background: var(--uui-color-surface-alt);
      }

      .domain-name {
        font-weight: 600;
        font-size: var(--uui-type-h5-size);
      }

      .domain-stats {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .warning {
        color: var(--uui-color-warning);
      }

      .notifications-list {
        padding: var(--uui-size-space-3) 0 0 0;
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .notification-item {
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface);
      }

      .notification-item.no-handlers {
        border-color: var(--uui-color-warning);
        background: color-mix(in srgb, var(--uui-color-warning) 5%, var(--uui-color-surface));
      }

      .notification-header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin-bottom: var(--uui-size-space-2);
      }

      .notification-name {
        font-weight: 500;
        font-family: var(--uui-font-monospace);
        font-size: 13px;
      }

      .handlers-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        padding-left: var(--uui-size-space-4);
      }

      .handler-item {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        font-size: var(--uui-type-small-size);
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .execution-order {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--uui-color-interactive);
        color: var(--uui-color-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 11px;
        flex-shrink: 0;
      }

      .handler-name {
        font-family: var(--uui-font-monospace);
        flex: 1;
        font-size: 12px;
      }

      .priority-badge {
        padding: 2px 6px;
        border-radius: var(--uui-border-radius);
        font-weight: 600;
        font-size: 11px;
        flex-shrink: 0;
      }

      .priority-badge.priority-validation { background: #e8f5e9; color: #2e7d32; }
      .priority-badge.priority-early { background: #e3f2fd; color: #1565c0; }
      .priority-badge.priority-default { background: #f5f5f5; color: #616161; }
      .priority-badge.priority-processing { background: #fff3e0; color: #e65100; }
      .priority-badge.priority-business { background: #fce4ec; color: #c2185b; }
      .priority-badge.priority-external { background: #ede7f6; color: #512da8; }

      .priority-category {
        color: var(--uui-color-text-alt);
        font-size: 10px;
        flex-shrink: 0;
      }

      .assembly-name {
        color: var(--uui-color-text-alt);
        font-size: 10px;
        font-style: italic;
        flex-shrink: 0;
      }
    `
];
u([
  f()
], l.prototype, "_data", 2);
u([
  f()
], l.prototype, "_loading", 2);
u([
  f()
], l.prototype, "_searchTerm", 2);
u([
  f()
], l.prototype, "_expandedDomains", 2);
l = u([
  P("merchello-notifications-workspace-editor")
], l);
const V = l;
export {
  l as MerchelloNotificationsWorkspaceEditorElement,
  V as default
};
//# sourceMappingURL=notifications-workspace-editor.element-DFkd2YGH.js.map
