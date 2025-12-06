import { LitElement as c, html as u, css as s, customElement as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
var m = Object.getOwnPropertyDescriptor, h = (r, i, n, l) => {
  for (var e = l > 1 ? void 0 : l ? m(i, n) : i, t = r.length - 1, a; t >= 0; t--)
    (a = r[t]) && (e = a(e) || e);
  return e;
};
let o = class extends p(c) {
  render() {
    return u`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline="Products">
            <div class="placeholder">
              <uui-icon name="icon-box"></uui-icon>
              <h2>Products</h2>
              <p>Product management coming soon.</p>
              <p class="hint">This section will allow you to manage your product catalog, inventory, and pricing.</p>
            </div>
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
o.styles = [
  s`
      :host {
        display: block;
        height: 100%;
      }

      .content {
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
  d("merchello-products-workspace")
], o);
const y = o;
export {
  o as MerchelloProductsWorkspaceElement,
  y as default
};
//# sourceMappingURL=products-workspace.element-CP4eNm7O.js.map
