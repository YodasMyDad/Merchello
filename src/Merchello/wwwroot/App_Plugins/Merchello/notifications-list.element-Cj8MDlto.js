import { html as s, nothing as h, css as I, state as m, customElement as B } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as G } from "@umbraco-cms/backoffice/lit-element";
import { UMB_WORKSPACE_CONTEXT as V } from "@umbraco-cms/backoffice/workspace";
import "./merchello-empty-state.element-D2dcD7_8.js";
function z(e) {
  switch (e) {
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
const F = [
  { category: "Validation", range: "<500", description: "Pre-checks and validation before processing" },
  { category: "Early Processing", range: "500-999", description: "Runs before default handlers" },
  { category: "Default", range: "1000", description: "Standard priority for most handlers" },
  { category: "Core Processing", range: "1001-1499", description: "Main business processing after defaults" },
  { category: "Business Rules", range: "1500-1999", description: "Domain rules, fulfilment, digital delivery" },
  { category: "Late / External", range: "2000+", description: "Emails, webhooks, external system sync" }
];
var K = Object.defineProperty, X = Object.getOwnPropertyDescriptor, $ = (e) => {
  throw TypeError(e);
}, f = (e, i, a, o) => {
  for (var c = o > 1 ? void 0 : o ? X(i, a) : i, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (c = (o ? l(i, a, c) : l(c)) || c);
  return o && c && K(i, a, c), c;
}, v = (e, i, a) => i.has(e) || $("Cannot " + a), p = (e, i, a) => (v(e, i, "read from private field"), i.get(e)), w = (e, i, a) => i.has(e) ? $("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), Y = (e, i, a, o) => (v(e, i, "write to private field"), i.set(e, a), a), t = (e, i, a) => (v(e, i, "access private method"), a), u, r, k, g, y, C, D, N, E, b, S, x, _, L, P, T, H, R, M, O, A, U, W;
let d = class extends G {
  constructor() {
    super(), w(this, r), this._loading = !0, this._loadError = null, this._searchTerm = "", this._expandedDomains = /* @__PURE__ */ new Set(), w(this, u), this.consumeContext(V, (e) => {
      Y(this, u, e), p(this, u) && (this.observe(
        p(this, u).data,
        (i) => {
          const a = !!this._data;
          this._data = i, !a && i && this._expandedDomains.size === 0 && (this._expandedDomains = new Set(i.domains.map((o) => o.domain)));
        },
        "_data"
      ), this.observe(p(this, u).loading, (i) => this._loading = i, "_loading"), this.observe(p(this, u).loadError, (i) => this._loadError = i, "_loadError"), this.observe(p(this, u).searchTerm, (i) => this._searchTerm = i, "_searchTerm"));
    });
  }
  render() {
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <div id="main">
          ${this._loading ? t(this, r, T).call(this) : this._loadError ? t(this, r, H).call(this) : t(this, r, O).call(this)}
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
r = /* @__PURE__ */ new WeakSet();
k = function(e) {
  const a = e.target.value;
  p(this, u)?.setSearchTerm(a), t(this, r, C).call(this, a);
};
g = function() {
  this._searchTerm && (this._searchTerm = "", p(this, u)?.setSearchTerm(""));
};
y = function() {
  p(this, u)?.loadData(!0);
};
C = function(e) {
  const i = e.trim().toLowerCase();
  if (!i || !this._data) return;
  const a = new Set(this._expandedDomains);
  for (const o of this._data.domains)
    t(this, r, b).call(this, o, i).length > 0 && a.add(o.domain);
  this._expandedDomains = a;
};
D = function(e) {
  const i = new Set(this._expandedDomains);
  i.has(e) ? i.delete(e) : i.add(e), this._expandedDomains = i;
};
N = function() {
  this._data && (this._expandedDomains = new Set(this._data.domains.map((e) => e.domain)));
};
E = function() {
  this._expandedDomains = /* @__PURE__ */ new Set();
};
b = function(e, i) {
  return !i || e.domain.toLowerCase().includes(i) ? e.notifications : e.notifications.filter((a) => a.typeName.toLowerCase().includes(i) || a.fullTypeName.toLowerCase().includes(i) ? !0 : a.handlers.some((o) => !!(o.typeName.toLowerCase().includes(i) || o.fullTypeName.toLowerCase().includes(i) || o.assemblyName?.toLowerCase().includes(i))));
};
S = function() {
  if (!this._data) return [];
  const e = this._searchTerm.trim().toLowerCase();
  return this._data.domains.map((i) => ({
    domain: i,
    notifications: t(this, r, b).call(this, i, e)
  })).filter((i) => i.notifications.length > 0);
};
x = function(e) {
  return e.reduce((i, a) => i + a.handlers.length, 0);
};
_ = function(e) {
  return e.filter((i) => !i.hasHandlers).length;
};
L = function(e) {
  return e.reduce(
    (i, a) => i + a.handlers.filter((o) => o.hasDuplicatePriority).length,
    0
  );
};
P = function(e) {
  return `domain-${e.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
};
T = function() {
  return s`
      <uui-box>
        <div class="loading-container">
          <uui-loader></uui-loader>
          <p>Discovering notifications and handlers...</p>
        </div>
      </uui-box>
    `;
};
H = function() {
  return s`
      <uui-box class="error-box" headline="Could not load notifications">
        <div class="error-content">
          <p>${this._loadError}</p>
          <uui-button look="secondary" label="Retry" @click=${t(this, r, y)}>Retry</uui-button>
        </div>
      </uui-box>
    `;
};
R = function() {
  return s`
      <uui-box>
        <merchello-empty-state
          icon="icon-bell"
          headline="No notifications discovered"
          message="No notification metadata was returned for this environment.">
          <uui-button slot="actions" look="secondary" label="Refresh" @click=${t(this, r, y)}>
            Refresh
          </uui-button>
        </merchello-empty-state>
      </uui-box>
    `;
};
M = function() {
  return s`
      <uui-box>
        <merchello-empty-state
          icon="icon-search"
          headline="No matching notifications"
          message="Try a different search term or clear the current filter.">
          <uui-button slot="actions" look="secondary" label="Clear search" @click=${t(this, r, g)}>
            Clear search
          </uui-button>
        </merchello-empty-state>
      </uui-box>
    `;
};
O = function() {
  if (!this._data || this._data.domains.length === 0)
    return t(this, r, R).call(this);
  const e = t(this, r, S).call(this), i = e.reduce((n, l) => n + l.notifications.length, 0), a = e.reduce(
    (n, l) => n + t(this, r, x).call(this, l.notifications),
    0
  ), o = this._data.domains.reduce(
    (n, l) => n + t(this, r, _).call(this, l.notifications),
    0
  ), c = this._searchTerm.trim().length > 0;
  return s`
      <uui-box>
        <div class="summary-cards">
          <div class="stat-card">
            <div class="stat-value">${this._data.totalNotifications}</div>
            <div class="stat-label">Notifications</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._data.totalHandlers}</div>
            <div class="stat-label">Handler registrations</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._data.domains.length}</div>
            <div class="stat-label">Domains</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${o}</div>
            <div class="stat-label">Unhandled notifications</div>
          </div>
        </div>
      </uui-box>

      <uui-box>
        <div class="controls-row">
          <div class="search-control">
            <uui-input
              placeholder="Search notifications or handlers..."
              @input=${t(this, r, k)}
              .value=${this._searchTerm}
              label="Search notifications and handlers">
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? s`
                    <uui-button slot="append" compact look="secondary" label="Clear search" @click=${t(this, r, g)}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : h}
            </uui-input>
          </div>
          <div class="control-buttons">
            <uui-button look="secondary" label="Expand all domains" @click=${t(this, r, N)}>
              <uui-icon name="icon-navigation-down" slot="icon"></uui-icon>
              Expand all
            </uui-button>
            <uui-button look="secondary" label="Collapse all domains" @click=${t(this, r, E)}>
              <uui-icon name="icon-navigation-right" slot="icon"></uui-icon>
              Collapse all
            </uui-button>
          </div>
        </div>
        <p class="results-summary">
          ${c ? s`
                Showing ${i} notifications and ${a} handlers in
                ${e.length} matching domains.
              ` : s`
                Showing ${this._data.totalNotifications} notifications and ${this._data.totalHandlers} handlers.
              `}
        </p>
      </uui-box>

      <uui-box headline="Priority Legend">
        <div class="priority-legend">
          ${F.map(
    (n) => s`
              <div class="legend-item ${z(n.category)}">
                <span class="legend-range">${n.range}</span>
                <span class="legend-category">${n.category}</span>
                <span class="legend-desc">${n.description}</span>
              </div>
            `
  )}
        </div>
      </uui-box>

      ${e.length === 0 ? t(this, r, M).call(this) : s`
            <div class="domains">
              ${e.map(({ domain: n, notifications: l }) => t(this, r, A).call(this, n, l))}
            </div>
          `}
    `;
};
A = function(e, i) {
  const a = t(this, r, P).call(this, e.domain), o = this._expandedDomains.has(e.domain), c = t(this, r, x).call(this, i), n = t(this, r, _).call(this, i), l = t(this, r, L).call(this, i);
  return s`
      <uui-box class="domain-box">
        <button
          type="button"
          class="domain-toggle"
          @click=${() => t(this, r, D).call(this, e.domain)}
          aria-expanded=${o ? "true" : "false"}
          aria-controls=${a}
          aria-label=${o ? `Collapse ${e.domain} domain` : `Expand ${e.domain} domain`}>
          <span class="domain-main">
            <uui-icon name=${o ? "icon-navigation-down" : "icon-navigation-right"}></uui-icon>
            <span class="domain-title-group">
              <span class="domain-name">${e.domain}</span>
              <span class="domain-stats">${i.length} notifications, ${c} handlers</span>
            </span>
          </span>
          <span class="domain-meta">
            ${n > 0 ? s`
                  <span class="status-chip warning">
                    ${n} unhandled
                  </span>
                ` : h}
            ${l > 0 ? s`
                  <span class="status-chip neutral">
                    ${l} shared priorities
                  </span>
                ` : h}
          </span>
        </button>
        ${o ? s`
              <div class="notifications-list" id=${a}>
                ${i.map((j) => t(this, r, U).call(this, j))}
              </div>
            ` : h}
      </uui-box>
    `;
};
U = function(e) {
  return s`
      <div class="notification-item ${e.hasHandlers ? "" : "no-handlers"}">
        <div class="notification-header">
          <span class="notification-name" title=${e.fullTypeName}>${e.typeName}</span>
          <span class="notification-flags">
            ${e.isCancelable ? s`<span class="status-chip info">Cancelable</span>` : h}
            ${e.hasHandlers ? h : s`<span class="status-chip warning">No handlers</span>`}
          </span>
        </div>
        ${e.hasHandlers ? t(this, r, W).call(this, e.handlers) : s`
              <p class="no-handlers-text">
                No handlers are currently registered for this notification.
              </p>
            `}
      </div>
    `;
};
W = function(e) {
  return s`
      <div class="handlers-list">
        ${e.map(
    (i) => s`
            <div class="handler-item ${i.hasDuplicatePriority ? "duplicate-priority" : ""}">
              <span class="execution-order">${i.executionOrder}</span>
              <div class="handler-main">
                <div class="handler-top">
                  <span class="handler-name" title=${i.fullTypeName}>${i.typeName}</span>
                  <span class="priority-badge ${z(i.priorityCategory)}">
                    ${i.priority}
                  </span>
                  <span class="priority-category">${i.priorityCategory}</span>
                </div>
                <div class="handler-meta">
                  ${i.hasDuplicatePriority ? s`
                        <span
                          class="status-chip warning"
                          title="Multiple handlers share this priority. Execution order between those handlers is non-deterministic.">
                          <uui-icon name="icon-alert"></uui-icon>
                          Shared priority
                        </span>
                      ` : h}
                  ${i.assemblyName ? s`<span class="assembly-name">${i.assemblyName}</span>` : h}
                </div>
              </div>
            </div>
          `
  )}
      </div>
    `;
};
d.styles = [
  I`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        background: var(--uui-color-background);
      }

      #main {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
        padding: var(--uui-size-layout-1);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-2);
        gap: var(--uui-size-space-3);
      }

      .loading-container p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .error-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--uui-size-space-3);
        color: var(--uui-color-danger);
      }

      .error-content p {
        margin: 0;
      }

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: var(--uui-size-space-3);
      }

      .stat-card {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
      }

      .stat-value {
        font-size: var(--uui-type-h3-size);
        font-weight: 700;
        color: var(--uui-color-interactive);
      }

      .stat-label {
        margin-top: var(--uui-size-space-1);
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .controls-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .search-control {
        flex: 1 1 320px;
        min-width: 260px;
      }

      .search-control uui-input {
        width: 100%;
      }

      .control-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
      }

      .results-summary {
        margin: var(--uui-size-space-3) 0 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .priority-legend {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--uui-size-space-3);
      }

      .legend-item {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-3);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        color: var(--uui-color-text);
      }

      .legend-range {
        font-size: var(--uui-type-small-size);
        font-weight: 700;
      }

      .legend-category {
        font-weight: 600;
      }

      .legend-desc {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .legend-item.priority-validation {
        border-color: var(--uui-color-positive);
        color: var(--uui-color-positive);
      }

      .legend-item.priority-early {
        border-color: var(--uui-color-interactive);
        color: var(--uui-color-interactive);
      }

      .legend-item.priority-default {
        border-color: var(--uui-color-border-emphasis, var(--uui-color-border));
        color: var(--uui-color-text-alt);
      }

      .legend-item.priority-processing {
        border-color: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
        color: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
      }

      .legend-item.priority-business {
        background: var(--merchello-color-warning-status-background, #8a6500);
        border-color: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
      }

      .legend-item.priority-business .legend-desc {
        color: #fff;
      }

      .legend-item.priority-external {
        border-color: var(--uui-color-text-alt);
        color: var(--uui-color-text-alt);
      }

      .domains {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .domain-toggle {
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-3);
        cursor: pointer;
        text-align: left;
      }

      .domain-toggle:focus-visible {
        outline: 2px solid var(--uui-color-interactive);
        outline-offset: 2px;
      }

      .domain-main {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        min-width: 0;
      }

      .domain-title-group {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        min-width: 0;
      }

      .domain-name {
        font-weight: 600;
        font-size: var(--uui-type-h5-size);
      }

      .domain-stats {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .domain-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--uui-size-space-2);
      }

      .notifications-list {
        margin-top: var(--uui-size-space-3);
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
        border-color: var(--merchello-color-warning-status-background, #8a6500);
      }

      .notification-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-2);
      }

      .notification-name {
        font-family: var(--uui-font-monospace);
        font-size: var(--uui-type-small-size);
        font-weight: 600;
        word-break: break-word;
      }

      .notification-flags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
      }

      .no-handlers-text {
        margin: var(--uui-size-space-2) 0 0;
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .handlers-list {
        margin-top: var(--uui-size-space-3);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .handler-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--uui-size-space-2);
        align-items: start;
        padding: var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface-alt);
      }

      .handler-item.duplicate-priority {
        border-left: 3px solid var(--merchello-color-warning-status-background, #8a6500);
      }

      .execution-order {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background: var(--uui-color-interactive);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: var(--uui-type-small-size);
        font-weight: 700;
      }

      .handler-main {
        min-width: 0;
      }

      .handler-top {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .handler-name {
        font-family: var(--uui-font-monospace);
        font-size: var(--uui-type-small-size);
        font-weight: 500;
        word-break: break-word;
      }

      .priority-badge {
        padding: 0 var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        font-size: var(--uui-type-small-size);
        font-weight: 700;
        background: var(--uui-color-surface);
        color: var(--uui-color-text);
        line-height: 1.5rem;
        min-width: 2.25rem;
        text-align: center;
      }

      .priority-badge.priority-validation {
        background: var(--uui-color-positive);
        border-color: var(--uui-color-positive);
        color: #fff;
      }

      .priority-badge.priority-early {
        background: var(--uui-color-interactive);
        border-color: var(--uui-color-interactive);
        color: #fff;
      }

      .priority-badge.priority-default {
        background: var(--uui-color-surface-emphasis);
        border-color: var(--uui-color-surface-emphasis);
      }

      .priority-badge.priority-processing {
        background: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
        border-color: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
        color: #fff;
      }

      .priority-badge.priority-business {
        background: var(--merchello-color-warning-status-background, #8a6500);
        border-color: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
      }

      .priority-badge.priority-external {
        background: var(--uui-color-surface-alt);
        border-color: var(--uui-color-text-alt);
        color: var(--uui-color-text-alt);
      }

      .priority-category {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .handler-meta {
        margin-top: var(--uui-size-space-1);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .assembly-name {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: 0 var(--uui-size-space-2);
        min-height: 1.5rem;
        border-radius: 999px;
        border: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface-alt);
        color: var(--uui-color-text);
        font-size: var(--uui-type-small-size);
        font-weight: 600;
      }

      .status-chip uui-icon {
        font-size: var(--uui-type-small-size);
      }

      .status-chip.info {
        background: var(--uui-color-interactive);
        border-color: var(--uui-color-interactive);
        color: #fff;
      }

      .status-chip.warning {
        background: var(--merchello-color-warning-status-background, #8a6500);
        border-color: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
      }

      .status-chip.neutral {
        background: var(--uui-color-surface-alt);
        border-color: var(--uui-color-border);
        color: var(--uui-color-text-alt);
      }

      @media (max-width: 900px) {
        .domain-toggle {
          flex-direction: column;
          align-items: flex-start;
        }

        .domain-meta {
          justify-content: flex-start;
        }
      }

      @media (max-width: 640px) {
        .search-control {
          min-width: 100%;
        }

        .control-buttons {
          width: 100%;
        }

        .control-buttons uui-button {
          flex: 1 1 auto;
        }
      }
    `
];
f([
  m()
], d.prototype, "_data", 2);
f([
  m()
], d.prototype, "_loading", 2);
f([
  m()
], d.prototype, "_loadError", 2);
f([
  m()
], d.prototype, "_searchTerm", 2);
f([
  m()
], d.prototype, "_expandedDomains", 2);
d = f([
  B("merchello-notifications-list")
], d);
const ii = d;
export {
  d as MerchelloNotificationsListElement,
  ii as default
};
//# sourceMappingURL=notifications-list.element-Cj8MDlto.js.map
