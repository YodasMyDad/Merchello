import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-upsells-workspace-editor")
export class MerchelloUpsellsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Upsells"></umb-workspace-editor>`;
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

export default MerchelloUpsellsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-upsells-workspace-editor": MerchelloUpsellsWorkspaceEditorElement;
  }
}
