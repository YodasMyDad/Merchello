import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-customers-workspace")
export class MerchelloCustomersWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-users"
        title="Customers"
        description="Customer management coming soon."
        hint="This section will allow you to view and manage customer accounts, order history, and preferences.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloCustomersWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customers-workspace": MerchelloCustomersWorkspaceElement;
  }
}
