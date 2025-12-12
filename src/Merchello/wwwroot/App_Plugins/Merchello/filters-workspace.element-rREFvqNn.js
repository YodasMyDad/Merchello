import { LitElement as n, html as a, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import "./workspace-placeholder.element-NptmC6AN.js";
var f = Object.getOwnPropertyDescriptor, h = (t, o, i, s) => {
  for (var e = s > 1 ? void 0 : s ? f(o, i) : o, r = t.length - 1, c; r >= 0; r--)
    (c = t[r]) && (e = c(e) || e);
  return e;
};
let l = class extends p(n) {
  render() {
    return a`
      <merchello-workspace-placeholder
        icon="icon-filter"
        title="Filters"
        description="Product filters coming soon."
        hint="This area will let you define and manage product filters for search and browsing.">
      </merchello-workspace-placeholder>
    `;
  }
};
l = h([
  m("merchello-filters-workspace")
], l);
const g = l;
export {
  l as MerchelloFiltersWorkspaceElement,
  g as default
};
//# sourceMappingURL=filters-workspace.element-rREFvqNn.js.map
