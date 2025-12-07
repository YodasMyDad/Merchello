import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { CreateProductModalData, CreateProductModalValue } from "./create-product-modal.token.js";

@customElement("merchello-create-product-modal")
export class MerchelloCreateProductModalElement extends UmbModalBaseElement<
  CreateProductModalData,
  CreateProductModalValue
> {
  private _handleClose(): void {
    this.value = { created: false };
    this.modalContext?.reject();
  }

  render() {
    return html`
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

  static styles = css`
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
}

export default MerchelloCreateProductModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-create-product-modal": MerchelloCreateProductModalElement;
  }
}
