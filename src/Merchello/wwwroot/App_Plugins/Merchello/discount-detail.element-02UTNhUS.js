import { LitElement as w, nothing as r, html as a, css as S, property as $, customElement as I, state as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as R } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as G } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as j } from "@umbraco-cms/backoffice/notification";
import { e as M, c as f, d as W, f as V, b as U, g as x, h as g, i as c, a as L, D as Y } from "./discount.types-fIKwcJXq.js";
import { M as b } from "./merchello-api-DXy2hS5y.js";
import { t as X } from "./navigation-BP2IjQvn.js";
import { a as H } from "./formatting-DbC6qaCT.js";
var K = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, O = (e, i, t, s) => {
  for (var u = s > 1 ? void 0 : s ? Q(i, t) : i, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (u = (s ? l(i, t, u) : l(u)) || u);
  return s && u && K(i, t, u), u;
};
let z = class extends R(w) {
  constructor() {
    super(...arguments), this.isNew = !1;
  }
  _getCategoryInfo(e) {
    return M.find((i) => i.category === e);
  }
  _formatValue() {
    return this.discount ? this.discount.valueType === f.Percentage ? `${this.discount.value}% off` : this.discount.valueType === f.FixedAmount ? `${this.discount.value} off` : this.discount.valueType === f.Free ? "Free" : "" : "";
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
  _renderSummaryItem(e, i, t) {
    return i == null || i === "" ? r : a`
      <div class="summary-item">
        ${t ? a`<uui-icon name=${t}></uui-icon>` : r}
        <div class="summary-item-content">
          <span class="summary-item-label">${e}</span>
          <span class="summary-item-value">${i}</span>
        </div>
      </div>
    `;
  }
  render() {
    if (!this.discount) return r;
    const e = this._getCategoryInfo(this.discount.category), i = W[this.discount.status], t = V[this.discount.status];
    return a`
      <uui-box>
        <!-- Header with category icon -->
        <div class="card-header">
          <div class="category-badge">
            <uui-icon name=${e?.icon ?? "icon-tag"}></uui-icon>
            <span>${e?.label ?? "Discount"}</span>
          </div>
          ${this.isNew ? r : a`<uui-tag look="secondary" color=${t}>${i}</uui-tag>`}
        </div>

        <!-- Code or Automatic badge -->
        <div class="method-section">
          ${this.discount.method === U.Code ? a`
                <div class="code-display">
                  <uui-icon name="icon-barcode"></uui-icon>
                  <span class="code-value">${this.discount.code || "No code set"}</span>
                </div>
              ` : a`
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

          ${this.discount.requirementType !== x.None ? this._renderSummaryItem(
      "Minimum",
      this.discount.requirementType === x.MinimumPurchaseAmount ? `${this.discount.requirementValue} purchase` : `${this.discount.requirementValue} items`,
      "icon-shopping-basket"
    ) : r}

          ${this._renderSummaryItem(
      "Usage",
      this.discount.totalUsageLimit ? `${this.discount.currentUsageCount} / ${this.discount.totalUsageLimit}` : `${this.discount.currentUsageCount} uses`,
      "icon-users"
    )}

          ${this._renderSummaryItem("Starts", this._formatDate(this.discount.startsAt), "icon-calendar")}

          ${this.discount.endsAt ? this._renderSummaryItem("Ends", this._formatDate(this.discount.endsAt), "icon-calendar") : r}
        </div>

        <hr class="divider" />

        <!-- Combinations -->
        <div class="combinations-section">
          <span class="section-label">Combinations</span>
          <div class="combinations-icons">
            ${this.discount.canCombineWithProductDiscounts ? a`<uui-icon name="icon-tags" title="Combines with product discounts"></uui-icon>` : r}
            ${this.discount.canCombineWithOrderDiscounts ? a`<uui-icon name="icon-receipt-dollar" title="Combines with order discounts"></uui-icon>` : r}
            ${this.discount.canCombineWithShippingDiscounts ? a`<uui-icon name="icon-truck" title="Combines with shipping discounts"></uui-icon>` : r}
            ${!this.discount.canCombineWithProductDiscounts && !this.discount.canCombineWithOrderDiscounts && !this.discount.canCombineWithShippingDiscounts ? a`<span class="no-combinations">None</span>` : r}
          </div>
        </div>
      </uui-box>
    `;
  }
};
z.styles = S`
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
O([
  $({ type: Object })
], z.prototype, "discount", 2);
O([
  $({ type: Boolean })
], z.prototype, "isNew", 2);
z = O([
  I("merchello-discount-summary-card")
], z);
var Z = Object.defineProperty, J = Object.getOwnPropertyDescriptor, D = (e, i, t, s) => {
  for (var u = s > 1 ? void 0 : s ? J(i, t) : i, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (u = (s ? l(i, t, u) : l(u)) || u);
  return s && u && Z(i, t, u), u;
};
let _ = class extends R(w) {
  constructor() {
    super(...arguments), this.discountId = "", this._isLoading = !0, this._dateRange = "30d";
  }
  connectedCallback() {
    super.connectedCallback(), this.discountId && this._loadPerformance();
  }
  updated(e) {
    e.has("discountId") && this.discountId && this._loadPerformance();
  }
  async _loadPerformance() {
    this._isLoading = !0, this._error = void 0;
    const e = /* @__PURE__ */ new Date();
    let i;
    switch (this._dateRange) {
      case "7d":
        i = new Date(e.getTime() - 10080 * 60 * 1e3);
        break;
      case "30d":
        i = new Date(e.getTime() - 720 * 60 * 60 * 1e3);
        break;
      case "90d":
        i = new Date(e.getTime() - 2160 * 60 * 60 * 1e3);
        break;
      case "all":
        i = void 0;
        break;
    }
    const { data: t, error: s } = await b.getDiscountPerformance(
      this.discountId,
      i?.toISOString(),
      e.toISOString()
    );
    if (this._isLoading = !1, s) {
      this._error = s.message;
      return;
    }
    this._performance = t;
  }
  _handleDateRangeChange(e) {
    this._dateRange = e, this._loadPerformance();
  }
  _formatNumber(e) {
    return e.toLocaleString();
  }
  _formatCurrency(e) {
    return H(e);
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
    return a`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading performance data...</span>
      </div>
    `;
  }
  _renderError() {
    return a`
      <div class="error">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._error}</span>
        <uui-button look="secondary" @click=${this._loadPerformance}>Retry</uui-button>
      </div>
    `;
  }
  _renderEmptyState() {
    return a`
      <div class="empty-state">
        <uui-icon name="icon-chart-line"></uui-icon>
        <h3>No usage data yet</h3>
        <p>This discount hasn't been used yet. Performance metrics will appear here once customers start using it.</p>
      </div>
    `;
  }
  _renderMetricCard(e, i, t, s) {
    return a`
      <div class="metric-card">
        <div class="metric-icon" style=${s ? `color: ${s}` : ""}>
          <uui-icon name=${t}></uui-icon>
        </div>
        <div class="metric-content">
          <span class="metric-value">${i}</span>
          <span class="metric-label">${e}</span>
        </div>
      </div>
    `;
  }
  _renderUsageChart() {
    if (!this._performance?.usageByDate?.length)
      return a`
        <div class="chart-placeholder">
          <p>No usage data available for the selected period</p>
        </div>
      `;
    const e = this._performance.usageByDate.length > 0 ? Math.max(...this._performance.usageByDate.map((i) => i.usageCount)) : 0;
    return a`
      <div class="chart-container">
        <div class="chart">
          ${this._performance.usageByDate.map((i) => {
      const t = e > 0 ? i.usageCount / e * 100 : 0, s = new Date(i.date);
      return a`
              <div class="chart-bar-container" title="${s.toLocaleDateString()}: ${i.usageCount} uses">
                <div class="chart-bar" style="height: ${t}%"></div>
                <span class="chart-label">${s.getDate()}</span>
              </div>
            `;
    })}
        </div>
      </div>
    `;
  }
  render() {
    return this._isLoading ? this._renderLoading() : this._error ? this._renderError() : !this._performance || this._performance.totalUsageCount === 0 ? this._renderEmptyState() : a`
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
      this._formatNumber(this._performance.totalUsageCount),
      "icon-users",
      "var(--uui-color-positive)"
    )}
          ${this._renderMetricCard(
      "Unique Customers",
      this._formatNumber(this._performance.uniqueCustomersCount),
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
            ${this._performance.remainingUses !== null && this._performance.remainingUses !== void 0 ? a`
                  <div class="revenue-item">
                    <span class="revenue-label">Remaining Uses</span>
                    <span class="revenue-value ${this._performance.remainingUses === 0 ? "exhausted" : ""}">
                      ${this._formatNumber(this._performance.remainingUses)}
                    </span>
                  </div>
                ` : r}
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
_.styles = S`
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
D([
  $({ type: String })
], _.prototype, "discountId", 2);
D([
  d()
], _.prototype, "_performance", 2);
D([
  d()
], _.prototype, "_isLoading", 2);
D([
  d()
], _.prototype, "_error", 2);
D([
  d()
], _.prototype, "_dateRange", 2);
_ = D([
  I("merchello-discount-performance")
], _);
var ee = Object.defineProperty, ie = Object.getOwnPropertyDescriptor, E = (e, i, t, s) => {
  for (var u = s > 1 ? void 0 : s ? ie(i, t) : i, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (u = (s ? l(i, t, u) : l(u)) || u);
  return s && u && ee(i, t, u), u;
};
const N = [
  { value: g.AllCustomers, label: "Everyone" },
  { value: g.CustomerSegments, label: "Customer segments" },
  { value: g.SpecificCustomers, label: "Specific customers" }
];
let C = class extends R(w) {
  constructor() {
    super(...arguments), this.rules = [], this.readonly = !1;
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
      eligibilityType: g.AllCustomers,
      eligibilityIds: null,
      eligibilityNames: null
    };
    this.rules = [...this.rules, e], this._editingRule = { index: this.rules.length - 1, rule: e }, this._dispatchChange();
  }
  _handleRemoveRule(e) {
    this.rules = this.rules.filter((i, t) => t !== e), this._editingRule?.index === e && (this._editingRule = void 0), this._dispatchChange();
  }
  _handleUpdateRule(e, i) {
    this.rules = this.rules.map((t, s) => s === e ? { ...t, ...i } : t), this._dispatchChange();
  }
  _handleEligibilityTypeChange(e, i) {
    this._handleUpdateRule(e, {
      eligibilityType: i,
      eligibilityIds: i === g.AllCustomers ? null : [],
      eligibilityNames: null
    });
  }
  _getEligibilityTypeLabel(e) {
    return N.find((i) => i.value === e)?.label ?? "Unknown";
  }
  _getTypeIcon(e) {
    switch (e) {
      case g.AllCustomers:
        return "icon-globe";
      case g.CustomerSegments:
        return "icon-users";
      case g.SpecificCustomers:
        return "icon-user";
      default:
        return "icon-user";
    }
  }
  _renderRuleCard(e, i) {
    const t = this._editingRule?.index === i, s = e.eligibilityIds && e.eligibilityIds.length > 0;
    return a`
      <div class="rule-card">
        <div class="rule-header">
          <div class="rule-type">
            <uui-icon name=${this._getTypeIcon(e.eligibilityType)}></uui-icon>
            <span>${this._getEligibilityTypeLabel(e.eligibilityType)}</span>
          </div>
          ${this.readonly ? r : a`
                <div class="rule-actions">
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._editingRule = t ? void 0 : { index: i, rule: e }}
                  >
                    ${t ? "Done" : "Edit"}
                  </uui-button>
                  <uui-button look="secondary" color="danger" compact @click=${() => this._handleRemoveRule(i)}>
                    Remove
                  </uui-button>
                </div>
              `}
        </div>

        ${t ? a`
              <div class="rule-edit-form">
                <uui-form-layout-item>
                  <uui-label slot="label">Who can use this discount?</uui-label>
                  <uui-select
                    .value=${String(e.eligibilityType)}
                    @change=${(u) => this._handleEligibilityTypeChange(i, parseInt(u.target.value, 10))}
                  >
                    ${N.map(
      (u) => a` <uui-select-option value=${String(u.value)}>${u.label}</uui-select-option> `
    )}
                  </uui-select>
                </uui-form-layout-item>

                ${e.eligibilityType !== g.AllCustomers ? a`
                      <div class="selection-placeholder">
                        <uui-icon name="icon-search"></uui-icon>
                        <span>
                          ${e.eligibilityType === g.SpecificCustomers ? "Customer selection coming soon" : "Customer segment selection coming soon"}
                        </span>
                        ${s ? a`<small>${e.eligibilityIds?.length} item(s) selected</small>` : a`<small>No items selected</small>`}
                      </div>
                    ` : a`
                      <div class="info-message">
                        <uui-icon name="icon-info"></uui-icon>
                        <span>This discount will be available to all customers.</span>
                      </div>
                    `}
              </div>
            ` : a`
              <div class="rule-summary">
                ${e.eligibilityType === g.AllCustomers ? a`<span>Available to everyone</span>` : a`
                      <span>
                        ${s ? `${e.eligibilityIds?.length} item(s) selected` : "No items selected"}
                      </span>
                    `}
              </div>
            `}
      </div>
    `;
  }
  render() {
    return a`
      <div class="eligibility-rule-builder">
        <div class="builder-header">
          <span class="builder-title">Customer Eligibility</span>
          <span class="builder-description">Define who can use this discount</span>
        </div>

        ${this.rules.length === 0 ? a`
              <div class="empty-state">
                <uui-icon name="icon-users"></uui-icon>
                <p>No eligibility rules defined. By default, the discount is available to everyone.</p>
              </div>
            ` : a`
              <div class="rules-list">
                ${this.rules.map((e, i) => this._renderRuleCard(e, i))}
              </div>
            `}

        ${this.readonly ? r : a`
              <uui-button look="secondary" @click=${this._handleAddRule}>
                <uui-icon name="icon-add"></uui-icon>
                Add eligibility rule
              </uui-button>
            `}
      </div>
    `;
  }
};
C.styles = S`
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

    .selection-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      border: 1px dashed var(--uui-color-border);
      text-align: center;
      gap: var(--uui-size-space-2);
    }

    .selection-placeholder small {
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
E([
  $({ type: Array })
], C.prototype, "rules", 2);
E([
  $({ type: Boolean })
], C.prototype, "readonly", 2);
E([
  d()
], C.prototype, "_editingRule", 2);
C = E([
  I("merchello-eligibility-rule-builder")
], C);
var te = Object.defineProperty, ae = Object.getOwnPropertyDescriptor, A = (e, i, t, s) => {
  for (var u = s > 1 ? void 0 : s ? ae(i, t) : i, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (u = (s ? l(i, t, u) : l(u)) || u);
  return s && u && te(i, t, u), u;
};
const q = [
  { value: c.AllProducts, label: "All products" },
  { value: c.SpecificProducts, label: "Specific products" },
  { value: c.Categories, label: "Specific categories" },
  { value: c.ProductFilters, label: "Product filters" },
  { value: c.ProductTypes, label: "Product types" },
  { value: c.Suppliers, label: "Suppliers" },
  { value: c.Warehouses, label: "Warehouses" }
];
let T = class extends R(w) {
  constructor() {
    super(...arguments), this.rules = [], this.readonly = !1;
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
    this.rules = this.rules.filter((i, t) => t !== e), this._editingRule?.index === e && (this._editingRule = void 0), this._dispatchChange();
  }
  _handleUpdateRule(e, i) {
    this.rules = this.rules.map((t, s) => s === e ? { ...t, ...i } : t), this._dispatchChange();
  }
  _handleTargetTypeChange(e, i) {
    this._handleUpdateRule(e, {
      targetType: i,
      targetIds: i === c.AllProducts ? null : [],
      targetNames: null
    });
  }
  _getTargetTypeLabel(e) {
    return q.find((i) => i.value === e)?.label ?? "Unknown";
  }
  _renderRuleCard(e, i) {
    const t = this._editingRule?.index === i, s = e.targetIds && e.targetIds.length > 0;
    return a`
      <div class="rule-card ${e.isExclusion ? "exclusion" : "inclusion"}">
        <div class="rule-header">
          <div class="rule-type">
            ${e.isExclusion ? a`<uui-tag look="secondary" color="danger">Exclude</uui-tag>` : a`<uui-tag look="secondary" color="positive">Include</uui-tag>`}
            <span>${this._getTargetTypeLabel(e.targetType)}</span>
          </div>
          ${this.readonly ? r : a`
                <div class="rule-actions">
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._editingRule = t ? void 0 : { index: i, rule: e }}
                  >
                    ${t ? "Done" : "Edit"}
                  </uui-button>
                  <uui-button look="secondary" color="danger" compact @click=${() => this._handleRemoveRule(i)}>
                    Remove
                  </uui-button>
                </div>
              `}
        </div>

        ${t ? a`
              <div class="rule-edit-form">
                <uui-form-layout-item>
                  <uui-label slot="label">Rule Type</uui-label>
                  <uui-select
                    .value=${String(e.targetType)}
                    @change=${(u) => this._handleTargetTypeChange(i, parseInt(u.target.value, 10))}
                  >
                    ${q.map(
      (u) => a` <uui-select-option value=${String(u.value)}>${u.label}</uui-select-option> `
    )}
                  </uui-select>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Action</uui-label>
                  <uui-select
                    .value=${e.isExclusion ? "exclude" : "include"}
                    @change=${(u) => this._handleUpdateRule(i, { isExclusion: u.target.value === "exclude" })}
                  >
                    <uui-select-option value="include">Include these products</uui-select-option>
                    <uui-select-option value="exclude">Exclude these products</uui-select-option>
                  </uui-select>
                </uui-form-layout-item>

                ${e.targetType !== c.AllProducts ? a`
                      <div class="selection-placeholder">
                        <uui-icon name="icon-search"></uui-icon>
                        <span>
                          ${e.targetType === c.SpecificProducts ? "Product selection coming soon" : e.targetType === c.Categories ? "Category selection coming soon" : e.targetType === c.ProductFilters ? "Product filter selection coming soon" : e.targetType === c.ProductTypes ? "Product type selection coming soon" : e.targetType === c.Suppliers ? "Supplier selection coming soon" : "Warehouse selection coming soon"}
                        </span>
                        ${s ? a`<small>${e.targetIds?.length} item(s) selected</small>` : a`<small>No items selected</small>`}
                      </div>
                    ` : r}
              </div>
            ` : a`
              <div class="rule-summary">
                ${e.targetType === c.AllProducts ? a`<span>Applies to all products</span>` : a`
                      <span>
                        ${s ? `${e.targetIds?.length} item(s) selected` : "No items selected"}
                      </span>
                    `}
              </div>
            `}
      </div>
    `;
  }
  render() {
    return a`
      <div class="target-rule-builder">
        <div class="builder-header">
          <span class="builder-title">Target Rules</span>
          <span class="builder-description">Define which products this discount applies to</span>
        </div>

        ${this.rules.length === 0 ? a`
              <div class="empty-state">
                <uui-icon name="icon-filter"></uui-icon>
                <p>No target rules defined. By default, the discount applies to all products.</p>
              </div>
            ` : a`
              <div class="rules-list">
                ${this.rules.map((e, i) => this._renderRuleCard(e, i))}
              </div>
            `}

        ${this.readonly ? r : a`
              <uui-button look="secondary" @click=${this._handleAddRule}>
                <uui-icon name="icon-add"></uui-icon>
                Add target rule
              </uui-button>
            `}
      </div>
    `;
  }
};
T.styles = S`
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

    .selection-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      border: 1px dashed var(--uui-color-border);
      text-align: center;
      gap: var(--uui-size-space-2);
    }

    .selection-placeholder small {
      color: var(--uui-color-text-alt);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-select {
      width: 100%;
    }
  `;
A([
  $({ type: Array })
], T.prototype, "rules", 2);
A([
  $({ type: Boolean })
], T.prototype, "readonly", 2);
A([
  d()
], T.prototype, "_editingRule", 2);
T = A([
  I("merchello-target-rule-builder")
], T);
var se = Object.defineProperty, ue = Object.getOwnPropertyDescriptor, B = (e) => {
  throw TypeError(e);
}, v = (e, i, t, s) => {
  for (var u = s > 1 ? void 0 : s ? ue(i, t) : i, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (u = (s ? l(i, t, u) : l(u)) || u);
  return s && u && se(i, t, u), u;
}, F = (e, i, t) => i.has(e) || B("Cannot " + t), o = (e, i, t) => (F(e, i, "read from private field"), t ? t.call(e) : i.get(e)), P = (e, i, t) => i.has(e) ? B("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), k = (e, i, t, s) => (F(e, i, "write to private field"), i.set(e, t), t), p, h, y;
let m = class extends R(w) {
  constructor() {
    super(), this._isNew = !0, this._isLoading = !0, this._isSaving = !1, this._activeTab = "details", this._validationErrors = /* @__PURE__ */ new Map(), this._codeAvailable = null, this._isGeneratingCode = !1, this._targetRules = [], this._eligibilityRules = [], P(this, p), P(this, h), P(this, y), this.consumeContext(G, (e) => {
      k(this, p, e), this._isNew = o(this, p).isNew, this.observe(o(this, p).discount, (i) => {
        this._discount = i, this._targetRules = i?.targetRules ?? [], this._eligibilityRules = i?.eligibilityRules ?? [], this._isLoading = !1;
      }), this.observe(o(this, p).isLoading, (i) => {
        this._isLoading = i;
      }), this.observe(o(this, p).isSaving, (i) => {
        this._isSaving = i;
      });
    }), this.consumeContext(j, (e) => {
      k(this, h, e);
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback(), o(this, y) && (clearTimeout(o(this, y)), k(this, y, void 0));
  }
  _getCategoryInfo(e) {
    return M.find((i) => i.category === e);
  }
  _getHeadline() {
    return this._isNew ? `Create ${this._getCategoryInfo(this._discount?.category ?? 0)?.label ?? "discount"}` : this._discount?.name ?? "Edit discount";
  }
  _handleInputChange(e, i) {
    if (!this._discount) return;
    const t = { ...this._discount, [e]: i };
    o(this, p)?.updateDiscount(t), this._validationErrors.delete(e), this.requestUpdate();
  }
  _handleCodeInput(e) {
    const t = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    this._handleInputChange("code", t || null), o(this, y) && clearTimeout(o(this, y)), t ? k(this, y, setTimeout(() => {
      this._checkCodeAvailability(t);
    }, 500)) : this._codeAvailable = null;
  }
  async _checkCodeAvailability(e) {
    const { data: i, error: t } = await b.checkDiscountCodeAvailable(
      e,
      this._isNew ? void 0 : this._discount?.id
    );
    !t && i && (this._codeAvailable = i.available);
  }
  async _handleGenerateCode() {
    this._isGeneratingCode = !0;
    const { data: e, error: i } = await b.generateDiscountCode(8);
    this._isGeneratingCode = !1, !i && e && (this._handleInputChange("code", e.code), this._codeAvailable = !0);
  }
  _handleTargetRulesChange(e) {
    this._targetRules = e.detail.rules;
  }
  _handleEligibilityRulesChange(e) {
    this._eligibilityRules = e.detail.rules;
  }
  _validate() {
    return this._validationErrors.clear(), this._discount?.name?.trim() || this._validationErrors.set("name", "Name is required"), this._discount?.method === U.Code && !this._discount.code?.trim() && this._validationErrors.set("code", "Code is required for code-based discounts"), (this._discount?.value === void 0 || this._discount.value <= 0) && this._validationErrors.set("value", "Value must be greater than 0"), this._discount?.valueType === f.Percentage && this._discount.value > 100 && this._validationErrors.set("value", "Percentage cannot exceed 100%"), this._discount?.requirementType !== x.None && !this._discount?.requirementValue && this._validationErrors.set("requirementValue", "Requirement value is required"), this.requestUpdate(), this._validationErrors.size === 0;
  }
  async _handleSave() {
    if (!this._discount || !this._validate()) {
      o(this, h)?.peek("warning", {
        data: { headline: "Validation failed", message: "Please fix the errors before saving" }
      });
      return;
    }
    if (o(this, p)?.setIsSaving(!0), this._isNew) {
      const e = {
        name: this._discount.name,
        description: this._discount.description,
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
        priority: this._discount.priority,
        targetRules: this._targetRules.map((s) => ({
          targetType: s.targetType,
          targetIds: s.targetIds,
          isExclusion: s.isExclusion
        })),
        eligibilityRules: this._eligibilityRules.map((s) => ({
          eligibilityType: s.eligibilityType,
          eligibilityIds: s.eligibilityIds
        }))
      }, { data: i, error: t } = await b.createDiscount(e);
      if (o(this, p)?.setIsSaving(!1), t) {
        o(this, h)?.peek("danger", {
          data: { headline: "Failed to create discount", message: t.message }
        });
        return;
      }
      i && (o(this, p)?.updateDiscount(i), o(this, h)?.peek("positive", {
        data: { headline: "Discount created", message: `${i.name} has been created` }
      }), history.replaceState({}, "", `section/merchello/workspace/merchello-discount/edit/${i.id}`));
    } else {
      const e = {
        id: this._discount.id,
        name: this._discount.name,
        description: this._discount.description,
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
        priority: this._discount.priority,
        targetRules: this._targetRules.map((s) => ({
          targetType: s.targetType,
          targetIds: s.targetIds,
          isExclusion: s.isExclusion
        })),
        eligibilityRules: this._eligibilityRules.map((s) => ({
          eligibilityType: s.eligibilityType,
          eligibilityIds: s.eligibilityIds
        }))
      }, { data: i, error: t } = await b.updateDiscount(this._discount.id, e);
      if (o(this, p)?.setIsSaving(!1), t) {
        o(this, h)?.peek("danger", {
          data: { headline: "Failed to update discount", message: t.message }
        });
        return;
      }
      i && (o(this, p)?.updateDiscount(i), o(this, h)?.peek("positive", {
        data: { headline: "Discount saved", message: `${i.name} has been updated` }
      }));
    }
  }
  async _handleDelete() {
    if (!this._discount?.id || !confirm(`Are you sure you want to delete "${this._discount.name}"? This action cannot be undone.`)) return;
    const { error: i } = await b.deleteDiscount(this._discount.id);
    if (i) {
      o(this, h)?.peek("danger", {
        data: { headline: "Failed to delete discount", message: i.message }
      });
      return;
    }
    o(this, h)?.peek("positive", {
      data: { headline: "Discount deleted", message: `${this._discount.name} has been deleted` }
    }), X();
  }
  async _handleActivate() {
    if (!this._discount?.id) return;
    const { data: e, error: i } = await b.activateDiscount(this._discount.id);
    if (i) {
      o(this, h)?.peek("danger", {
        data: { headline: "Failed to activate discount", message: i.message }
      });
      return;
    }
    e && (o(this, p)?.updateDiscount(e), o(this, h)?.peek("positive", {
      data: { headline: "Discount activated", message: `${e.name} is now active` }
    }));
  }
  async _handleDeactivate() {
    if (!this._discount?.id) return;
    const { data: e, error: i } = await b.deactivateDiscount(this._discount.id);
    if (i) {
      o(this, h)?.peek("danger", {
        data: { headline: "Failed to deactivate discount", message: i.message }
      });
      return;
    }
    e && (o(this, p)?.updateDiscount(e), o(this, h)?.peek("positive", {
      data: { headline: "Discount deactivated", message: `${e.name} has been disabled` }
    }));
  }
  _renderLoading() {
    return a`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderDetailsTab() {
    return a`
      <uui-box headline="Basic Information">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label" required>Name</uui-label>
            <uui-input
              .value=${this._discount?.name ?? ""}
              @input=${(e) => this._handleInputChange("name", e.target.value)}
              placeholder="e.g., Summer Sale 20% Off"
              ?invalid=${this._validationErrors.has("name")}
            ></uui-input>
            ${this._validationErrors.has("name") ? a`<div class="error-message">${this._validationErrors.get("name")}</div>` : r}
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label">Description</uui-label>
            <uui-textarea
              .value=${this._discount?.description ?? ""}
              @input=${(e) => this._handleInputChange("description", e.target.value)}
              placeholder="Internal description for this discount"
            ></uui-textarea>
          </uui-form-layout-item>
        </div>
      </uui-box>

      <uui-box headline="Discount Method">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label">Method</uui-label>
            <uui-select
              .value=${String(this._discount?.method ?? 0)}
              @change=${(e) => this._handleInputChange("method", parseInt(e.target.value, 10))}
            >
              <uui-select-option value="0">Discount code</uui-select-option>
              <uui-select-option value="1">Automatic discount</uui-select-option>
            </uui-select>
          </uui-form-layout-item>

          ${this._discount?.method === U.Code ? a`
                <uui-form-layout-item>
                  <uui-label slot="label" required>Discount Code</uui-label>
                  <div class="code-input-row">
                    <uui-input
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
                  ${this._validationErrors.has("code") ? a`<div class="error-message">${this._validationErrors.get("code")}</div>` : this._codeAvailable === !1 ? a`<div class="error-message">This code is already in use</div>` : this._codeAvailable === !0 ? a`<div class="success-message">Code is available</div>` : r}
                </uui-form-layout-item>
              ` : r}
        </div>
      </uui-box>

      <uui-box headline="Discount Value">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label">Value Type</uui-label>
            <uui-select
              .value=${String(this._discount?.valueType ?? 1)}
              @change=${(e) => this._handleInputChange("valueType", parseInt(e.target.value, 10))}
            >
              <uui-select-option value="1">Percentage</uui-select-option>
              <uui-select-option value="0">Fixed amount</uui-select-option>
              ${this._discount?.category === L.BuyXGetY ? a`<uui-select-option value="2">Free</uui-select-option>` : r}
            </uui-select>
          </uui-form-layout-item>

          ${this._discount?.valueType !== f.Free ? a`
                <uui-form-layout-item>
                  <uui-label slot="label" required>
                    ${this._discount?.valueType === f.Percentage ? "Percentage (%)" : "Amount"}
                  </uui-label>
                  <uui-input
                    type="number"
                    min="0"
                    max=${this._discount?.valueType === f.Percentage ? "100" : ""}
                    step="0.01"
                    .value=${String(this._discount?.value ?? "")}
                    @input=${(e) => this._handleInputChange("value", parseFloat(e.target.value) || 0)}
                    ?invalid=${this._validationErrors.has("value")}
                  ></uui-input>
                  ${this._validationErrors.has("value") ? a`<div class="error-message">${this._validationErrors.get("value")}</div>` : r}
                </uui-form-layout-item>
              ` : r}
        </div>
      </uui-box>
    `;
  }
  _renderRequirementsTab() {
    return a`
      <uui-box headline="Minimum Requirements">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label">Requirement Type</uui-label>
            <uui-select
              .value=${String(this._discount?.requirementType ?? 0)}
              @change=${(e) => this._handleInputChange("requirementType", parseInt(e.target.value, 10))}
            >
              <uui-select-option value="0">No minimum requirements</uui-select-option>
              <uui-select-option value="1">Minimum purchase amount</uui-select-option>
              <uui-select-option value="2">Minimum quantity of items</uui-select-option>
            </uui-select>
          </uui-form-layout-item>

          ${this._discount?.requirementType !== x.None ? a`
                <uui-form-layout-item>
                  <uui-label slot="label" required>
                    ${this._discount?.requirementType === x.MinimumPurchaseAmount ? "Minimum Amount" : "Minimum Quantity"}
                  </uui-label>
                  <uui-input
                    type="number"
                    min="0"
                    step=${this._discount?.requirementType === x.MinimumPurchaseAmount ? "0.01" : "1"}
                    .value=${String(this._discount?.requirementValue ?? "")}
                    @input=${(e) => this._handleInputChange("requirementValue", parseFloat(e.target.value) || null)}
                    ?invalid=${this._validationErrors.has("requirementValue")}
                  ></uui-input>
                  ${this._validationErrors.has("requirementValue") ? a`<div class="error-message">${this._validationErrors.get("requirementValue")}</div>` : r}
                </uui-form-layout-item>
              ` : r}
        </div>
      </uui-box>

      <uui-box headline="Usage Limits">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label">Total usage limit</uui-label>
            <uui-input
              type="number"
              min="0"
              step="1"
              .value=${String(this._discount?.totalUsageLimit ?? "")}
              @input=${(e) => {
      const i = e.target.value;
      this._handleInputChange("totalUsageLimit", i ? parseInt(i, 10) : null);
    }}
              placeholder="Unlimited"
            ></uui-input>
            <small>Leave empty for unlimited uses</small>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label">Per customer limit</uui-label>
            <uui-input
              type="number"
              min="0"
              step="1"
              .value=${String(this._discount?.perCustomerUsageLimit ?? "")}
              @input=${(e) => {
      const i = e.target.value;
      this._handleInputChange("perCustomerUsageLimit", i ? parseInt(i, 10) : null);
    }}
              placeholder="Unlimited"
            ></uui-input>
            <small>Max uses per customer</small>
          </uui-form-layout-item>

          ${this._discount?.category === L.BuyXGetY ? a`
                <uui-form-layout-item>
                  <uui-label slot="label">Per order limit</uui-label>
                  <uui-input
                    type="number"
                    min="0"
                    step="1"
                    .value=${String(this._discount?.perOrderUsageLimit ?? "")}
                    @input=${(e) => {
      const i = e.target.value;
      this._handleInputChange("perOrderUsageLimit", i ? parseInt(i, 10) : null);
    }}
                    placeholder="Unlimited"
                  ></uui-input>
                  <small>Max times per order (for Buy X Get Y)</small>
                </uui-form-layout-item>
              ` : r}
        </div>
      </uui-box>
    `;
  }
  _renderCombinationsTab() {
    return a`
      <uui-box headline="Discount Combinations">
        <p class="box-description">
          Choose which other discount types can be used together with this discount.
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

      <uui-box headline="Priority">
        <p class="box-description">
          Lower numbers have higher priority. When multiple discounts apply, higher priority discounts are calculated first.
        </p>
        <uui-form-layout-item>
          <uui-label slot="label">Priority</uui-label>
          <uui-input
            type="number"
            min="1"
            step="1"
            .value=${String(this._discount?.priority ?? 1e3)}
            @input=${(e) => this._handleInputChange("priority", parseInt(e.target.value, 10) || 1e3)}
          ></uui-input>
        </uui-form-layout-item>
      </uui-box>
    `;
  }
  _renderScheduleTab() {
    const e = (i) => i ? new Date(i).toISOString().slice(0, 16) : "";
    return a`
      <uui-box headline="Active Dates">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label" required>Start Date</uui-label>
            <input
              type="datetime-local"
              .value=${e(this._discount?.startsAt)}
              @change=${(i) => {
      const t = i.target.value;
      this._handleInputChange("startsAt", t ? new Date(t).toISOString() : (/* @__PURE__ */ new Date()).toISOString());
    }}
            />
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label">End Date</uui-label>
            <input
              type="datetime-local"
              .value=${e(this._discount?.endsAt)}
              @change=${(i) => {
      const t = i.target.value;
      this._handleInputChange("endsAt", t ? new Date(t).toISOString() : null);
    }}
            />
            <small>Leave empty for no end date</small>
          </uui-form-layout-item>
        </div>
      </uui-box>
    `;
  }
  _renderTargetsTab() {
    return a`
      <uui-box headline="Product Targeting">
        <merchello-target-rule-builder
          .rules=${this._targetRules}
          @rules-change=${this._handleTargetRulesChange}
        ></merchello-target-rule-builder>
      </uui-box>
    `;
  }
  _renderEligibilityTab() {
    return a`
      <uui-box headline="Customer Eligibility">
        <merchello-eligibility-rule-builder
          .rules=${this._eligibilityRules}
          @rules-change=${this._handleEligibilityRulesChange}
        ></merchello-eligibility-rule-builder>
      </uui-box>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoading() : a`
      <div class="detail-layout">
        <div class="main-content">
          <!-- Tabs -->
          <uui-tab-group>
            <uui-tab
              label="Details"
              ?active=${this._activeTab === "details"}
              @click=${() => this._activeTab = "details"}
            >
              Details
            </uui-tab>
            <uui-tab
              label="Applies To"
              ?active=${this._activeTab === "targets"}
              @click=${() => this._activeTab = "targets"}
            >
              Applies To
            </uui-tab>
            <uui-tab
              label="Requirements"
              ?active=${this._activeTab === "requirements"}
              @click=${() => this._activeTab = "requirements"}
            >
              Requirements
            </uui-tab>
            <uui-tab
              label="Eligibility"
              ?active=${this._activeTab === "eligibility"}
              @click=${() => this._activeTab = "eligibility"}
            >
              Eligibility
            </uui-tab>
            <uui-tab
              label="Combinations"
              ?active=${this._activeTab === "combinations"}
              @click=${() => this._activeTab = "combinations"}
            >
              Combinations
            </uui-tab>
            <uui-tab
              label="Schedule"
              ?active=${this._activeTab === "schedule"}
              @click=${() => this._activeTab = "schedule"}
            >
              Schedule
            </uui-tab>
            ${this._isNew ? r : a`
                  <uui-tab
                    label="Performance"
                    ?active=${this._activeTab === "performance"}
                    @click=${() => this._activeTab = "performance"}
                  >
                    Performance
                  </uui-tab>
                `}
          </uui-tab-group>

          <!-- Tab Content -->
          <div class="tab-content">
            ${this._activeTab === "details" ? this._renderDetailsTab() : r}
            ${this._activeTab === "targets" ? this._renderTargetsTab() : r}
            ${this._activeTab === "requirements" ? this._renderRequirementsTab() : r}
            ${this._activeTab === "eligibility" ? this._renderEligibilityTab() : r}
            ${this._activeTab === "combinations" ? this._renderCombinationsTab() : r}
            ${this._activeTab === "schedule" ? this._renderScheduleTab() : r}
            ${this._activeTab === "performance" && !this._isNew && this._discount?.id ? a`<merchello-discount-performance discountId=${this._discount.id}></merchello-discount-performance>` : r}
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
    `;
  }
  render() {
    const e = this._discount?.status !== void 0 ? W[this._discount.status] : "", i = this._discount?.status !== void 0 ? V[this._discount.status] : "default";
    return a`
      <umb-workspace-editor alias="Merchello.Discount.Detail.Workspace" headline=${this._getHeadline()}>
        <!-- Status badge in header -->
        ${!this._isNew && this._discount ? a`
              <div slot="header">
                <uui-tag look="secondary" color=${i}>${e}</uui-tag>
              </div>
            ` : r}

        <!-- Header Actions -->
        <div slot="action-menu">
          ${this._isNew ? r : a`
                ${this._discount?.status === Y.Active ? a`
                      <uui-button
                        look="secondary"
                        color="warning"
                        label="Deactivate"
                        @click=${this._handleDeactivate}
                      >
                        Deactivate
                      </uui-button>
                    ` : a`
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
              `}
          <uui-button
            look="primary"
            color="positive"
            label=${this._isNew ? "Create discount" : "Save"}
            ?disabled=${this._isSaving}
            @click=${this._handleSave}
          >
            ${this._isSaving ? "Saving..." : this._isNew ? "Create discount" : "Save"}
          </uui-button>
        </div>

        <!-- Main Content -->
        ${this._renderContent()}
      </umb-workspace-editor>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
m.styles = S`
    :host {
      display: block;
      height: 100%;
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
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
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
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      background: var(--uui-color-surface);
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
  `;
v([
  d()
], m.prototype, "_discount", 2);
v([
  d()
], m.prototype, "_isNew", 2);
v([
  d()
], m.prototype, "_isLoading", 2);
v([
  d()
], m.prototype, "_isSaving", 2);
v([
  d()
], m.prototype, "_activeTab", 2);
v([
  d()
], m.prototype, "_validationErrors", 2);
v([
  d()
], m.prototype, "_codeAvailable", 2);
v([
  d()
], m.prototype, "_isGeneratingCode", 2);
v([
  d()
], m.prototype, "_targetRules", 2);
v([
  d()
], m.prototype, "_eligibilityRules", 2);
m = v([
  I("merchello-discount-detail")
], m);
const me = m;
export {
  m as MerchelloDiscountDetailElement,
  me as default
};
//# sourceMappingURL=discount-detail.element-02UTNhUS.js.map
