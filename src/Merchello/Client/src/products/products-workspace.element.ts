import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-products-workspace")
export class MerchelloProductsWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <uui-box headline="Products">
        <div class="placeholder">
          <uui-icon name="icon-box"></uui-icon>
          <h2>Products</h2>
          <p>Product management coming soon.</p>
          <p class="hint">This section will allow you to manage your product catalog, inventory, and pricing.</p>
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

export default MerchelloProductsWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-products-workspace": MerchelloProductsWorkspaceElement;
  }
}

