import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-orders-workspace-editor")
export class MerchelloOrdersWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Orders"></umb-workspace-editor>`;
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

export default MerchelloOrdersWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-orders-workspace-editor": MerchelloOrdersWorkspaceEditorElement;
  }
}
