import {
  LitElement,
  html,
  css,
  svg,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-analytics-kpi-card")
export class MerchelloAnalyticsKpiCard extends UmbElementMixin(LitElement) {
  @property({ type: String })
  label = "";

  @property({ type: String })
  value = "";

  @property({ type: Number })
  change = 0;

  @property({ type: Array })
  sparklineData: number[] = [];

  @property({ type: Boolean })
  isLoading = false;

  @property({ type: Boolean })
  showChange = true;

  private _renderSparkline(): unknown {
    if (!this.sparklineData || this.sparklineData.length < 2) {
      return html`<div class="sparkline-empty"></div>`;
    }

    const width = 80;
    const height = 32;
    const padding = 2;

    const data = this.sparklineData;
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(" L ")}`;
    const isPositive = this.change >= 0;
    const strokeColor = isPositive ? "#3b82f6" : "#94a3b8";

    return svg`
      <svg
        class="sparkline"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none">
        <path
          d="${pathD}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }

  private _renderChangeIndicator(): unknown {
    if (!this.showChange) return "";

    const isPositive = this.change > 0;

    if (this.change === 0) {
      return html`<span class="change neutral">—</span>`;
    }

    return html`
      <span class="change ${isPositive ? "positive" : "negative"}">
        ${isPositive ? "↑" : "↓"} ${Math.abs(this.change)}%
      </span>
    `;
  }

  override render() {
    return html`
      <uui-box>
        ${this.isLoading
          ? html`
              <div class="loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            `
          : html`
              <div class="card-content">
                <div class="info">
                  <div class="label">${this.label}</div>
                  <div class="value-row">
                    <span class="value">${this.value}</span>
                    ${this._renderChangeIndicator()}
                  </div>
                </div>
                <div class="sparkline-container">
                  ${this._renderSparkline()}
                </div>
              </div>
            `}
      </uui-box>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
      height: 100%;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60px;
    }

    .card-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
    }

    .info {
      flex: 1;
      min-width: 0;
    }

    .label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .value-row {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .value {
      font-size: var(--uui-type-h4-size);
      font-weight: 700;
      line-height: 1.2;
    }

    .change {
      font-size: var(--uui-type-small-size);
      font-weight: 500;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .change.positive {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }

    .change.negative {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .change.neutral {
      color: var(--uui-color-text-alt);
    }

    .sparkline-container {
      flex-shrink: 0;
      width: 80px;
      height: 32px;
    }

    .sparkline {
      width: 100%;
      height: 100%;
    }

    .sparkline-empty {
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        var(--uui-color-border) 0%,
        var(--uui-color-border) 50%,
        transparent 50%,
        transparent 100%
      );
      background-size: 8px 2px;
      background-position: bottom;
      background-repeat: repeat-x;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-kpi-card": MerchelloAnalyticsKpiCard;
  }
}

export default MerchelloAnalyticsKpiCard;
