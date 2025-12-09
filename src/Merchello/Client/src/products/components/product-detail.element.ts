import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { MerchelloProductDetailWorkspaceContext } from "@products/contexts/product-detail-workspace.context.js";
import type { ProductDetailDto } from "@products/types/product.types.js";

@customElement("merchello-product-detail")
export class MerchelloProductDetailElement extends UmbElementMixin(LitElement) {
  @state() private _product: ProductDetailDto | null = null;
  @state() private _isLoading = true;

  #workspaceContext?: MerchelloProductDetailWorkspaceContext;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductDetailWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.product, (product) => {
          this._product = product ?? null;
          this._isLoading = !product;
        });
      }
    });
  }

  private _renderLoading() {
    return html`
      <div class="loading">
        <uui-loader></uui-loader>
      </div>
    `;
  }

  private _renderPlaceholder() {
    return html`
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
    return html`
      <umb-body-layout header-fit-height>
        <div class="product-detail-container">
          ${this._isLoading ? this._renderLoading() : this._renderPlaceholder()}
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
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
}

export default MerchelloProductDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-detail": MerchelloProductDetailElement;
  }
}
