import { html as n, css as a, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as p } from "@umbraco-cms/backoffice/lit-element";
var d = Object.getOwnPropertyDescriptor, h = (o, s, i, l) => {
  for (var e = l > 1 ? void 0 : l ? d(s, i) : s, r = o.length - 1, c; r >= 0; r--)
    (c = o[r]) && (e = c(e) || e);
  return e;
};
let t = class extends p {
  render() {
    return n`<umb-workspace-editor headline="Merchello"></umb-workspace-editor>`;
  }
};
t.styles = [
  a`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
];
t = h([
  m("merchello-settings-workspace-editor")
], t);
const g = t;
export {
  t as MerchelloSettingsWorkspaceEditorElement,
  g as default
};
//# sourceMappingURL=settings-workspace-editor.element-kNNm7l1O.js.map
