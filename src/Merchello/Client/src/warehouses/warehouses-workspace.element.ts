import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-warehouses-workspace")
export class MerchelloWarehousesWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <uui-box headline="Warehouses">
        <div class="placeholder">
          <uui-icon name="icon-store"></uui-icon>
          <h2>Warehouses</h2>
          <p>Warehouse management coming soon.</p>
          <p class="hint">This section will allow you to manage warehouse locations, inventory distribution, and fulfillment centers.</p>
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

export default MerchelloWarehousesWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warehouses-workspace": MerchelloWarehousesWorkspaceElement;
  }
}

