import { LitElement as l, html as c, css as u, customElement as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
var m = Object.getOwnPropertyDescriptor, h = (t, n, s, r) => {
  for (var e = r > 1 ? void 0 : r ? m(n, s) : n, i = t.length - 1, a; i >= 0; i--)
    (a = t[i]) && (e = a(e) || e);
  return e;
};
let o = class extends p(l) {
  render() {
    return c`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline="Discounts">
            <div class="placeholder">
              <uui-icon name="icon-megaphone"></uui-icon>
              <h2>Discounts</h2>
              <p>Discount codes and promotions coming soon.</p>
              <p class="hint">This section will allow you to create discount codes, percentage or fixed amount discounts, and promotional campaigns.</p>
            </div>
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
o.styles = [
  u`
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
  d("merchello-discounts-workspace")
], o);
const f = o;
export {
  o as MerchelloDiscountsWorkspaceElement,
  f as default
};
//# sourceMappingURL=discounts-workspace.element-BJWQmcGt.js.map
