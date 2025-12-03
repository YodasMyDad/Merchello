import { LitElement as s, html as c, css as u, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
var d = Object.getOwnPropertyDescriptor, h = (l, o, n, t) => {
  for (var e = t > 1 ? void 0 : t ? d(o, n) : o, i = l.length - 1, a; i >= 0; i--)
    (a = l[i]) && (e = a(e) || e);
  return e;
};
let r = class extends m(s) {
  render() {
    return c`
      <uui-box headline="Analytics">
        <div class="placeholder">
          <uui-icon name="icon-chart-curve"></uui-icon>
          <h2>Analytics</h2>
          <p>Sales analytics and reporting coming soon.</p>
          <p class="hint">This section will provide insights into sales performance, customer behavior, and revenue trends.</p>
        </div>
      </uui-box>
    `;
  }
};
r.styles = [
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
r = h([
  p("merchello-analytics-workspace")
], r);
const y = r;
export {
  r as MerchelloAnalyticsWorkspaceElement,
  y as default
};
//# sourceMappingURL=analytics-workspace.element-BvcWxAL1.js.map
