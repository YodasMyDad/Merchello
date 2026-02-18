import { LitElement, css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatDateTime } from "@shared/utils/formatting.js";
import {
  ProductSyncDirection,
  ProductSyncRunStatus,
  ProductSyncIssueSeverity,
  type ProductSyncIssueDto,
  type ProductSyncIssueQueryParams,
  type ProductSyncRunDto,
  type ProductSyncRunQueryParams,
} from "@product-import-export/types/product-import-export.types.js";

@customElement("merchello-product-sync-runs-list")
export class MerchelloProductSyncRunsListElement extends UmbElementMixin(LitElement) {
  @state() private _runs: ProductSyncRunDto[] = [];
  @state() private _isLoading = true;
  @state() private _isRefreshing = false;
  @state() private _errorMessage: string | null = null;

  @state() private _directionFilter = "";
  @state() private _statusFilter = "";

  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;

  @state() private _expandedRunId: string | null = null;
  @state() private _issuesByRun: Record<string, ProductSyncIssueDto[]> = {};
  @state() private _loadingIssuesRunId: string | null = null;
  @state() private _downloadingRunId: string | null = null;

  #notificationContext?: UmbNotificationContext;
  #pollTimer: ReturnType<typeof setInterval> | null = null;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this.reload();

    this.#pollTimer = setInterval(() => {
      const hasActiveRun = this._runs.some((run) =>
        run.status === ProductSyncRunStatus.Queued || run.status === ProductSyncRunStatus.Running);
      if (hasActiveRun) {
        this.reload(true);
      }
    }, 5000);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;

    if (this.#pollTimer) {
      clearInterval(this.#pollTimer);
      this.#pollTimer = null;
    }
  }

  public async reload(silent = false): Promise<void> {
    if (silent) {
      this._isRefreshing = true;
    } else {
      this._isLoading = true;
      this._errorMessage = null;
    }

    const params: ProductSyncRunQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
    };

    if (this._directionFilter !== "") {
      params.direction = parseInt(this._directionFilter, 10) as ProductSyncDirection;
    }
    if (this._statusFilter !== "") {
      params.status = parseInt(this._statusFilter, 10) as ProductSyncRunStatus;
    }

    const { data, error } = await MerchelloApi.getProductSyncRuns(params);
    if (!this.#isConnected) return;

    if (error || !data) {
      this._errorMessage = error?.message ?? "Unable to load run history.";
      this._isLoading = false;
      this._isRefreshing = false;
      return;
    }

    this._runs = data.items;
    this._totalItems = data.totalItems;
    this._totalPages = data.totalPages;
    this._isLoading = false;
    this._isRefreshing = false;

    if (this._expandedRunId && !this._runs.some((run) => run.id === this._expandedRunId)) {
      this._expandedRunId = null;
    }
  }

  private _handleFilterChange(): void {
    this._page = 1;
    this.reload();
  }

  private _handlePageChange(page: number): void {
    if (page < 1 || page > this._totalPages) {
      return;
    }

    this._page = page;
    this.reload();
  }

  private _toggleRunDetails(runId: string): void {
    if (this._expandedRunId === runId) {
      this._expandedRunId = null;
      return;
    }

    this._expandedRunId = runId;

    if (!this._issuesByRun[runId]) {
      void this._loadIssues(runId);
    }
  }

  private async _loadIssues(runId: string): Promise<void> {
    this._loadingIssuesRunId = runId;

    const params: ProductSyncIssueQueryParams = {
      page: 1,
      pageSize: 200,
    };

    const { data, error } = await MerchelloApi.getProductSyncRunIssues(runId, params);
    if (!this.#isConnected) return;

    if (error || !data) {
      this._issuesByRun = {
        ...this._issuesByRun,
        [runId]: [],
      };
      this._loadingIssuesRunId = null;

      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Unable to load issues",
          message: error?.message ?? "Issue details are unavailable for this run.",
        },
      });
      return;
    }

    this._issuesByRun = {
      ...this._issuesByRun,
      [runId]: data.items,
    };
    this._loadingIssuesRunId = null;
  }

  private async _downloadExport(run: ProductSyncRunDto): Promise<void> {
    this._downloadingRunId = run.id;
    const { blob, fileName, error } = await MerchelloApi.downloadProductSyncExport(run.id);
    this._downloadingRunId = null;

    if (error || !blob) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Download failed",
          message: error?.message ?? "Unable to download export file.",
        },
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName ?? `product-sync-${run.id}.csv`;
    document.body.appendChild(link);
    link.addEventListener("click", (event) => event.stopPropagation(), { once: true });
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private _getDirectionLabel(direction: ProductSyncDirection): string {
    return direction === ProductSyncDirection.Import ? "Import" : "Export";
  }

  private _getProfileLabel(profile: number): string {
    return profile === 0 ? "Shopify Strict" : "Merchello Extended";
  }

  private _getStatusColor(statusCssClass: string): "default" | "warning" | "positive" | "danger" {
    if (statusCssClass === "warning" || statusCssClass === "positive" || statusCssClass === "danger") {
      return statusCssClass;
    }
    return "default";
  }

  private _getSeverityColor(severity: ProductSyncIssueSeverity): "default" | "warning" | "danger" {
    if (severity === ProductSyncIssueSeverity.Error) {
      return "danger";
    }

    if (severity === ProductSyncIssueSeverity.Warning) {
      return "warning";
    }

    return "default";
  }

  private _getSeverityLabel(severity: ProductSyncIssueSeverity): string {
    if (severity === ProductSyncIssueSeverity.Error) {
      return "Error";
    }

    if (severity === ProductSyncIssueSeverity.Warning) {
      return "Warning";
    }

    return "Info";
  }

  private _renderIssues(runId: string): unknown {
    if (this._loadingIssuesRunId === runId) {
      return html`<div class="issues-loading"><uui-loader></uui-loader></div>`;
    }

    const issues = this._issuesByRun[runId] ?? [];
    if (issues.length === 0) {
      return html`<p class="issues-empty">No issues were recorded for this run.</p>`;
    }

    return html`
      <div class="issues-table-wrap">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Severity</uui-table-head-cell>
            <uui-table-head-cell>Row</uui-table-head-cell>
            <uui-table-head-cell>Field</uui-table-head-cell>
            <uui-table-head-cell>Message</uui-table-head-cell>
          </uui-table-head>
          ${issues.map(
            (issue) => html`
              <uui-table-row>
                <uui-table-cell>
                  <uui-tag color=${this._getSeverityColor(issue.severity)}>
                    ${this._getSeverityLabel(issue.severity)}
                  </uui-tag>
                </uui-table-cell>
                <uui-table-cell>${issue.rowNumber ?? "-"}</uui-table-cell>
                <uui-table-cell>${issue.field ?? "-"}</uui-table-cell>
                <uui-table-cell>${issue.message}</uui-table-cell>
              </uui-table-row>
            `
          )}
        </uui-table>
      </div>
    `;
  }

  private _renderTable(): unknown {
    return html`
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
          ${this._runs.map((run) => {
            const isExpanded = this._expandedRunId === run.id;
            const canDownload = run.direction === ProductSyncDirection.Export &&
              run.status === ProductSyncRunStatus.Completed;
            const isDownloading = this._downloadingRunId === run.id;

            return html`
              <uui-table-row>
                <uui-table-cell>
                  <div class="stack">
                    <strong>${run.requestedByUserName ?? "Unknown"}</strong>
                    <span class="muted">${formatDateTime(run.dateCreatedUtc)}</span>
                  </div>
                </uui-table-cell>
                <uui-table-cell>
                  <div class="stack">
                    <span>${this._getDirectionLabel(run.direction)}</span>
                    <span class="muted">${this._getProfileLabel(run.profile)}</span>
                  </div>
                </uui-table-cell>
                <uui-table-cell>
                  <uui-tag color=${this._getStatusColor(run.statusCssClass)}>
                    ${run.statusLabel}
                  </uui-tag>
                </uui-table-cell>
                <uui-table-cell>
                  <div class="stack">
                    <span>${run.itemsSucceeded}/${run.itemsProcessed} succeeded</span>
                    <span class="muted">
                      ${run.itemsFailed} failed, ${run.warningCount} warnings, ${run.errorCount} errors
                    </span>
                  </div>
                </uui-table-cell>
                <uui-table-cell>${run.startedAtUtc ? formatDateTime(run.startedAtUtc) : "-"}</uui-table-cell>
                <uui-table-cell>${run.completedAtUtc ? formatDateTime(run.completedAtUtc) : "-"}</uui-table-cell>
                <uui-table-cell>
                  <div class="actions">
                    <uui-button
                      compact
                      look="secondary"
                      label=${isExpanded ? "Hide Issues" : "View Issues"}
                      @click=${() => this._toggleRunDetails(run.id)}>
                      <uui-icon name=${isExpanded ? "icon-navigation-up" : "icon-navigation-down"}></uui-icon>
                    </uui-button>
                    ${canDownload
                      ? html`
                          <uui-button
                            compact
                            look="secondary"
                            label="Download"
                            ?disabled=${isDownloading}
                            @click=${() => this._downloadExport(run)}>
                            <uui-icon name=${isDownloading ? "icon-hourglass" : "icon-download"}></uui-icon>
                          </uui-button>
                        `
                      : nothing}
                  </div>
                </uui-table-cell>
              </uui-table-row>
              ${run.errorMessage
                ? html`
                    <uui-table-row class="run-error-row">
                      <uui-table-cell colspan="7">
                        <div class="run-error">${run.errorMessage}</div>
                      </uui-table-cell>
                    </uui-table-row>
                  `
                : nothing}
              ${isExpanded
                ? html`
                    <uui-table-row>
                      <uui-table-cell colspan="7">
                        ${this._renderIssues(run.id)}
                      </uui-table-cell>
                    </uui-table-row>
                  `
                : nothing}
            `;
          })}
        </uui-table>
      </div>
    `;
  }

  private _renderPagination(): unknown {
    if (this._totalPages <= 1) {
      return nothing;
    }

    return html`
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

  override render() {
    return html`
      <uui-box headline="Run History">
        <div class="toolbar">
          <uui-select
            label="Direction"
            .options=${[
              { name: "All Directions", value: "", selected: this._directionFilter === "" },
              { name: "Imports", value: String(ProductSyncDirection.Import), selected: this._directionFilter === String(ProductSyncDirection.Import) },
              { name: "Exports", value: String(ProductSyncDirection.Export), selected: this._directionFilter === String(ProductSyncDirection.Export) },
            ]}
            @change=${(event: Event) => {
              this._directionFilter = (event.target as HTMLSelectElement).value;
              this._handleFilterChange();
            }}>
          </uui-select>

          <uui-select
            label="Status"
            .options=${[
              { name: "All Statuses", value: "", selected: this._statusFilter === "" },
              { name: "Queued", value: String(ProductSyncRunStatus.Queued), selected: this._statusFilter === String(ProductSyncRunStatus.Queued) },
              { name: "Running", value: String(ProductSyncRunStatus.Running), selected: this._statusFilter === String(ProductSyncRunStatus.Running) },
              { name: "Completed", value: String(ProductSyncRunStatus.Completed), selected: this._statusFilter === String(ProductSyncRunStatus.Completed) },
              { name: "Failed", value: String(ProductSyncRunStatus.Failed), selected: this._statusFilter === String(ProductSyncRunStatus.Failed) },
            ]}
            @change=${(event: Event) => {
              this._statusFilter = (event.target as HTMLSelectElement).value;
              this._handleFilterChange();
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

        ${this._isLoading
          ? html`<div class="loading"><uui-loader></uui-loader></div>`
          : this._errorMessage
            ? html`
                <div class="error">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : this._runs.length === 0
              ? html`<p class="empty">No import/export runs found for the selected filters.</p>`
              : html`${this._renderTable()}${this._renderPagination()}`}
      </uui-box>
    `;
  }

  static override readonly styles = css`
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
}

export default MerchelloProductSyncRunsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-sync-runs-list": MerchelloProductSyncRunsListElement;
  }
}
