import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-stats-dashboard")
export class MerchelloStatsDashboardElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <div class="stats-grid">
        <uui-box headline="Orders">
          <div class="stat-value">247</div>
          <div class="stat-label">Total Orders</div>
          <div class="stat-change positive">+12% from last month</div>
        </uui-box>

        <uui-box headline="Revenue">
          <div class="stat-value">£12,450</div>
          <div class="stat-label">Total Revenue</div>
          <div class="stat-change positive">+8% from last month</div>
        </uui-box>

        <uui-box headline="Products">
          <div class="stat-value">156</div>
          <div class="stat-label">Active Products</div>
          <div class="stat-change neutral">No change</div>
        </uui-box>

        <uui-box headline="Customers">
          <div class="stat-value">1,892</div>
          <div class="stat-label">Registered Customers</div>
          <div class="stat-change positive">+23 this week</div>
        </uui-box>
      </div>

      <uui-box headline="Recent Orders" class="wide">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Order #</uui-table-head-cell>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Date</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Total</uui-table-head-cell>
          </uui-table-head>
          <uui-table-row>
            <uui-table-cell>#1047</uui-table-cell>
            <uui-table-cell>John Smith</uui-table-cell>
            <uui-table-cell>01 Dec 2025</uui-table-cell>
            <uui-table-cell><uui-badge color="positive">Completed</uui-badge></uui-table-cell>
            <uui-table-cell>£125.00</uui-table-cell>
          </uui-table-row>
          <uui-table-row>
            <uui-table-cell>#1046</uui-table-cell>
            <uui-table-cell>Jane Doe</uui-table-cell>
            <uui-table-cell>30 Nov 2025</uui-table-cell>
            <uui-table-cell><uui-badge color="warning">Processing</uui-badge></uui-table-cell>
            <uui-table-cell>£89.50</uui-table-cell>
          </uui-table-row>
          <uui-table-row>
            <uui-table-cell>#1045</uui-table-cell>
            <uui-table-cell>Bob Wilson</uui-table-cell>
            <uui-table-cell>30 Nov 2025</uui-table-cell>
            <uui-table-cell><uui-badge color="positive">Completed</uui-badge></uui-table-cell>
            <uui-table-cell>£245.00</uui-table-cell>
          </uui-table-row>
          <uui-table-row>
            <uui-table-cell>#1044</uui-table-cell>
            <uui-table-cell>Sarah Connor</uui-table-cell>
            <uui-table-cell>29 Nov 2025</uui-table-cell>
            <uui-table-cell><uui-badge color="default">Pending</uui-badge></uui-table-cell>
            <uui-table-cell>£67.25</uui-table-cell>
          </uui-table-row>
        </uui-table>
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--uui-size-layout-1);
        margin-bottom: var(--uui-size-layout-1);
      }

      .stat-value {
        font-size: 2.5rem;
        font-weight: bold;
        color: var(--uui-color-text);
        margin-bottom: var(--uui-size-space-2);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-2);
      }

      .stat-change {
        font-size: var(--uui-type-small-size);
      }

      .stat-change.positive {
        color: var(--uui-color-positive);
      }

      .stat-change.negative {
        color: var(--uui-color-danger);
      }

      .stat-change.neutral {
        color: var(--uui-color-text-alt);
      }

      .wide {
        grid-column: span 4;
      }

      uui-table {
        width: 100%;
      }
    `,
  ];
}

export default MerchelloStatsDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-stats-dashboard": MerchelloStatsDashboardElement;
  }
}
