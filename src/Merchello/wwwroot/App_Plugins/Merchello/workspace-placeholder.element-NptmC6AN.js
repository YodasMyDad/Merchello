import { LitElement as u, html as a, css as h, property as n, customElement as d } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
var y = Object.defineProperty, g = Object.getOwnPropertyDescriptor, i = (p, o, l, r) => {
  for (var e = r > 1 ? void 0 : r ? g(o, l) : o, s = p.length - 1, c; s >= 0; s--)
    (c = p[s]) && (e = (r ? c(o, l, e) : c(e)) || e);
  return r && e && y(o, l, e), e;
};
let t = class extends m(u) {
  constructor() {
    super(...arguments), this.icon = "icon-settings", this.title = "Coming Soon", this.description = "", this.hint = "";
  }
  render() {
    return a`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline=${this.title}>
            <div class="placeholder">
              <uui-icon name=${this.icon}></uui-icon>
              <h2>${this.title}</h2>
              <p>${this.description}</p>
              ${this.hint ? a`<p class="hint">${this.hint}</p>` : ""}
            </div>
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
t.styles = [
  h`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        padding: var(--uui-size-layout-1);
      }

      .placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-4);
        text-align: center;
      }

      .placeholder uui-icon {
        font-size: 4rem;
        color: var(--uui-color-border-emphasis);
        margin-bottom: var(--uui-size-space-4);
      }

      .placeholder h2 {
        margin: 0 0 var(--uui-size-space-2) 0;
        color: var(--uui-color-text);
      }

      .placeholder p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .placeholder .hint {
        margin-top: var(--uui-size-space-4);
        font-size: 0.875rem;
      }
    `
];
i([
  n({ type: String })
], t.prototype, "icon", 2);
i([
  n({ type: String })
], t.prototype, "title", 2);
i([
  n({ type: String })
], t.prototype, "description", 2);
i([
  n({ type: String })
], t.prototype, "hint", 2);
t = i([
  d("merchello-workspace-placeholder")
], t);
//# sourceMappingURL=workspace-placeholder.element-NptmC6AN.js.map
