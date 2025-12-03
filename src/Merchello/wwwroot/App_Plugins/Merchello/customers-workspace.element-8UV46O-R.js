import { LitElement as n, html as c, css as u, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
var d = Object.getOwnPropertyDescriptor, h = (t, s, a, l) => {
  for (var e = l > 1 ? void 0 : l ? d(s, a) : s, r = t.length - 1, i; r >= 0; r--)
    (i = t[r]) && (e = i(e) || e);
  return e;
};
let o = class extends p(n) {
  render() {
    return c`
      <uui-box headline="Customers">
        <div class="placeholder">
          <uui-icon name="icon-users"></uui-icon>
          <h2>Customers</h2>
          <p>Customer management coming soon.</p>
          <p class="hint">This section will allow you to view and manage customer accounts, order history, and preferences.</p>
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
  m("merchello-customers-workspace")
], o);
const f = o;
export {
  o as MerchelloCustomersWorkspaceElement,
  f as default
};
//# sourceMappingURL=customers-workspace.element-8UV46O-R.js.map
