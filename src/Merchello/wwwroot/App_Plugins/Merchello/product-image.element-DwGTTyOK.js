import { LitElement as d, html as m, css as h, property as u, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import "@umbraco-cms/backoffice/imaging";
var f = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, a = (i, e, r, t) => {
  for (var n = t > 1 ? void 0 : t ? $(e, r) : e, s = i.length - 1, o; s >= 0; s--)
    (o = i[s]) && (n = (t ? o(e, r, n) : o(n)) || n);
  return t && n && f(e, r, n), n;
};
const c = {
  small: 32,
  medium: 40,
  large: 56
}, y = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, _ = /^[0-9a-f]{32}$/i, b = /^umb:\/\/media\/([0-9a-f]{32})$/i;
let l = class extends p(d) {
  constructor() {
    super(...arguments), this.mediaKey = null, this.size = "medium", this.alt = "";
  }
  get _dimension() {
    return c[this.size] || c.medium;
  }
  get _normalizedMediaKey() {
    const i = typeof this.mediaKey == "string" ? this.mediaKey.trim() : "";
    if (!i) return null;
    const e = i.toLowerCase();
    return e === "null" || e === "undefined" || i === "00000000-0000-0000-0000-000000000000" ? null : this._normalizeMediaKeyToGuid(i);
  }
  _normalizeMediaKeyToGuid(i) {
    const e = i.replace(/[{}]/g, "").trim();
    if (!e)
      return null;
    if (y.test(e))
      return e;
    if (_.test(e))
      return `${e.slice(0, 8)}-${e.slice(8, 12)}-${e.slice(12, 16)}-${e.slice(16, 20)}-${e.slice(20)}`;
    const r = b.exec(e);
    if (r?.[1]) {
      const t = r[1];
      return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`;
    }
    return null;
  }
  render() {
    const i = this._dimension, e = this._normalizedMediaKey;
    return e ? m`
        <div class="image-container" style="width: ${i}px; height: ${i}px;">
          <umb-imaging-thumbnail
            .unique=${e}
            .width=${i}
            .height=${i}
            .alt=${this.alt}
            icon="icon-picture"
            loading="lazy">
          </umb-imaging-thumbnail>
        </div>
      ` : m`
      <div class="image-container" style="width: ${i}px; height: ${i}px;">
        <umb-imaging-thumbnail
          .unique=${""}
          .width=${i}
          .height=${i}
          .alt=${this.alt || "No image available"}
          icon="icon-picture"
          loading="lazy">
        </umb-imaging-thumbnail>
      </div>
    `;
  }
};
l.styles = h`
    :host {
      display: inline-block;
    }

    .image-container {
      border-radius: var(--uui-border-radius);
      overflow: hidden;
      background-color: var(--uui-color-surface-alt);
    }

    .image-container umb-imaging-thumbnail {
      width: 100%;
      height: 100%;
    }

  `;
a([
  u({ attribute: "media-key" })
], l.prototype, "mediaKey", 2);
a([
  u()
], l.prototype, "size", 2);
a([
  u()
], l.prototype, "alt", 2);
l = a([
  g("merchello-product-image")
], l);
//# sourceMappingURL=product-image.element-DwGTTyOK.js.map
