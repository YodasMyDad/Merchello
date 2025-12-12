import { LitElement as a, html as i, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import "./workspace-placeholder.element-NptmC6AN.js";
var h = Object.getOwnPropertyDescriptor, d = (l, o, s, n) => {
  for (var e = n > 1 ? void 0 : n ? h(o, s) : o, r = l.length - 1, c; r >= 0; r--)
    (c = l[r]) && (e = c(e) || e);
  return e;
};
let t = class extends p(a) {
  render() {
    return i`
      <merchello-workspace-placeholder
        icon="icon-chart-curve"
        title="Analytics"
        description="Sales analytics and reporting coming soon."
        hint="This section will provide insights into sales performance, customer behavior, and revenue trends.">
      </merchello-workspace-placeholder>
    `;
  }
};
t = d([
  m("merchello-analytics-workspace")
], t);
const w = t;
export {
  t as MerchelloAnalyticsWorkspaceElement,
  w as default
};
//# sourceMappingURL=analytics-workspace.element-JuLp5vow.js.map
