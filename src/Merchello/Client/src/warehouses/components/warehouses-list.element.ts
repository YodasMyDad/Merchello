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

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadWarehouses();
  }

  disconnectedCallback(): void {
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
        content: `Are you sure you want to delete warehouse "${warehouse.name || "Unnamed"}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled
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
      <uui-table-row class="clickable">
        <uui-table-cell class="name-cell">
          <a href=${getWarehouseDetailHref(warehouse.id)} class="warehouse-link">
            <span class="warehouse-name">${warehouse.name || "Unnamed Warehouse"}</span>
            ${warehouse.code ? html`<span class="warehouse-code">${warehouse.code}</span>` : nothing}
          </a>
        </uui-table-cell>
        <uui-table-cell>${warehouse.supplierName || "—"}</uui-table-cell>
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
        <uui-table-cell class="address-cell">${warehouse.addressSummary || "—"}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <a href=${getWarehouseDetailHref(warehouse.id)}>
              <uui-button
                look="secondary"
                compact
                label="Edit">
                <uui-icon name="icon-edit"></uui-icon>
              </uui-button>
            </a>
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

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="warehouses-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <a href=${getWarehouseCreateHref()}>
              <uui-button
                look="primary"
                color="positive"
                label="Add Warehouse">
                Add Warehouse
              </uui-button>
            </a>
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

  static styles = [
    badgeStyles,
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .warehouses-container {
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

      .header-actions a {
        text-decoration: none;
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
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .warehouse-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
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
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
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

      .actions-cell a {
        text-decoration: none;
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

export default MerchelloWarehousesListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warehouses-list": MerchelloWarehousesListElement;
  }
}
