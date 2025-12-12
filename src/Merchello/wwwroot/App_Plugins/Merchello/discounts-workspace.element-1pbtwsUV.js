import { LitElement as i, html as a, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import "./workspace-placeholder.element-NptmC6AN.js";
var u = Object.getOwnPropertyDescriptor, d = (r, s, l, c) => {
  for (var e = c > 1 ? void 0 : c ? u(s, l) : s, o = r.length - 1, n; o >= 0; o--)
    (n = r[o]) && (e = n(e) || e);
  return e;
};
let t = class extends p(i) {
  render() {
    return a`
      <merchello-workspace-placeholder
        icon="icon-tag"
        title="Discounts"
        description="Discount codes and promotions coming soon."
        hint="This section will allow you to create discount codes, percentage or fixed amount discounts, and promotional campaigns.">
      </merchello-workspace-placeholder>
    `;
  }
};
t = d([
  m("merchello-discounts-workspace")
], t);
const g = t;
export {
  t as MerchelloDiscountsWorkspaceElement,
  g as default
};
//# sourceMappingURL=discounts-workspace.element-1pbtwsUV.js.map
