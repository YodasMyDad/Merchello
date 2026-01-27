import { LitElement as d, nothing as c, html as n, css as u, property as o, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as v } from "@umbraco-cms/backoffice/element-api";
import "./product-image.element-D7HwAIKr.js";
var f = Object.defineProperty, y = Object.getOwnPropertyDescriptor, i = (s, r, a, l) => {
  for (var t = l > 1 ? void 0 : l ? y(r, a) : r, m = s.length - 1, p; m >= 0; m--)
    (p = s[m]) && (t = (l ? p(r, a, t) : p(t)) || t);
  return l && t && f(r, a, t), t;
};
let e = class extends v(d) {
  constructor() {
    super(...arguments), this.mediaKey = null, this.name = "", this.selectedOptions = [], this.sku = "", this.size = "medium";
  }
  render() {
    return n`
      <merchello-product-image
        media-key=${this.mediaKey || c}
        size=${this.size}
        alt=${this.name}>
      </merchello-product-image>
      <div class="details">
        <div class="name">${this.name || "Unknown item"}</div>
        ${this.selectedOptions?.length ? n`
              <div class="options">
                ${this.selectedOptions.map(
      (s) => n`<span class="option">${s.optionName}: ${s.valueName}</span>`
    )}
              </div>
            ` : c}
        ${this.sku ? n`<div class="sku">${this.sku}</div>` : c}
      </div>
    `;
  }
};
e.styles = u`
    :host {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      min-width: 0;
    }

    .details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--line-item-color, var(--uui-color-text));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
    }

    .option {
      font-size: 0.8125rem;
      color: var(--line-item-secondary-color, var(--uui-color-text-alt));
    }

    .sku {
      font-size: 0.75rem;
      color: var(--line-item-secondary-color, var(--uui-color-text-alt));
    }
  `;
i([
  o({ attribute: "media-key" })
], e.prototype, "mediaKey", 2);
i([
  o()
], e.prototype, "name", 2);
i([
  o({ attribute: !1 })
], e.prototype, "selectedOptions", 2);
i([
  o()
], e.prototype, "sku", 2);
i([
  o()
], e.prototype, "size", 2);
e = i([
  h("merchello-line-item-identity")
], e);
//# sourceMappingURL=line-item-identity.element-DTtPHFdM.js.map
