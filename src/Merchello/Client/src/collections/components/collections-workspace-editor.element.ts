import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-collections-workspace-editor")
export class MerchelloCollectionsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Collections"></umb-workspace-editor>`;
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

export default MerchelloCollectionsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-collections-workspace-editor": MerchelloCollectionsWorkspaceEditorElement;
  }
}
