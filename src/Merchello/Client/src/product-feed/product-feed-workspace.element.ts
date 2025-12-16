import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-product-feed-workspace")
export class MerchelloProductFeedWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-rss"
        title="Product Feed"
        description="Product feed management coming soon."
        hint="This section will allow you to create and manage product feeds for Google Shopping, Facebook Catalog, and other marketing channels.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloProductFeedWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-feed-workspace": MerchelloProductFeedWorkspaceElement;
  }
}
