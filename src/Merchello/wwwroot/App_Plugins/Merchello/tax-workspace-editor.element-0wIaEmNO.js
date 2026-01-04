import { html as m, css as p, customElement as i } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as n } from "@umbraco-cms/backoffice/lit-element";
var d = Object.getOwnPropertyDescriptor, h = (o, l, c, s) => {
  for (var e = s > 1 ? void 0 : s ? d(l, c) : l, t = o.length - 1, a; t >= 0; t--)
    (a = o[t]) && (e = a(e) || e);
  return e;
};
let r = class extends n {
  render() {
    return m`<umb-workspace-editor headline="Tax Groups"></umb-workspace-editor>`;
  }
};
r.styles = [
  p`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
];
r = h([
  i("merchello-tax-workspace-editor")
], r);
const w = r;
export {
  r as MerchelloTaxWorkspaceEditorElement,
  w as default
};
//# sourceMappingURL=tax-workspace-editor.element-0wIaEmNO.js.map
