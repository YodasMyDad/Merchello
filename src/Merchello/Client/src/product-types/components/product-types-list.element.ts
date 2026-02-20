import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { ProductTypeDto } from "@product-types/types/product-types.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_PRODUCT_TYPE_MODAL } from "@product-types/modals/product-type-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-product-types-list")
export class MerchelloProductTypesListElement extends UmbElementMixin(LitElement) {
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _deletingId: string | null = null;
  @state() private _searchTerm = "";

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

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadProductTypes();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private get _filteredProductTypes(): ProductTypeDto[] {
    const sorted = [...this._productTypes].sort((a, b) => a.name.localeCompare(b.name));
    const term = this._searchTerm.trim().toLowerCase();
    if (!term) {
      return sorted;
    }
    return sorted.filter((productType) =>
      [productType.name, productType.alias ?? ""].some((value) => value.toLowerCase().includes(term))
    );
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

    this._productTypes = data ?? [];
    this._isLoading = false;
  }

  private _handleSearchInput(event: Event): void {
    this._searchTerm = (event.target as HTMLInputElement).value;
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
  }

  private async _handleAddProductType(): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_TYPE_MODAL, {
      data: {},
    });

    const result = await modal.onSubmit().catch(() => undefined);
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
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_TYPE_MODAL, {
      data: { productType },
    });

    const result = await modal.onSubmit().catch(() => undefined);
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

  private async _handleDeleteProductType(productType: ProductTypeDto): Promise<void> {
    if (!this.#modalManager) return;

    const modalContext = this.#modalManager.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete product type",
        content: `Delete "${productType.name}" permanently. Product types assigned to products cannot be deleted.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext.onSubmit();
    } catch {
      return;
    }

    if (!this.#isConnected) return;

    this._deletingId = productType.id;

    const { error } = await MerchelloApi.deleteProductType(productType.id);

    if (!this.#isConnected) return;

    this._deletingId = null;

    if (error) {
      this._errorMessage = `Failed to delete product type: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete product type", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Product type deleted", message: `"${productType.name}" was deleted` },
    });
    this._loadProductTypes();
  }

  private _renderLoadingState(): unknown {
    return html`
      <div class="state-block">
        <uui-loader-bar></uui-loader-bar>
      </div>
    `;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" label="Retry" @click=${() => this._loadProductTypes()}>
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-tags"
        headline="No product types configured"
        message="Create product types to classify products such as Physical, Digital, and Service.">
      </merchello-empty-state>
      <div class="state-action">
        <uui-button look="primary" color="positive" label="Add product type" @click=${this._handleAddProductType}>
          Add Product Type
        </uui-button>
      </div>
    `;
  }

  private _renderNoSearchResults(): unknown {
    return html`
      <div class="state-block state-block-compact">
        <p class="state-text">No product types match "${this._searchTerm}".</p>
        <uui-button look="secondary" label="Clear search" @click=${this._handleSearchClear}>
          Clear Search
        </uui-button>
      </div>
    `;
  }

  private _renderProductTypeRow(productType: ProductTypeDto): unknown {
    const isDeleting = this._deletingId === productType.id;
    const alias = productType.alias?.trim() ? productType.alias : "Not set";

    return html`
      <uui-table-row>
        <uui-table-cell>
          <div class="name-cell">
            <uui-icon name="icon-tag"></uui-icon>
            <span class="type-name">${productType.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <span class="type-alias">${alias}</span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            look="secondary"
            compact
            label=${`Edit ${productType.name}`}
            @click=${() => this._handleEditProductType(productType)}>
            Edit
          </uui-button>
          <uui-button
            look="secondary"
            color="danger"
            compact
            label=${`Delete ${productType.name}`}
            ?disabled=${isDeleting}
            @click=${() => this._handleDeleteProductType(productType)}>
            ${isDeleting ? "Deleting..." : "Delete"}
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderProductTypesTable(): unknown {
    return html`
      <uui-table class="product-types-table">
        <uui-table-head>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Alias</uui-table-head-cell>
          <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
        </uui-table-head>
        ${this._filteredProductTypes.map((productType) => this._renderProductTypeRow(productType))}
      </uui-table>
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

    if (this._filteredProductTypes.length === 0) {
      return this._renderNoSearchResults();
    }

    return this._renderProductTypesTable();
  }

  override render() {
    const totalCount = this._productTypes.length;

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container layout-container">
          <div class="filters">
            <div class="filters-top">
              <div class="search-box">
                <uui-input
                  type="search"
                  label="Search product types"
                  placeholder="Search by name or alias"
                  .value=${this._searchTerm}
                  @input=${this._handleSearchInput}>
                  <uui-icon name="icon-search" slot="prepend"></uui-icon>
                  ${this._searchTerm
                    ? html`
                        <uui-button slot="append" compact look="secondary" label="Clear search" @click=${this._handleSearchClear}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      `
                    : ""}
                </uui-input>
              </div>
              <div class="header-actions">
                <uui-button look="primary" color="positive" label="Add product type" @click=${this._handleAddProductType}>
                  Add Product Type
                </uui-button>
              </div>
            </div>
          </div>

          <uui-box>
            <div class="intro">
              <uui-icon name="icon-info"></uui-icon>
              <span>
                Product types classify products for reporting, filtering, and merchandising rules.
                Keep names clear and consistent across your catalog.
              </span>
            </div>
          </uui-box>

          <uui-box>
            <div class="table-header">
              <h4>Product Types</h4>
              <span>${totalCount} total</span>
            </div>
            ${this._renderContent()}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    ${collectionLayoutStyles}

    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .search-box {
      max-width: 520px;
    }

    .intro {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }

    .intro uui-icon {
      color: var(--uui-color-interactive);
      flex-shrink: 0;
    }

    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .table-header h4 {
      margin: 0;
      font-size: var(--uui-type-h5-size);
      font-weight: var(--uui-font-weight-bold, 700);
    }

    .table-header span {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .product-types-table {
      width: 100%;
    }

    .name-cell {
      align-items: center;
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .name-cell uui-icon {
      color: var(--uui-color-interactive);
    }

    .type-name {
      font-weight: 600;
    }

    .type-alias {
      color: var(--uui-color-text-alt);
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .actions-header {
      text-align: right;
      width: 220px;
    }

    .state-block {
      padding: var(--uui-size-space-4) 0;
    }

    .state-block-compact {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      justify-content: center;
    }

    .state-text {
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    .state-action {
      display: flex;
      justify-content: center;
      margin-top: var(--uui-size-space-4);
    }

    .error-banner {
      align-items: center;
      background: var(--uui-color-danger-standalone);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger-contrast);
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
    }
  `;
}

export default MerchelloProductTypesListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-types-list": MerchelloProductTypesListElement;
  }
}
