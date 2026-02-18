import { LitElement as c, html as i, property as m, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as u } from "@umbraco-cms/backoffice/element-api";
import { b as f } from "./badge.styles-C7D4rnJo.js";
var h = Object.defineProperty, g = Object.getOwnPropertyDescriptor, o = (n, t, l, r) => {
  for (var e = r > 1 ? void 0 : r ? g(t, l) : t, a = n.length - 1, p; a >= 0; a--)
    (p = n[a]) && (e = (r ? p(t, l, e) : p(e)) || e);
  return r && e && h(t, l, e), e;
};
let s = class extends u(c) {
  constructor() {
    super(...arguments), this.cssClass = "", this.label = "";
  }
  render() {
    return i`<span class="badge ${this.cssClass}">${this.label}</span>`;
  }
};
s.styles = [f];
o([
  m({ type: String })
], s.prototype, "cssClass", 2);
o([
  m({ type: String })
], s.prototype, "label", 2);
s = o([
  b("merchello-status-badge")
], s);
//# sourceMappingURL=merchello-status-badge.element-DZtAtyQ1.js.map
