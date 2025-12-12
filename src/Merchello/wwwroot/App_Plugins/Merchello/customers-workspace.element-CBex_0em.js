import { LitElement as m, html as a, customElement as i } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import "./workspace-placeholder.element-NptmC6AN.js";
var u = Object.getOwnPropertyDescriptor, h = (t, s, n, l) => {
  for (var e = l > 1 ? void 0 : l ? u(s, n) : s, r = t.length - 1, c; r >= 0; r--)
    (c = t[r]) && (e = c(e) || e);
  return e;
};
let o = class extends p(m) {
  render() {
    return a`
      <merchello-workspace-placeholder
        icon="icon-users"
        title="Customers"
        description="Customer management coming soon."
        hint="This section will allow you to view and manage customer accounts, order history, and preferences.">
      </merchello-workspace-placeholder>
    `;
  }
};
o = h([
  i("merchello-customers-workspace")
], o);
const v = o;
export {
  o as MerchelloCustomersWorkspaceElement,
  v as default
};
//# sourceMappingURL=customers-workspace.element-CBex_0em.js.map
