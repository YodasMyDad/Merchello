import { LitElement as y, nothing as o, html as i, css as b, property as v, state as h, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as z, UMB_MODAL_MANAGER_CONTEXT as $ } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-B76CV0sD.js";
const R = new z("Merchello.HealthCheck.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var M = Object.defineProperty, O = Object.getOwnPropertyDescriptor, p = (e, s, r, a) => {
  for (var t = a > 1 ? void 0 : a ? O(s, r) : s, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (t = (a ? c(s, r, t) : c(t)) || t);
  return a && t && M(s, r, t), t;
};
let u = class extends x(y) {
  constructor() {
    super(...arguments), this.metadata = null, this.result = null, this.isRunning = !1, this._isHovered = !1;
  }
  _onClick() {
    !this.metadata || this.isRunning || this.dispatchEvent(new CustomEvent("check-detail", {
      detail: { alias: this.metadata.alias },
      bubbles: !0,
      composed: !0
    }));
  }
  _getStatusColor() {
    if (!this.result) return "var(--uui-color-border)";
    switch (this.result.status) {
      case "error":
        return "var(--uui-color-danger)";
      case "warning":
        return "var(--uui-color-warning)";
      case "success":
        return "var(--uui-color-positive)";
      default:
        return "var(--uui-color-border)";
    }
  }
  _getStatusIcon() {
    if (!this.result) return "icon-science";
    switch (this.result.status) {
      case "error":
        return "icon-alert";
      case "warning":
        return "icon-alert";
      case "success":
        return "icon-check";
      default:
        return "icon-science";
    }
  }
  _getStatusLabel() {
    if (!this.result) return "Not checked";
    switch (this.result.status) {
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "success":
        return "Healthy";
      default:
        return "Unknown";
    }
  }
  render() {
    if (!this.metadata) return o;
    const e = this.result !== null, s = this._getStatusColor();
    return i`
      <button
        class="card"
        style="--status-color: ${s}"
        @click=${this._onClick}
        @mouseenter=${() => {
      this._isHovered = !0;
    }}
        @mouseleave=${() => {
      this._isHovered = !1;
    }}
        ?disabled=${this.isRunning}>

        <div class="card-header">
          <div class="card-icon">
            <umb-icon name=${this.metadata.icon}></umb-icon>
          </div>
          <div class="card-status">
            ${this.isRunning ? i`<uui-loader-circle></uui-loader-circle>` : e ? i`
                    <div class="status-indicator">
                      <umb-icon name=${this._getStatusIcon()}></umb-icon>
                      <span class="status-label">${this._getStatusLabel()}</span>
                    </div>
                  ` : i`<span class="status-idle">Not checked</span>`}
          </div>
        </div>

        <div class="card-body">
          <h3 class="card-title">${this.metadata.name}</h3>
          <p class="card-description">${this.metadata.description}</p>
        </div>

        ${e && !this.isRunning ? i`
              <div class="card-footer">
                <span class="card-summary">${this.result.summary}</span>
                ${this.result.affectedCount > 0 ? i`<span class="affected-count">${this.result.affectedCount}</span>` : o}
              </div>
            ` : o}

        ${this._isHovered && e && this.result.affectedCount > 0 ? i`<div class="card-action-hint">Click for details</div>` : o}
      </button>
    `;
  }
};
u.styles = b`
    :host {
      display: block;
    }

    .card {
      all: unset;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-5);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      border-left: 4px solid var(--status-color, var(--uui-color-border));
      background: var(--uui-color-surface);
      cursor: pointer;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
      box-sizing: border-box;
      position: relative;
      text-align: left;
      width: 100%;
    }

    .card:hover:not([disabled]) {
      box-shadow: var(--uui-shadow-depth-1);
    }

    .card:focus-visible {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .card[disabled] {
      cursor: default;
      opacity: 0.7;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
    }

    .card-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
      font-size: 18px;
      flex-shrink: 0;
    }

    .card-status {
      display: flex;
      align-items: center;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      color: var(--status-color);
      font-size: var(--uui-type-small-size);
      font-weight: 600;
    }

    .status-idle {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .card-title {
      margin: 0;
      font-size: var(--uui-type-default-size);
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .card-description {
      margin: 0;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      line-height: 1.4;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .card-summary {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text);
    }

    .affected-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 var(--uui-size-space-2);
      border-radius: 12px;
      background: var(--status-color);
      color: #fff;
      font-size: var(--uui-type-small-size);
      font-weight: 600;
      flex-shrink: 0;
    }

    .card-action-hint {
      position: absolute;
      bottom: var(--uui-size-space-2);
      right: var(--uui-size-space-3);
      font-size: 11px;
      color: var(--uui-color-text-alt);
      opacity: 0.7;
    }

    uui-loader-circle {
      font-size: 20px;
    }
  `;
p([
  v({ type: Object })
], u.prototype, "metadata", 2);
p([
  v({ type: Object })
], u.prototype, "result", 2);
p([
  v({ type: Boolean, attribute: "is-running" })
], u.prototype, "isRunning", 2);
p([
  h()
], u.prototype, "_isHovered", 2);
u = p([
  k("merchello-health-check-card")
], u);
var A = Object.defineProperty, H = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, m = (e, s, r, a) => {
  for (var t = a > 1 ? void 0 : a ? H(s, r) : s, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (t = (a ? c(s, r, t) : c(t)) || t);
  return a && t && A(s, r, t), t;
}, w = (e, s, r) => s.has(e) || C("Cannot " + r), f = (e, s, r) => (w(e, s, "read from private field"), s.get(e)), E = (e, s, r) => s.has(e) ? C("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(e) : s.set(e, r), S = (e, s, r, a) => (w(e, s, "write to private field"), s.set(e, r), r), d;
const _ = {
  error: 0,
  warning: 1,
  success: 2
};
let l = class extends x(y) {
  constructor() {
    super(...arguments), this._checks = [], this._isLoadingChecks = !0, this._isRunningAll = !1, this._errorMessage = null, E(this, d);
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext($, (e) => {
      S(this, d, e);
    }), this._loadAvailableChecks();
  }
  async _loadAvailableChecks() {
    this._isLoadingChecks = !0, this._errorMessage = null;
    const { data: e, error: s } = await g.getHealthChecks();
    if (this._isLoadingChecks = !1, s || !e) {
      this._errorMessage = s?.message ?? "Failed to load health checks.";
      return;
    }
    this._checks = e.sort((r, a) => r.sortOrder - a.sortOrder || r.name.localeCompare(a.name)).map((r) => ({ metadata: r, result: null, isRunning: !1 }));
  }
  async _runAllChecks() {
    if (this._isRunningAll) return;
    this._isRunningAll = !0, this._checks = this._checks.map((s) => ({ ...s, isRunning: !0, result: null }));
    const e = this._checks.map(async (s) => {
      const { data: r, error: a } = await g.runHealthCheck(s.metadata.alias);
      this._checks = this._checks.map(
        (t) => t.metadata.alias === s.metadata.alias ? { ...t, result: a ? null : r ?? null, isRunning: !1 } : t
      ), this._sortChecks();
    });
    await Promise.allSettled(e), this._isRunningAll = !1;
  }
  async _runSingleCheck(e) {
    this._checks = this._checks.map(
      (a) => a.metadata.alias === e ? { ...a, isRunning: !0 } : a
    );
    const { data: s, error: r } = await g.runHealthCheck(e);
    this._checks = this._checks.map(
      (a) => a.metadata.alias === e ? { ...a, result: r ? null : s ?? null, isRunning: !1 } : a
    ), this._sortChecks();
  }
  _sortChecks() {
    this._checks = [...this._checks].sort((e, s) => {
      if (e.isRunning || s.isRunning) return 0;
      const r = e.result?.status, a = s.result?.status;
      if (!r && !a) return e.metadata.sortOrder - s.metadata.sortOrder;
      if (!r) return 1;
      if (!a) return -1;
      const t = _[r] ?? 3, n = _[a] ?? 3;
      return t !== n ? t - n : e.metadata.sortOrder - s.metadata.sortOrder;
    });
  }
  _handleCheckDetail(e) {
    const s = e.detail.alias, r = this._checks.find((a) => a.metadata.alias === s);
    if (!(!r || !f(this, d))) {
      if (!r.result || r.result.affectedCount === 0) {
        r.result || this._runSingleCheck(s);
        return;
      }
      f(this, d).open(this, R, {
        data: {
          alias: r.metadata.alias,
          name: r.metadata.name,
          description: r.metadata.description,
          icon: r.metadata.icon
        }
      });
    }
  }
  _renderHeader() {
    const e = this._checks.some((s) => s.isRunning);
    return i`
      <div class="header">
        <div class="header-text">
          <h2 class="header-title">Health Checks</h2>
          <p class="header-description">
            Monitor your store configuration and identify potential issues.
          </p>
        </div>
        <uui-button
          look="primary"
          color="positive"
          label="Run all health checks"
          ?disabled=${e || this._isLoadingChecks}
          @click=${this._runAllChecks}>
          ${this._isRunningAll ? "Running..." : "Run All Checks"}
        </uui-button>
      </div>
    `;
  }
  _renderChecks() {
    return this._isLoadingChecks ? i`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? i`
        <div class="error-banner">
          <umb-icon name="icon-alert"></umb-icon>
          <span>${this._errorMessage}</span>
        </div>
      ` : this._checks.length === 0 ? i`<p class="hint">No health checks are registered.</p>` : i`
      <div class="checks-grid">
        ${this._checks.map((e) => i`
          <merchello-health-check-card
            .metadata=${e.metadata}
            .result=${e.result}
            ?is-running=${e.isRunning}
            @check-detail=${this._handleCheckDetail}>
          </merchello-health-check-card>
        `)}
      </div>
    `;
  }
  _renderSummary() {
    const e = this._checks.filter((t) => t.result !== null);
    if (e.length === 0) return o;
    const s = e.filter((t) => t.result?.status === "error").length, r = e.filter((t) => t.result?.status === "warning").length, a = e.filter((t) => t.result?.status === "success").length;
    return i`
      <div class="summary-bar">
        ${s > 0 ? i`<span class="summary-badge summary-error">${s} error${s === 1 ? "" : "s"}</span>` : o}
        ${r > 0 ? i`<span class="summary-badge summary-warning">${r} warning${r === 1 ? "" : "s"}</span>` : o}
        ${a > 0 ? i`<span class="summary-badge summary-success">${a} healthy</span>` : o}
      </div>
    `;
  }
  render() {
    return i`
      <div class="dashboard">
        ${this._renderHeader()}
        ${this._renderSummary()}
        ${this._renderChecks()}
      </div>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
l.styles = b`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
    }

    .dashboard {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      max-width: 1200px;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
    }

    .header-text {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .header-title {
      margin: 0;
      font-size: var(--uui-type-h3-size);
      font-weight: 700;
      color: var(--uui-color-text);
    }

    .header-description {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-default-size);
    }

    .summary-bar {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .summary-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-1) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      font-weight: 600;
    }

    .summary-error {
      background: color-mix(in srgb, var(--uui-color-danger) 12%, var(--uui-color-surface));
      color: var(--uui-color-danger);
    }

    .summary-warning {
      background: color-mix(in srgb, var(--uui-color-warning) 12%, var(--uui-color-surface));
      color: var(--merchello-color-warning-status-background, #8a6500);
    }

    .summary-success {
      background: color-mix(in srgb, var(--uui-color-positive) 12%, var(--uui-color-surface));
      color: var(--uui-color-positive);
    }

    .checks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-5);
    }

    .hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      text-align: center;
      padding: var(--uui-size-space-5);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    @media (max-width: 700px) {
      :host {
        padding: var(--uui-size-space-4);
      }

      .checks-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
m([
  h()
], l.prototype, "_checks", 2);
m([
  h()
], l.prototype, "_isLoadingChecks", 2);
m([
  h()
], l.prototype, "_isRunningAll", 2);
m([
  h()
], l.prototype, "_errorMessage", 2);
l = m([
  k("merchello-health-checks-dashboard")
], l);
const T = l;
export {
  l as MerchelloHealthChecksDashboardElement,
  T as default
};
//# sourceMappingURL=health-checks-dashboard.element-4f3TGE5m.js.map
