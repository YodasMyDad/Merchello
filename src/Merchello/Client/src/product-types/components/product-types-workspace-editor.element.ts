import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-product-types-workspace-editor")
export class MerchelloProductTypesWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Product Types"></umb-workspace-editor>`;
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

export default MerchelloProductTypesWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-types-workspace-editor": MerchelloProductTypesWorkspaceEditorElement;
  }
}
