import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-product-feed-workspace-editor")
export class MerchelloProductFeedWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Product Feed"></umb-workspace-editor>`;
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

export default MerchelloProductFeedWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-feed-workspace-editor": MerchelloProductFeedWorkspaceEditorElement;
  }
}
