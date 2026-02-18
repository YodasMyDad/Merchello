import { LitElement as M, html as a, nothing as f, css as P, state as s, customElement as V, query as A } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as L } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as O } from "@umbraco-cms/backoffice/notification";
import { M as $ } from "./merchello-api-B1P1cUX9.js";
import { g as E, c as k } from "./formatting-BoIk_URG.js";
var b = /* @__PURE__ */ ((e) => (e[e.Import = 0] = "Import", e[e.Export = 1] = "Export", e))(b || {}), p = /* @__PURE__ */ ((e) => (e[e.ShopifyStrict = 0] = "ShopifyStrict", e[e.MerchelloExtended = 1] = "MerchelloExtended", e))(p || {}), c = /* @__PURE__ */ ((e) => (e[e.Queued = 0] = "Queued", e[e.Running = 1] = "Running", e[e.Completed = 2] = "Completed", e[e.Failed = 3] = "Failed", e))(c || {}), _ = /* @__PURE__ */ ((e) => (e[e.Info = 0] = "Info", e[e.Warning = 1] = "Warning", e[e.Error = 2] = "Error", e))(_ || {}), D = Object.defineProperty, T = Object.getOwnPropertyDescriptor, U = (e) => {
  throw TypeError(e);
}, n = (e, t, i, r) => {
  for (var l = r > 1 ? void 0 : r ? T(t, i) : t, u = e.length - 1, g; u >= 0; u--)
    (g = e[u]) && (l = (r ? g(t, i, l) : g(l)) || l);
  return r && l && D(t, i, l), l;
}, B = (e, t, i) => t.has(e) || U("Cannot " + i), v = (e, t, i) => (B(e, t, "read from private field"), t.get(e)), C = (e, t, i) => t.has(e) ? U("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), w = (e, t, i, r) => (B(e, t, "write to private field"), t.set(e, i), i), I, y, x;
let o = class extends L(M) {
  constructor() {
    super(), this._runs = [], this._isLoading = !0, this._isRefreshing = !1, this._errorMessage = null, this._directionFilter = "", this._statusFilter = "", this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._expandedRunId = null, this._issuesByRun = {}, this._loadingIssuesRunId = null, this._downloadingRunId = null, C(this, I), C(this, y, null), C(this, x, !1), this.consumeContext(O, (e) => {
      w(this, I, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), w(this, x, !0), this.reload(), w(this, y, setInterval(() => {
      this._runs.some((t) => t.status === c.Queued || t.status === c.Running) && this.reload(!0);
    }, 5e3));
  }
  disconnectedCallback() {
    super.disconnectedCallback(), w(this, x, !1), v(this, y) && (clearInterval(v(this, y)), w(this, y, null));
  }
  async reload(e = !1) {
    e ? this._isRefreshing = !0 : (this._isLoading = !0, this._errorMessage = null);
    const t = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._directionFilter !== "" && (t.direction = parseInt(this._directionFilter, 10)), this._statusFilter !== "" && (t.status = parseInt(this._statusFilter, 10));
    const { data: i, error: r } = await $.getProductSyncRuns(t);
    if (v(this, x)) {
      if (r || !i) {
        this._errorMessage = r?.message ?? "Unable to load run history.", this._isLoading = !1, this._isRefreshing = !1;
        return;
      }
      this._runs = i.items, this._totalItems = i.totalItems, this._totalPages = i.totalPages, this._isLoading = !1, this._isRefreshing = !1, this._expandedRunId && !this._runs.some((l) => l.id === this._expandedRunId) && (this._expandedRunId = null);
    }
  }
  _handleFilterChange() {
    this._page = 1, this.reload();
  }
  _handlePageChange(e) {
    e < 1 || e > this._totalPages || (this._page = e, this.reload());
  }
  _toggleRunDetails(e) {
    if (this._expandedRunId === e) {
      this._expandedRunId = null;
      return;
    }
    this._expandedRunId = e, this._issuesByRun[e] || this._loadIssues(e);
  }
  async _loadIssues(e) {
    this._loadingIssuesRunId = e;
    const t = {
      page: 1,
      pageSize: 200
    }, { data: i, error: r } = await $.getProductSyncRunIssues(e, t);
    if (v(this, x)) {
      if (r || !i) {
        this._issuesByRun = {
          ...this._issuesByRun,
          [e]: []
        }, this._loadingIssuesRunId = null, v(this, I)?.peek("warning", {
          data: {
            headline: "Unable to load issues",
            message: r?.message ?? "Issue details are unavailable for this run."
          }
        });
        return;
      }
      this._issuesByRun = {
        ...this._issuesByRun,
        [e]: i.items
      }, this._loadingIssuesRunId = null;
    }
  }
  async _downloadExport(e) {
    this._downloadingRunId = e.id;
    const { blob: t, fileName: i, error: r } = await $.downloadProductSyncExport(e.id);
    if (this._downloadingRunId = null, r || !t) {
      v(this, I)?.peek("danger", {
        data: {
          headline: "Download failed",
          message: r?.message ?? "Unable to download export file."
        }
      });
      return;
    }
    const l = URL.createObjectURL(t), u = document.createElement("a");
    u.href = l, u.download = i ?? `product-sync-${e.id}.csv`, document.body.appendChild(u), u.addEventListener("click", (g) => g.stopPropagation(), { once: !0 }), u.click(), u.remove(), URL.revokeObjectURL(l);
  }
  _getDirectionLabel(e) {
    return e === b.Import ? "Import" : "Export";
  }
  _getProfileLabel(e) {
    return e === 0 ? "Shopify Strict" : "Merchello Extended";
  }
  _getStatusColor(e) {
    return e === "warning" || e === "positive" || e === "danger" ? e : "default";
  }
  _getSeverityColor(e) {
    return e === _.Error ? "danger" : e === _.Warning ? "warning" : "default";
  }
  _getSeverityLabel(e) {
    return e === _.Error ? "Error" : e === _.Warning ? "Warning" : "Info";
  }
  _renderIssues(e) {
    if (this._loadingIssuesRunId === e)
      return a`<div class="issues-loading"><uui-loader></uui-loader></div>`;
    const t = this._issuesByRun[e] ?? [];
    return t.length === 0 ? a`<p class="issues-empty">No issues were recorded for this run.</p>` : a`
      <div class="issues-table-wrap">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Severity</uui-table-head-cell>
            <uui-table-head-cell>Row</uui-table-head-cell>
            <uui-table-head-cell>Field</uui-table-head-cell>
            <uui-table-head-cell>Message</uui-table-head-cell>
          </uui-table-head>
          ${t.map(
      (i) => a`
              <uui-table-row>
                <uui-table-cell>
                  <uui-tag color=${this._getSeverityColor(i.severity)}>
                    ${this._getSeverityLabel(i.severity)}
                  </uui-tag>
                </uui-table-cell>
                <uui-table-cell>${i.rowNumber ?? "-"}</uui-table-cell>
                <uui-table-cell>${i.field ?? "-"}</uui-table-cell>
                <uui-table-cell>${i.message}</uui-table-cell>
              </uui-table-row>
            `
    )}
        </uui-table>
      </div>
    `;
  }
  _renderTable() {
    return a`
      <div class="table-wrap">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Requested By</uui-table-head-cell>
            <uui-table-head-cell>Direction</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Counters</uui-table-head-cell>
            <uui-table-head-cell>Started</uui-table-head-cell>
            <uui-table-head-cell>Completed</uui-table-head-cell>
            <uui-table-head-cell>Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._runs.map((e) => {
      const t = this._expandedRunId === e.id, i = e.direction === b.Export && e.status === c.Completed, r = this._downloadingRunId === e.id;
      return a`
              <uui-table-row>
                <uui-table-cell>
                  <div class="stack">
                    <strong>${e.requestedByUserName ?? "Unknown"}</strong>
                    <span class="muted">${E(e.dateCreatedUtc)}</span>
                  </div>
                </uui-table-cell>
                <uui-table-cell>
                  <div class="stack">
                    <span>${this._getDirectionLabel(e.direction)}</span>
                    <span class="muted">${this._getProfileLabel(e.profile)}</span>
                  </div>
                </uui-table-cell>
                <uui-table-cell>
                  <uui-tag color=${this._getStatusColor(e.statusCssClass)}>
                    ${e.statusLabel}
                  </uui-tag>
                </uui-table-cell>
                <uui-table-cell>
                  <div class="stack">
                    <span>${e.itemsSucceeded}/${e.itemsProcessed} succeeded</span>
                    <span class="muted">
                      ${e.itemsFailed} failed, ${e.warningCount} warnings, ${e.errorCount} errors
                    </span>
                  </div>
                </uui-table-cell>
                <uui-table-cell>${e.startedAtUtc ? E(e.startedAtUtc) : "-"}</uui-table-cell>
                <uui-table-cell>${e.completedAtUtc ? E(e.completedAtUtc) : "-"}</uui-table-cell>
                <uui-table-cell>
                  <div class="actions">
                    <uui-button
                      compact
                      look="secondary"
                      label=${t ? "Hide Issues" : "View Issues"}
                      @click=${() => this._toggleRunDetails(e.id)}>
                      <uui-icon name=${t ? "icon-navigation-up" : "icon-navigation-down"}></uui-icon>
                    </uui-button>
                    ${i ? a`
                          <uui-button
                            compact
                            look="secondary"
                            label="Download"
                            ?disabled=${r}
                            @click=${() => this._downloadExport(e)}>
                            <uui-icon name=${r ? "icon-hourglass" : "icon-download"}></uui-icon>
                          </uui-button>
                        ` : f}
                  </div>
                </uui-table-cell>
              </uui-table-row>
              ${e.errorMessage ? a`
                    <uui-table-row class="run-error-row">
                      <uui-table-cell colspan="7">
                        <div class="run-error">${e.errorMessage}</div>
                      </uui-table-cell>
                    </uui-table-row>
                  ` : f}
              ${t ? a`
                    <uui-table-row>
                      <uui-table-cell colspan="7">
                        ${this._renderIssues(e.id)}
                      </uui-table-cell>
                    </uui-table-row>
                  ` : f}
            `;
    })}
        </uui-table>
      </div>
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? f : a`
      <div class="pagination">
        <span class="muted">
          Showing ${(this._page - 1) * this._pageSize + 1}
          -
          ${Math.min(this._page * this._pageSize, this._totalItems)}
          of ${this._totalItems}
        </span>
        <div class="actions">
          <uui-button
            compact
            look="secondary"
            label="Previous page"
            ?disabled=${this._page <= 1}
            @click=${() => this._handlePageChange(this._page - 1)}>
            Previous
          </uui-button>
          <span>Page ${this._page} of ${this._totalPages}</span>
          <uui-button
            compact
            look="secondary"
            label="Next page"
            ?disabled=${this._page >= this._totalPages}
            @click=${() => this._handlePageChange(this._page + 1)}>
            Next
          </uui-button>
        </div>
      </div>
    `;
  }
  render() {
    return a`
      <uui-box headline="Run History">
        <div class="toolbar">
          <uui-select
            label="Direction"
            .options=${[
      { name: "All Directions", value: "", selected: this._directionFilter === "" },
      { name: "Imports", value: String(b.Import), selected: this._directionFilter === String(b.Import) },
      { name: "Exports", value: String(b.Export), selected: this._directionFilter === String(b.Export) }
    ]}
            @change=${(e) => {
      this._directionFilter = e.target.value, this._handleFilterChange();
    }}>
          </uui-select>

          <uui-select
            label="Status"
            .options=${[
      { name: "All Statuses", value: "", selected: this._statusFilter === "" },
      { name: "Queued", value: String(c.Queued), selected: this._statusFilter === String(c.Queued) },
      { name: "Running", value: String(c.Running), selected: this._statusFilter === String(c.Running) },
      { name: "Completed", value: String(c.Completed), selected: this._statusFilter === String(c.Completed) },
      { name: "Failed", value: String(c.Failed), selected: this._statusFilter === String(c.Failed) }
    ]}
            @change=${(e) => {
      this._statusFilter = e.target.value, this._handleFilterChange();
    }}>
          </uui-select>

          <uui-button
            look="secondary"
            label="Refresh run history"
            @click=${() => this.reload()}
            ?disabled=${this._isRefreshing}>
            <uui-icon name=${this._isRefreshing ? "icon-hourglass" : "icon-refresh"} slot="icon"></uui-icon>
            Refresh
          </uui-button>
        </div>

        ${this._isLoading ? a`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? a`
                <div class="error">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              ` : this._runs.length === 0 ? a`<p class="empty">No import/export runs found for the selected filters.</p>` : a`${this._renderTable()}${this._renderPagination()}`}
      </uui-box>
    `;
  }
};
I = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
o.styles = P`
    :host {
      display: block;
    }

    .toolbar {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      padding-bottom: var(--uui-size-space-4);
      flex-wrap: wrap;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-5);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .empty {
      color: var(--uui-color-text-alt);
      margin: 0;
      padding: var(--uui-size-space-3) 0;
    }

    .table-wrap {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
    }

    uui-table {
      width: 100%;
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .muted {
      color: var(--uui-color-text-alt);
      font-size: 0.8125rem;
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      flex-wrap: wrap;
    }

    .run-error-row {
      background: var(--uui-color-danger-standalone);
    }

    .run-error {
      color: var(--uui-color-danger-contrast);
      font-size: 0.875rem;
      padding: var(--uui-size-space-2);
    }

    .issues-loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-4);
    }

    .issues-empty {
      color: var(--uui-color-text-alt);
      margin: 0;
      padding: var(--uui-size-space-3) 0;
    }

    .issues-table-wrap {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
    }

    .pagination {
      margin-top: var(--uui-size-space-3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
    }
  `;
n([
  s()
], o.prototype, "_runs", 2);
n([
  s()
], o.prototype, "_isLoading", 2);
n([
  s()
], o.prototype, "_isRefreshing", 2);
n([
  s()
], o.prototype, "_errorMessage", 2);
n([
  s()
], o.prototype, "_directionFilter", 2);
n([
  s()
], o.prototype, "_statusFilter", 2);
n([
  s()
], o.prototype, "_page", 2);
n([
  s()
], o.prototype, "_pageSize", 2);
n([
  s()
], o.prototype, "_totalItems", 2);
n([
  s()
], o.prototype, "_totalPages", 2);
n([
  s()
], o.prototype, "_expandedRunId", 2);
n([
  s()
], o.prototype, "_issuesByRun", 2);
n([
  s()
], o.prototype, "_loadingIssuesRunId", 2);
n([
  s()
], o.prototype, "_downloadingRunId", 2);
o = n([
  V("merchello-product-sync-runs-list")
], o);
var q = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, W = (e) => {
  throw TypeError(e);
}, h = (e, t, i, r) => {
  for (var l = r > 1 ? void 0 : r ? Q(t, i) : t, u = e.length - 1, g; u >= 0; u--)
    (g = e[u]) && (l = (r ? g(t, i, l) : g(l)) || l);
  return r && l && q(t, i, l), l;
}, N = (e, t, i) => t.has(e) || W("Cannot " + i), S = (e, t, i) => (N(e, t, "read from private field"), t.get(e)), z = (e, t, i) => t.has(e) ? W("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), F = (e, t, i, r) => (N(e, t, "write to private field"), t.set(e, i), i), R, m;
let d = class extends L(M) {
  constructor() {
    super(), this._importProfile = p.ShopifyStrict, this._exportProfile = p.ShopifyStrict, this._continueOnImageFailure = !1, this._selectedFile = null, this._validationResult = null, this._validationError = null, this._isValidating = !1, this._isStartingImport = !1, this._isStartingExport = !1, z(this, R), z(this, m, !1), this.consumeContext(O, (e) => {
      F(this, R, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), F(this, m, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), F(this, m, !1);
  }
  _notify(e, t, i) {
    S(this, R)?.peek(e, {
      data: {
        headline: t,
        message: i
      }
    });
  }
  _handleFileChange(e) {
    const t = e.target;
    this._selectedFile = t.files?.[0] ?? null, this._validationResult = null, this._validationError = null;
  }
  _formatFileSize(e) {
    if (e < 1024)
      return `${e} B`;
    const t = e / 1024;
    return t < 1024 ? `${k(t, 1)} KB` : `${k(t / 1024, 1)} MB`;
  }
  async _validateImport() {
    if (!this._selectedFile) {
      this._validationError = "Select a CSV file before validating.";
      return;
    }
    this._isValidating = !0, this._validationError = null, this._validationResult = null;
    const { data: e, error: t } = await $.validateProductImport(this._selectedFile, {
      profile: this._importProfile,
      maxIssues: null
    });
    if (S(this, m)) {
      if (this._isValidating = !1, t || !e) {
        this._validationError = t?.message ?? "Validation failed.";
        return;
      }
      if (this._validationResult = e, e.errorCount > 0) {
        this._notify(
          "warning",
          "Validation completed with errors",
          `${e.errorCount} error(s) found. Fix errors before starting import.`
        );
        return;
      }
      this._notify(
        "positive",
        "Validation passed",
        `Validated ${e.rowCount} row(s) across ${e.distinctHandleCount} handle(s).`
      );
    }
  }
  async _startImport() {
    if (!this._selectedFile) {
      this._notify("warning", "No file selected", "Select a CSV file before starting import.");
      return;
    }
    if (!this._validationResult) {
      this._notify("warning", "Validate first", "Run validation before starting the import.");
      return;
    }
    if (this._validationResult.errorCount > 0) {
      this._notify("warning", "Validation errors remain", "Fix validation errors before starting import.");
      return;
    }
    this._isStartingImport = !0;
    const { data: e, error: t } = await $.startProductImport(this._selectedFile, {
      profile: this._importProfile,
      continueOnImageFailure: this._continueOnImageFailure,
      maxIssues: null
    });
    if (S(this, m)) {
      if (this._isStartingImport = !1, t || !e) {
        this._notify("danger", "Import queue failed", t?.message ?? "Unable to start import run.");
        return;
      }
      this._notify(
        "positive",
        "Import queued",
        `Import run ${e.id} has been queued and will be processed in the background.`
      ), await this._runsList?.reload();
    }
  }
  async _startExport() {
    this._isStartingExport = !0;
    const { data: e, error: t } = await $.startProductExport({
      profile: this._exportProfile
    });
    if (S(this, m)) {
      if (this._isStartingExport = !1, t || !e) {
        this._notify("danger", "Export queue failed", t?.message ?? "Unable to start export run.");
        return;
      }
      this._notify(
        "positive",
        "Export queued",
        `Export run ${e.id} has been queued and will be processed in the background.`
      ), await this._runsList?.reload();
    }
  }
  _getSeverityLabel(e) {
    return e === _.Error ? "Error" : e === _.Warning ? "Warning" : "Info";
  }
  _getSeverityColor(e) {
    return e === _.Error ? "danger" : e === _.Warning ? "warning" : "default";
  }
  _renderValidationBlock() {
    return this._validationError ? a`
        <div class="error-banner">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._validationError}</span>
        </div>
      ` : this._validationResult ? a`
      <uui-box headline="Validation Results" class="section">
        <div class="validation-summary">
          <span>${this._validationResult.rowCount} row(s)</span>
          <span>${this._validationResult.distinctHandleCount} handle(s)</span>
          <span>${this._validationResult.warningCount} warning(s)</span>
          <span>${this._validationResult.errorCount} error(s)</span>
        </div>

        ${this._validationResult.issues.length > 0 ? a`
              <div class="table-wrap">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Severity</uui-table-head-cell>
                    <uui-table-head-cell>Row</uui-table-head-cell>
                    <uui-table-head-cell>Field</uui-table-head-cell>
                    <uui-table-head-cell>Message</uui-table-head-cell>
                  </uui-table-head>
                  ${this._validationResult.issues.map(
      (e) => a`
                      <uui-table-row>
                        <uui-table-cell>
                          <uui-tag color=${this._getSeverityColor(e.severity)}>
                            ${this._getSeverityLabel(e.severity)}
                          </uui-tag>
                        </uui-table-cell>
                        <uui-table-cell>${e.rowNumber ?? "-"}</uui-table-cell>
                        <uui-table-cell>${e.field ?? "-"}</uui-table-cell>
                        <uui-table-cell>${e.message}</uui-table-cell>
                      </uui-table-row>
                    `
    )}
                </uui-table>
              </div>
            ` : a`<p class="helper-text">No issues found.</p>`}
      </uui-box>
    ` : f;
  }
  render() {
    const e = this._selectedFile !== null && this._validationResult !== null && this._validationResult.errorCount === 0 && !this._isValidating && !this._isStartingImport;
    return a`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container">
          <uui-box headline="Import Products" class="section">
            <div class="form-grid">
              <umb-property-layout
                label="Profile"
                description="Shopify Strict is Shopify-compatible. Merchello Extended includes custom columns for round-trips.">
                <uui-select
                  slot="editor"
                  label="Import profile"
                  .options=${[
      {
        name: "Shopify Strict",
        value: String(p.ShopifyStrict),
        selected: this._importProfile === p.ShopifyStrict
      },
      {
        name: "Merchello Extended",
        value: String(p.MerchelloExtended),
        selected: this._importProfile === p.MerchelloExtended
      }
    ]}
                  @change=${(t) => {
      this._importProfile = parseInt(t.target.value, 10), this._validationResult = null, this._validationError = null;
    }}>
                </uui-select>
              </umb-property-layout>

              <umb-property-layout
                label="CSV File"
                description="Upload a Shopify-compatible CSV file. Validation runs before import can start.">
                <input
                  slot="editor"
                  class="file-input"
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="CSV file upload"
                  @change=${this._handleFileChange} />
                ${this._selectedFile ? a`<p class="helper-text">${this._selectedFile.name} (${this._formatFileSize(this._selectedFile.size)})</p>` : f}
              </umb-property-layout>

              <umb-property-layout
                label="Options"
                description="Continue importing products when image downloads fail. Failures are logged as warnings.">
                <uui-toggle
                  slot="editor"
                  label="Continue on image failure"
                  .checked=${this._continueOnImageFailure}
                  @change=${(t) => {
      this._continueOnImageFailure = t.target.checked;
    }}>
                </uui-toggle>
              </umb-property-layout>
            </div>

            <div class="actions">
              <uui-button
                look="secondary"
                label="Validate import file"
                ?disabled=${!this._selectedFile || this._isValidating || this._isStartingImport}
                @click=${this._validateImport}>
                <uui-icon name=${this._isValidating ? "icon-hourglass" : "icon-search"} slot="icon"></uui-icon>
                ${this._isValidating ? "Validating..." : "Validate"}
              </uui-button>
              <uui-button
                look="primary"
                color="positive"
                label="Start import"
                ?disabled=${!e}
                @click=${this._startImport}>
                <uui-icon name=${this._isStartingImport ? "icon-hourglass" : "icon-cloud-upload"} slot="icon"></uui-icon>
                ${this._isStartingImport ? "Starting..." : "Start Import"}
              </uui-button>
            </div>

            ${this._selectedFile && !this._validationResult ? a`<p class="helper-text action-hint">Validate this file before starting import.</p>` : f}
            ${this._validationResult && this._validationResult.errorCount > 0 ? a`<p class="helper-text action-hint error-text">Resolve validation errors before starting import.</p>` : f}
          </uui-box>

          ${this._renderValidationBlock()}

          <uui-box headline="Export Products" class="section">
            <div class="form-grid">
              <umb-property-layout
                label="Profile"
                description="Choose Shopify Strict for Shopify import compatibility, or Merchello Extended for full Merchello metadata.">
                <uui-select
                  slot="editor"
                  label="Export profile"
                  .options=${[
      {
        name: "Shopify Strict",
        value: String(p.ShopifyStrict),
        selected: this._exportProfile === p.ShopifyStrict
      },
      {
        name: "Merchello Extended",
        value: String(p.MerchelloExtended),
        selected: this._exportProfile === p.MerchelloExtended
      }
    ]}
                  @change=${(t) => {
      this._exportProfile = parseInt(t.target.value, 10);
    }}>
                </uui-select>
              </umb-property-layout>
            </div>

            <div class="actions">
              <uui-button
                look="primary"
                color="positive"
                label="Start export"
                ?disabled=${this._isStartingExport}
                @click=${this._startExport}>
                <uui-icon name=${this._isStartingExport ? "icon-hourglass" : "icon-page-up"} slot="icon"></uui-icon>
                ${this._isStartingExport ? "Starting..." : "Start Export"}
              </uui-button>
            </div>
          </uui-box>

          <merchello-product-sync-runs-list></merchello-product-sync-runs-list>
        </div>
      </umb-body-layout>
    `;
  }
};
R = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
d.styles = P`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .section {
      margin: 0;
    }

    .form-grid {
      display: grid;
      gap: var(--uui-size-space-4);
    }

    .file-input {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    .helper-text {
      margin: var(--uui-size-space-2) 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.8125rem;
    }

    .actions {
      margin-top: var(--uui-size-space-4);
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .validation-summary {
      display: flex;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
      margin-bottom: var(--uui-size-space-3);
      font-weight: 600;
    }

    .table-wrap {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
    }

    uui-table {
      width: 100%;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .action-hint {
      margin-top: var(--uui-size-space-3);
    }

    .error-text {
      color: var(--uui-color-danger-emphasis);
    }
  `;
h([
  s()
], d.prototype, "_importProfile", 2);
h([
  s()
], d.prototype, "_exportProfile", 2);
h([
  s()
], d.prototype, "_continueOnImageFailure", 2);
h([
  s()
], d.prototype, "_selectedFile", 2);
h([
  s()
], d.prototype, "_validationResult", 2);
h([
  s()
], d.prototype, "_validationError", 2);
h([
  s()
], d.prototype, "_isValidating", 2);
h([
  s()
], d.prototype, "_isStartingImport", 2);
h([
  s()
], d.prototype, "_isStartingExport", 2);
h([
  A("merchello-product-sync-runs-list")
], d.prototype, "_runsList", 2);
d = h([
  V("merchello-product-import-export-page")
], d);
const J = d;
export {
  d as MerchelloProductImportExportPageElement,
  J as default
};
//# sourceMappingURL=product-import-export-page.element-Cv0weukr.js.map
