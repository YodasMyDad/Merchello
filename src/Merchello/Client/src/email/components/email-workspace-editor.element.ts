import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-email-workspace-editor")
export class MerchelloEmailWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Emails"></umb-workspace-editor>`;
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

export default MerchelloEmailWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-email-workspace-editor": MerchelloEmailWorkspaceEditorElement;
  }
}
