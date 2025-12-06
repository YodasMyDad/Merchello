import { LitElement as n, html as u, css as c, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
var p = Object.getOwnPropertyDescriptor, d = (t, i, s, a) => {
  for (var e = a > 1 ? void 0 : a ? p(i, s) : i, r = t.length - 1, l; r >= 0; r--)
    (l = t[r]) && (e = l(e) || e);
  return e;
};
let o = class extends m(n) {
  render() {
    return u`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline="Warehouses">
            <div class="placeholder">
              <uui-icon name="icon-store"></uui-icon>
              <h2>Warehouses</h2>
              <p>Warehouse management coming soon.</p>
              <p class="hint">This section will allow you to manage warehouse locations, inventory distribution, and fulfillment centers.</p>
            </div>
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
o.styles = [
  c`
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
o = d([
  h("merchello-warehouses-workspace")
], o);
const f = o;
export {
  o as MerchelloWarehousesWorkspaceElement,
  f as default
};
//# sourceMappingURL=warehouses-workspace.element-CMcbB99-.js.map
