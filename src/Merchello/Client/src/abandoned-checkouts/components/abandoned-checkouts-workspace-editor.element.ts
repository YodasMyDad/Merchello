import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-abandoned-checkouts-workspace-editor")
export class MerchelloAbandonedCheckoutsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Abandoned Checkouts"></umb-workspace-editor>`;
  }

  static override readonly styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ];
}

export default MerchelloAbandonedCheckoutsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-abandoned-checkouts-workspace-editor": MerchelloAbandonedCheckoutsWorkspaceEditorElement;
  }
}
