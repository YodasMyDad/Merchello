import { LitElement as E, nothing as n, html as s, css as z, property as T, customElement as A, state as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as L } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as te } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as ie } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT as B, UmbModalToken as ae, UMB_CONFIRM_MODAL as se } from "@umbraco-cms/backoffice/modal";
import { e as G, D as w, c as f, f as v, g as c, d as $, b as W, a as oe } from "./discount.types-DX82Q6oV.js";
import { M as x } from "./merchello-api-COnU_HX2.js";
import { g as re } from "./store-settings-BKyRkVmT.js";
import { D as ne, E as ue, F as le } from "./navigation-CvTcY6zJ.js";
import { a as ce, c as F } from "./formatting-CZRy3TEt.js";
import { M as de } from "./customer-picker-modal.token-BZSMisS9.js";
import { M as he, a as pe } from "./supplier-picker-modal.token-CHapAKSP.js";
import { M as me } from "./product-picker-modal.token-BfbHsSHl.js";
import { M as ge } from "./collection-picker-modal.token-DEqocfk-.js";
import { M as ve } from "./product-type-picker-modal.token-BIXbr0YK.js";
import { M as be } from "./filter-picker-modal.token-DlO79hNz.js";
var ye = Object.defineProperty, _e = Object.getOwnPropertyDescriptor, V = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? _e(t, i) : t, u = e.length - 1, r; u >= 0; u--)
    (r = e[u]) && (o = (a ? r(t, i, o) : r(o)) || o);
  return a && o && ye(t, i, o), o;
};
let R = class extends L(E) {
  constructor() {
    super(...arguments), this.isNew = !1;
  }
  _getCategoryInfo(e) {
    return G.find((t) => t.category === e);
  }
  _formatValue() {
    return this.discount ? this.discount.formattedValue : "";
  }
  _formatDate(e) {
    return e ? new Date(e).toLocaleDateString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) : "Not set";
  }
  _renderSummaryItem(e, t, i) {
    return t == null || t === "" ? n : s`
      <div class="summary-item">
        ${i ? s`<uui-icon name=${i}></uui-icon>` : n}
        <div class="summary-item-content">
          <span class="summary-item-label">${e}</span>
          <span class="summary-item-value">${t}</span>
        </div>
      </div>
    `;
  }
  render() {
    if (!this.discount) return n;
    const e = this._getCategoryInfo(this.discount.category), t = this.discount.statusLabel, i = this.discount.statusColor;
    return s`
      <uui-box>
        <!-- Header with category icon -->
        <div class="card-header">
          <div class="category-badge">
            <uui-icon name=${e?.icon ?? "icon-tag"}></uui-icon>
            <span>${e?.label ?? "Discount"}</span>
          </div>
          ${this.isNew ? n : s`<uui-tag look="secondary" color=${i}>${t}</uui-tag>`}
        </div>

        <!-- Code or Automatic badge -->
        <div class="method-section">
          ${this.discount.method === w.Code ? s`
                <div class="code-display">
                  <uui-icon name="icon-barcode"></uui-icon>
                  <span class="code-value">${this.discount.code || "No code set"}</span>
                </div>
              ` : s`
                <div class="automatic-badge">
                  <uui-icon name="icon-flash"></uui-icon>
                  <span>Automatic discount</span>
                </div>
              `}
        </div>

        <hr class="divider" />

        <!-- Summary Details -->
        <div class="summary-list">
          ${this._renderSummaryItem("Value", this._formatValue(), "icon-coin")}

          ${this.discount.requirementType !== f.None ? this._renderSummaryItem(
      "Minimum",
      this.discount.requirementType === f.MinimumPurchaseAmount ? `${this.discount.requirementValue} purchase` : `${this.discount.requirementValue} items`,
      "icon-shopping-basket"
    ) : n}

          ${this._renderSummaryItem(
      "Usage",
      this.discount.totalUsageLimit ? `${this.discount.currentUsageCount} / ${this.discount.totalUsageLimit}` : `${this.discount.currentUsageCount} uses`,
      "icon-users"
    )}

          ${this._renderSummaryItem("Starts", this._formatDate(this.discount.startsAt), "icon-calendar")}

          ${this.discount.endsAt ? this._renderSummaryItem("Ends", this._formatDate(this.discount.endsAt), "icon-calendar") : n}
        </div>

        <hr class="divider" />

        <!-- Combinations -->
        <div class="combinations-section">
          <span class="section-label">Combinations</span>
          <div class="combinations-icons">
            ${this.discount.canCombineWithProductDiscounts ? s`<uui-icon name="icon-tags" title="Combines with product discounts"></uui-icon>` : n}
            ${this.discount.canCombineWithOrderDiscounts ? s`<uui-icon name="icon-receipt-dollar" title="Combines with order discounts"></uui-icon>` : n}
            ${this.discount.canCombineWithShippingDiscounts ? s`<uui-icon name="icon-truck" title="Combines with shipping discounts"></uui-icon>` : n}
            ${!this.discount.canCombineWithProductDiscounts && !this.discount.canCombineWithOrderDiscounts && !this.discount.canCombineWithShippingDiscounts ? s`<span class="no-combinations">None</span>` : n}
          </div>
        </div>
      </uui-box>
    `;
  }
};
R.styles = z`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .category-badge {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .category-badge uui-icon {
      font-size: 1.2em;
    }

    .method-section {
      margin-bottom: var(--uui-size-space-3);
    }

    .code-display {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      border: 1px dashed var(--uui-color-border-emphasis);
    }

    .code-value {
      font-family: monospace;
      font-size: 1.1em;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .automatic-badge {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
    }

    .divider {
      border: none;
      border-top: 1px solid var(--uui-color-border);
      margin: var(--uui-size-space-3) 0;
    }

    .summary-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .summary-item {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
    }

    .summary-item uui-icon {
      color: var(--uui-color-text-alt);
      margin-top: 2px;
    }

    .summary-item-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .summary-item-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .summary-item-value {
      font-weight: 500;
    }

    .section-label {
      display: block;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    .combinations-section {
      margin-top: var(--uui-size-space-1);
    }

    .combinations-icons {
      display: flex;
      gap: var(--uui-size-space-3);
    }

    .combinations-icons uui-icon {
      font-size: 1.2em;
      color: var(--uui-color-positive);
    }

    .no-combinations {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }
  `;
V([
  T({ type: Object })
], R.prototype, "discount", 2);
V([
  T({ type: Boolean })
], R.prototype, "isNew", 2);
R = V([
  A("merchello-discount-summary-card")
], R);
var fe = Object.defineProperty, Ce = Object.getOwnPropertyDescriptor, C = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? Ce(t, i) : t, u = e.length - 1, r; u >= 0; u--)
    (r = e[u]) && (o = (a ? r(t, i, o) : r(o)) || o);
  return a && o && fe(t, i, o), o;
};
let _ = class extends L(E) {
  constructor() {
    super(...arguments), this.discountId = "", this._isLoading = !0, this._dateRange = this._getDefaultDateRange(), this._activePreset = "last30days", this._showCustomPicker = !1, this._customStartDate = "", this._customEndDate = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.discountId && this._loadPerformance();
  }
  updated(e) {
    e.has("discountId") && this.discountId && this._loadPerformance();
  }
  async _loadPerformance() {
    this._isLoading = !0, this._error = void 0;
    const { data: e, error: t } = await x.getDiscountPerformance(
      this.discountId,
      this._dateRange.startDate.toISOString(),
      this._dateRange.endDate.toISOString()
    );
    if (this._isLoading = !1, t) {
      this._error = t.message;
      return;
    }
    this._performance = e;
  }
  _getDefaultDateRange() {
    const e = /* @__PURE__ */ new Date(), t = /* @__PURE__ */ new Date();
    return t.setDate(t.getDate() - 30), { startDate: t, endDate: e };
  }
  _getPresetDateRange(e) {
    const t = /* @__PURE__ */ new Date(), i = /* @__PURE__ */ new Date();
    switch (e) {
      case "today":
        break;
      case "last7days":
        i.setDate(i.getDate() - 7);
        break;
      case "last30days":
        i.setDate(i.getDate() - 30);
        break;
      case "thisMonth":
        i.setDate(1);
        break;
      case "lastMonth": {
        i.setMonth(i.getMonth() - 1), i.setDate(1);
        const a = new Date(t.getFullYear(), t.getMonth(), 0);
        return { startDate: i, endDate: a };
      }
      default:
        i.setDate(i.getDate() - 30);
    }
    return { startDate: i, endDate: t };
  }
  _handlePresetClick(e) {
    this._activePreset = e, this._showCustomPicker = e === "custom", e !== "custom" && (this._dateRange = this._getPresetDateRange(e), this._loadPerformance());
  }
  _handleCustomStartChange(e) {
    const t = e.target;
    this._customStartDate = t.value, this._tryApplyCustomRange();
  }
  _handleCustomEndChange(e) {
    const t = e.target;
    this._customEndDate = t.value, this._tryApplyCustomRange();
  }
  _tryApplyCustomRange() {
    if (this._customStartDate && this._customEndDate) {
      const e = new Date(this._customStartDate), t = new Date(this._customEndDate);
      e <= t && (this._dateRange = { startDate: e, endDate: t }, this._loadPerformance());
    }
  }
  _formatDateForInput(e) {
    return e.toISOString().split("T")[0];
  }
  _formatCurrency(e) {
    return ce(e);
  }
  _formatDate(e) {
    return e ? new Date(e).toLocaleDateString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) : "Never";
  }
  _renderLoading() {
    return s`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading performance data...</span>
      </div>
    `;
  }
  _renderError() {
    return s`
      <div class="error">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._error}</span>
        <uui-button look="secondary" label="Retry" @click=${this._loadPerformance}>Retry</uui-button>
      </div>
    `;
  }
  _renderEmptyState() {
    return s`
      <div class="empty-state">
        <uui-icon name="icon-chart-line"></uui-icon>
        <h3>No usage data yet</h3>
        <p>This discount hasn't been used yet. Performance metrics will appear here once customers start using it.</p>
      </div>
    `;
  }
  _renderMetricCard(e, t, i, a) {
    return s`
      <div class="metric-card">
        <div class="metric-icon" style=${a ? `color: ${a}` : ""}>
          <uui-icon name=${i}></uui-icon>
        </div>
        <div class="metric-content">
          <span class="metric-value">${t}</span>
          <span class="metric-label">${e}</span>
        </div>
      </div>
    `;
  }
  _renderUsageChart() {
    if (!this._performance?.usageByDate?.length)
      return s`
        <div class="chart-placeholder">
          <p>No usage data available for the selected period</p>
        </div>
      `;
    const e = this._performance.usageByDate.length > 0 ? Math.max(...this._performance.usageByDate.map((t) => t.usageCount)) : 0;
    return s`
      <div class="chart-container">
        <div class="chart">
          ${this._performance.usageByDate.map((t) => {
      const i = e > 0 ? t.usageCount / e * 100 : 0, a = new Date(t.date);
      return s`
              <div class="chart-bar-container" title="${a.toLocaleDateString()}: ${t.usageCount} uses">
                <div class="chart-bar" style="height: ${i}%"></div>
                <span class="chart-label">${a.getDate()}</span>
              </div>
            `;
    })}
        </div>
      </div>
    `;
  }
  render() {
    return this._isLoading ? this._renderLoading() : this._error ? this._renderError() : !this._performance || this._performance.totalUsageCount === 0 ? this._renderEmptyState() : s`
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

          ${this._showCustomPicker ? s`
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
              ` : n}
        </div>

        <!-- Key Metrics -->
        <div class="metrics-grid">
          ${this._renderMetricCard(
      "Total Uses",
      F(this._performance.totalUsageCount),
      "icon-users",
      "var(--uui-color-positive)"
    )}
          ${this._renderMetricCard(
      "Unique Customers",
      F(this._performance.uniqueCustomersCount),
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
            ${this._performance.remainingUses !== null && this._performance.remainingUses !== void 0 ? s`
                  <div class="revenue-item">
                    <span class="revenue-label">Remaining Uses</span>
                    <span class="revenue-value ${this._performance.remainingUses === 0 ? "exhausted" : ""}">
                      ${F(this._performance.remainingUses)}
                    </span>
                  </div>
                ` : n}
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
};
_.styles = z`
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
C([
  T({ type: String })
], _.prototype, "discountId", 2);
C([
  d()
], _.prototype, "_performance", 2);
C([
  d()
], _.prototype, "_isLoading", 2);
C([
  d()
], _.prototype, "_error", 2);
C([
  d()
], _.prototype, "_dateRange", 2);
C([
  d()
], _.prototype, "_activePreset", 2);
C([
  d()
], _.prototype, "_showCustomPicker", 2);
C([
  d()
], _.prototype, "_customStartDate", 2);
C([
  d()
], _.prototype, "_customEndDate", 2);
_ = C([
  A("merchello-discount-performance")
], _);
var $e = Object.defineProperty, xe = Object.getOwnPropertyDescriptor, H = (e) => {
  throw TypeError(e);
}, U = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? xe(t, i) : t, u = e.length - 1, r; u >= 0; u--)
    (r = e[u]) && (o = (a ? r(t, i, o) : r(o)) || o);
  return a && o && $e(t, i, o), o;
}, K = (e, t, i) => t.has(e) || H("Cannot " + i), N = (e, t, i) => (K(e, t, "read from private field"), t.get(e)), De = (e, t, i) => t.has(e) ? H("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), we = (e, t, i, a) => (K(e, t, "write to private field"), t.set(e, i), i), I;
const j = [
  { value: v.AllCustomers, label: "Everyone" },
  { value: v.CustomerSegments, label: "Customer segments" },
  { value: v.SpecificCustomers, label: "Specific customers" }
];
function Ie(e) {
  return j.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
let P = class extends L(E) {
  constructor() {
    super(), this.rules = [], this.readonly = !1, De(this, I), this.consumeContext(B, (e) => {
      we(this, I, e);
    });
  }
  _dispatchChange() {
    this.dispatchEvent(
      new CustomEvent("rules-change", {
        detail: { rules: this.rules },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleAddRule() {
    const e = {
      id: crypto.randomUUID(),
      eligibilityType: v.AllCustomers,
      eligibilityIds: null,
      eligibilityNames: null
    };
    this.rules = [...this.rules, e], this._editingRule = { index: this.rules.length - 1, rule: e }, this._dispatchChange();
  }
  _handleRemoveRule(e) {
    this.rules = this.rules.filter((t, i) => i !== e), this._editingRule?.index === e && (this._editingRule = void 0), this._dispatchChange();
  }
  _handleUpdateRule(e, t) {
    this.rules = this.rules.map((i, a) => a === e ? { ...i, ...t } : i), this._dispatchChange();
  }
  _handleEligibilityTypeChange(e, t) {
    this._handleUpdateRule(e, {
      eligibilityType: t,
      eligibilityIds: t === v.AllCustomers ? null : [],
      eligibilityNames: null
    });
  }
  _getEligibilityTypeLabel(e) {
    return j.find((t) => t.value === e)?.label ?? "Unknown";
  }
  _getTypeIcon(e) {
    switch (e) {
      case v.AllCustomers:
        return "icon-globe";
      case v.CustomerSegments:
        return "icon-users";
      case v.SpecificCustomers:
        return "icon-user";
      default:
        return "icon-user";
    }
  }
  async _openCustomerPicker(e, t) {
    if (!N(this, I)) return;
    const a = await N(this, I).open(this, de, {
      data: {
        excludeCustomerIds: t.eligibilityIds ?? [],
        multiSelect: !0
      }
    }).onSubmit().catch(() => {
    });
    if (a?.selectedCustomerIds?.length) {
      const o = [];
      for (const u of a.selectedCustomerIds) {
        const { data: r } = await x.getCustomer(u);
        if (r) {
          const ee = [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email;
          o.push(ee);
        }
      }
      this._handleUpdateRule(e, {
        eligibilityIds: [...t.eligibilityIds ?? [], ...a.selectedCustomerIds],
        eligibilityNames: [...t.eligibilityNames ?? [], ...o]
      });
    }
  }
  async _openSegmentPicker(e, t) {
    if (!N(this, I)) return;
    const a = await N(this, I).open(this, he, {
      data: {
        excludeIds: t.eligibilityIds ?? [],
        multiSelect: !0
      }
    }).onSubmit().catch(() => {
    });
    a?.selectedIds?.length && this._handleUpdateRule(e, {
      eligibilityIds: [...t.eligibilityIds ?? [], ...a.selectedIds],
      eligibilityNames: [...t.eligibilityNames ?? [], ...a.selectedNames]
    });
  }
  _removeEligibilityItem(e, t, i) {
    const a = t.eligibilityIds?.filter((u, r) => r !== i) ?? [], o = t.eligibilityNames?.filter((u, r) => r !== i) ?? [];
    this._handleUpdateRule(e, {
      eligibilityIds: a.length > 0 ? a : [],
      eligibilityNames: o.length > 0 ? o : []
    });
  }
  _getPickerButtonLabel(e) {
    switch (e) {
      case v.SpecificCustomers:
        return "Select customers";
      case v.CustomerSegments:
        return "Select segments";
      default:
        return "Select items";
    }
  }
  async _openPicker(e, t) {
    switch (t.eligibilityType) {
      case v.SpecificCustomers:
        await this._openCustomerPicker(e, t);
        break;
      case v.CustomerSegments:
        await this._openSegmentPicker(e, t);
        break;
    }
  }
  _renderRuleCard(e, t) {
    const i = this._editingRule?.index === t, a = e.eligibilityIds && e.eligibilityIds.length > 0;
    return s`
      <div class="rule-card">
        <div class="rule-header">
          <div class="rule-type">
            <uui-icon name=${this._getTypeIcon(e.eligibilityType)}></uui-icon>
            <span>${this._getEligibilityTypeLabel(e.eligibilityType)}</span>
          </div>
          ${this.readonly ? n : s`
                <div class="rule-actions">
                  <uui-button
                    look="secondary"
                    compact
                    label=${i ? "Done" : "Edit"}
                    @click=${() => this._editingRule = i ? void 0 : { index: t, rule: e }}
                  >
                    ${i ? "Done" : "Edit"}
                  </uui-button>
                  <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
                    Remove
                  </uui-button>
                </div>
              `}
        </div>

        ${i ? s`
              <div class="rule-edit-form">
                <uui-form-layout-item>
                  <uui-label slot="label">Who can use this discount?</uui-label>
                  <uui-select
                    .options=${Ie(e.eligibilityType)}
                    @change=${(o) => this._handleEligibilityTypeChange(t, o.target.value)}
                  ></uui-select>
                </uui-form-layout-item>

                ${e.eligibilityType !== v.AllCustomers ? s`
                      <div class="selection-area">
                        <uui-button look="secondary" label="Select items" @click=${() => this._openPicker(t, e)}>
                          <uui-icon name="icon-search"></uui-icon>
                          ${this._getPickerButtonLabel(e.eligibilityType)}
                        </uui-button>
                        ${a ? s`
                              <uui-ref-list>
                                ${e.eligibilityNames?.map(
      (o, u) => s`
                                    <uui-ref-node name=${o}>
                                      <uui-icon slot="icon" name=${this._getTypeIcon(e.eligibilityType)}></uui-icon>
                                      <uui-action-bar slot="actions">
                                        <uui-button
                                          label="Remove"
                                          @click=${(r) => {
        r.stopPropagation(), this._removeEligibilityItem(t, e, u);
      }}></uui-button>
                                      </uui-action-bar>
                                    </uui-ref-node>
                                  `
    )}
                              </uui-ref-list>
                            ` : s`<small class="no-selection">No items selected</small>`}
                      </div>
                    ` : s`
                      <div class="info-message">
                        <uui-icon name="icon-info"></uui-icon>
                        <span>This discount will be available to all customers.</span>
                      </div>
                    `}
              </div>
            ` : s`
              <div class="rule-summary">
                ${e.eligibilityType === v.AllCustomers ? s`<span>Available to everyone</span>` : s`
                      <span>
                        ${a ? `${e.eligibilityIds?.length} item(s) selected` : "No items selected"}
                      </span>
                    `}
              </div>
            `}
      </div>
    `;
  }
  render() {
    return s`
      <div class="eligibility-rule-builder">
        <div class="builder-header">
          <span class="builder-title">Customer Eligibility</span>
          <span class="builder-description">Define who can use this discount</span>
        </div>

        ${this.rules.length === 0 ? s`
              <div class="empty-state">
                <uui-icon name="icon-users"></uui-icon>
                <p>No eligibility rules defined. By default, the discount is available to everyone.</p>
              </div>
            ` : s`
              <div class="rules-list">
                ${this.rules.map((e, t) => this._renderRuleCard(e, t))}
              </div>
            `}

        ${this.readonly ? n : s`
              <uui-button look="secondary" label="Add eligibility rule" @click=${this._handleAddRule}>
                <uui-icon name="icon-add"></uui-icon>
                Add eligibility rule
              </uui-button>
            `}
      </div>
    `;
  }
};
I = /* @__PURE__ */ new WeakMap();
P.styles = z`
    :host {
      display: block;
    }

    .eligibility-rule-builder {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .builder-header {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .builder-title {
      font-weight: 600;
    }

    .builder-description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-5);
      text-align: center;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 2em;
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-state p {
      margin: 0;
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .rule-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
    }

    .rule-type {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .rule-type uui-icon {
      color: var(--uui-color-current);
    }

    .rule-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .rule-edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
    }

    .rule-summary {
      padding: var(--uui-size-space-3);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .selection-area {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    uui-ref-list {
      margin-top: var(--uui-size-space-2);
    }

    .no-selection {
      color: var(--uui-color-text-alt);
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .info-message uui-icon {
      color: var(--uui-color-current);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-select {
      width: 100%;
    }
  `;
U([
  T({ type: Array })
], P.prototype, "rules", 2);
U([
  T({ type: Boolean })
], P.prototype, "readonly", 2);
U([
  d()
], P.prototype, "_editingRule", 2);
P = U([
  A("merchello-eligibility-rule-builder")
], P);
const Te = new ae("Merchello.WarehousePicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var Pe = Object.defineProperty, Se = Object.getOwnPropertyDescriptor, Y = (e) => {
  throw TypeError(e);
}, q = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? Se(t, i) : t, u = e.length - 1, r; u >= 0; u--)
    (r = e[u]) && (o = (a ? r(t, i, o) : r(o)) || o);
  return a && o && Pe(t, i, o), o;
}, X = (e, t, i) => t.has(e) || Y("Cannot " + i), y = (e, t, i) => (X(e, t, "read from private field"), t.get(e)), ke = (e, t, i) => t.has(e) ? Y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), Re = (e, t, i, a) => (X(e, t, "write to private field"), t.set(e, i), i), m;
const Q = [
  { value: c.AllProducts, label: "All products" },
  { value: c.SpecificProducts, label: "Specific products" },
  { value: c.Collections, label: "Specific collections" },
  { value: c.ProductFilters, label: "Product filters" },
  { value: c.ProductTypes, label: "Product types" },
  { value: c.Suppliers, label: "Suppliers" },
  { value: c.Warehouses, label: "Warehouses" }
];
function Ee(e) {
  return Q.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
function ze(e) {
  return [
    { name: "Include these products", value: "include", selected: !e },
    { name: "Exclude these products", value: "exclude", selected: e }
  ];
}
let S = class extends L(E) {
  constructor() {
    super(), this.rules = [], this.readonly = !1, ke(this, m), this.consumeContext(B, (e) => {
      Re(this, m, e);
    });
  }
  _dispatchChange() {
    this.dispatchEvent(
      new CustomEvent("rules-change", {
        detail: { rules: this.rules },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleAddRule() {
    const e = {
      id: crypto.randomUUID(),
      targetType: c.AllProducts,
      targetIds: null,
      targetNames: null,
      isExclusion: !1
    };
    this.rules = [...this.rules, e], this._editingRule = { index: this.rules.length - 1, rule: e }, this._dispatchChange();
  }
  _handleRemoveRule(e) {
    this.rules = this.rules.filter((t, i) => i !== e), this._editingRule?.index === e && (this._editingRule = void 0), this._dispatchChange();
  }
  _handleUpdateRule(e, t) {
    this.rules = this.rules.map((i, a) => a === e ? { ...i, ...t } : i), this._dispatchChange();
  }
  _handleTargetTypeChange(e, t) {
    this._handleUpdateRule(e, {
      targetType: t,
      targetIds: t === c.AllProducts ? null : [],
      targetNames: null
    });
  }
  _getTargetTypeLabel(e) {
    return Q.find((t) => t.value === e)?.label ?? "Unknown";
  }
  async _openProductPicker(e, t) {
    if (!y(this, m)) return;
    const a = await y(this, m).open(this, me, {
      data: {
        config: {
          currencySymbol: "",
          excludeProductIds: t.targetIds ?? []
        }
      }
    }).onSubmit().catch(() => {
    });
    if (a?.selections?.length) {
      const o = a.selections.map((r) => r.productId), u = a.selections.map((r) => r.name);
      this._handleUpdateRule(e, {
        targetIds: [...t.targetIds ?? [], ...o],
        targetNames: [...t.targetNames ?? [], ...u]
      });
    }
  }
  async _openCollectionPicker(e, t) {
    if (!y(this, m)) return;
    const a = await y(this, m).open(this, ge, {
      data: {
        excludeIds: t.targetIds ?? [],
        multiSelect: !0
      }
    }).onSubmit().catch(() => {
    });
    a?.selectedIds?.length && this._handleUpdateRule(e, {
      targetIds: [...t.targetIds ?? [], ...a.selectedIds],
      targetNames: [...t.targetNames ?? [], ...a.selectedNames]
    });
  }
  async _openProductTypePicker(e, t) {
    if (!y(this, m)) return;
    const a = await y(this, m).open(this, ve, {
      data: {
        excludeIds: t.targetIds ?? [],
        multiSelect: !0
      }
    }).onSubmit().catch(() => {
    });
    a?.selectedIds?.length && this._handleUpdateRule(e, {
      targetIds: [...t.targetIds ?? [], ...a.selectedIds],
      targetNames: [...t.targetNames ?? [], ...a.selectedNames]
    });
  }
  async _openSupplierPicker(e, t) {
    if (!y(this, m)) return;
    const a = await y(this, m).open(this, pe, {
      data: {
        excludeIds: t.targetIds ?? [],
        multiSelect: !0
      }
    }).onSubmit().catch(() => {
    });
    a?.selectedIds?.length && this._handleUpdateRule(e, {
      targetIds: [...t.targetIds ?? [], ...a.selectedIds],
      targetNames: [...t.targetNames ?? [], ...a.selectedNames]
    });
  }
  async _openWarehousePicker(e, t) {
    if (!y(this, m)) return;
    const a = await y(this, m).open(this, Te, {
      data: {
        excludeIds: t.targetIds ?? [],
        multiSelect: !0
      }
    }).onSubmit().catch(() => {
    });
    a?.selectedIds?.length && this._handleUpdateRule(e, {
      targetIds: [...t.targetIds ?? [], ...a.selectedIds],
      targetNames: [...t.targetNames ?? [], ...a.selectedNames]
    });
  }
  async _openFilterPicker(e, t) {
    if (!y(this, m)) return;
    const a = await y(this, m).open(this, be, {
      data: {
        excludeFilterIds: t.targetIds ?? [],
        multiSelect: !0
      }
    }).onSubmit().catch(() => {
    });
    a?.selectedFilterIds?.length && this._handleUpdateRule(e, {
      targetIds: [...t.targetIds ?? [], ...a.selectedFilterIds],
      targetNames: [...t.targetNames ?? [], ...a.selectedFilterNames]
    });
  }
  _removeTargetItem(e, t, i) {
    const a = t.targetIds?.filter((u, r) => r !== i) ?? [], o = t.targetNames?.filter((u, r) => r !== i) ?? [];
    this._handleUpdateRule(e, {
      targetIds: a.length > 0 ? a : [],
      targetNames: o.length > 0 ? o : []
    });
  }
  _getIconForTargetType(e) {
    switch (e) {
      case c.SpecificProducts:
        return "icon-box";
      case c.Collections:
        return "icon-categories";
      case c.ProductFilters:
        return "icon-filter";
      case c.ProductTypes:
        return "icon-item-arrangement";
      case c.Suppliers:
        return "icon-truck";
      case c.Warehouses:
        return "icon-store";
      default:
        return "icon-document";
    }
  }
  _getPickerButtonLabel(e) {
    switch (e) {
      case c.SpecificProducts:
        return "Select products";
      case c.Collections:
        return "Select collections";
      case c.ProductFilters:
        return "Select product filters";
      case c.ProductTypes:
        return "Select product types";
      case c.Suppliers:
        return "Select suppliers";
      case c.Warehouses:
        return "Select warehouses";
      default:
        return "Select items";
    }
  }
  async _openPicker(e, t) {
    switch (t.targetType) {
      case c.SpecificProducts:
        await this._openProductPicker(e, t);
        break;
      case c.Collections:
        await this._openCollectionPicker(e, t);
        break;
      case c.ProductFilters:
        await this._openFilterPicker(e, t);
        break;
      case c.ProductTypes:
        await this._openProductTypePicker(e, t);
        break;
      case c.Suppliers:
        await this._openSupplierPicker(e, t);
        break;
      case c.Warehouses:
        await this._openWarehousePicker(e, t);
        break;
    }
  }
  _renderRuleCard(e, t) {
    const i = this._editingRule?.index === t, a = e.targetIds && e.targetIds.length > 0;
    return s`
      <div class="rule-card ${e.isExclusion ? "exclusion" : "inclusion"}">
        <div class="rule-header">
          <div class="rule-type">
            ${e.isExclusion ? s`<uui-tag look="secondary" color="danger">Exclude</uui-tag>` : s`<uui-tag look="secondary" color="positive">Include</uui-tag>`}
            <span>${this._getTargetTypeLabel(e.targetType)}</span>
          </div>
          ${this.readonly ? n : s`
                <div class="rule-actions">
                  <uui-button
                    look="secondary"
                    compact
                    label=${i ? "Done" : "Edit"}
                    @click=${() => this._editingRule = i ? void 0 : { index: t, rule: e }}
                  >
                    ${i ? "Done" : "Edit"}
                  </uui-button>
                  <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
                    Remove
                  </uui-button>
                </div>
              `}
        </div>

        ${i ? s`
              <div class="rule-edit-form">
                <uui-form-layout-item>
                  <uui-label slot="label">Rule Type</uui-label>
                  <uui-select
                    .options=${Ee(e.targetType)}
                    @change=${(o) => this._handleTargetTypeChange(t, o.target.value)}
                  ></uui-select>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Action</uui-label>
                  <uui-select
                    .options=${ze(e.isExclusion)}
                    @change=${(o) => this._handleUpdateRule(t, { isExclusion: o.target.value === "exclude" })}
                  ></uui-select>
                </uui-form-layout-item>

                ${e.targetType !== c.AllProducts ? s`
                      <div class="selection-area">
                        <uui-button look="secondary" label="Select items" @click=${() => this._openPicker(t, e)}>
                          <uui-icon name="icon-search"></uui-icon>
                          ${this._getPickerButtonLabel(e.targetType)}
                        </uui-button>
                        ${a ? s`
                              <uui-ref-list>
                                ${e.targetNames?.map(
      (o, u) => s`
                                    <uui-ref-node name=${o}>
                                      <uui-icon slot="icon" name=${this._getIconForTargetType(e.targetType)}></uui-icon>
                                      <uui-action-bar slot="actions">
                                        <uui-button
                                          label="Remove"
                                          @click=${(r) => {
        r.stopPropagation(), this._removeTargetItem(t, e, u);
      }}></uui-button>
                                      </uui-action-bar>
                                    </uui-ref-node>
                                  `
    )}
                              </uui-ref-list>
                            ` : s`<small class="no-selection">No items selected</small>`}
                      </div>
                    ` : n}
              </div>
            ` : s`
              <div class="rule-summary">
                ${e.targetType === c.AllProducts ? s`<span>Applies to all products</span>` : s`
                      <span>
                        ${a ? `${e.targetIds?.length} item(s) selected` : "No items selected"}
                      </span>
                    `}
              </div>
            `}
      </div>
    `;
  }
  render() {
    return s`
      <div class="target-rule-builder">
        <div class="builder-header">
          <span class="builder-title">Target Rules</span>
          <span class="builder-description">Define which products this discount applies to</span>
        </div>

        ${this.rules.length === 0 ? s`
              <div class="empty-state">
                <uui-icon name="icon-filter"></uui-icon>
                <p>No target rules defined. By default, the discount applies to all products.</p>
              </div>
            ` : s`
              <div class="rules-list">
                ${this.rules.map((e, t) => this._renderRuleCard(e, t))}
              </div>
            `}

        ${this.readonly ? n : s`
              <uui-button look="secondary" label="Add target rule" @click=${this._handleAddRule}>
                <uui-icon name="icon-add"></uui-icon>
                Add target rule
              </uui-button>
            `}
      </div>
    `;
  }
};
m = /* @__PURE__ */ new WeakMap();
S.styles = z`
    :host {
      display: block;
    }

    .target-rule-builder {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .builder-header {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .builder-title {
      font-weight: 600;
    }

    .builder-description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-5);
      text-align: center;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 2em;
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-state p {
      margin: 0;
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .rule-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .rule-card.inclusion {
      border-left: 3px solid var(--uui-color-positive);
    }

    .rule-card.exclusion {
      border-left: 3px solid var(--uui-color-danger);
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
    }

    .rule-type {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .rule-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .rule-edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
    }

    .rule-summary {
      padding: var(--uui-size-space-3);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .selection-area {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    uui-ref-list {
      margin-top: var(--uui-size-space-2);
    }

    .no-selection {
      color: var(--uui-color-text-alt);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-select {
      width: 100%;
    }
  `;
q([
  T({ type: Array })
], S.prototype, "rules", 2);
q([
  T({ type: Boolean })
], S.prototype, "readonly", 2);
q([
  d()
], S.prototype, "_editingRule", 2);
S = q([
  A("merchello-target-rule-builder")
], S);
var Ae = Object.defineProperty, Le = Object.getOwnPropertyDescriptor, Z = (e) => {
  throw TypeError(e);
}, b = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? Le(t, i) : t, u = e.length - 1, r; u >= 0; u--)
    (r = e[u]) && (o = (a ? r(t, i, o) : r(o)) || o);
  return a && o && Ae(t, i, o), o;
}, J = (e, t, i) => t.has(e) || Z("Cannot " + i), l = (e, t, i) => (J(e, t, "read from private field"), t.get(e)), O = (e, t, i) => t.has(e) ? Z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), k = (e, t, i, a) => (J(e, t, "write to private field"), t.set(e, i), i), p, g, M, D;
let h = class extends L(E) {
  constructor() {
    super(), this._isNew = !0, this._isLoading = !0, this._isSaving = !1, this._validationErrors = /* @__PURE__ */ new Map(), this._codeAvailable = null, this._isGeneratingCode = !1, this._targetRules = [], this._eligibilityRules = [], this._discountCodeLength = 8, this._routes = [], this._activePath = "", O(this, p), O(this, g), O(this, M), O(this, D), this._initRoutes(), this._loadSettings(), this.consumeContext(te, (e) => {
      k(this, p, e), l(this, p) && (this._isNew = l(this, p).isNew, this.observe(l(this, p).discount, (t) => {
        this._discount = t, this._targetRules = t?.targetRules ?? [], this._eligibilityRules = t?.eligibilityRules ?? [], this._isLoading = !1;
      }, "_discount"), this.observe(l(this, p).isLoading, (t) => {
        this._isLoading = t;
      }, "_isLoading"), this.observe(l(this, p).isSaving, (t) => {
        this._isSaving = t;
      }, "_isSaving"));
    }), this.consumeContext(ie, (e) => {
      k(this, g, e);
    }), this.consumeContext(B, (e) => {
      k(this, M, e);
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback(), l(this, D) && (clearTimeout(l(this, D)), k(this, D, void 0));
  }
  async _loadSettings() {
    const e = await re();
    this._discountCodeLength = e.discountCodeLength;
  }
  // ============================================
  // Router Methods
  // ============================================
  /**
   * Initialize routes for URL-based tab navigation
   */
  _initRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/details", component: e },
      { path: "tab/targets", component: e },
      { path: "tab/requirements", component: e },
      { path: "tab/eligibility", component: e },
      { path: "tab/combinations", component: e },
      { path: "tab/schedule", component: e },
      { path: "tab/performance", component: e },
      { path: "", redirectTo: "tab/details" }
    ];
  }
  /**
   * Get the currently active tab from the router path
   */
  _getActiveTab() {
    return this._activePath.includes("tab/targets") ? "targets" : this._activePath.includes("tab/requirements") ? "requirements" : this._activePath.includes("tab/eligibility") ? "eligibility" : this._activePath.includes("tab/combinations") ? "combinations" : this._activePath.includes("tab/schedule") ? "schedule" : this._activePath.includes("tab/performance") ? "performance" : "details";
  }
  /**
   * Handle router slot initialization
   */
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  /**
   * Handle router slot path changes
   */
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
  }
  _getCategoryInfo(e) {
    return G.find((t) => t.category === e);
  }
  _getMethodOptions() {
    return [
      { name: "Discount code", value: w.Code, selected: this._discount?.method === w.Code },
      { name: "Automatic discount", value: w.Automatic, selected: this._discount?.method === w.Automatic }
    ];
  }
  _getValueTypeOptions() {
    const e = [
      { name: "Percentage", value: $.Percentage, selected: this._discount?.valueType === $.Percentage },
      { name: "Fixed amount", value: $.FixedAmount, selected: this._discount?.valueType === $.FixedAmount }
    ];
    return this._discount?.category === W.BuyXGetY && e.push({ name: "Free", value: $.Free, selected: this._discount?.valueType === $.Free }), e;
  }
  _getRequirementTypeOptions() {
    return [
      { name: "No minimum requirements", value: f.None, selected: this._discount?.requirementType === f.None },
      { name: "Minimum purchase amount", value: f.MinimumPurchaseAmount, selected: this._discount?.requirementType === f.MinimumPurchaseAmount },
      { name: "Minimum quantity of items", value: f.MinimumQuantity, selected: this._discount?.requirementType === f.MinimumQuantity }
    ];
  }
  _getHeadline() {
    return this._isNew ? `Create ${this._getCategoryInfo(this._discount?.category ?? W.AmountOffProducts)?.label ?? "discount"}` : this._discount?.name ?? "Edit discount";
  }
  _handleInputChange(e, t) {
    if (!this._discount) return;
    const i = { ...this._discount, [e]: t };
    l(this, p)?.updateDiscount(i), this._validationErrors.delete(e), this.requestUpdate();
  }
  _handleCodeInput(e) {
    const i = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    this._handleInputChange("code", i || null), l(this, D) && clearTimeout(l(this, D)), i ? k(this, D, setTimeout(() => {
      this._checkCodeAvailability(i);
    }, 500)) : this._codeAvailable = null;
  }
  async _checkCodeAvailability(e) {
    const { data: t, error: i } = await x.checkDiscountCodeAvailable(
      e,
      this._isNew ? void 0 : this._discount?.id
    );
    !i && t && (this._codeAvailable = t.isAvailable ?? t.available ?? null);
  }
  async _handleGenerateCode() {
    this._isGeneratingCode = !0;
    const { data: e, error: t } = await x.generateDiscountCode(this._discountCodeLength);
    this._isGeneratingCode = !1, !t && e && (this._handleInputChange("code", e.code), this._codeAvailable = !0);
  }
  _handleTargetRulesChange(e) {
    this._targetRules = e.detail.rules;
  }
  _handleEligibilityRulesChange(e) {
    this._eligibilityRules = e.detail.rules;
  }
  /**
   * UX validation only - checks for required fields to provide immediate feedback.
   * Business rule validation (value ranges, percentages) is handled by backend.
   */
  _validate() {
    return this._validationErrors.clear(), this._discount?.name?.trim() || this._validationErrors.set("name", "Name is required"), this._discount?.method === w.Code && !this._discount.code?.trim() && this._validationErrors.set("code", "Code is required for code-based discounts"), this.requestUpdate(), this._validationErrors.size === 0;
  }
  async _handleSave() {
    if (!this._discount || !this._validate()) {
      l(this, g)?.peek("warning", {
        data: { headline: "Validation failed", message: "Please fix the errors before saving" }
      });
      return;
    }
    if (l(this, p)?.setIsSaving(!0), this._isNew) {
      const e = {
        name: this._discount.name,
        description: this._discount.description,
        showInFeed: this._discount.showInFeed,
        feedPromotionName: this._discount.feedPromotionName,
        category: this._discount.category,
        method: this._discount.method,
        code: this._discount.code,
        valueType: this._discount.valueType,
        value: this._discount.value,
        startsAt: this._discount.startsAt,
        endsAt: this._discount.endsAt,
        timezone: this._discount.timezone,
        totalUsageLimit: this._discount.totalUsageLimit,
        perCustomerUsageLimit: this._discount.perCustomerUsageLimit,
        perOrderUsageLimit: this._discount.perOrderUsageLimit,
        requirementType: this._discount.requirementType,
        requirementValue: this._discount.requirementValue,
        canCombineWithProductDiscounts: this._discount.canCombineWithProductDiscounts,
        canCombineWithOrderDiscounts: this._discount.canCombineWithOrderDiscounts,
        canCombineWithShippingDiscounts: this._discount.canCombineWithShippingDiscounts,
        applyAfterTax: this._discount.applyAfterTax,
        priority: this._discount.priority,
        targetRules: this._targetRules.map((a) => ({
          targetType: a.targetType,
          targetIds: a.targetIds,
          isExclusion: a.isExclusion
        })),
        eligibilityRules: this._eligibilityRules.map((a) => ({
          eligibilityType: a.eligibilityType,
          eligibilityIds: a.eligibilityIds
        }))
      }, { data: t, error: i } = await x.createDiscount(e);
      if (l(this, p)?.setIsSaving(!1), i) {
        l(this, g)?.peek("danger", {
          data: { headline: "Failed to create discount", message: i.message }
        });
        return;
      }
      t && (l(this, p)?.updateDiscount(t), this._isNew = !1, l(this, g)?.peek("positive", {
        data: { headline: "Discount created", message: `${t.name} has been created` }
      }), ne(t.id));
    } else {
      const e = {
        id: this._discount.id,
        name: this._discount.name,
        description: this._discount.description,
        showInFeed: this._discount.showInFeed,
        feedPromotionName: this._discount.feedPromotionName,
        category: this._discount.category,
        method: this._discount.method,
        code: this._discount.code,
        valueType: this._discount.valueType,
        value: this._discount.value,
        startsAt: this._discount.startsAt,
        endsAt: this._discount.endsAt,
        timezone: this._discount.timezone,
        totalUsageLimit: this._discount.totalUsageLimit,
        perCustomerUsageLimit: this._discount.perCustomerUsageLimit,
        perOrderUsageLimit: this._discount.perOrderUsageLimit,
        requirementType: this._discount.requirementType,
        requirementValue: this._discount.requirementValue,
        canCombineWithProductDiscounts: this._discount.canCombineWithProductDiscounts,
        canCombineWithOrderDiscounts: this._discount.canCombineWithOrderDiscounts,
        canCombineWithShippingDiscounts: this._discount.canCombineWithShippingDiscounts,
        applyAfterTax: this._discount.applyAfterTax,
        priority: this._discount.priority,
        targetRules: this._targetRules.map((a) => ({
          targetType: a.targetType,
          targetIds: a.targetIds,
          isExclusion: a.isExclusion
        })),
        eligibilityRules: this._eligibilityRules.map((a) => ({
          eligibilityType: a.eligibilityType,
          eligibilityIds: a.eligibilityIds
        }))
      }, { data: t, error: i } = await x.updateDiscount(this._discount.id, e);
      if (l(this, p)?.setIsSaving(!1), i) {
        l(this, g)?.peek("danger", {
          data: { headline: "Failed to update discount", message: i.message }
        });
        return;
      }
      t && (l(this, p)?.updateDiscount(t), l(this, g)?.peek("positive", {
        data: { headline: "Discount saved", message: `${t.name} has been updated` }
      }));
    }
  }
  async _handleDelete() {
    if (!this._discount?.id) return;
    const e = l(this, M)?.open(this, se, {
      data: {
        headline: "Delete Discount",
        content: `Are you sure you want to delete "${this._discount.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await e?.onSubmit();
    } catch {
      return;
    }
    const { error: t } = await x.deleteDiscount(this._discount.id);
    if (t) {
      l(this, g)?.peek("danger", {
        data: { headline: "Failed to delete discount", message: t.message }
      });
      return;
    }
    l(this, g)?.peek("positive", {
      data: { headline: "Discount deleted", message: `${this._discount.name} has been deleted` }
    }), ue();
  }
  async _handleActivate() {
    if (!this._discount?.id) return;
    const { data: e, error: t } = await x.activateDiscount(this._discount.id);
    if (t) {
      l(this, g)?.peek("danger", {
        data: { headline: "Failed to activate discount", message: t.message }
      });
      return;
    }
    e && (l(this, p)?.updateDiscount(e), l(this, g)?.peek("positive", {
      data: { headline: "Discount activated", message: `${e.name} is now active` }
    }));
  }
  async _handleDeactivate() {
    if (!this._discount?.id) return;
    const { data: e, error: t } = await x.deactivateDiscount(this._discount.id);
    if (t) {
      l(this, g)?.peek("danger", {
        data: { headline: "Failed to deactivate discount", message: t.message }
      });
      return;
    }
    e && (l(this, p)?.updateDiscount(e), l(this, g)?.peek("positive", {
      data: { headline: "Discount deactivated", message: `${e.name} has been disabled` }
    }));
  }
  _renderDetailsTab() {
    return s`
      <uui-box headline="Basic Information">
        <div class="form-grid">
          <umb-property-layout
            label="Name"
            ?mandatory=${!0}
            ?invalid=${this._validationErrors.has("name")}>
            <uui-input
              slot="editor"
              maxlength="300"
              .value=${this._discount?.name ?? ""}
              @input=${(e) => this._handleInputChange("name", e.target.value)}
              placeholder="e.g., Summer Sale 20% Off"
              ?invalid=${this._validationErrors.has("name")}
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Description"
            description="Internal description for this discount">
            <uui-textarea
              slot="editor"
              maxlength="1000"
              .value=${this._discount?.description ?? ""}
              @input=${(e) => this._handleInputChange("description", e.target.value)}
              placeholder="Internal description for this discount"
            ></uui-textarea>
          </umb-property-layout>
        </div>
      </uui-box>

      <uui-box headline="Discount Method">
        <div class="form-grid">
          <umb-property-layout label="Method">
            <uui-select
              slot="editor"
              label="Method"
              .options=${this._getMethodOptions()}
              @change=${(e) => this._handleInputChange("method", e.target.value)}
            ></uui-select>
          </umb-property-layout>

          ${this._discount?.method === w.Code ? s`
                <umb-property-layout
                  label="Discount Code"
                  ?mandatory=${!0}
                  ?invalid=${this._validationErrors.has("code") || this._codeAvailable === !1}>
                  <div slot="editor" class="code-input-row">
                    <uui-input
                      maxlength="50"
                      .value=${this._discount?.code ?? ""}
                      @input=${this._handleCodeInput}
                      placeholder="e.g., SUMMER20"
                      ?invalid=${this._validationErrors.has("code") || this._codeAvailable === !1}
                    ></uui-input>
                    <uui-button
                      look="secondary"
                      @click=${this._handleGenerateCode}
                      ?disabled=${this._isGeneratingCode}
                    >
                      ${this._isGeneratingCode ? "Generating..." : "Generate"}
                    </uui-button>
                  </div>
                  ${this._validationErrors.has("code") ? s`<div class="error-message">${this._validationErrors.get("code")}</div>` : this._codeAvailable === !1 ? s`<div class="error-message">This code is already in use</div>` : this._codeAvailable === !0 ? s`<div class="success-message">Code is available</div>` : n}
                </umb-property-layout>
              ` : n}
        </div>
      </uui-box>

      <uui-box headline="Discount Value">
        <div class="form-grid">
          <umb-property-layout label="Value Type">
            <uui-select
              slot="editor"
              label="Value type"
              .options=${this._getValueTypeOptions()}
              @change=${(e) => this._handleInputChange("valueType", e.target.value)}
            ></uui-select>
          </umb-property-layout>

          ${this._discount?.valueType !== $.Free ? s`
                <umb-property-layout
                  label=${this._discount?.valueType === $.Percentage ? "Percentage (%)" : "Amount"}
                  ?mandatory=${!0}
                  ?invalid=${this._validationErrors.has("value")}>
                  <uui-input
                    slot="editor"
                    type="number"
                    min="0"
                    max=${this._discount?.valueType === $.Percentage ? "100" : ""}
                    step="0.01"
                    .value=${String(this._discount?.value ?? "")}
                    @input=${(e) => this._handleInputChange("value", parseFloat(e.target.value) || 0)}
                    ?invalid=${this._validationErrors.has("value")}
                  ></uui-input>
                </umb-property-layout>
              ` : n}
        </div>
      </uui-box>

      <uui-box headline="Product Feed">
        <div class="form-grid">
          <umb-property-layout
            label="Show in feed"
            description="Include this discount as a promotion in product feeds (e.g. Google Merchant Center)">
            <uui-toggle
              slot="editor"
              label="Show in feed"
              .checked=${this._discount?.showInFeed ?? !1}
              @change=${(e) => this._handleInputChange("showInFeed", e.target.checked)}
            ></uui-toggle>
          </umb-property-layout>

          ${this._discount?.showInFeed ? s`
                <umb-property-layout
                  label="Feed promotion name"
                  description="Name shown in the feed. Leave empty to use the discount name.">
                  <uui-input
                    slot="editor"
                    .value=${this._discount?.feedPromotionName ?? ""}
                    @input=${(e) => this._handleInputChange("feedPromotionName", e.target.value)}
                    placeholder=${this._discount?.name ?? "Uses discount name"}
                  ></uui-input>
                </umb-property-layout>
              ` : n}
        </div>
      </uui-box>
    `;
  }
  _renderRequirementsTab() {
    return s`
      <uui-box headline="Minimum Requirements">
        <div class="form-grid">
          <umb-property-layout label="Requirement Type">
            <uui-select
              slot="editor"
              label="Requirement type"
              .options=${this._getRequirementTypeOptions()}
              @change=${(e) => this._handleInputChange("requirementType", e.target.value)}
            ></uui-select>
          </umb-property-layout>

          ${this._discount?.requirementType !== f.None ? s`
                <umb-property-layout
                  label=${this._discount?.requirementType === f.MinimumPurchaseAmount ? "Minimum Amount" : "Minimum Quantity"}
                  ?mandatory=${!0}
                  ?invalid=${this._validationErrors.has("requirementValue")}>
                  <uui-input
                    slot="editor"
                    type="number"
                    min="0"
                    step=${this._discount?.requirementType === f.MinimumPurchaseAmount ? "0.01" : "1"}
                    .value=${String(this._discount?.requirementValue ?? "")}
                    @input=${(e) => this._handleInputChange("requirementValue", parseFloat(e.target.value) || null)}
                    ?invalid=${this._validationErrors.has("requirementValue")}
                  ></uui-input>
                </umb-property-layout>
              ` : n}
        </div>
      </uui-box>

      <uui-box headline="Usage Limits">
        <div class="form-grid">
          <umb-property-layout
            label="Total usage limit"
            description="Leave empty for unlimited uses">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              step="1"
              .value=${String(this._discount?.totalUsageLimit ?? "")}
              @input=${(e) => {
      const t = e.target.value;
      this._handleInputChange("totalUsageLimit", t ? parseInt(t, 10) : null);
    }}
              placeholder="Unlimited"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Per customer limit"
            description="Max uses per customer">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              step="1"
              .value=${String(this._discount?.perCustomerUsageLimit ?? "")}
              @input=${(e) => {
      const t = e.target.value;
      this._handleInputChange("perCustomerUsageLimit", t ? parseInt(t, 10) : null);
    }}
              placeholder="Unlimited"
            ></uui-input>
          </umb-property-layout>

          ${this._discount?.category === W.BuyXGetY ? s`
                <umb-property-layout
                  label="Per order limit"
                  description="Max times per order (for Buy X Get Y)">
                  <uui-input
                    slot="editor"
                    type="number"
                    min="0"
                    step="1"
                    .value=${String(this._discount?.perOrderUsageLimit ?? "")}
                    @input=${(e) => {
      const t = e.target.value;
      this._handleInputChange("perOrderUsageLimit", t ? parseInt(t, 10) : null);
    }}
                    placeholder="Unlimited"
                  ></uui-input>
                </umb-property-layout>
              ` : n}
        </div>
      </uui-box>
    `;
  }
  _renderCombinationsTab() {
    return s`
      <uui-box headline="Discount Combinations">
        <p class="box-description">
          Choose which other discount types can be used together with this discount.
          If no options are selected, this discount cannot be combined with any other discounts.
        </p>
        <div class="checkbox-group">
          <uui-checkbox
            label="Can combine with product discounts"
            ?checked=${this._discount?.canCombineWithProductDiscounts}
            @change=${(e) => this._handleInputChange("canCombineWithProductDiscounts", e.target.checked)}
          >
            Can combine with product discounts
          </uui-checkbox>

          <uui-checkbox
            label="Can combine with order discounts"
            ?checked=${this._discount?.canCombineWithOrderDiscounts}
            @change=${(e) => this._handleInputChange("canCombineWithOrderDiscounts", e.target.checked)}
          >
            Can combine with order discounts
          </uui-checkbox>

          <uui-checkbox
            label="Can combine with shipping discounts"
            ?checked=${this._discount?.canCombineWithShippingDiscounts}
            @change=${(e) => this._handleInputChange("canCombineWithShippingDiscounts", e.target.checked)}
          >
            Can combine with shipping discounts
          </uui-checkbox>
        </div>
      </uui-box>

      <uui-box headline="Tax Calculation">
        <p class="box-description">
          Choose how the discount is calculated in relation to tax.
        </p>
        <div class="checkbox-group">
          <uui-checkbox
            label="Calculate discount on total including tax"
            ?checked=${this._discount?.applyAfterTax}
            @change=${(e) => this._handleInputChange("applyAfterTax", e.target.checked)}
          >
            Calculate discount on total including tax
          </uui-checkbox>
          <small>
            When enabled, customers see the discount as a percentage/amount off their total (including tax).
            The system will correctly calculate the pre-tax adjustment for accounting purposes.
          </small>
        </div>
      </uui-box>

      <uui-box headline="Priority">
        <p class="box-description">
          Lower numbers have higher priority. When multiple discounts apply, higher priority discounts are calculated first.
        </p>
        <umb-property-layout label="Priority"
          description="When discounts cannot be combined (based on the settings above), only the discount with the lowest priority number will be applied.">
          <uui-input
            slot="editor"
            type="number"
            min="1"
            step="1"
            .value=${String(this._discount?.priority ?? 1e3)}
            @input=${(e) => this._handleInputChange("priority", parseInt(e.target.value, 10) || 1e3)}
          ></uui-input>
        </umb-property-layout>
      </uui-box>
    `;
  }
  _renderScheduleTab() {
    const e = (t) => t ? new Date(t).toISOString().slice(0, 16) : "";
    return s`
      <uui-box headline="Active Dates">
        <div class="schedule-form">
          <umb-property-layout label="Start Date" ?mandatory=${!0}>
            <input
              slot="editor"
              type="datetime-local"
              .value=${e(this._discount?.startsAt)}
              @change=${(t) => {
      const i = t.target.value;
      this._handleInputChange("startsAt", i ? new Date(i).toISOString() : (/* @__PURE__ */ new Date()).toISOString());
    }}
            />
          </umb-property-layout>

          <umb-property-layout
            label="End Date"
            description="Leave empty for no end date">
            <input
              slot="editor"
              type="datetime-local"
              .value=${e(this._discount?.endsAt)}
              @change=${(t) => {
      const i = t.target.value;
      this._handleInputChange("endsAt", i ? new Date(i).toISOString() : null);
    }}
            />
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }
  _renderTargetsTab() {
    return s`
      <uui-box headline="Product Targeting">
        <merchello-target-rule-builder
          .rules=${this._targetRules}
          @rules-change=${this._handleTargetRulesChange}
        ></merchello-target-rule-builder>
      </uui-box>
    `;
  }
  _renderEligibilityTab() {
    return s`
      <uui-box headline="Customer Eligibility">
        <merchello-eligibility-rule-builder
          .rules=${this._eligibilityRules}
          @rules-change=${this._handleEligibilityRulesChange}
        ></merchello-eligibility-rule-builder>
      </uui-box>
    `;
  }
  /**
   * Render the tabs with href-based routing
   */
  _renderTabs() {
    const e = this._getActiveTab();
    return s`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${e === "details"}>
          Details
        </uui-tab>
        <uui-tab
          label="Applies To"
          href="${this._routerPath}/tab/targets"
          ?active=${e === "targets"}>
          Applies To
        </uui-tab>
        <uui-tab
          label="Requirements"
          href="${this._routerPath}/tab/requirements"
          ?active=${e === "requirements"}>
          Requirements
        </uui-tab>
        <uui-tab
          label="Eligibility"
          href="${this._routerPath}/tab/eligibility"
          ?active=${e === "eligibility"}>
          Eligibility
        </uui-tab>
        <uui-tab
          label="Combinations"
          href="${this._routerPath}/tab/combinations"
          ?active=${e === "combinations"}>
          Combinations
        </uui-tab>
        <uui-tab
          label="Schedule"
          href="${this._routerPath}/tab/schedule"
          ?active=${e === "schedule"}>
          Schedule
        </uui-tab>
        ${this._isNew ? n : s`
              <uui-tab
                label="Performance"
                href="${this._routerPath}/tab/performance"
                ?active=${e === "performance"}>
                Performance
              </uui-tab>
            `}
      </uui-tab-group>
    `;
  }
  /**
   * Render the active tab content
   */
  _renderActiveTabContent() {
    const e = this._getActiveTab();
    return s`
      ${e === "details" ? this._renderDetailsTab() : n}
      ${e === "targets" ? this._renderTargetsTab() : n}
      ${e === "requirements" ? this._renderRequirementsTab() : n}
      ${e === "eligibility" ? this._renderEligibilityTab() : n}
      ${e === "combinations" ? this._renderCombinationsTab() : n}
      ${e === "schedule" ? this._renderScheduleTab() : n}
      ${e === "performance" && !this._isNew && this._discount?.id ? s`<merchello-discount-performance discountId=${this._discount.id}></merchello-discount-performance>` : n}
    `;
  }
  render() {
    if (this._isLoading)
      return s`
        <umb-body-layout>
          <div class="loading"><uui-loader></uui-loader></div>
        </umb-body-layout>
      `;
    const e = this._discount?.statusLabel ?? "", t = this._discount?.statusColor ?? "default";
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${le()} label="Back to Discounts" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with discount info -->
        <div id="header" slot="header">
          <umb-icon name="icon-coin-dollar"></umb-icon>
          <span class="headline">${this._getHeadline()}</span>
          ${!this._isNew && this._discount ? s`<uui-tag look="secondary" color=${t}>${e}</uui-tag>` : n}
        </div>

        <!-- Header Actions (only for existing discounts) -->
        ${this._isNew ? n : s`
              <div slot="header" class="header-actions">
                ${this._discount?.status === oe.Active ? s`
                      <uui-button
                        look="secondary"
                        color="warning"
                        label="Deactivate"
                        @click=${this._handleDeactivate}
                      >
                        Deactivate
                      </uui-button>
                    ` : s`
                      <uui-button
                        look="secondary"
                        color="positive"
                        label="Activate"
                        @click=${this._handleActivate}
                      >
                        Activate
                      </uui-button>
                    `}
                <uui-button look="secondary" color="danger" label="Delete" @click=${this._handleDelete}>
                  Delete
                </uui-button>
              </div>
            `}

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <!-- Router slot for URL tracking (hidden via CSS) -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <!-- Detail layout with main content and sidebar -->
          <div class="detail-layout">
            <div class="main-content">
              <div class="tab-content">
                ${this._renderActiveTabContent()}
              </div>
            </div>

            <!-- Sidebar -->
            <div class="sidebar">
              <merchello-discount-summary-card
                .discount=${this._discount}
                .isNew=${this._isNew}
              ></merchello-discount-summary-card>
            </div>
          </div>
        </umb-body-layout>

        <!-- Footer with Save button -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label=${this._isNew ? "Create" : "Save"}
            ?disabled=${this._isSaving}
            @click=${this._handleSave}
          >
            ${this._isSaving ? this._isNew ? "Creating..." : "Saving..." : this._isNew ? "Create" : "Save"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
M = /* @__PURE__ */ new WeakMap();
D = /* @__PURE__ */ new WeakMap();
h.styles = z`
    :host {
      display: block;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    /* Back button styling */
    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    /* Hide router slot - we use it only for URL tracking */
    umb-router-slot {
      display: none;
    }

    /* Header styling */
    #header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex: 1;
      padding: var(--uui-size-space-4) 0;
    }

    #header umb-icon {
      font-size: 24px;
      color: var(--uui-color-text-alt);
    }

    #header .headline {
      font-size: var(--uui-type-h4-size);
      font-weight: 700;
    }

    /* Header actions styling */
    .header-actions {
      display: flex;
      gap: var(--uui-size-space-3);
      padding-right: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--uui-size-layout-2);
    }

    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: var(--uui-size-layout-1);
      padding: var(--uui-size-layout-1);
    }

    @media (max-width: 1024px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }

      .sidebar {
        order: -1;
      }
    }

    .main-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      align-self: start;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Tab group styling */
    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
      width: 100%;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .box-description {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text-alt);
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-input,
    uui-textarea,
    uui-select {
      width: 100%;
    }

    input[type="datetime-local"] {
      width: 100%;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-default-size);
      font-family: inherit;
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      box-sizing: border-box;
    }

    input[type="datetime-local"]:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .code-input-row {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .code-input-row uui-input {
      flex: 1;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .error-message {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    .success-message {
      color: var(--uui-color-positive);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    small {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .sidebar {
      position: sticky;
      top: var(--uui-size-space-4);
      align-self: start;
    }

    .schedule-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      max-width: 400px;
    }

  `;
b([
  d()
], h.prototype, "_discount", 2);
b([
  d()
], h.prototype, "_isNew", 2);
b([
  d()
], h.prototype, "_isLoading", 2);
b([
  d()
], h.prototype, "_isSaving", 2);
b([
  d()
], h.prototype, "_validationErrors", 2);
b([
  d()
], h.prototype, "_codeAvailable", 2);
b([
  d()
], h.prototype, "_isGeneratingCode", 2);
b([
  d()
], h.prototype, "_targetRules", 2);
b([
  d()
], h.prototype, "_eligibilityRules", 2);
b([
  d()
], h.prototype, "_discountCodeLength", 2);
b([
  d()
], h.prototype, "_routes", 2);
b([
  d()
], h.prototype, "_routerPath", 2);
b([
  d()
], h.prototype, "_activePath", 2);
h = b([
  A("merchello-discount-detail")
], h);
const Ze = h;
export {
  h as MerchelloDiscountDetailElement,
  Ze as default
};
//# sourceMappingURL=discount-detail.element-CA2HMrYn.js.map
