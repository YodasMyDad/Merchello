import { html as a, css as d, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as m } from "@umbraco-cms/backoffice/lit-element";
var i = Object.getOwnPropertyDescriptor, p = (r, s, n, l) => {
  for (var e = l > 1 ? void 0 : l ? i(s, n) : s, o = r.length - 1, c; o >= 0; o--)
    (c = r[o]) && (e = c(e) || e);
  return e;
};
let t = class extends m {
  render() {
    return a`<umb-workspace-editor headline="Abandoned Checkouts"></umb-workspace-editor>`;
  }
};
t.styles = [
  d`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `
];
t = p([
  h("merchello-abandoned-checkouts-workspace-editor")
], t);
const k = t;
export {
  t as MerchelloAbandonedCheckoutsWorkspaceEditorElement,
  k as default
};
//# sourceMappingURL=abandoned-checkouts-workspace-editor.element-ByqEk9bi.js.map
