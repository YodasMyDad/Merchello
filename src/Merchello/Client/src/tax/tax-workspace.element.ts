import {
  LitElement,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import "@shared/components/workspace-placeholder.element.js";

@customElement("merchello-tax-workspace")
export class MerchelloTaxWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <merchello-workspace-placeholder
        icon="icon-calculator"
        title="Tax"
        description="Tax configuration coming soon."
        hint="This section will provide tools to set up tax groups, rates, and rules.">
      </merchello-workspace-placeholder>
    `;
  }
}

export default MerchelloTaxWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-workspace": MerchelloTaxWorkspaceElement;
  }
}
