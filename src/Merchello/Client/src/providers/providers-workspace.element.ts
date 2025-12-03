import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("merchello-providers-workspace")
export class MerchelloProvidersWorkspaceElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <uui-box headline="Providers Overview">
        <p class="description">
          Manage the various providers that power your Merchello store. Configure payment gateways, 
          tax calculators, and other integrations from this section.
        </p>

        <div class="provider-categories">
          <div class="category-card">
            <uui-icon name="icon-credit-card"></uui-icon>
            <h3>Payment Providers</h3>
            <p>Configure payment gateways like Stripe, PayPal, and manual payments.</p>
          </div>

          <div class="category-card coming-soon">
            <uui-icon name="icon-calculator"></uui-icon>
            <h3>Tax Providers</h3>
            <p>Set up tax calculation services and regional tax rules.</p>
          </div>

          <div class="category-card coming-soon">
            <uui-icon name="icon-globe"></uui-icon>
            <h3>Currency Providers</h3>
            <p>Manage currency exchange rates and multi-currency support.</p>
          </div>
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

      .description {
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-layout-1);
      }

      .provider-categories {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--uui-size-space-5);
      }

      .category-card {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-5);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .category-card.coming-soon {
        opacity: 0.7;
      }

      .category-card uui-icon {
        font-size: 2rem;
        color: var(--uui-color-interactive);
      }

      .category-card h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .category-card p {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-size: 0.875rem;
      }
    `,
  ];
}

export default MerchelloProvidersWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-providers-workspace": MerchelloProvidersWorkspaceElement;
  }
}

