import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { DiscountPerformanceDto } from "@discounts/types/discount.types.js";
import type { DateRange, DateRangePreset } from "@analytics/types/analytics.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatNumber } from "@shared/utils/formatting.js";

@customElement("merchello-discount-performance")
export class MerchelloDiscountPerformanceElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) discountId = "";

  @state() private _performance?: DiscountPerformanceDto;
  @state() private _isLoading = true;
  @state() private _error?: string;
  @state() private _dateRange: DateRange = this._getDefaultDateRange();
  @state() private _activePreset: DateRangePreset = "last30days";
  @state() private _showCustomPicker = false;
  @state() private _customStartDate = "";
  @state() private _customEndDate = "";

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

    const { data, error } = await MerchelloApi.getDiscountPerformance(
      this.discountId,
      this._dateRange.startDate.toISOString(),
      this._dateRange.endDate.toISOString()
    );

    this._isLoading = false;

    if (error) {
      this._error = error.message;
      return;
    }

    this._performance = data;
  }

  private _getDefaultDateRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: end };
  }

  private _getPresetDateRange(preset: DateRangePreset): DateRange {
    const end = new Date();
    const start = new Date();

    switch (preset) {
      case "today":
        break;
      case "last7days":
        start.setDate(start.getDate() - 7);
        break;
      case "last30days":
        start.setDate(start.getDate() - 30);
        break;
      case "thisMonth":
        start.setDate(1);
        break;
      case "lastMonth": {
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        const lastDayOfLastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        return { startDate: start, endDate: lastDayOfLastMonth };
      }
      default:
        start.setDate(start.getDate() - 30);
    }

    return { startDate: start, endDate: end };
  }

  private _handlePresetClick(preset: DateRangePreset): void {
    this._activePreset = preset;
    this._showCustomPicker = preset === "custom";

    if (preset !== "custom") {
      this._dateRange = this._getPresetDateRange(preset);
      this._loadPerformance();
    }
  }

  private _handleCustomStartChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this._customStartDate = input.value;
    this._tryApplyCustomRange();
  }

  private _handleCustomEndChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this._customEndDate = input.value;
    this._tryApplyCustomRange();
  }

  private _tryApplyCustomRange(): void {
    if (this._customStartDate && this._customEndDate) {
      const startDate = new Date(this._customStartDate);
      const endDate = new Date(this._customEndDate);

      if (startDate <= endDate) {
        this._dateRange = { startDate, endDate };
        this._loadPerformance();
      }
    }
  }

  private _formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0];
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
          <div class="preset-buttons">
            <uui-button
              look=${this._activePreset === "today" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("today")}
              label="Today">
              Today
            </uui-button>
            <uui-button
              look=${this._activePreset === "last7days" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("last7days")}
              label="Last 7 days">
              Last 7 days
            </uui-button>
            <uui-button
              look=${this._activePreset === "last30days" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("last30days")}
              label="Last 30 days">
              Last 30 days
            </uui-button>
            <uui-button
              look=${this._activePreset === "thisMonth" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("thisMonth")}
              label="This month">
              This month
            </uui-button>
            <uui-button
              look=${this._activePreset === "custom" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("custom")}
              label="Custom">
              Custom
            </uui-button>
          </div>

          ${this._showCustomPicker
            ? html`
                <div class="custom-picker">
                  <uui-input
                    type="date"
                    .value=${this._customStartDate || this._formatDateForInput(this._dateRange.startDate)}
                    @change=${this._handleCustomStartChange}
                    label="Start date">
                  </uui-input>
                  <span class="date-separator">to</span>
                  <uui-input
                    type="date"
                    .value=${this._customEndDate || this._formatDateForInput(this._dateRange.endDate)}
                    @change=${this._handleCustomEndChange}
                    label="End date">
                  </uui-input>
                </div>
              `
            : nothing}
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
      align-items: center;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
    }

    .preset-buttons {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .custom-picker {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .date-separator {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    uui-input[type="date"] {
      width: 150px;
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
