import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-notifications-workspace-editor")
export class MerchelloNotificationsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Notifications"></umb-workspace-editor>`;
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

export default MerchelloNotificationsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-notifications-workspace-editor": MerchelloNotificationsWorkspaceEditorElement;
  }
}
