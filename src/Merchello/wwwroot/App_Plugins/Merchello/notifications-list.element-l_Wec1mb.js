import { html as r, nothing as d, css as S, state as f, customElement as T } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as L } from "@umbraco-cms/backoffice/lit-element";
import { UMB_WORKSPACE_CONTEXT as A } from "@umbraco-cms/backoffice/workspace";
function y(i) {
  switch (i) {
    case "Validation":
      return "priority-validation";
    case "Early Processing":
      return "priority-early";
    case "Default":
      return "priority-default";
    case "Core Processing":
      return "priority-processing";
    case "Business Rules":
      return "priority-business";
    case "Late / External":
      return "priority-external";
    default:
      return "priority-default";
  }
}
const H = [
  { category: "Validation", range: "<500", description: "Pre-checks and validation before processing" },
  { category: "Early Processing", range: "500-999", description: "Runs before default handlers" },
  { category: "Default", range: "1000", description: "Standard priority for most handlers" },
  { category: "Core Processing", range: "1001-1499", description: "Main business processing after defaults" },
  { category: "Business Rules", range: "1500-1999", description: "Domain rules, fulfilment, digital delivery" },
  { category: "Late / External", range: "2000+", description: "Emails, webhooks, external system sync" }
];
var M = Object.defineProperty, O = Object.getOwnPropertyDescriptor, x = (i) => {
  throw TypeError(i);
}, p = (i, e, a, n) => {
  for (var o = n > 1 ? void 0 : n ? O(e, a) : e, g = i.length - 1, h; g >= 0; g--)
    (h = i[g]) && (o = (n ? h(e, a, o) : h(o)) || o);
  return n && o && M(e, a, o), o;
}, v = (i, e, a) => e.has(i) || x("Cannot " + a), u = (i, e, a) => (v(i, e, "read from private field"), e.get(i)), m = (i, e, a) => e.has(i) ? x("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, a), R = (i, e, a, n) => (v(i, e, "write to private field"), e.set(i, a), a), s = (i, e, a) => (v(i, e, "access private method"), a), l, t, b, _, w, z, $, k, C, D, E, N, P;
let c = class extends L {
  constructor() {
    super(), m(this, t), this._loading = !0, this._searchTerm = "", this._expandedDomains = /* @__PURE__ */ new Set(), m(this, l), this.consumeContext(A, (i) => {
      R(this, l, i), u(this, l)?.data && (this.observe(u(this, l).data, (e) => this._data = e, "_data"), this.observe(u(this, l).loading, (e) => this._loading = e, "_loading"), this.observe(u(this, l).searchTerm, (e) => this._searchTerm = e, "_searchTerm"));
    });
  }
  render() {
    return r`
      <umb-body-layout header-fit-height>
        <div id="main">
          ${this._loading ? s(this, t, k).call(this) : s(this, t, C).call(this)}
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
t = /* @__PURE__ */ new WeakSet();
b = function(i) {
  const e = i.target;
  u(this, l)?.setSearchTerm(e.value);
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
$ = function(i) {
  if (!this._searchTerm) return i.notifications;
  const e = this._searchTerm.toLowerCase();
  return i.notifications.filter(
    (a) => a.typeName.toLowerCase().includes(e) || a.handlers.some((n) => n.typeName.toLowerCase().includes(e))
  );
};
k = function() {
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
        ${H.map(
    (i) => r`
            <div class="legend-item ${y(i.category)}">
              <span class="legend-range">${i.range}</span>
              <span class="legend-category">${i.category}</span>
              <span class="legend-desc">${i.description}</span>
            </div>
          `
  )}
      </div>

      <!-- Domain Groups -->
      <div class="domains">
        ${this._data.domains.map((i) => s(this, t, D).call(this, i))}
      </div>
    ` : r`<uui-box><p>No data available</p></uui-box>`;
};
D = function(i) {
  const e = s(this, t, $).call(this, i);
  if (this._searchTerm && e.length === 0) return d;
  const a = this._expandedDomains.has(i.domain), n = i.notifications.filter((o) => !o.hasHandlers).length;
  return r`
      <uui-box>
        <div class="domain-header" @click=${() => s(this, t, _).call(this, i.domain)}>
          <uui-icon name=${a ? "icon-navigation-down" : "icon-navigation-right"}></uui-icon>
          <span class="domain-name">${i.domain}</span>
          <span class="domain-stats">
            ${i.notificationCount} notifications, ${i.handlerCount} handlers
            ${n > 0 ? r`<span class="warning">(${n} unhandled)</span>` : d}
          </span>
        </div>
        ${a ? s(this, t, E).call(this, e) : d}
      </uui-box>
    `;
};
E = function(i) {
  return r`
      <div class="notifications-list">
        ${i.map((e) => s(this, t, N).call(this, e))}
      </div>
    `;
};
N = function(i) {
  return r`
      <div class="notification-item ${i.hasHandlers ? "" : "no-handlers"}">
        <div class="notification-header">
          <span class="notification-name">${i.typeName}</span>
          ${i.isCancelable ? r`<uui-tag look="secondary" color="warning">Cancelable</uui-tag>` : d}
          ${i.hasHandlers ? d : r`<uui-tag look="secondary" color="default">No handlers</uui-tag>`}
        </div>
        ${i.hasHandlers ? s(this, t, P).call(this, i.handlers) : d}
      </div>
    `;
};
P = function(i) {
  return r`
      <div class="handlers-list">
        ${i.map(
    (e) => r`
            <div class="handler-item ${e.hasDuplicatePriority ? "duplicate-priority" : ""}">
              <span class="execution-order">${e.executionOrder}</span>
              <span class="handler-name">${e.typeName}</span>
              <span class="priority-badge ${y(e.priorityCategory)}">
                ${e.priority}
              </span>
              <span class="priority-category">${e.priorityCategory}</span>
              ${e.hasDuplicatePriority ? r`<span class="duplicate-warning" title="Multiple handlers share this priority. Execution order between them is non-deterministic.">
                    <uui-icon name="icon-alert"></uui-icon> shared priority
                  </span>` : d}
              ${e.assemblyName ? r`<span class="assembly-name">${e.assemblyName}</span>` : d}
            </div>
          `
  )}
      </div>
    `;
};
c.styles = [
  S`
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
        padding: var(--uui-size-space-5) var(--uui-size-space-6);
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
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: var(--uui-size-space-3);
        font-size: var(--uui-type-small-size);
      }

      @media (max-width: 900px) {
        .priority-legend {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 600px) {
        .priority-legend {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .legend-item {
        padding: 6px 10px;
        border-radius: var(--uui-border-radius);
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .legend-range {
        font-weight: 700;
        font-size: 11px;
      }

      .legend-category {
        font-weight: 600;
        font-size: 12px;
      }

      .legend-desc {
        font-size: 10px;
        opacity: 0.8;
      }

      .legend-item.priority-validation { background: #e8f5e9; color: #2e7d32; }
      .legend-item.priority-early { background: #e3f2fd; color: #1565c0; }
      .legend-item.priority-default { background: #f5f5f5; color: #616161; }
      .legend-item.priority-processing { background: #e0f2f1; color: #00695c; }
      .legend-item.priority-business { background: #fff8e1; color: #e65100; }
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
      .priority-badge.priority-processing { background: #e0f2f1; color: #00695c; }
      .priority-badge.priority-business { background: #fff8e1; color: #e65100; }
      .priority-badge.priority-external { background: #ede7f6; color: #512da8; }

      .priority-category {
        color: var(--uui-color-text-alt);
        font-size: 10px;
        flex-shrink: 0;
      }

      .handler-item.duplicate-priority {
        border-left: 3px solid var(--uui-color-warning);
      }

      .duplicate-warning {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--uui-color-warning-emphasis);
        font-size: 10px;
        font-weight: 500;
        flex-shrink: 0;
      }

      .duplicate-warning uui-icon {
        font-size: 12px;
      }

      .assembly-name {
        color: var(--uui-color-text-alt);
        font-size: 10px;
        font-style: italic;
        flex-shrink: 0;
      }
    `
];
p([
  f()
], c.prototype, "_data", 2);
p([
  f()
], c.prototype, "_loading", 2);
p([
  f()
], c.prototype, "_searchTerm", 2);
p([
  f()
], c.prototype, "_expandedDomains", 2);
c = p([
  T("merchello-notifications-list")
], c);
const I = c;
export {
  c as MerchelloNotificationsListElement,
  I as default
};
//# sourceMappingURL=notifications-list.element-l_Wec1mb.js.map
