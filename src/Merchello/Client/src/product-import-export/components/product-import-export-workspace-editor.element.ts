import { css, customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-product-import-export-workspace-editor")
export class MerchelloProductImportExportWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Import & Export"></umb-workspace-editor>`;
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

export default MerchelloProductImportExportWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-import-export-workspace-editor": MerchelloProductImportExportWorkspaceEditorElement;
  }
}
