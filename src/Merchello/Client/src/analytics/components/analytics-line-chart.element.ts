import {
  LitElement,
  html,
  css,
  customElement,
  property,
  query,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { Chart, registerables } from "chart.js";
import type { TimeSeriesDataPointDto } from "../types/analytics.types.js";

// Register all Chart.js components
Chart.register(...registerables);

@customElement("merchello-analytics-line-chart")
export class MerchelloAnalyticsLineChart extends UmbElementMixin(LitElement) {
  @property({ type: String })
  headline = "";

  @property({ type: String })
  valuePrefix = "";

  @property({ type: Array })
  data: TimeSeriesDataPointDto[] = [];

  @property({ type: Boolean })
  showComparison = true;

  @property({ type: Boolean })
  isLoading = false;

  @query("canvas")
  private _canvas!: HTMLCanvasElement;

  @state()
  private _chart?: Chart;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyChart();
  }

  protected override updated(changedProps: Map<string | number | symbol, unknown>): void {
    super.updated(changedProps);
    if (changedProps.has("data") && this.data.length > 0) {
      this._updateChart();
    }
  }

  private _destroyChart(): void {
    if (this._chart) {
      this._chart.destroy();
      this._chart = undefined;
    }
  }

  private _updateChart(): void {
    if (!this._canvas) return;

    this._destroyChart();

    const labels = this.data.map((d) => this._formatDate(d.date));
    const currentValues = this.data.map((d) => d.value);
    const comparisonValues = this.data.map((d) => d.comparisonValue);
    const hasComparison = this.showComparison && comparisonValues.some((v) => v !== null);

    const datasets = [
      {
        label: "Current Period",
        data: currentValues,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ];

    if (hasComparison) {
      datasets.push({
        label: "Comparison Period",
        data: comparisonValues as number[],
        borderColor: "#94a3b8",
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        borderDash: [5, 5],
      } as typeof datasets[0]);
    }

    this._chart = new Chart(this._canvas, {
      type: "line",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: hasComparison,
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 16,
              font: {
                family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              size: 13,
            },
            bodyFont: {
              family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              size: 12,
            },
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                if (value === null || value === undefined) return "";
                return `${context.dataset.label}: ${this.valuePrefix}${this._formatNumber(value)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                size: 11,
              },
              color: "#64748b",
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              font: {
                family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                size: 11,
              },
              color: "#64748b",
              callback: (value) => `${this.valuePrefix}${this._formatNumber(value as number)}`,
            },
          },
        },
      },
    });
  }

  private _formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  private _formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + "K";
    }
    return value.toFixed(2);
  }

  private _getTotalValue(): number {
    return this.data.reduce((sum, d) => sum + d.value, 0);
  }

  private _getPercentChange(): number {
    if (!this.showComparison) return 0;
    const currentTotal = this._getTotalValue();
    const comparisonTotal = this.data.reduce((sum, d) => sum + (d.comparisonValue ?? 0), 0);
    if (comparisonTotal === 0) return currentTotal > 0 ? 100 : 0;
    return Math.round(((currentTotal - comparisonTotal) / Math.abs(comparisonTotal)) * 100 * 10) / 10;
  }

  override render() {
    const totalValue = this._getTotalValue();
    const percentChange = this._getPercentChange();
    const isPositive = percentChange >= 0;

    return html`
      <uui-box>
        <div class="chart-header">
          <div class="headline">${this.headline}</div>
          <div class="summary">
            <span class="total-value">${this.valuePrefix}${this._formatNumber(totalValue)}</span>
            ${this.showComparison
              ? html`
                  <span class="change ${isPositive ? "positive" : "negative"}">
                    ${isPositive ? "↑" : "↓"} ${Math.abs(percentChange)}%
                  </span>
                `
              : ""}
          </div>
        </div>
        <div class="chart-container">
          ${this.isLoading
            ? html`<div class="loading"><uui-loader></uui-loader></div>`
            : this.data.length === 0
              ? html`<div class="empty">No data available for this period</div>`
              : html`<canvas></canvas>`}
        </div>
      </uui-box>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .chart-header {
      margin-bottom: var(--uui-size-space-4);
    }

    .headline {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    .summary {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-3);
    }

    .total-value {
      font-size: var(--uui-type-h3-size);
      font-weight: 700;
    }

    .change {
      font-size: var(--uui-type-small-size);
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .change.positive {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }

    .change.negative {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .chart-container {
      position: relative;
      height: 250px;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .loading,
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--uui-color-text-alt);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-line-chart": MerchelloAnalyticsLineChart;
  }
}

export default MerchelloAnalyticsLineChart;
