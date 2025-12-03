import { LitElement as n, html as s, css as u, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as d } from "@umbraco-cms/backoffice/element-api";
var m = Object.getOwnPropertyDescriptor, h = (t, l, c, i) => {
  for (var e = i > 1 ? void 0 : i ? m(l, c) : l, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (e = a(e) || e);
  return e;
};
let o = class extends d(n) {
  render() {
    return s`
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
};
o.styles = [
  u`
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
o = h([
  p("merchello-products-workspace")
], o);
const f = o;
export {
  o as MerchelloProductsWorkspaceElement,
  f as default
};
//# sourceMappingURL=products-workspace.element-DJMzQim_.js.map
