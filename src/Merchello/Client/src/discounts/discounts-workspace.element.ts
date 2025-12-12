import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-discounts-workspace")
export class MerchelloDiscountsWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-tag"
        title="Discounts"
        description="Discount codes and promotions coming soon."
        hint="This section will allow you to create discount codes, percentage or fixed amount discounts, and promotional campaigns.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloDiscountsWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discounts-workspace": MerchelloDiscountsWorkspaceElement;
  }
}
