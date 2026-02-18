import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  FulfilmentSyncLogDto,
  FulfilmentSyncLogPageDto,
  FulfilmentSyncType,
  FulfilmentSyncStatus,
  FulfilmentProviderOptionDto,
} from "@fulfilment-providers/types/fulfilment-providers.types.js";
import { formatDate } from "@shared/utils/formatting.js";

@customElement("merchello-sync-logs-list")
export class MerchelloSyncLogsListElement extends UmbElementMixin(LitElement) {
  @state() private _logs: FulfilmentSyncLogDto[] = [];
  @state() private _providers: FulfilmentProviderOptionDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  // Pagination
  @state() private _page = 1;
  @state() private _pageSize = 20;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;

  // Filters
  @state() private _filterProviderConfigId: string = "";
  @state() private _filterSyncType: string = "";
  @state() private _filterStatus: string = "";

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadProviders();
    this._loadLogs();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadProviders(): Promise<void> {
    const { data } = await MerchelloApi.getFulfilmentProviderOptions();
    if (this.#isConnected && data) {
      this._providers = data;
    }
  }

  private async _loadLogs(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: {
      providerConfigurationId?: string;
      syncType?: FulfilmentSyncType;
      status?: FulfilmentSyncStatus;
      page: number;
      pageSize: number;
    } = {
      page: this._page,
      pageSize: this._pageSize,
    };

    if (this._filterProviderConfigId) {
      params.providerConfigurationId = this._filterProviderConfigId;
    }
    if (this._filterSyncType) {
      params.syncType = parseInt(this._filterSyncType, 10) as FulfilmentSyncType;
    }
    if (this._filterStatus) {
      params.status = parseInt(this._filterStatus, 10) as FulfilmentSyncStatus;
    }

    const { data, error } = await MerchelloApi.getFulfilmentSyncLogs(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    const result = data as FulfilmentSyncLogPageDto;
    this._logs = result.items;
    this._totalItems = result.totalItems;
    this._totalPages = result.totalPages;
    this._isLoading = false;
  }

  private _handleFilterChange(): void {
    this._page = 1;
    this._loadLogs();
  }

  private _handlePageChange(newPage: number): void {
    if (newPage < 1 || newPage > this._totalPages) return;
    this._page = newPage;
    this._loadLogs();
  }


  override render() {
    return html`
      <uui-box headline="Sync History">
        ${this._renderFilters()}

        ${this._isLoading
          ? html`<div class="loading"><uui-loader></uui-loader></div>`
          : this._errorMessage
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                  <uui-button look="secondary" label="Retry" @click=${() => this._loadLogs()}>Retry</uui-button>
                </div>
              `
            : this._logs.length === 0
              ? html`<p class="empty-message">No sync logs found.</p>`
              : html`
                  ${this._renderTable()}
                  ${this._renderPagination()}
                `}
      </uui-box>
    `;
  }

  private _renderFilters() {
    return html`
      <div class="filters">
        <div class="filter-row">
          <div class="filter-item">
            <label for="sync-log-provider-filter">Provider</label>
            <uui-select
              id="sync-log-provider-filter"
              label="Provider filter"
              .options=${[
                { name: "All Providers", value: "", selected: this._filterProviderConfigId === "" },
                ...this._providers.map((p) => ({
                  name: p.displayName,
                  value: p.configurationId,
                  selected: p.configurationId === this._filterProviderConfigId,
                })),
              ]}
              @change=${(e: Event) => {
                this._filterProviderConfigId = (e.target as HTMLSelectElement).value;
                this._handleFilterChange();
              }}
            ></uui-select>
          </div>

          <div class="filter-item">
            <label for="sync-log-type-filter">Sync Type</label>
            <uui-select
              id="sync-log-type-filter"
              label="Sync type filter"
              .options=${[
                { name: "All Types", value: "", selected: this._filterSyncType === "" },
                { name: "Products Out", value: "0", selected: this._filterSyncType === "0" },
                { name: "Inventory In", value: "1", selected: this._filterSyncType === "1" },
              ]}
              @change=${(e: Event) => {
                this._filterSyncType = (e.target as HTMLSelectElement).value;
                this._handleFilterChange();
              }}
            ></uui-select>
          </div>

          <div class="filter-item">
            <label for="sync-log-status-filter">Status</label>
            <uui-select
              id="sync-log-status-filter"
              label="Sync status filter"
              .options=${[
                { name: "All Statuses", value: "", selected: this._filterStatus === "" },
                { name: "Pending", value: "0", selected: this._filterStatus === "0" },
                { name: "Running", value: "1", selected: this._filterStatus === "1" },
                { name: "Completed", value: "2", selected: this._filterStatus === "2" },
                { name: "Failed", value: "3", selected: this._filterStatus === "3" },
              ]}
              @change=${(e: Event) => {
                this._filterStatus = (e.target as HTMLSelectElement).value;
                this._handleFilterChange();
              }}
            ></uui-select>
          </div>

          <uui-button look="secondary" compact label="Refresh" @click=${() => this._loadLogs()}>
            <uui-icon name="icon-refresh"></uui-icon>
            Refresh
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderTable() {
    return html`
      <uui-table>
        <uui-table-head>
          <uui-table-head-cell>Provider</uui-table-head-cell>
          <uui-table-head-cell>Sync Type</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
          <uui-table-head-cell>Items</uui-table-head-cell>
          <uui-table-head-cell>Started</uui-table-head-cell>
          <uui-table-head-cell>Completed</uui-table-head-cell>
        </uui-table-head>
        ${this._logs.map(
          (log) => html`
            <uui-table-row>
              <uui-table-cell>${log.providerDisplayName ?? "Unknown"}</uui-table-cell>
              <uui-table-cell>
                <span class="sync-type-badge">${log.syncTypeLabel}</span>
              </uui-table-cell>
              <uui-table-cell>
                <span class="status-badge ${log.statusCssClass}">
                  ${log.statusLabel}
                </span>
              </uui-table-cell>
              <uui-table-cell>
                <span class="items-summary">
                  ${log.itemsSucceeded}/${log.itemsProcessed}
                  ${log.itemsFailed > 0
                    ? html`<span class="failed-count">(${log.itemsFailed} failed)</span>`
                    : nothing}
                </span>
              </uui-table-cell>
              <uui-table-cell>${log.startedAt ? formatDate(log.startedAt) : "-"}</uui-table-cell>
              <uui-table-cell>${log.completedAt ? formatDate(log.completedAt) : "-"}</uui-table-cell>
            </uui-table-row>
            ${log.errorMessage
              ? html`
                  <uui-table-row class="error-row">
                    <uui-table-cell colspan="6">
                      <div class="error-detail">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${log.errorMessage}
                      </div>
                    </uui-table-cell>
                  </uui-table-row>
                `
              : nothing}
          `
        )}
      </uui-table>
    `;
  }

  private _renderPagination() {
    if (this._totalPages <= 1) return nothing;

    return html`
      <div class="pagination">
        <span class="pagination-info">
          Showing ${(this._page - 1) * this._pageSize + 1} -
          ${Math.min(this._page * this._pageSize, this._totalItems)} of ${this._totalItems}
        </span>
        <div class="pagination-controls">
          <uui-button
            compact
            look="secondary"
            label="Previous page"
            ?disabled=${this._page <= 1}
            @click=${() => this._handlePageChange(this._page - 1)}
          >
            Previous
          </uui-button>
          <span class="page-number">Page ${this._page} of ${this._totalPages}</span>
          <uui-button
            compact
            look="secondary"
            label="Next page"
            ?disabled=${this._page >= this._totalPages}
            @click=${() => this._handlePageChange(this._page + 1)}
          >
            Next
          </uui-button>
        </div>
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-5);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin: var(--uui-size-space-4);
    }

    .empty-message {
      text-align: center;
      color: var(--uui-color-text-alt);
      padding: var(--uui-size-space-5);
    }

    .filters {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .filter-row {
      display: flex;
      gap: var(--uui-size-space-4);
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .filter-item label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .filter-item uui-select {
      min-width: 160px;
    }

    uui-table {
      width: 100%;
    }

    .sync-type-badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.75rem;
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 12px;
    }

    .status-pending {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .status-running {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .status-completed {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .status-failed {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .items-summary {
      font-variant-numeric: tabular-nums;
    }

    .failed-count {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .error-row {
      background: var(--uui-color-danger-standalone);
    }

    .error-detail {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-danger-contrast);
      font-size: 0.875rem;
      padding: var(--uui-size-space-2);
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .pagination-info {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .page-number {
      font-size: 0.875rem;
    }
  `;
}

export default MerchelloSyncLogsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-sync-logs-list": MerchelloSyncLogsListElement;
  }
}
