import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-analytics-workspace")
export class MerchelloAnalyticsWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <uui-box headline="Analytics">
        <div class="placeholder">
          <uui-icon name="icon-chart-curve"></uui-icon>
          <h2>Analytics</h2>
          <p>Sales analytics and reporting coming soon.</p>
          <p class="hint">This section will provide insights into sales performance, customer behavior, and revenue trends.</p>
        </div>
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      .placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-4);
        text-align: center;
      }

      .placeholder uui-icon {
        font-size: 4rem;
        color: var(--uui-color-border-emphasis);
        margin-bottom: var(--uui-size-space-4);
      }

      .placeholder h2 {
        margin: 0 0 var(--uui-size-space-2) 0;
        color: var(--uui-color-text);
      }

      .placeholder p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .placeholder .hint {
        margin-top: var(--uui-size-space-4);
        font-size: 0.875rem;
      }
    `,
  ];
}

export default MerchelloAnalyticsWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-workspace": MerchelloAnalyticsWorkspaceElement;
  }
}

