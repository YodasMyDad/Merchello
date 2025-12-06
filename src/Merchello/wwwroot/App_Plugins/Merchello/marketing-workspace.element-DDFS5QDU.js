import { LitElement as c, html as s, css as u, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
var d = Object.getOwnPropertyDescriptor, h = (t, r, n, a) => {
  for (var e = a > 1 ? void 0 : a ? d(r, n) : r, i = t.length - 1, l; i >= 0; i--)
    (l = t[i]) && (e = l(e) || e);
  return e;
};
let o = class extends p(c) {
  render() {
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline="Marketing">
            <div class="placeholder">
              <uui-icon name="icon-megaphone"></uui-icon>
              <h2>Marketing</h2>
              <p>Marketing tools and promotions coming soon.</p>
              <p class="hint">This section will allow you to create discount codes, promotions, and email campaigns.</p>
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
  m("merchello-marketing-workspace")
], o);
const f = o;
export {
  o as MerchelloMarketingWorkspaceElement,
  f as default
};
//# sourceMappingURL=marketing-workspace.element-DDFS5QDU.js.map
