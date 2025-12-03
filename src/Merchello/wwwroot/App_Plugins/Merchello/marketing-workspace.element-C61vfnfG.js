import { LitElement as s, html as c, css as u, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
var d = Object.getOwnPropertyDescriptor, h = (i, t, n, a) => {
  for (var e = a > 1 ? void 0 : a ? d(t, n) : t, r = i.length - 1, l; r >= 0; r--)
    (l = i[r]) && (e = l(e) || e);
  return e;
};
let o = class extends m(s) {
  render() {
    return c`
      <uui-box headline="Marketing">
        <div class="placeholder">
          <uui-icon name="icon-megaphone"></uui-icon>
          <h2>Marketing</h2>
          <p>Marketing tools and promotions coming soon.</p>
          <p class="hint">This section will allow you to create discount codes, promotions, and email campaigns.</p>
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
  p("merchello-marketing-workspace")
], o);
const f = o;
export {
  o as MerchelloMarketingWorkspaceElement,
  f as default
};
//# sourceMappingURL=marketing-workspace.element-C61vfnfG.js.map
