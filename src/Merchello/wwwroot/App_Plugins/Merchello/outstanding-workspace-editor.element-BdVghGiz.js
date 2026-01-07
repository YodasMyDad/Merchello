import { LitElement as m, html as d, css as i, customElement as u } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as c } from "@umbraco-cms/backoffice/element-api";
var p = Object.getOwnPropertyDescriptor, b = (o, s, n, a) => {
  for (var e = a > 1 ? void 0 : a ? p(s, n) : s, r = o.length - 1, l; r >= 0; r--)
    (l = o[r]) && (e = l(e) || e);
  return e;
};
let t = class extends c(m) {
  render() {
    return d`
      <umb-workspace-editor>
        <umb-workspace-header-name-editable slot="header" .name=${"Outstanding"} readonly></umb-workspace-header-name-editable>
        <umb-router-slot></umb-router-slot>
      </umb-workspace-editor>
    `;
  }
};
t.styles = i`
    :host {
      display: block;
      height: 100%;
    }
  `;
t = b([
  u("merchello-outstanding-workspace-editor")
], t);
const k = t;
export {
  t as MerchelloOutstandingWorkspaceEditorElement,
  k as default
};
//# sourceMappingURL=outstanding-workspace-editor.element-BdVghGiz.js.map
