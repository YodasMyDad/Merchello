import { LitElement as i, html as c, css as m, customElement as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
var u = Object.getOwnPropertyDescriptor, h = (o, s, a, l) => {
  for (var e = l > 1 ? void 0 : l ? u(s, a) : s, r = o.length - 1, n; r >= 0; r--)
    (n = o[r]) && (e = n(e) || e);
  return e;
};
let t = class extends p(i) {
  render() {
    return c`
      <umb-workspace-editor headline="Outstanding"></umb-workspace-editor>
    `;
  }
};
t.styles = m`
    :host {
      display: block;
      height: 100%;
    }
  `;
t = h([
  d("merchello-outstanding-workspace-editor")
], t);
const f = t;
export {
  t as MerchelloOutstandingWorkspaceEditorElement,
  f as default
};
//# sourceMappingURL=outstanding-workspace-editor.element-BA-tz-HE.js.map
