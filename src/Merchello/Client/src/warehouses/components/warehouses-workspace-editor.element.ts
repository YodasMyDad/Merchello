import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-warehouses-workspace-editor")
export class MerchelloWarehousesWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Warehouses"></umb-workspace-editor>`;
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

export default MerchelloWarehousesWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warehouses-workspace-editor": MerchelloWarehousesWorkspaceEditorElement;
  }
}
