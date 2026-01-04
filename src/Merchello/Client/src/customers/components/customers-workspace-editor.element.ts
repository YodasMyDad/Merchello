import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-customers-workspace-editor")
export class MerchelloCustomersWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Customers"></umb-workspace-editor>`;
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

export default MerchelloCustomersWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customers-workspace-editor": MerchelloCustomersWorkspaceEditorElement;
  }
}
