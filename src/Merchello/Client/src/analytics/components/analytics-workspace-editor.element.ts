import { html, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-analytics-workspace-editor")
export class MerchelloAnalyticsWorkspaceEditorElement extends UmbLitElement {
  override render() {
    return html`<umb-workspace-editor headline="Analytics"></umb-workspace-editor>`;
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

export default MerchelloAnalyticsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-workspace-editor": MerchelloAnalyticsWorkspaceEditorElement;
  }
}
