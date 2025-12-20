import {
  LitElement,
  html,
  css,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatNumber } from "@shared/utils/formatting.js";
import type {
  AnalyticsSummaryDto,
  TimeSeriesDataPointDto,
  SalesBreakdownDto,
  DateRange,
} from "./types/analytics.types.js";
import type { DateRangeChangeDetail } from "./components/analytics-header.element.js";

// Import child components
import "./components/analytics-header.element.js";
import "./components/analytics-kpi-card.element.js";
import "./components/analytics-line-chart.element.js";
import "./components/analytics-breakdown.element.js";

@customElement("merchello-analytics-workspace")
export class MerchelloAnalyticsWorkspaceElement extends UmbElementMixin(LitElement) {
  @state()
  private _dateRange: DateRange = this._getDefaultDateRange();

  @state()
  private _summary: AnalyticsSummaryDto | null = null;

  @state()
  private _salesTimeSeries: TimeSeriesDataPointDto[] = [];

  @state()
  private _aovTimeSeries: TimeSeriesDataPointDto[] = [];

  @state()
  private _breakdown: SalesBreakdownDto | null = null;

  @state()
  private _isLoading = true;

  @state()
  private _errorMessage = "";

  @state()
  private _currencySymbol = "$";

  #isConnected = false;

  private _getDefaultDateRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: end };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadSettings();
    this._loadAllData();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadSettings(): Promise<void> {
    const { data } = await MerchelloApi.getSettings();
    if (data && this.#isConnected) {
      this._currencySymbol = data.currencySymbol || "$";
    }
  }

  private async _loadAllData(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = "";

    const startDate = this._formatDateForApi(this._dateRange.startDate);
    const endDate = this._formatDateForApi(this._dateRange.endDate);

    try {
      // Load all data in parallel
      const [summaryResult, salesResult, aovResult, breakdownResult] = await Promise.all([
        MerchelloApi.getAnalyticsSummary(startDate, endDate),
        MerchelloApi.getSalesTimeSeries(startDate, endDate),
        MerchelloApi.getAovTimeSeries(startDate, endDate),
        MerchelloApi.getSalesBreakdown(startDate, endDate),
      ]);

      if (!this.#isConnected) return;

      if (summaryResult.error || salesResult.error || aovResult.error || breakdownResult.error) {
        const errors = [
          summaryResult.error,
          salesResult.error,
          aovResult.error,
          breakdownResult.error,
        ].filter(Boolean);
        this._errorMessage = errors[0]?.message ?? "Failed to load analytics data";
        this._isLoading = false;
        return;
      }

      this._summary = summaryResult.data ?? null;
      this._salesTimeSeries = salesResult.data ?? [];
      this._aovTimeSeries = aovResult.data ?? [];
      this._breakdown = breakdownResult.data ?? null;
    } catch (error) {
      if (!this.#isConnected) return;
      this._errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    } finally {
      if (this.#isConnected) {
        this._isLoading = false;
      }
    }
  }

  private _formatDateForApi(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private _handleDateRangeChange(e: CustomEvent<DateRangeChangeDetail>): void {
    this._dateRange = {
      startDate: e.detail.startDate,
      endDate: e.detail.endDate,
    };
    this._loadAllData();
  }

  private _formatCurrency(value: number): string {
    return `${this._currencySymbol}${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private _formatPercent(value: number): string {
    return `${formatNumber(value, 1)}%`;
  }

  private _formatNumber(value: number): string {
    return value.toLocaleString();
  }

  private _renderKpiCards(): unknown {
    const isLoading = this._isLoading || !this._summary;

    return html`
      <div class="kpi-grid">
        <merchello-analytics-kpi-card
          label="Gross sales"
          value=${isLoading ? "—" : this._formatCurrency(this._summary!.grossSales)}
          change=${this._summary?.grossSalesChange ?? 0}
          .sparklineData=${this._summary?.grossSalesSparkline ?? []}
          ?isLoading=${isLoading}>
        </merchello-analytics-kpi-card>

        <merchello-analytics-kpi-card
          label="Returning customer rate"
          value=${isLoading ? "—" : this._formatPercent(this._summary!.returningCustomerRate)}
          change=${this._summary?.returningCustomerRateChange ?? 0}
          .sparklineData=${this._summary?.returningCustomerSparkline ?? []}
          ?isLoading=${isLoading}>
        </merchello-analytics-kpi-card>

        <merchello-analytics-kpi-card
          label="Orders fulfilled"
          value=${isLoading ? "—" : this._formatNumber(this._summary!.ordersFulfilled)}
          change=${this._summary?.ordersFulfilledChange ?? 0}
          .sparklineData=${this._summary?.ordersFulfilledSparkline ?? []}
          ?isLoading=${isLoading}>
        </merchello-analytics-kpi-card>

        <merchello-analytics-kpi-card
          label="Orders"
          value=${isLoading ? "—" : this._formatNumber(this._summary!.totalOrders)}
          change=${this._summary?.totalOrdersChange ?? 0}
          .sparklineData=${this._summary?.totalOrdersSparkline ?? []}
          ?isLoading=${isLoading}>
        </merchello-analytics-kpi-card>
      </div>
    `;
  }

  private _renderCharts(): unknown {
    return html`
      <merchello-analytics-line-chart
        headline="Total sales over time"
        valuePrefix=${this._currencySymbol}
        .data=${this._salesTimeSeries}
        ?isLoading=${this._isLoading}
        showComparison>
      </merchello-analytics-line-chart>

      <div class="bottom-section">
        <merchello-analytics-line-chart
          headline="Average order value over time"
          valuePrefix=${this._currencySymbol}
          .data=${this._aovTimeSeries}
          ?isLoading=${this._isLoading}
          showComparison>
        </merchello-analytics-line-chart>

        <merchello-analytics-breakdown
          .data=${this._breakdown}
          currencySymbol=${this._currencySymbol}
          ?isLoading=${this._isLoading}>
        </merchello-analytics-breakdown>
      </div>
    `;
  }

  private _renderError(): unknown {
    return html`
      <uui-box>
        <div class="error-state">
          <uui-icon name="icon-alert"></uui-icon>
          <p>${this._errorMessage}</p>
          <uui-button
            look="primary"
            @click=${() => this._loadAllData()}
            label="Retry">
            Retry
          </uui-button>
        </div>
      </uui-box>
    `;
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height>
        <div class="analytics-content">
          <merchello-analytics-header
            .dateRange=${this._dateRange}
            @date-range-change=${this._handleDateRangeChange}>
          </merchello-analytics-header>

          ${this._errorMessage
            ? this._renderError()
            : html`
                ${this._renderKpiCards()}
                ${this._renderCharts()}
              `}
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .analytics-content {
      padding: var(--uui-size-layout-1);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--uui-size-space-5);
      margin-bottom: var(--uui-size-space-5);
    }

    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-5);
      margin-top: var(--uui-size-space-5);
    }

    @media (max-width: 1200px) {
      .bottom-section {
        grid-template-columns: 1fr;
      }
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      text-align: center;
      gap: var(--uui-size-space-3);
    }

    .error-state uui-icon {
      font-size: 32px;
      color: var(--uui-color-danger);
    }

    .error-state p {
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    merchello-analytics-line-chart {
      margin-bottom: var(--uui-size-space-5);
    }

    merchello-analytics-line-chart:last-of-type {
      margin-bottom: 0;
    }
  `;
}

export default MerchelloAnalyticsWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-workspace": MerchelloAnalyticsWorkspaceElement;
  }
}
