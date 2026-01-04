import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-discounts-workspace-editor")
export class MerchelloDiscountsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Discounts"></umb-workspace-editor>`;
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

export default MerchelloDiscountsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discounts-workspace-editor": MerchelloDiscountsWorkspaceEditorElement;
  }
}
