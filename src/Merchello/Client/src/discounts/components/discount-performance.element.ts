import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { DiscountPerformanceDto } from "@discounts/types/discount.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatNumber } from "@shared/utils/formatting.js";

@customElement("merchello-discount-performance")
export class MerchelloDiscountPerformanceElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) discountId = "";

  @state() private _performance?: DiscountPerformanceDto;
  @state() private _isLoading = true;
  @state() private _error?: string;
  @state() private _dateRange: "7d" | "30d" | "90d" | "all" = "30d";

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.discountId) {
      this._loadPerformance();
    }
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("discountId") && this.discountId) {
      this._loadPerformance();
    }
  }

  private async _loadPerformance(): Promise<void> {
    this._isLoading = true;
    this._error = undefined;

    const endDate = new Date();
    let startDate: Date | undefined;

    switch (this._dateRange) {
      case "7d":
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        startDate = undefined;
        break;
    }

    const { data, error } = await MerchelloApi.getDiscountPerformance(
      this.discountId,
      startDate?.toISOString(),
      endDate.toISOString()
    );

    this._isLoading = false;

    if (error) {
      this._error = error.message;
      return;
    }

    this._performance = data;
  }

  private _handleDateRangeChange(range: typeof this._dateRange): void {
    this._dateRange = range;
    this._loadPerformance();
  }

  private _formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  private _formatDate(isoString: string | null | undefined): string {
    if (!isoString) return "Never";
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private _renderLoading(): unknown {
    return html`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading performance data...</span>
      </div>
    `;
  }

  private _renderError(): unknown {
    return html`
      <div class="error">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._error}</span>
        <uui-button look="secondary" @click=${this._loadPerformance}>Retry</uui-button>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <div class="empty-state">
        <uui-icon name="icon-chart-line"></uui-icon>
        <h3>No usage data yet</h3>
        <p>This discount hasn't been used yet. Performance metrics will appear here once customers start using it.</p>
      </div>
    `;
  }

  private _renderMetricCard(label: string, value: string | number, icon: string, color?: string): unknown {
    return html`
      <div class="metric-card">
        <div class="metric-icon" style=${color ? `color: ${color}` : ""}>
          <uui-icon name=${icon}></uui-icon>
        </div>
        <div class="metric-content">
          <span class="metric-value">${value}</span>
          <span class="metric-label">${label}</span>
        </div>
      </div>
    `;
  }

  private _renderUsageChart(): unknown {
    if (!this._performance?.usageByDate?.length) {
      return html`
        <div class="chart-placeholder">
          <p>No usage data available for the selected period</p>
        </div>
      `;
    }

    const maxCount = this._performance.usageByDate.length > 0
      ? Math.max(...this._performance.usageByDate.map((d) => d.usageCount))
      : 0;

    return html`
      <div class="chart-container">
        <div class="chart">
          ${this._performance.usageByDate.map((day) => {
            const height = maxCount > 0 ? (day.usageCount / maxCount) * 100 : 0;
            const date = new Date(day.date);
            return html`
              <div class="chart-bar-container" title="${date.toLocaleDateString()}: ${day.usageCount} uses">
                <div class="chart-bar" style="height: ${height}%"></div>
                <span class="chart-label">${date.getDate()}</span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  override render() {
    if (this._isLoading) {
      return this._renderLoading();
    }

    if (this._error) {
      return this._renderError();
    }

    if (!this._performance || this._performance.totalUsageCount === 0) {
      return this._renderEmptyState();
    }

    return html`
      <div class="performance-container">
        <!-- Date Range Selector -->
        <div class="date-range-selector">
          <uui-button-group>
            <uui-button
              look=${this._dateRange === "7d" ? "primary" : "secondary"}
              @click=${() => this._handleDateRangeChange("7d")}
            >
              7 Days
            </uui-button>
            <uui-button
              look=${this._dateRange === "30d" ? "primary" : "secondary"}
              @click=${() => this._handleDateRangeChange("30d")}
            >
              30 Days
            </uui-button>
            <uui-button
              look=${this._dateRange === "90d" ? "primary" : "secondary"}
              @click=${() => this._handleDateRangeChange("90d")}
            >
              90 Days
            </uui-button>
            <uui-button
              look=${this._dateRange === "all" ? "primary" : "secondary"}
              @click=${() => this._handleDateRangeChange("all")}
            >
              All Time
            </uui-button>
          </uui-button-group>
        </div>

        <!-- Key Metrics -->
        <div class="metrics-grid">
          ${this._renderMetricCard(
            "Total Uses",
            formatNumber(this._performance.totalUsageCount),
            "icon-users",
            "var(--uui-color-positive)"
          )}
          ${this._renderMetricCard(
            "Unique Customers",
            formatNumber(this._performance.uniqueCustomersCount),
            "icon-user",
            "var(--uui-color-current)"
          )}
          ${this._renderMetricCard(
            "Total Discount Given",
            this._formatCurrency(this._performance.totalDiscountAmount),
            "icon-tag",
            "var(--uui-color-warning)"
          )}
          ${this._renderMetricCard(
            "Avg. Discount per Use",
            this._formatCurrency(this._performance.averageDiscountPerUse),
            "icon-coin"
          )}
        </div>

        <!-- Revenue Metrics -->
        <uui-box headline="Revenue Impact">
          <div class="revenue-metrics">
            <div class="revenue-item">
              <span class="revenue-label">Total Order Revenue</span>
              <span class="revenue-value">${this._formatCurrency(this._performance.totalOrderRevenue)}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-label">Average Order Value</span>
              <span class="revenue-value">${this._formatCurrency(this._performance.averageOrderValue)}</span>
            </div>
            ${this._performance.remainingUses !== null && this._performance.remainingUses !== undefined
              ? html`
                  <div class="revenue-item">
                    <span class="revenue-label">Remaining Uses</span>
                    <span class="revenue-value ${this._performance.remainingUses === 0 ? "exhausted" : ""}">
                      ${formatNumber(this._performance.remainingUses)}
                    </span>
                  </div>
                `
              : nothing}
          </div>
        </uui-box>

        <!-- Usage Chart -->
        <uui-box headline="Usage Over Time">
          ${this._renderUsageChart()}
        </uui-box>

        <!-- Timeline -->
        <uui-box headline="Timeline">
          <div class="timeline">
            <div class="timeline-item">
              <uui-icon name="icon-calendar"></uui-icon>
              <div class="timeline-content">
                <span class="timeline-label">First Used</span>
                <span class="timeline-value">${this._formatDate(this._performance.firstUsed)}</span>
              </div>
            </div>
            <div class="timeline-item">
              <uui-icon name="icon-time"></uui-icon>
              <div class="timeline-content">
                <span class="timeline-label">Last Used</span>
                <span class="timeline-value">${this._formatDate(this._performance.lastUsed)}</span>
              </div>
            </div>
          </div>
        </uui-box>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .loading,
    .error,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-3);
      text-align: center;
      gap: var(--uui-size-space-3);
    }

    .error {
      color: var(--uui-color-danger);
    }

    .empty-state uui-icon {
      font-size: 3em;
      color: var(--uui-color-text-alt);
    }

    .empty-state h3 {
      margin: 0;
      color: var(--uui-color-text);
    }

    .empty-state p {
      margin: 0;
      color: var(--uui-color-text-alt);
      max-width: 400px;
    }

    .performance-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .date-range-selector {
      display: flex;
      justify-content: flex-end;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .metric-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 1.5em;
    }

    .metric-content {
      display: flex;
      flex-direction: column;
    }

    .metric-value {
      font-size: 1.5em;
      font-weight: 600;
      line-height: 1.2;
    }

    .metric-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .revenue-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .revenue-item {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .revenue-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .revenue-value {
      font-size: 1.25em;
      font-weight: 600;
    }

    .revenue-value.exhausted {
      color: var(--uui-color-danger);
    }

    .chart-container {
      padding: var(--uui-size-space-3) 0;
    }

    .chart {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 150px;
      padding: var(--uui-size-space-2) 0;
    }

    .chart-bar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      max-width: 30px;
    }

    .chart-bar {
      flex: 1;
      width: 100%;
      background: var(--uui-color-positive);
      border-radius: var(--uui-border-radius) var(--uui-border-radius) 0 0;
      min-height: 2px;
      transition: height 0.3s ease;
    }

    .chart-label {
      font-size: 10px;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .chart-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 150px;
      color: var(--uui-color-text-alt);
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .timeline-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .timeline-item uui-icon {
      color: var(--uui-color-text-alt);
    }

    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .timeline-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .timeline-value {
      font-weight: 500;
    }
  `;
}

export default MerchelloDiscountPerformanceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discount-performance": MerchelloDiscountPerformanceElement;
  }
}
