import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-products-workspace-editor")
export class MerchelloProductsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Products"></umb-workspace-editor>`;
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

export default MerchelloProductsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-products-workspace-editor": MerchelloProductsWorkspaceEditorElement;
  }
}
