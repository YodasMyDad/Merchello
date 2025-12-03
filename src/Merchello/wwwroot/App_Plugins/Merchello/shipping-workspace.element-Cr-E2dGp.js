import { LitElement as s, html as c, css as p, customElement as u } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as h } from "@umbraco-cms/backoffice/element-api";
var m = Object.getOwnPropertyDescriptor, d = (r, l, a, n) => {
  for (var e = n > 1 ? void 0 : n ? m(l, a) : l, o = r.length - 1, t; o >= 0; o--)
    (t = r[o]) && (e = t(e) || e);
  return e;
};
let i = class extends h(s) {
  render() {
    return c`
      <uui-box headline="Shipping">
        <div class="placeholder">
          <uui-icon name="icon-truck"></uui-icon>
          <h2>Shipping</h2>
          <p>Shipping configuration coming soon.</p>
          <p class="hint">This section will allow you to configure shipping zones, rates, carriers, and delivery options.</p>
        </div>
      </uui-box>
    `;
  }
};
i.styles = [
  p`
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
    `
];
i = d([
  u("merchello-shipping-workspace")
], i);
const f = i;
export {
  i as MerchelloShippingWorkspaceElement,
  f as default
};
//# sourceMappingURL=shipping-workspace.element-Cr-E2dGp.js.map
