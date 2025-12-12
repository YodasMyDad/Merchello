import { LitElement as n, html as i, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import "./workspace-placeholder.element-NptmC6AN.js";
var g = Object.getOwnPropertyDescriptor, h = (t, l, s, a) => {
  for (var e = a > 1 ? void 0 : a ? g(l, s) : l, r = t.length - 1, c; r >= 0; r--)
    (c = t[r]) && (e = c(e) || e);
  return e;
};
let o = class extends p(n) {
  render() {
    return i`
      <merchello-workspace-placeholder
        icon="icon-tag"
        title="Categories"
        description="Category management coming soon."
        hint="This section will allow you to organize products into categories and manage category structures.">
      </merchello-workspace-placeholder>
    `;
  }
};
o = h([
  m("merchello-categories-workspace")
], o);
const f = o;
export {
  o as MerchelloCategoriesWorkspaceElement,
  f as default
};
//# sourceMappingURL=categories-workspace.element-FcYZ2W5I.js.map
