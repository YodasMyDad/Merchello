import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-categories-workspace")
export class MerchelloCategoriesWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-tag"
        title="Categories"
        description="Category management coming soon."
        hint="This section will allow you to organize products into categories and manage category structures.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloCategoriesWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-categories-workspace": MerchelloCategoriesWorkspaceElement;
  }
}

