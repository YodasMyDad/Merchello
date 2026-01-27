import { html as a, css as n, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as p } from "@umbraco-cms/backoffice/lit-element";
var d = Object.getOwnPropertyDescriptor, f = (r, s, c, i) => {
  for (var e = i > 1 ? void 0 : i ? d(s, c) : s, o = r.length - 1, l; o >= 0; o--)
    (l = r[o]) && (e = l(e) || e);
  return e;
};
let t = class extends p {
  render() {
    return a`<umb-workspace-editor headline="Notifications"></umb-workspace-editor>`;
  }
};
t.styles = [
  n`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
];
t = f([
  m("merchello-notifications-workspace-editor")
], t);
const w = t;
export {
  t as MerchelloNotificationsWorkspaceEditorElement,
  w as default
};
//# sourceMappingURL=notifications-workspace-editor.element-CRJrLwrT.js.map
