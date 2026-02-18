import { LitElement as M, html as s, nothing as x, css as P, state as r, customElement as z, query as D } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as L } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as V } from "@umbraco-cms/backoffice/notification";
import { M as w } from "./merchello-api-Dp_zU_yi.js";
import { g as E } from "./formatting-B_f6AiQh.js";
var b = /* @__PURE__ */ ((e) => (e[e.Import = 0] = "Import", e[e.Export = 1] = "Export", e))(b || {}), c = /* @__PURE__ */ ((e) => (e[e.ShopifyStrict = 0] = "ShopifyStrict", e[e.MerchelloExtended = 1] = "MerchelloExtended", e))(c || {}), p = /* @__PURE__ */ ((e) => (e[e.Queued = 0] = "Queued", e[e.Running = 1] = "Running", e[e.Completed = 2] = "Completed", e[e.Failed = 3] = "Failed", e))(p || {}), g = /* @__PURE__ */ ((e) => (e[e.Info = 0] = "Info", e[e.Warning = 1] = "Warning", e[e.Error = 2] = "Error", e))(g || {}), N = Object.defineProperty, A = Object.getOwnPropertyDescriptor, O = (e) => {
  throw TypeError(e);
}, n = (e, t, i, a) => {
  for (var l = a > 1 ? void 0 : a ? A(t, i) : t, d = e.length - 1, _; d >= 0; d--)
    (_ = e[d]) && (l = (a ? _(t, i, l) : _(l)) || l);
  return a && l && N(t, i, l), l;
}, U = (e, t, i) => t.has(e) || O("Cannot " + i), m = (e, t, i) => (U(e, t, "read from private field"), t.get(e)), C = (e, t, i) => t.has(e) ? O("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), $ = (e, t, i, a) => (U(e, t, "write to private field"), t.set(e, i), i), I, v, y;
let o = class extends L(M) {
  constructor() {
    super(), this._runs = [], this._isLoading = !0, this._isRefreshing = !1, this._errorMessage = null, this._directionFilter = "", this._statusFilter = "", this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._expandedRunId = null, this._issuesByRun = {}, this._loadingIssuesRunId = null, this._downloadingRunId = null, C(this, I), C(this, v, null), C(this, y, !1), this.consumeContext(V, (e) => {
      $(this, I, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), $(this, y, !0), this.reload(), $(this, v, setInterval(() => {
      this._runs.some((t) => t.status === p.Running) && this.reload(!0);
    }, 5e3));
  }
  disconnectedCallback() {
    super.disconnectedCallback(), $(this, y, !1), m(this, v) && (clearInterval(m(this, v)), $(this, v, null));
  }
  async reload(e = !1) {
    e ? this._isRefreshing = !0 : (this._isLoading = !0, this._errorMessage = null);
    const t = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._directionFilter !== "" && (t.direction = parseInt(this._directionFilter, 10)), this._statusFilter !== "" && (t.status = parseInt(this._statusFilter, 10));
    const { data: i, error: a } = await w.getProductSyncRuns(t);
    if (m(this, y)) {
      if (a || !i) {
        this._errorMessage = a?.message ?? "Unable to load run history.", this._isLoading = !1, this._isRefreshing = !1;
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
    }, { data: i, error: a } = await w.getProductSyncRunIssues(e, t);
    if (m(this, y)) {
      if (a || !i) {
        this._issuesByRun = {
          ...this._issuesByRun,
          [e]: []
        }, this._loadingIssuesRunId = null, m(this, I)?.peek("warning", {
          data: {
            headline: "Unable to load issues",
            message: a?.message ?? "Issue details are unavailable for this run."
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
    const { blob: t, fileName: i, error: a } = await w.downloadProductSyncExport(e.id);
    if (this._downloadingRunId = null, a || !t) {
      m(this, I)?.peek("danger", {
        data: {
          headline: "Download failed",
          message: a?.message ?? "Unable to download export file."
        }
      });
      return;
    }
    const l = URL.createObjectURL(t), d = document.createElement("a");
    d.href = l, d.download = i ?? `product-sync-${e.id}.csv`, document.body.appendChild(d), d.click(), d.remove(), URL.revokeObjectURL(l);
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
    return e === g.Error ? "danger" : e === g.Warning ? "warning" : "default";
  }
  _getSeverityLabel(e) {
    return e === g.Error ? "Error" : e === g.Warning ? "Warning" : "Info";
  }
  _renderIssues(e) {
    if (this._loadingIssuesRunId === e)
      return s`<div class="issues-loading"><uui-loader></uui-loader></div>`;
    const t = this._issuesByRun[e] ?? [];
    return t.length === 0 ? s`<p class="issues-empty">No issues were recorded for this run.</p>` : s`
      <div class="issues-table-wrap">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Severity</uui-table-head-cell>
            <uui-table-head-cell>Row</uui-table-head-cell>
            <uui-table-head-cell>Field</uui-table-head-cell>
            <uui-table-head-cell>Message</uui-table-head-cell>
          </uui-table-head>
          ${t.map(
      (i) => s`
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
    return s`
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
      const t = this._expandedRunId === e.id, i = e.direction === b.Export && e.status === p.Completed, a = this._downloadingRunId === e.id;
      return s`
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
                    ${i ? s`
                          <uui-button
                            compact
                            look="secondary"
                            label="Download"
                            ?disabled=${a}
                            @click=${() => this._downloadExport(e)}>
                            <uui-icon name=${a ? "icon-hourglass" : "icon-download"}></uui-icon>
                          </uui-button>
                        ` : x}
                  </div>
                </uui-table-cell>
              </uui-table-row>
              ${e.errorMessage ? s`
                    <uui-table-row class="run-error-row">
                      <uui-table-cell colspan="7">
                        <div class="run-error">${e.errorMessage}</div>
                      </uui-table-cell>
                    </uui-table-row>
                  ` : x}
              ${t ? s`
                    <uui-table-row>
                      <uui-table-cell colspan="7">
                        ${this._renderIssues(e.id)}
                      </uui-table-cell>
                    </uui-table-row>
                  ` : x}
            `;
    })}
        </uui-table>
      </div>
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? x : s`
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
            ?disabled=${this._page <= 1}
            @click=${() => this._handlePageChange(this._page - 1)}>
            Previous
          </uui-button>
          <span>Page ${this._page} of ${this._totalPages}</span>
          <uui-button
            compact
            look="secondary"
            ?disabled=${this._page >= this._totalPages}
            @click=${() => this._handlePageChange(this._page + 1)}>
            Next
          </uui-button>
        </div>
      </div>
    `;
  }
  render() {
    return s`
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
      { name: "Queued", value: String(p.Queued), selected: this._statusFilter === String(p.Queued) },
      { name: "Running", value: String(p.Running), selected: this._statusFilter === String(p.Running) },
      { name: "Completed", value: String(p.Completed), selected: this._statusFilter === String(p.Completed) },
      { name: "Failed", value: String(p.Failed), selected: this._statusFilter === String(p.Failed) }
    ]}
            @change=${(e) => {
      this._statusFilter = e.target.value, this._handleFilterChange();
    }}>
          </uui-select>

          <uui-button look="secondary" @click=${() => this.reload()} ?disabled=${this._isRefreshing}>
            <uui-icon name=${this._isRefreshing ? "icon-hourglass" : "icon-refresh"} slot="icon"></uui-icon>
            Refresh
          </uui-button>
        </div>

        ${this._isLoading ? s`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? s`<div class="error">${this._errorMessage}</div>` : this._runs.length === 0 ? s`<p class="empty">No import/export runs found for the selected filters.</p>` : s`${this._renderTable()}${this._renderPagination()}`}
      </uui-box>
    `;
  }
};
I = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
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
  r()
], o.prototype, "_runs", 2);
n([
  r()
], o.prototype, "_isLoading", 2);
n([
  r()
], o.prototype, "_isRefreshing", 2);
n([
  r()
], o.prototype, "_errorMessage", 2);
n([
  r()
], o.prototype, "_directionFilter", 2);
n([
  r()
], o.prototype, "_statusFilter", 2);
n([
  r()
], o.prototype, "_page", 2);
n([
  r()
], o.prototype, "_pageSize", 2);
n([
  r()
], o.prototype, "_totalItems", 2);
n([
  r()
], o.prototype, "_totalPages", 2);
n([
  r()
], o.prototype, "_expandedRunId", 2);
n([
  r()
], o.prototype, "_issuesByRun", 2);
n([
  r()
], o.prototype, "_loadingIssuesRunId", 2);
n([
  r()
], o.prototype, "_downloadingRunId", 2);
o = n([
  z("merchello-product-sync-runs-list")
], o);
var T = Object.defineProperty, q = Object.getOwnPropertyDescriptor, W = (e) => {
  throw TypeError(e);
}, h = (e, t, i, a) => {
  for (var l = a > 1 ? void 0 : a ? q(t, i) : t, d = e.length - 1, _; d >= 0; d--)
    (_ = e[d]) && (l = (a ? _(t, i, l) : _(l)) || l);
  return a && l && T(t, i, l), l;
}, B = (e, t, i) => t.has(e) || W("Cannot " + i), S = (e, t, i) => (B(e, t, "read from private field"), t.get(e)), k = (e, t, i) => t.has(e) ? W("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), F = (e, t, i, a) => (B(e, t, "write to private field"), t.set(e, i), i), R, f;
let u = class extends L(M) {
  constructor() {
    super(), this._importProfile = c.ShopifyStrict, this._exportProfile = c.ShopifyStrict, this._continueOnImageFailure = !1, this._selectedFile = null, this._validationResult = null, this._validationError = null, this._isValidating = !1, this._isStartingImport = !1, this._isStartingExport = !1, k(this, R), k(this, f, !1), this.consumeContext(V, (e) => {
      F(this, R, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), F(this, f, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), F(this, f, !1);
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
  async _validateImport() {
    if (!this._selectedFile) {
      this._validationError = "Select a CSV file before validating.";
      return;
    }
    this._isValidating = !0, this._validationError = null, this._validationResult = null;
    const { data: e, error: t } = await w.validateProductImport(this._selectedFile, {
      profile: this._importProfile,
      maxIssues: null
    });
    if (S(this, f)) {
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
    const { data: e, error: t } = await w.startProductImport(this._selectedFile, {
      profile: this._importProfile,
      continueOnImageFailure: this._continueOnImageFailure,
      maxIssues: null
    });
    if (S(this, f)) {
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
    const { data: e, error: t } = await w.startProductExport({
      profile: this._exportProfile
    });
    if (S(this, f)) {
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
    return e === g.Error ? "Error" : e === g.Warning ? "Warning" : "Info";
  }
  _getSeverityColor(e) {
    return e === g.Error ? "danger" : e === g.Warning ? "warning" : "default";
  }
  _renderValidationBlock() {
    return this._validationError ? s`<div class="error-banner">${this._validationError}</div>` : this._validationResult ? s`
      <uui-box headline="Validation Results" class="section">
        <div class="validation-summary">
          <span>${this._validationResult.rowCount} row(s)</span>
          <span>${this._validationResult.distinctHandleCount} handle(s)</span>
          <span>${this._validationResult.warningCount} warning(s)</span>
          <span>${this._validationResult.errorCount} error(s)</span>
        </div>

        ${this._validationResult.issues.length > 0 ? s`
              <div class="table-wrap">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Severity</uui-table-head-cell>
                    <uui-table-head-cell>Row</uui-table-head-cell>
                    <uui-table-head-cell>Field</uui-table-head-cell>
                    <uui-table-head-cell>Message</uui-table-head-cell>
                  </uui-table-head>
                  ${this._validationResult.issues.map(
      (e) => s`
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
            ` : s`<p class="helper-text">No issues found.</p>`}
      </uui-box>
    ` : x;
  }
  render() {
    const e = this._selectedFile !== null && this._validationResult !== null && this._validationResult.errorCount === 0 && !this._isStartingImport;
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container">
          <uui-box headline="Import Products" class="section">
            <div class="form-grid">
              <umb-property-layout
                label="Profile"
                description="Shopify Strict is Shopify-compatible. Merchello Extended includes custom columns for round-trips.">
                <uui-select
                  slot="editor"
                  .options=${[
      {
        name: "Shopify Strict",
        value: String(c.ShopifyStrict),
        selected: this._importProfile === c.ShopifyStrict
      },
      {
        name: "Merchello Extended",
        value: String(c.MerchelloExtended),
        selected: this._importProfile === c.MerchelloExtended
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
                  @change=${this._handleFileChange} />
                ${this._selectedFile ? s`<p class="helper-text">${this._selectedFile.name}</p>` : x}
              </umb-property-layout>

              <umb-property-layout
                label="Options"
                description="Continue importing products when image downloads fail. Failures are logged as warnings.">
                <uui-toggle
                  slot="editor"
                  .checked=${this._continueOnImageFailure}
                  @change=${() => {
      this._continueOnImageFailure = !this._continueOnImageFailure;
    }}>
                </uui-toggle>
              </umb-property-layout>
            </div>

            <div class="actions">
              <uui-button
                look="secondary"
                ?disabled=${!this._selectedFile || this._isValidating || this._isStartingImport}
                @click=${this._validateImport}>
                <uui-icon name=${this._isValidating ? "icon-hourglass" : "icon-search"} slot="icon"></uui-icon>
                ${this._isValidating ? "Validating..." : "Validate"}
              </uui-button>
              <uui-button
                look="primary"
                color="positive"
                ?disabled=${!e}
                @click=${this._startImport}>
                <uui-icon name=${this._isStartingImport ? "icon-hourglass" : "icon-cloud-upload"} slot="icon"></uui-icon>
                ${this._isStartingImport ? "Starting..." : "Start Import"}
              </uui-button>
            </div>
          </uui-box>

          ${this._renderValidationBlock()}

          <uui-box headline="Export Products" class="section">
            <div class="form-grid">
              <umb-property-layout
                label="Profile"
                description="Choose Shopify Strict for Shopify import compatibility, or Merchello Extended for full Merchello metadata.">
                <uui-select
                  slot="editor"
                  .options=${[
      {
        name: "Shopify Strict",
        value: String(c.ShopifyStrict),
        selected: this._exportProfile === c.ShopifyStrict
      },
      {
        name: "Merchello Extended",
        value: String(c.MerchelloExtended),
        selected: this._exportProfile === c.MerchelloExtended
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
f = /* @__PURE__ */ new WeakMap();
u.styles = P`
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
      padding: var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }
  `;
h([
  r()
], u.prototype, "_importProfile", 2);
h([
  r()
], u.prototype, "_exportProfile", 2);
h([
  r()
], u.prototype, "_continueOnImageFailure", 2);
h([
  r()
], u.prototype, "_selectedFile", 2);
h([
  r()
], u.prototype, "_validationResult", 2);
h([
  r()
], u.prototype, "_validationError", 2);
h([
  r()
], u.prototype, "_isValidating", 2);
h([
  r()
], u.prototype, "_isStartingImport", 2);
h([
  r()
], u.prototype, "_isStartingExport", 2);
h([
  D("merchello-product-sync-runs-list")
], u.prototype, "_runsList", 2);
u = h([
  z("merchello-product-import-export-page")
], u);
const J = u;
export {
  u as MerchelloProductImportExportPageElement,
  J as default
};
//# sourceMappingURL=product-import-export-page.element-D94no5DI.js.map
