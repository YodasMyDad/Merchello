import { LitElement as c, nothing as u, html as m, css as h, property as l, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as g } from "@umbraco-cms/backoffice/element-api";
var v = Object.defineProperty, d = Object.getOwnPropertyDescriptor, i = (p, o, r, s) => {
  for (var t = s > 1 ? void 0 : s ? d(o, r) : o, n = p.length - 1, a; n >= 0; n--)
    (a = p[n]) && (t = (s ? a(o, r, t) : a(t)) || t);
  return s && t && v(o, r, t), t;
};
let e = class extends g(c) {
  constructor() {
    super(...arguments), this.icon = "icon-box", this.headline = "No items found";
  }
  render() {
    return m`
      <div class="empty-state">
        <uui-icon name=${this.icon}></uui-icon>
        <h3>${this.headline}</h3>
        ${this.message ? m`<p>${this.message}</p>` : u}
        <slot name="actions"></slot>
        <slot name="action"></slot>
      </div>
    `;
  }
};
e.styles = h`
    :host {
      display: block;
    }

    .empty-state {
      text-align: center;
      padding: var(--uui-size-layout-2);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    .empty-state p {
      margin: 0;
    }

    ::slotted([slot="actions"]),
    ::slotted([slot="action"]) {
      margin-top: var(--uui-size-space-4);
    }
  `;
i([
  l({ type: String })
], e.prototype, "icon", 2);
i([
  l({ type: String })
], e.prototype, "headline", 2);
i([
  l({ type: String })
], e.prototype, "message", 2);
e = i([
  y("merchello-empty-state")
], e);
//# sourceMappingURL=merchello-empty-state.element-D2dcD7_8.js.map
