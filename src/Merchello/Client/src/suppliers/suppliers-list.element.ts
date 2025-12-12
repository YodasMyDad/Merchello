import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { SupplierListItemDto } from "./types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_SUPPLIER_MODAL } from "./modals/supplier-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-suppliers-list")
export class MerchelloSuppliersListElement extends UmbElementMixin(LitElement) {
  @state() private _suppliers: SupplierListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isDeleting: string | null = null;

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
    this._loadSuppliers();
  }

  disconnectedCallback(): void {
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
    if (result?.created) {
      this._loadSuppliers();
    }
  }

  private async _handleEditSupplier(supplier: SupplierListItemDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_SUPPLIER_MODAL, {
      data: { supplier },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.updated) {
      this._loadSuppliers();
    }
  }

  private async _handleDelete(e: Event, supplier: SupplierListItemDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = confirm(
      `Are you sure you want to delete supplier "${supplier.name}"?\n\nThis will remove the supplier association from all linked warehouses.`
    );

    if (!confirmed) return;

    this._isDeleting = supplier.id;

    const { error } = await MerchelloApi.deleteSupplier(supplier.id);

    if (!this.#isConnected) return;

    this._isDeleting = null;

    if (error) {
      this._errorMessage = `Failed to delete supplier: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete supplier" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Supplier deleted", message: "The supplier has been deleted successfully" }
    });
    this._loadSuppliers();
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

  private _renderSupplierRow(supplier: SupplierListItemDto): unknown {
    const isDeleting = this._isDeleting === supplier.id;

    return html`
      <uui-table-row class="clickable" @click=${() => this._handleEditSupplier(supplier)}>
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
              @click=${(e: Event) => { e.stopPropagation(); this._handleEditSupplier(supplier); }}>
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
          ${this._suppliers.map((s) => this._renderSupplierRow(s))}
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
    return this._renderSuppliersTable();
  }

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="suppliers-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button
              look="primary"
              color="positive"
              label="Add Supplier"
              @click=${this._handleAddSupplier}>
              Add Supplier
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Suppliers represent the companies or sources that provide your inventory. Link suppliers to warehouses to track where your stock comes from.</span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .suppliers-container {
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

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
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

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
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
    `,
  ];
}

export default MerchelloSuppliersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-suppliers-list": MerchelloSuppliersListElement;
  }
}
