import { LitElement as s, html as c, css as u, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as d } from "@umbraco-cms/backoffice/element-api";
var m = Object.getOwnPropertyDescriptor, h = (o, r, n, a) => {
  for (var e = a > 1 ? void 0 : a ? m(r, n) : r, t = o.length - 1, l; t >= 0; t--)
    (l = o[t]) && (e = l(e) || e);
  return e;
};
let i = class extends d(s) {
  render() {
    return c`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline="Analytics">
            <div class="placeholder">
              <uui-icon name="icon-chart-curve"></uui-icon>
              <h2>Analytics</h2>
              <p>Sales analytics and reporting coming soon.</p>
              <p class="hint">This section will provide insights into sales performance, customer behavior, and revenue trends.</p>
            </div>
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = [
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
i = h([
  p("merchello-analytics-workspace")
], i);
const g = i;
export {
  i as MerchelloAnalyticsWorkspaceElement,
  g as default
};
//# sourceMappingURL=analytics-workspace.element-D386Jmck.js.map
