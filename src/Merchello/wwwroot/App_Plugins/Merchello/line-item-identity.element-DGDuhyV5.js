import { LitElement as d, nothing as c, html as n, css as u, property as o, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as v } from "@umbraco-cms/backoffice/element-api";
import "./product-image.element-DwGTTyOK.js";
var y = Object.defineProperty, f = Object.getOwnPropertyDescriptor, s = (r, t, a, l) => {
  for (var i = l > 1 ? void 0 : l ? f(t, a) : t, m = r.length - 1, p; m >= 0; m--)
    (p = r[m]) && (i = (l ? p(t, a, i) : p(i)) || i);
  return l && i && y(t, a, i), i;
};
let e = class extends v(d) {
  constructor() {
    super(...arguments), this.mediaKey = null, this.name = "", this.selectedOptions = [], this.sku = "", this.size = "medium";
  }
  render() {
    const r = typeof this.mediaKey == "string" ? this.mediaKey.trim() : "";
    return n`
      <merchello-product-image
        .mediaKey=${r || null}
        .size=${this.size}
        .alt=${this.name}>
      </merchello-product-image>
      <div class="details">
        <div class="name">${this.name || "Unknown item"}</div>
        ${this.selectedOptions?.length ? n`
              <div class="options">
                ${this.selectedOptions.map(
      (t) => n`<span class="option">${t.optionName}: ${t.valueName}</span>`
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
s([
  o({ attribute: "media-key" })
], e.prototype, "mediaKey", 2);
s([
  o()
], e.prototype, "name", 2);
s([
  o({ attribute: !1 })
], e.prototype, "selectedOptions", 2);
s([
  o()
], e.prototype, "sku", 2);
s([
  o()
], e.prototype, "size", 2);
e = s([
  h("merchello-line-item-identity")
], e);
//# sourceMappingURL=line-item-identity.element-DGDuhyV5.js.map
