import { LitElement as y, nothing as c, html as i, css as b, property as f, customElement as k, state as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as z, UMB_MODAL_MANAGER_CONTEXT as $ } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-B76CV0sD.js";
const R = new z("Merchello.HealthCheck.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var M = Object.defineProperty, O = Object.getOwnPropertyDescriptor, g = (e, r, s, a) => {
  for (var t = a > 1 ? void 0 : a ? O(r, s) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (a ? o(r, s, t) : o(t)) || t);
  return a && t && M(r, s, t), t;
};
let u = class extends x(y) {
  constructor() {
    super(...arguments), this.metadata = null, this.result = null, this.isRunning = !1;
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
    if (!this.metadata) return c;
    const e = this.result !== null, r = this._getStatusColor();
    return i`
      <button
        class="card"
        style="--status-color: ${r}"
        @click=${this._onClick}
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
                ${this.result.affectedCount > 0 ? i`<span class="affected-count">${this.result.affectedCount}</span>` : c}
              </div>
            ` : c}

      </button>
    `;
  }
};
u.styles = b`
    :host {
      display: block;
      height: 100%;
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
      height: 100%;
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

    uui-loader-circle {
      font-size: 20px;
    }
  `;
g([
  f({ type: Object })
], u.prototype, "metadata", 2);
g([
  f({ type: Object })
], u.prototype, "result", 2);
g([
  f({ type: Boolean, attribute: "is-running" })
], u.prototype, "isRunning", 2);
u = g([
  k("merchello-health-check-card")
], u);
var A = Object.defineProperty, E = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, h = (e, r, s, a) => {
  for (var t = a > 1 ? void 0 : a ? E(r, s) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (a ? o(r, s, t) : o(t)) || t);
  return a && t && A(r, s, t), t;
}, w = (e, r, s) => r.has(e) || C("Cannot " + s), v = (e, r, s) => (w(e, r, "read from private field"), r.get(e)), S = (e, r, s) => r.has(e) ? C("Cannot add the same private member more than once") : r instanceof WeakSet ? r.add(e) : r.set(e, s), H = (e, r, s, a) => (w(e, r, "write to private field"), r.set(e, s), s), d;
const _ = {
  error: 0,
  warning: 1,
  success: 2
};
let l = class extends x(y) {
  constructor() {
    super(...arguments), this._checks = [], this._isLoadingChecks = !0, this._isRunningAll = !1, this._errorMessage = null, S(this, d);
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext($, (e) => {
      H(this, d, e);
    }), this._loadAvailableChecks();
  }
  async _loadAvailableChecks() {
    this._isLoadingChecks = !0, this._errorMessage = null;
    const { data: e, error: r } = await m.getHealthChecks();
    if (this._isLoadingChecks = !1, r || !e) {
      this._errorMessage = r?.message ?? "Failed to load health checks.";
      return;
    }
    this._checks = e.sort((s, a) => s.sortOrder - a.sortOrder || s.name.localeCompare(a.name)).map((s) => ({ metadata: s, result: null, isRunning: !1 }));
  }
  async _runAllChecks() {
    if (this._isRunningAll) return;
    this._isRunningAll = !0, this._checks = this._checks.map((r) => ({ ...r, isRunning: !0, result: null }));
    const e = this._checks.map(async (r) => {
      const { data: s, error: a } = await m.runHealthCheck(r.metadata.alias);
      this._checks = this._checks.map(
        (t) => t.metadata.alias === r.metadata.alias ? { ...t, result: a ? null : s ?? null, isRunning: !1 } : t
      ), this._sortChecks();
    });
    await Promise.allSettled(e), this._isRunningAll = !1;
  }
  async _runSingleCheck(e) {
    this._checks = this._checks.map(
      (a) => a.metadata.alias === e ? { ...a, isRunning: !0 } : a
    );
    const { data: r, error: s } = await m.runHealthCheck(e);
    this._checks = this._checks.map(
      (a) => a.metadata.alias === e ? { ...a, result: s ? null : r ?? null, isRunning: !1 } : a
    ), this._sortChecks();
  }
  _sortChecks() {
    this._checks = [...this._checks].sort((e, r) => {
      if (e.isRunning || r.isRunning) return 0;
      const s = e.result?.status, a = r.result?.status;
      if (!s && !a) return e.metadata.sortOrder - r.metadata.sortOrder;
      if (!s) return 1;
      if (!a) return -1;
      const t = _[s] ?? 3, n = _[a] ?? 3;
      return t !== n ? t - n : e.metadata.sortOrder - r.metadata.sortOrder;
    });
  }
  _handleCheckDetail(e) {
    const r = e.detail.alias, s = this._checks.find((a) => a.metadata.alias === r);
    if (!(!s || !v(this, d))) {
      if (!s.result || s.result.affectedCount === 0) {
        s.result || this._runSingleCheck(r);
        return;
      }
      v(this, d).open(this, R, {
        data: {
          alias: s.metadata.alias,
          name: s.metadata.name,
          description: s.metadata.description,
          icon: s.metadata.icon
        }
      });
    }
  }
  _renderHeader() {
    const e = this._checks.some((r) => r.isRunning);
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
    if (e.length === 0) return c;
    const r = e.filter((t) => t.result?.status === "error").length, s = e.filter((t) => t.result?.status === "warning").length, a = e.filter((t) => t.result?.status === "success").length;
    return i`
      <div class="summary-bar">
        ${r > 0 ? i`<span class="summary-badge summary-error">${r} error${r === 1 ? "" : "s"}</span>` : c}
        ${s > 0 ? i`<span class="summary-badge summary-warning">${s} warning${s === 1 ? "" : "s"}</span>` : c}
        ${a > 0 ? i`<span class="summary-badge summary-success">${a} healthy</span>` : c}
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
h([
  p()
], l.prototype, "_checks", 2);
h([
  p()
], l.prototype, "_isLoadingChecks", 2);
h([
  p()
], l.prototype, "_isRunningAll", 2);
h([
  p()
], l.prototype, "_errorMessage", 2);
l = h([
  k("merchello-health-checks-dashboard")
], l);
const T = l;
export {
  l as MerchelloHealthChecksDashboardElement,
  T as default
};
//# sourceMappingURL=health-checks-dashboard.element-B74AtvBy.js.map
