import { html as u, css as n, customElement as s } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as d } from "@umbraco-cms/backoffice/modal";
var p = Object.getOwnPropertyDescriptor, m = (t, a, c, i) => {
  for (var e = i > 1 ? void 0 : i ? p(a, c) : a, o = t.length - 1, r; o >= 0; o--)
    (r = t[o]) && (e = r(e) || e);
  return e;
};
let l = class extends d {
  _handleClose() {
    this.value = { created: !1 }, this.modalContext?.reject();
  }
  render() {
    return u`
      <umb-body-layout headline="Add Product">
        <div class="content">
          <div class="placeholder">
            <uui-icon name="icon-box" class="placeholder-icon"></uui-icon>
            <h2>Product Creation Coming Soon</h2>
            <p>The product creation wizard will be implemented here.</p>
            <p>This will include:</p>
            <ul>
              <li>Basic product information (name, SKU, price)</li>
              <li>Product type and category selection</li>
              <li>Tax group assignment</li>
              <li>Variant options configuration</li>
              <li>Stock and warehouse settings</li>
            </ul>
          </div>
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Cancel" @click=${this._handleClose}>Cancel</uui-button>
          <uui-button look="primary" color="positive" label="Create" disabled>Create Product</uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
l.styles = n`
    :host {
      display: block;
      height: 100%;
    }

    .content {
      padding: var(--uui-size-space-5);
    }

    .placeholder {
      text-align: center;
      padding: var(--uui-size-space-6);
    }

    .placeholder-icon {
      font-size: 64px;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .placeholder h2 {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text);
    }

    .placeholder p {
      margin: var(--uui-size-space-2) 0;
      color: var(--uui-color-text-alt);
    }

    .placeholder ul {
      text-align: left;
      max-width: 300px;
      margin: var(--uui-size-space-4) auto;
      color: var(--uui-color-text-alt);
    }

    .placeholder li {
      margin: var(--uui-size-space-2) 0;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
l = m([
  s("merchello-create-product-modal")
], l);
const g = l;
export {
  l as MerchelloCreateProductModalElement,
  g as default
};
//# sourceMappingURL=create-product-modal.element-tp0y4-sG.js.map
