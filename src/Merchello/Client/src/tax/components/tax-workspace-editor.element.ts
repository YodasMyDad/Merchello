import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-tax-workspace-editor")
export class MerchelloTaxWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Tax Groups"></umb-workspace-editor>`;
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

export default MerchelloTaxWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-workspace-editor": MerchelloTaxWorkspaceEditorElement;
  }
}
