import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { TaxGroupDto } from '@tax/types/tax.types.js';
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_TAX_GROUP_MODAL } from "./modals/tax-group-modal.token.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-tax-workspace")
export class MerchelloTaxWorkspaceElement extends UmbElementMixin(LitElement) {
  @state() private _taxGroups: TaxGroupDto[] = [];
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
    this._loadTaxGroups();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadTaxGroups(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getTaxGroups();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._taxGroups = data;
    }

    this._isLoading = false;
  }

  private async _handleAddTaxGroup(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_TAX_GROUP_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isCreated) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Tax group created", message: `"${result.taxGroup?.name}" has been created successfully` }
      });
      this._loadTaxGroups();
    }
  }

  private async _handleEditTaxGroup(taxGroup: TaxGroupDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_TAX_GROUP_MODAL, {
      data: { taxGroup },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Tax group updated", message: `"${result.taxGroup?.name}" has been updated successfully` }
      });
      this._loadTaxGroups();
    }
  }

  private async _handleDelete(e: Event, taxGroup: TaxGroupDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Tax Group",
        content: `Are you sure you want to delete tax group "${taxGroup.name}"? Products using this tax group will need to be reassigned.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._isDeleting = taxGroup.id;

    const { error } = await MerchelloApi.deleteTaxGroup(taxGroup.id);

    if (!this.#isConnected) return;

    this._isDeleting = null;

    if (error) {
      this._errorMessage = `Failed to delete tax group: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete tax group" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Tax group deleted", message: "The tax group has been deleted successfully" }
    });
    this._loadTaxGroups();
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
        icon="icon-calculator"
        headline="No tax groups configured"
        message="Tax groups define the tax rates applied to your products. Create tax groups like 'Standard VAT' or 'Reduced Rate' to assign to products.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Tax Group"
          @click=${this._handleAddTaxGroup}>
          Add Tax Group
        </uui-button>
      </div>
    `;
  }

  private _formatPercentage(value: number): string {
    return `${value}%`;
  }

  private _renderTaxGroupRow(taxGroup: TaxGroupDto): unknown {
    const isDeleting = this._isDeleting === taxGroup.id;

    return html`
      <uui-table-row class="clickable" @click=${() => this._handleEditTaxGroup(taxGroup)}>
        <uui-table-cell>
          <span class="tax-group-name">${taxGroup.name}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="tax-rate">${this._formatPercentage(taxGroup.taxPercentage)}</span>
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(e: Event) => { e.stopPropagation(); this._handleEditTaxGroup(taxGroup); }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${isDeleting}
              @click=${(e: Event) => this._handleDelete(e, taxGroup)}>
              <uui-icon name="${isDeleting ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderTaxGroupsTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="tax-groups-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Tax Rate</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._taxGroups.map((tg) => this._renderTaxGroupRow(tg))}
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
    if (this._taxGroups.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderTaxGroupsTable();
  }

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="tax-groups-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button
              look="primary"
              color="positive"
              label="Add Tax Group"
              @click=${this._handleAddTaxGroup}>
              Add Tax Group
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Tax groups define the tax rates that can be assigned to products. When a customer places an order, the appropriate tax rate is applied based on the product's assigned tax group.</span>
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

      .tax-groups-container {
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

      .tax-groups-table {
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

      .tax-group-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
      }

      .tax-rate {
        font-family: var(--uui-font-family-monospace, monospace);
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

export default MerchelloTaxWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-workspace": MerchelloTaxWorkspaceElement;
  }
}
