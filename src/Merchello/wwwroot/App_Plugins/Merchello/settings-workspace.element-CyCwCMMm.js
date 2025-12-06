import { LitElement as s, html as c, css as l, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
var d = Object.getOwnPropertyDescriptor, g = (t, n, r, u) => {
  for (var e = u > 1 ? void 0 : u ? d(n, r) : n, o = t.length - 1, a; o >= 0; o--)
    (a = t[o]) && (e = a(e) || e);
  return e;
};
let i = class extends m(s) {
  render() {
    return c`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline="Merchello Settings">
            <p>
              Welcome to Merchello Settings. This is where you can configure your e-commerce store.
            </p>

            <h3>Store Configuration</h3>
            <p>Configure your store's basic settings such as currency, tax rates, and shipping options.</p>

            <h3>Payment Providers</h3>
            <p>Set up and manage payment gateways for processing customer orders.</p>

            <h3>Shipping Methods</h3>
            <p>Define shipping zones and rates for delivering products to customers.</p>

            <h3>Notifications</h3>
            <p>Configure email templates for order confirmations, shipping updates, and more.</p>
          </uui-box>

          <uui-box headline="Quick Actions">
            <div class="actions">
              <uui-button look="primary" label="Store Settings">
                <uui-icon name="icon-store"></uui-icon>
                Store Settings
              </uui-button>
              <uui-button look="secondary" label="Payment Providers">
                <uui-icon name="icon-credit-card"></uui-icon>
                Payment Providers
              </uui-button>
              <uui-button look="secondary" label="Shipping">
                <uui-icon name="icon-truck"></uui-icon>
                Shipping
              </uui-button>
              <uui-button look="secondary" label="Notifications">
                <uui-icon name="icon-message"></uui-icon>
                Notifications
              </uui-button>
            </div>
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = [
  l`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        padding: var(--uui-size-layout-1);
      }

      uui-box {
        margin-bottom: var(--uui-size-layout-1);
      }

      h3 {
        margin-top: var(--uui-size-space-5);
        margin-bottom: var(--uui-size-space-2);
      }

      p {
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-4);
      }

      .actions {
        display: flex;
        gap: var(--uui-size-space-4);
        flex-wrap: wrap;
      }

      uui-button {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }
    `
];
i = g([
  p("merchello-settings-workspace")
], i);
const y = i;
export {
  i as MerchelloSettingsWorkspaceElement,
  y as default
};
//# sourceMappingURL=settings-workspace.element-CyCwCMMm.js.map
