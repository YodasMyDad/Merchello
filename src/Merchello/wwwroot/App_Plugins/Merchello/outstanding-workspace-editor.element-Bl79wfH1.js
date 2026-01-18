import { LitElement as i, html as m, css as u, customElement as c } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as d } from "@umbraco-cms/backoffice/element-api";
var p = Object.getOwnPropertyDescriptor, h = (o, s, a, l) => {
  for (var e = l > 1 ? void 0 : l ? p(s, a) : s, r = o.length - 1, n; r >= 0; r--)
    (n = o[r]) && (e = n(e) || e);
  return e;
};
let t = class extends d(i) {
  render() {
    return m`
      <umb-workspace-editor headline="Outstanding">
        <umb-router-slot></umb-router-slot>
      </umb-workspace-editor>
    `;
  }
};
t.styles = u`
    :host {
      display: block;
      height: 100%;
    }
  `;
t = h([
  c("merchello-outstanding-workspace-editor")
], t);
const E = t;
export {
  t as MerchelloOutstandingWorkspaceEditorElement,
  E as default
};
//# sourceMappingURL=outstanding-workspace-editor.element-Bl79wfH1.js.map
