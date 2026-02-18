import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { CustomerPreviewDto, SegmentStatisticsDto } from "@customers/types/segment.types.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import { getCurrencyCode } from "@api/store-settings.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-segment-preview")
export class MerchelloSegmentPreviewElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) segmentId: string = "";

  @state() private _customers: CustomerPreviewDto[] = [];
  @state() private _statistics: SegmentStatisticsDto | null = null;
  @state() private _isLoading = true;
  @state() private _isLoadingStats = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    if (this.segmentId) {
      this._loadPreview();
      this._loadStatistics();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("segmentId") && this.segmentId) {
      this._page = 1;
      this._loadPreview();
      this._loadStatistics();
    }
  }

  private async _loadPreview(): Promise<void> {
    if (!this.segmentId) return;

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.previewSegmentMatches(
      this.segmentId,
      this._page,
      this._pageSize
    );

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._customers = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private async _loadStatistics(): Promise<void> {
    if (!this.segmentId) return;

    this._isLoadingStats = true;

    const { data, error } = await MerchelloApi.getSegmentStatistics(this.segmentId);

    if (!this.#isConnected) return;

    if (error) {
      this._isLoadingStats = false;
      return;
    }

    this._statistics = data ?? null;
    this._isLoadingStats = false;
  }

  private _handleRefresh(): void {
    this._loadPreview();
    this._loadStatistics();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadPreview();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _formatCurrency(value: number): string {
    return formatCurrency(value, getCurrencyCode());
  }

  private _renderStatisticsCard(): unknown {
    if (this._isLoadingStats || !this._statistics) {
      return html`
        <uui-box>
          <div class="stats-loading"><uui-loader></uui-loader></div>
        </uui-box>
      `;
    }

    return html`
      <uui-box>
        <div class="statistics-grid">
          <div class="stat-card">
            <div class="stat-value">${this._statistics.totalMembers}</div>
            <div class="stat-label">Total members</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._statistics.activeMembers}</div>
            <div class="stat-label">Active members</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatCurrency(this._statistics.totalRevenue)}</div>
            <div class="stat-label">Total revenue</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatCurrency(this._statistics.averageOrderValue)}</div>
            <div class="stat-label">Average order value</div>
          </div>
        </div>
      </uui-box>
    `;
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-users"
        headline="No matching customers"
        message="No customers currently match the defined criteria.">
      </merchello-empty-state>
    `;
  }

  private _renderCustomerRow(customer: CustomerPreviewDto): unknown {
    return html`
      <uui-table-row>
        <uui-table-cell>
          <span class="customer-name">${customer.name || "N/A"}</span>
        </uui-table-cell>
        <uui-table-cell>${customer.email}</uui-table-cell>
        <uui-table-cell class="center">${customer.orderCount}</uui-table-cell>
        <uui-table-cell class="right">${this._formatCurrency(customer.totalSpend)}</uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderCustomersTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="customers-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Email</uui-table-head-cell>
            <uui-table-head-cell class="center">Orders</uui-table-head-cell>
            <uui-table-head-cell class="right">Total spend</uui-table-head-cell>
          </uui-table-head>
          ${this._customers.map((customer) => this._renderCustomerRow(customer))}
        </uui-table>
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._customers.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderCustomersTable();
  }

  override render() {
    return html`
      <div class="preview-container">
        ${this._renderStatisticsCard()}

        <div class="header-actions">
          <span class="matching-count">
            ${this._totalItems} customer${this._totalItems !== 1 ? "s" : ""} match${this._totalItems === 1 ? "es" : ""} the criteria
          </span>
          <uui-button
            look="secondary"
            label="Refresh preview"
            @click=${this._handleRefresh}
            ?disabled=${this._isLoading}>
            <uui-icon name="icon-sync"></uui-icon>
            Refresh preview
          </uui-button>
        </div>

        ${this._renderContent()}

        ${this._customers.length > 0 && !this._isLoading
          ? html`
              <merchello-pagination
                .state=${this._getPaginationState()}
                .disabled=${this._isLoading}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            `
          : nothing}
      </div>
    `;
  }

  static override readonly styles = [
    css`
      :host {
        display: block;
      }

      .preview-container {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .statistics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--uui-size-space-4);
      }

      .stat-card {
        text-align: center;
        padding: var(--uui-size-space-3);
      }

      .stat-value {
        font-size: var(--uui-type-h3-size);
        font-weight: 700;
        color: var(--uui-color-interactive);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-top: var(--uui-size-space-1);
      }

      .stats-loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-4);
      }

      .header-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex-wrap: wrap;
      }

      .matching-count {
        font-weight: 500;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .customers-table {
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

      uui-table-head-cell.right,
      uui-table-cell.right {
        text-align: right;
      }

      .customer-name {
        font-weight: 500;
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

      .error-banner uui-icon {
        flex-shrink: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-segment-preview": MerchelloSegmentPreviewElement;
  }
}
