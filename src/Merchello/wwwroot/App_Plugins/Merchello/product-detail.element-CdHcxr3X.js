import { LitElement as _, html as c, css as m, state as p, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as x } from "@umbraco-cms/backoffice/workspace";
var y = Object.defineProperty, P = Object.getOwnPropertyDescriptor, h = (t) => {
  throw TypeError(t);
}, s = (t, e, r, a) => {
  for (var i = a > 1 ? void 0 : a ? P(e, r) : e, d = t.length - 1, n; d >= 0; d--)
    (n = t[d]) && (i = (a ? n(e, r, i) : n(i)) || i);
  return a && i && y(e, r, i), i;
}, v = (t, e, r) => e.has(t) || h("Cannot " + r), u = (t, e, r) => (v(t, e, "read from private field"), e.get(t)), w = (t, e, r) => e.has(t) ? h("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r), E = (t, e, r, a) => (v(t, e, "write to private field"), e.set(t, r), r), l;
let o = class extends f(_) {
  constructor() {
    super(), this._product = null, this._isLoading = !0, w(this, l), this.consumeContext(x, (t) => {
      E(this, l, t), u(this, l) && this.observe(u(this, l).product, (e) => {
        this._product = e ?? null, this._isLoading = !e;
      });
    });
  }
  _renderLoading() {
    return c`
      <div class="loading">
        <uui-loader></uui-loader>
      </div>
    `;
  }
  _renderPlaceholder() {
    return c`
      <div class="placeholder">
        <uui-box headline="Product Details">
          <div class="placeholder-content">
            <uui-icon name="icon-box" class="placeholder-icon"></uui-icon>
            <h2>Product Editor Coming Soon</h2>
            <p>Product ID: ${this._product?.id}</p>
            <p>This is a placeholder for the product detail view.</p>
            <p>The full product editor will be implemented here.</p>
          </div>
        </uui-box>
      </div>
    `;
  }
  render() {
    return c`
      <umb-body-layout header-fit-height>
        <div class="product-detail-container">
          ${this._isLoading ? this._renderLoading() : this._renderPlaceholder()}
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
o.styles = m`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .product-detail-container {
      padding: var(--uui-size-layout-1);
      max-width: 1200px;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .placeholder {
      max-width: 600px;
      margin: 0 auto;
    }

    .placeholder-content {
      text-align: center;
      padding: var(--uui-size-space-6);
    }

    .placeholder-icon {
      font-size: 64px;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .placeholder-content h2 {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text);
    }

    .placeholder-content p {
      margin: var(--uui-size-space-2) 0;
      color: var(--uui-color-text-alt);
    }
  `;
s([
  p()
], o.prototype, "_product", 2);
s([
  p()
], o.prototype, "_isLoading", 2);
o = s([
  g("merchello-product-detail")
], o);
const z = o;
export {
  o as MerchelloProductDetailElement,
  z as default
};
//# sourceMappingURL=product-detail.element-CdHcxr3X.js.map
