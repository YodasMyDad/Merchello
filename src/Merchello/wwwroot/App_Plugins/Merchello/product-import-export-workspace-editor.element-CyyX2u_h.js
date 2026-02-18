import { html as m, css as a, customElement as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as i } from "@umbraco-cms/backoffice/lit-element";
var n = Object.getOwnPropertyDescriptor, u = (o, l, c, p) => {
  for (var e = p > 1 ? void 0 : p ? n(l, c) : l, t = o.length - 1, s; t >= 0; t--)
    (s = o[t]) && (e = s(e) || e);
  return e;
};
let r = class extends i {
  render() {
    return m`<umb-workspace-editor headline="Import & Export"></umb-workspace-editor>`;
  }
};
r.styles = [
  a`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
];
r = u([
  d("merchello-product-import-export-workspace-editor")
], r);
const f = r;
export {
  r as MerchelloProductImportExportWorkspaceEditorElement,
  f as default
};
//# sourceMappingURL=product-import-export-workspace-editor.element-CyyX2u_h.js.map
