import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-marketing-workspace")
export class MerchelloMarketingWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-megaphone"
        title="Marketing"
        description="Marketing tools and promotions coming soon."
        hint="This section will allow you to create discount codes, promotions, and email campaigns.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloMarketingWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-marketing-workspace": MerchelloMarketingWorkspaceElement;
  }
}
