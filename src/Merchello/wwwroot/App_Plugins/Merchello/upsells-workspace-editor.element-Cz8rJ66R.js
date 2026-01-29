import { html as a, css as m, customElement as i } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as n } from "@umbraco-cms/backoffice/lit-element";
var d = Object.getOwnPropertyDescriptor, h = (t, s, c, o) => {
  for (var e = o > 1 ? void 0 : o ? d(s, c) : s, l = t.length - 1, p; l >= 0; l--)
    (p = t[l]) && (e = p(e) || e);
  return e;
};
let r = class extends n {
  render() {
    return a`<umb-workspace-editor headline="Upsells"></umb-workspace-editor>`;
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
r = h([
  i("merchello-upsells-workspace-editor")
], r);
const w = r;
export {
  r as MerchelloUpsellsWorkspaceEditorElement,
  w as default
};
//# sourceMappingURL=upsells-workspace-editor.element-Cz8rJ66R.js.map
