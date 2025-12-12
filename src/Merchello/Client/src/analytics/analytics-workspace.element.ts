import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-analytics-workspace")
export class MerchelloAnalyticsWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-chart-curve"
        title="Analytics"
        description="Sales analytics and reporting coming soon."
        hint="This section will provide insights into sales performance, customer behavior, and revenue trends.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloAnalyticsWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-workspace": MerchelloAnalyticsWorkspaceElement;
  }
}
