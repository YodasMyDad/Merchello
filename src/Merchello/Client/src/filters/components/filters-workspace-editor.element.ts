import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-filters-workspace-editor")
export class MerchelloFiltersWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Filters"></umb-workspace-editor>`;
  }

  static override styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ];
}

export default MerchelloFiltersWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filters-workspace-editor": MerchelloFiltersWorkspaceEditorElement;
  }
}
