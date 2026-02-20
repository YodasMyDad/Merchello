import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import {
  getWarehouseDetailHref,
  getWarehouseCreateHref,
  navigateToWarehouseCreate,
} from "@shared/utils/navigation.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-warehouses-list")
export class MerchelloWarehousesListElement extends UmbElementMixin(LitElement) {
  @state() private _warehouses: WarehouseListDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isDeleting: string | null = null;

  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadWarehouses();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadWarehouses(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getWarehousesList();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._warehouses = data;
    }

    this._isLoading = false;
  }

  private _handleAddWarehouse(): void {
    navigateToWarehouseCreate();
  }

  private async _handleDelete(e: Event, warehouse: WarehouseListDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Warehouse",
        content: `Delete warehouse "${warehouse.name || "Unnamed"}". This action cannot be undone.`,
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

    this._isDeleting = warehouse.id;

    const { error } = await MerchelloApi.deleteWarehouse(warehouse.id);

    if (!this.#isConnected) return;

    this._isDeleting = null;

    if (error) {
      this._errorMessage = `Failed to delete warehouse: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete warehouse" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Warehouse deleted", message: "The warehouse has been deleted successfully" }
    });
    this._loadWarehouses();
  }

  private _renderLoadingState(): unknown {
    return html`
      <div class="loading" role="status" aria-live="polite">
        <uui-loader></uui-loader>
        <span>Loading warehouses...</span>
      </div>
    `;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button
          look="secondary"
          label="Retry loading warehouses"
          @click=${() => this._loadWarehouses()}>
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-store"
        headline="No warehouses configured"
        message="Add your first warehouse to start fulfilling orders from different locations.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Warehouse"
          @click=${this._handleAddWarehouse}>
          Add Warehouse
        </uui-button>
      </div>
    `;
  }

  private _renderWarningBadge(count: number, tooltip: string): unknown {
    if (count > 0) return nothing;
    return html`
      <span class="badge badge-warning" title="${tooltip}">
        <uui-icon name="icon-alert"></uui-icon>
      </span>
    `;
  }

  private _renderWarehouseRow(warehouse: WarehouseListDto): unknown {
    const isDeleting = this._isDeleting === warehouse.id;

    return html`
      <uui-table-row>
        <uui-table-cell class="name-cell">
          <a href=${getWarehouseDetailHref(warehouse.id)} class="warehouse-link">
            <span class="warehouse-name">${warehouse.name || "Unnamed Warehouse"}</span>
            ${warehouse.code ? html`<span class="warehouse-code">${warehouse.code}</span>` : nothing}
          </a>
        </uui-table-cell>
        <uui-table-cell>${warehouse.supplierName || "-"}</uui-table-cell>
        <uui-table-cell>
          <span class="count-cell">
            ${this._renderWarningBadge(warehouse.serviceRegionCount, "No shipping regions configured")}
            <span>${warehouse.serviceRegionCount}</span>
          </span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="count-cell">
            ${this._renderWarningBadge(warehouse.shippingOptionCount, "No shipping methods configured")}
            <span>${warehouse.shippingOptionCount}</span>
          </span>
        </uui-table-cell>
        <uui-table-cell class="address-cell">${warehouse.addressSummary || "-"}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              href=${getWarehouseDetailHref(warehouse.id)}
              look="secondary"
              compact
              label="Edit">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${isDeleting}
              @click=${(e: Event) => this._handleDelete(e, warehouse)}>
              <uui-icon name="${isDeleting ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderWarehousesTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="warehouse-table">
          <uui-table-head>
            <uui-table-head-cell>Warehouse</uui-table-head-cell>
            <uui-table-head-cell>Supplier</uui-table-head-cell>
            <uui-table-head-cell>Regions</uui-table-head-cell>
            <uui-table-head-cell>Options</uui-table-head-cell>
            <uui-table-head-cell>Address</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._warehouses.map((w) => this._renderWarehouseRow(w))}
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
    if (this._warehouses.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderWarehousesTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="warehouses-container layout-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button
              href=${getWarehouseCreateHref()}
              look="primary"
              color="positive"
              label="Add Warehouse">
              Add Warehouse
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Warehouses define your shipping origins. Configure service regions to specify where each warehouse can ship to, then add shipping options with costs.</span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    badgeStyles,
    collectionLayoutStyles,
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .info-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: flex-start;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .info-banner uui-icon {
        flex-shrink: 0;
        color: var(--uui-color-interactive);
      }

      .table-container {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .warehouse-table {
        width: 100%;
      }

      .name-cell {
        min-width: 200px;
      }

      .warehouse-link {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        text-decoration: none;
        color: inherit;
      }

      .warehouse-link:hover .warehouse-name {
        color: var(--uui-color-interactive);
        text-decoration: underline;
      }

      .warehouse-name {
        font-weight: 500;
        color: var(--uui-color-text);
      }

      .warehouse-code {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
      }

      .count-cell {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .badge-warning {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        background: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
        border-radius: 50%;
      }

      .badge-warning uui-icon {
        font-size: 0.75rem;
      }

      .address-cell {
        color: var(--uui-color-text-alt);
        font-size: 0.875rem;
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: inline-flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .loading {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .loading span {
        color: var(--uui-color-text-alt);
        font-size: 0.875rem;
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

export default MerchelloWarehousesListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warehouses-list": MerchelloWarehousesListElement;
  }
}
