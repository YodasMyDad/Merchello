import {
  LitElement,
  html,
  css,
  customElement,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { DateRange, DateRangePreset } from "../types/analytics.types.js";

export interface DateRangeChangeDetail {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
}

@customElement("merchello-analytics-header")
export class MerchelloAnalyticsHeader extends UmbElementMixin(LitElement) {
  @property({ type: Object })
  dateRange: DateRange = this._getDefaultDateRange();

  @state()
  private _activePreset: DateRangePreset = "last30days";

  @state()
  private _showCustomPicker = false;

  @state()
  private _customStartDate = "";

  @state()
  private _customEndDate = "";

  private _getDefaultDateRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: end };
  }

  private _formatDateRange(): string {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    const start = this.dateRange.startDate.toLocaleDateString(undefined, options);
    const end = this.dateRange.endDate.toLocaleDateString(undefined, options);

    // Check if same day
    if (this._isSameDay(this.dateRange.startDate, this.dateRange.endDate)) {
      return start;
    }

    return `${start} – ${end}`;
  }

  private _isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private _handlePresetClick(preset: DateRangePreset): void {
    this._activePreset = preset;
    this._showCustomPicker = preset === "custom";

    if (preset !== "custom") {
      const { startDate, endDate } = this._getPresetDateRange(preset);
      this._emitDateRangeChange(startDate, endDate, preset);
    }
  }

  private _getPresetDateRange(preset: DateRangePreset): DateRange {
    const end = new Date();
    const start = new Date();

    switch (preset) {
      case "today":
        // start is already today
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
        this._emitDateRangeChange(startDate, endDate, "custom");
      }
    }
  }

  private _emitDateRangeChange(startDate: Date, endDate: Date, preset: DateRangePreset): void {
    this.dispatchEvent(
      new CustomEvent<DateRangeChangeDetail>("date-range-change", {
        detail: { startDate, endDate, preset },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  override render() {
    return html`
      <div class="header">
        <div class="controls">
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
                    .value=${this._customStartDate || this._formatDateForInput(this.dateRange.startDate)}
                    @change=${this._handleCustomStartChange}
                    label="Start date">
                  </uui-input>
                  <span class="date-separator">to</span>
                  <uui-input
                    type="date"
                    .value=${this._customEndDate || this._formatDateForInput(this.dateRange.endDate)}
                    @change=${this._handleCustomEndChange}
                    label="End date">
                  </uui-input>
                </div>
              `
            : html`
                <div class="date-display">
                  <uui-icon name="icon-calendar"></uui-icon>
                  <span>${this._formatDateRange()}</span>
                </div>
              `}
        </div>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-5);
    }

    .controls {
      display: flex;
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

    .date-display {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text);
    }

    .date-display uui-icon {
      color: var(--uui-color-text-alt);
    }

    uui-input[type="date"] {
      width: 150px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-header": MerchelloAnalyticsHeader;
  }
}

export default MerchelloAnalyticsHeader;
