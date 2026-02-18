import { html as a, css as m, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as i } from "@umbraco-cms/backoffice/lit-element";
var n = Object.getOwnPropertyDescriptor, u = (o, l, d, s) => {
  for (var e = s > 1 ? void 0 : s ? n(l, d) : l, t = o.length - 1, c; t >= 0; t--)
    (c = o[t]) && (e = c(e) || e);
  return e;
};
let r = class extends i {
  render() {
    return a`<umb-workspace-editor headline="Product Feeds"></umb-workspace-editor>`;
  }
};
r.styles = [
  m`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
];
r = u([
  p("merchello-product-feed-workspace-editor")
], r);
const w = r;
export {
  r as MerchelloProductFeedWorkspaceEditorElement,
  w as default
};
//# sourceMappingURL=product-feed-workspace-editor.element-DvSzk632.js.map
