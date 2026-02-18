import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-outstanding-workspace-editor")
export class MerchelloOutstandingWorkspaceEditorElement extends UmbElementMixin(LitElement) {
  override render() {
    return html`
      <umb-workspace-editor headline="Outstanding"></umb-workspace-editor>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
    }
  `;
}

export default MerchelloOutstandingWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-outstanding-workspace-editor": MerchelloOutstandingWorkspaceEditorElement;
  }
}
