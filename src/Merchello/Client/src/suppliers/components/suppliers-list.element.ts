import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { SupplierListItemDto } from "@suppliers/types/suppliers.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_SUPPLIER_MODAL } from "@suppliers/modals/supplier-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-suppliers-list")
export class MerchelloSuppliersListElement extends UmbElementMixin(LitElement) {
  @state() private _suppliers: SupplierListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isDeleting: string | null = null;
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
    this._loadSuppliers();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadSuppliers(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getSuppliers();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._suppliers = data;
    }

    this._isLoading = false;
  }

  private async _handleAddSupplier(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_SUPPLIER_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isCreated) {
      this._loadSuppliers();
    }
  }

  private async _handleEditSupplier(supplier: SupplierListItemDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_SUPPLIER_MODAL, {
      data: { supplier },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isUpdated) {
      this._loadSuppliers();
    }
  }

  private async _handleDelete(e: Event, supplier: SupplierListItemDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Supplier",
        content: `Deleting "${supplier.name}" removes its association from linked warehouses.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._isDeleting = supplier.id;

    const { error } = await MerchelloApi.deleteSupplier(supplier.id);

    if (!this.#isConnected) return;

    this._isDeleting = null;

    if (error) {
      this._errorMessage = `Failed to delete supplier: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete supplier" },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Supplier deleted", message: "The supplier has been deleted successfully" },
    });
    this._loadSuppliers();
  }

  private get _sortedSuppliers(): SupplierListItemDto[] {
    return [...this._suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }

  private get _filteredSuppliers(): SupplierListItemDto[] {
    const normalizedSearch = this._searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return this._sortedSuppliers;
    }

    return this._sortedSuppliers.filter((supplier) =>
      [supplier.name, supplier.code ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      )
    );
  }

  private _handleSearchInput(event: Event): void {
    this._searchTerm = (event.target as HTMLInputElement).value;
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
  }

  private _handleRowKeydown(event: KeyboardEvent, supplier: SupplierListItemDto): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    this._handleEditSupplier(supplier);
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" label="Retry loading suppliers" @click=${() => this._loadSuppliers()}>
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-truck"
        headline="No suppliers configured"
        message="Add suppliers to track where your inventory comes from and link them to warehouses.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Supplier"
          @click=${this._handleAddSupplier}>
          Add Supplier
        </uui-button>
      </div>
    `;
  }

  private _renderNoSearchResultsState(): unknown {
    return html`
      <p class="empty-state">
        No suppliers match
        <strong>${this._searchTerm.trim()}</strong>.
      </p>
    `;
  }

  private _renderSupplierRow(supplier: SupplierListItemDto): unknown {
    const isDeleting = this._isDeleting === supplier.id;

    return html`
      <uui-table-row
        class="clickable"
        tabindex="0"
        @click=${() => this._handleEditSupplier(supplier)}
        @keydown=${(event: KeyboardEvent) => this._handleRowKeydown(event, supplier)}>
        <uui-table-cell>
          <div class="supplier-info">
            <span class="supplier-name">${supplier.name}</span>
            ${supplier.code ? html`<span class="supplier-code">${supplier.code}</span>` : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>${supplier.warehouseCount}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._handleEditSupplier(supplier);
              }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${isDeleting}
              @click=${(e: Event) => this._handleDelete(e, supplier)}>
              <uui-icon name="${isDeleting ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderSuppliersTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="supplier-table">
          <uui-table-head>
            <uui-table-head-cell>Supplier</uui-table-head-cell>
            <uui-table-head-cell>Warehouses</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._filteredSuppliers.map((supplier) => this._renderSupplierRow(supplier))}
        </uui-table>
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
    if (this._suppliers.length === 0) {
      return this._renderEmptyState();
    }
    if (this._filteredSuppliers.length === 0) {
      return this._renderNoSearchResultsState();
    }
    return this._renderSuppliersTable();
  }

  override render() {
    const supplierCount = this._suppliers.length;
    const filteredCount = this._filteredSuppliers.length;

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="suppliers-container layout-container">
          <div class="filters">
            <div class="filters-top">
              <div class="search-box">
                <uui-input
                  type="search"
                  label="Search suppliers"
                  placeholder="Search by supplier name or code"
                  .value=${this._searchTerm}
                  @input=${this._handleSearchInput}>
                  <uui-icon name="icon-search" slot="prepend"></uui-icon>
                  ${this._searchTerm
                    ? html`
                        <uui-button
                          slot="append"
                          compact
                          look="secondary"
                          label="Clear supplier search"
                          @click=${this._handleSearchClear}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      `
                    : nothing}
                </uui-input>
              </div>
              <span class="results-summary">
                ${this._isLoading
                  ? "Loading suppliers..."
                  : `${filteredCount} of ${supplierCount} supplier${supplierCount === 1 ? "" : "s"}`}
              </span>
              <div class="header-actions">
                <uui-button look="primary" color="positive" label="Add Supplier" @click=${this._handleAddSupplier}>
                  Add Supplier
                </uui-button>
              </div>
            </div>
          </div>

          <uui-box>
            <div class="header-content">
              <div class="header-copy">
                <h2>Suppliers</h2>
                <p>
                  Suppliers represent the companies or sources that provide your inventory. Link suppliers to
                  warehouses to track where your stock comes from.
                </p>
              </div>
            </div>
          </uui-box>

          <uui-box>
            ${this._renderContent()}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    collectionLayoutStyles,
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .header-content {
        display: block;
      }

      .header-copy h2 {
        margin: 0 0 var(--uui-size-space-2) 0;
        font-size: 1.125rem;
      }

      .header-copy p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .search-box {
        max-width: 420px;
      }

      .results-summary {
        color: var(--uui-color-text-alt);
        font-size: 0.8125rem;
        align-self: flex-end;
      }

      .table-container {
        overflow-x: auto;
      }

      .supplier-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover,
      uui-table-row.clickable:focus-visible {
        background: var(--uui-color-surface-emphasis);
        outline: none;
      }

      .supplier-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .supplier-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
      }

      .supplier-code {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
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
        flex-wrap: wrap;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }

      .empty-state {
        margin: 0;
        color: var(--uui-color-text-alt);
        text-align: center;
        padding: var(--uui-size-space-6);
      }

      .empty-action {
        display: flex;
        justify-content: center;
        margin-top: var(--uui-size-space-4);
      }
    `,
  ];
}

export default MerchelloSuppliersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-suppliers-list": MerchelloSuppliersListElement;
  }
}
