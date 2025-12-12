import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-filters-workspace")
export class MerchelloFiltersWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-filter"
        title="Filters"
        description="Product filters coming soon."
        hint="This area will let you define and manage product filters for search and browsing.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloFiltersWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filters-workspace": MerchelloFiltersWorkspaceElement;
  }
}

