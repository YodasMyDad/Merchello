import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { ProductTypeDto } from '@product-types/types/product-types.types.js';
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_PRODUCT_TYPE_MODAL } from "../modals/product-type-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-product-types-list")
export class MerchelloProductTypesListElement extends UmbElementMixin(LitElement) {
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _deletingId: string | null = null;

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadProductTypes();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadProductTypes(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getProductTypes();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._productTypes = data;
    }

    this._isLoading = false;
  }

  private async _handleAddProductType(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_PRODUCT_TYPE_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isCreated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Product type created",
          message: `"${result.productType?.name}" has been created successfully`,
        },
      });
      this._loadProductTypes();
    }
  }

  private async _handleEditProductType(productType: ProductTypeDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_PRODUCT_TYPE_MODAL, {
      data: { productType },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Product type updated",
          message: `"${result.productType?.name}" has been updated successfully`,
        },
      });
      this._loadProductTypes();
    }
  }

  private async _handleDeleteProductType(e: Event, productType: ProductTypeDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Product Type",
        content: `Are you sure you want to delete the product type "${productType.name}"? This action cannot be undone. Note: You cannot delete a product type that is assigned to products.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._deletingId = productType.id;

    const { error } = await MerchelloApi.deleteProductType(productType.id);

    if (!this.#isConnected) return;

    this._deletingId = null;

    if (error) {
      this._errorMessage = `Failed to delete product type: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Product type deleted", message: "The product type has been deleted successfully" },
    });
    this._loadProductTypes();
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-tags"
        headline="No product types configured"
        message="Create product types to categorize your products (e.g., Physical, Digital, Service). Product types help organize and filter your product catalog.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button look="primary" color="positive" label="Add Product Type" @click=${this._handleAddProductType}>
          Add Product Type
        </uui-button>
      </div>
    `;
  }

  private _renderProductTypeRow(productType: ProductTypeDto): unknown {
    const isDeleting = this._deletingId === productType.id;

    return html`
      <div class="product-type-row" @click=${() => this._handleEditProductType(productType)}>
        <div class="product-type-info">
          <span class="product-type-name">${productType.name}</span>
          ${productType.alias
            ? html`<span class="product-type-alias">${productType.alias}</span>`
            : nothing}
        </div>
        <div class="product-type-actions">
          <uui-button
            look="secondary"
            compact
            label="Edit"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._handleEditProductType(productType);
            }}>
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-button
            look="primary"
            color="danger"
            compact
            label="Delete"
            ?disabled=${isDeleting}
            @click=${(e: Event) => this._handleDeleteProductType(e, productType)}>
            <uui-icon name=${isDeleting ? "icon-hourglass" : "icon-trash"}></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._productTypes.length === 0) {
      return this._renderEmptyState();
    }
    return html`
      <div class="product-types-list">
        ${this._productTypes.map((pt) => this._renderProductTypeRow(pt))}
      </div>
    `;
  }

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button look="primary" color="positive" label="Add Product Type" @click=${this._handleAddProductType}>
              Add Product Type
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              Product types help categorize your products for organization and filtering.
              Common examples include Physical, Digital, Service, or Subscription.
            </span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
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

    .container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      justify-content: flex-end;
      margin-bottom: var(--uui-size-space-4);
    }

    .info-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .info-banner uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
    }

    .product-types-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .product-type-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .product-type-row:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .product-type-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .product-type-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .product-type-alias {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      font-family: var(--uui-font-monospace);
    }

    .product-type-actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-action {
      display: flex;
      justify-content: center;
      margin-top: var(--uui-size-space-4);
    }
  `;
}

export default MerchelloProductTypesListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-types-list": MerchelloProductTypesListElement;
  }
}
