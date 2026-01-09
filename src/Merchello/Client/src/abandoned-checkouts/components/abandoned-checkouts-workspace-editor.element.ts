import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-abandoned-checkouts-workspace-editor")
export class MerchelloAbandonedCheckoutsWorkspaceEditorElement extends UmbElementMixin(LitElement) {
  override render() {
    return html`
      <umb-workspace-editor headline="Abandoned Checkouts">
        <umb-router-slot></umb-router-slot>
      </umb-workspace-editor>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
    }
  `;
}

export default MerchelloAbandonedCheckoutsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-abandoned-checkouts-workspace-editor": MerchelloAbandonedCheckoutsWorkspaceEditorElement;
  }
}
