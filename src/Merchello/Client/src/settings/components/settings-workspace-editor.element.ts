import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-settings-workspace-editor")
export class MerchelloSettingsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Merchello"></umb-workspace-editor>`;
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

export default MerchelloSettingsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-settings-workspace-editor": MerchelloSettingsWorkspaceEditorElement;
  }
}
