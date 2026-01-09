import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-webhooks-workspace-editor")
export class MerchelloWebhooksWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Webhooks"></umb-workspace-editor>`;
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

export default MerchelloWebhooksWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-webhooks-workspace-editor": MerchelloWebhooksWorkspaceEditorElement;
  }
}
