import { LitElement as n, html as i, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
import "./workspace-placeholder.element-NptmC6AN.js";
var h = Object.getOwnPropertyDescriptor, u = (t, l, s, a) => {
  for (var e = a > 1 ? void 0 : a ? h(l, s) : l, r = t.length - 1, c; r >= 0; r--)
    (c = t[r]) && (e = c(e) || e);
  return e;
};
let o = class extends m(n) {
  render() {
    return i`
      <merchello-workspace-placeholder
        icon="icon-calculator"
        title="Tax"
        description="Tax configuration coming soon."
        hint="This section will provide tools to set up tax groups, rates, and rules.">
      </merchello-workspace-placeholder>
    `;
  }
};
o = u([
  p("merchello-tax-workspace")
], o);
const v = o;
export {
  o as MerchelloTaxWorkspaceElement,
  v as default
};
//# sourceMappingURL=tax-workspace.element-DuzrGHPu.js.map
