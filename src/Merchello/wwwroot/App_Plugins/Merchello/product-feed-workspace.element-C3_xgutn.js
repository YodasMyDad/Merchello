import { LitElement as s, html as m, customElement as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import "./workspace-placeholder.element-NptmC6AN.js";
var i = Object.getOwnPropertyDescriptor, h = (t, l, a, c) => {
  for (var e = c > 1 ? void 0 : c ? i(l, a) : l, o = t.length - 1, n; o >= 0; o--)
    (n = t[o]) && (e = n(e) || e);
  return e;
};
let r = class extends p(s) {
  render() {
    return m`
      <merchello-workspace-placeholder
        icon="icon-rss"
        title="Product Feed"
        description="Product feed management coming soon."
        hint="This section will allow you to create and manage product feeds for Google Shopping, Facebook Catalog, and other marketing channels.">
      </merchello-workspace-placeholder>
    `;
  }
};
r = h([
  d("merchello-product-feed-workspace")
], r);
const w = r;
export {
  r as MerchelloProductFeedWorkspaceElement,
  w as default
};
//# sourceMappingURL=product-feed-workspace.element-C3_xgutn.js.map
