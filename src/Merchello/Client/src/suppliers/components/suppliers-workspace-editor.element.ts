import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-suppliers-workspace-editor")
export class MerchelloSuppliersWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Suppliers"></umb-workspace-editor>`;
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

export default MerchelloSuppliersWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-suppliers-workspace-editor": MerchelloSuppliersWorkspaceEditorElement;
  }
}
