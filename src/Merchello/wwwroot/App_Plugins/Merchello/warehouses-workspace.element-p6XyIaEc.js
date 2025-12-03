import { LitElement as n, html as u, css as c, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
var h = Object.getOwnPropertyDescriptor, d = (l, a, s, i) => {
  for (var e = i > 1 ? void 0 : i ? h(a, s) : a, r = l.length - 1, t; r >= 0; r--)
    (t = l[r]) && (e = t(e) || e);
  return e;
};
let o = class extends p(n) {
  render() {
    return u`
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
};
o.styles = [
  c`
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
o = d([
  m("merchello-warehouses-workspace")
], o);
const g = o;
export {
  o as MerchelloWarehousesWorkspaceElement,
  g as default
};
//# sourceMappingURL=warehouses-workspace.element-p6XyIaEc.js.map
