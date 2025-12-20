import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ShippingOptionDto, WarehouseDto } from "@shipping/types/shipping.types.js";
import { MERCHELLO_SHIPPING_OPTION_DETAIL_MODAL } from "@shipping/modals/shipping-option-detail-modal.token.js";
import { formatCurrency } from "@shared/utils/formatting.js";

@customElement("merchello-shipping-options-list")
export class MerchelloShippingOptionsListElement extends UmbElementMixin(LitElement) {
  @state() private _options: ShippingOptionDto[] = [];
  @state() private _warehouses: WarehouseDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

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
    this._loadData();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadData(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    try {
      const [optionsResult, warehousesResult] = await Promise.all([
        MerchelloApi.getShippingOptions(),
        MerchelloApi.getWarehouses(),
      ]);

      if (!this.#isConnected) return;

      if (optionsResult.error) {
        this._errorMessage = optionsResult.error.message;
        this._isLoading = false;
        return;
      }

      if (warehousesResult.error) {
        this._errorMessage = warehousesResult.error.message;
        this._isLoading = false;
        return;
      }

      this._options = optionsResult.data ?? [];
      this._warehouses = warehousesResult.data ?? [];
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load shipping options";
    }

    this._isLoading = false;
  }

  private async _openDetailModal(option?: ShippingOptionDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_OPTION_DETAIL_MODAL, {
      data: { option, warehouses: this._warehouses },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved) {
      await this._loadData();
    }
  }

  private async _deleteOption(option: ShippingOptionDto): Promise<void> {
    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Shipping Option",
        content: `Are you sure you want to delete "${option.name}"?`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled
    if (!this.#isConnected) return; // Component disconnected while modal was open

    const { error } = await MerchelloApi.deleteShippingOption(option.id);

    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: `${option.name} deleted` },
    });

    await this._loadData();
  }

  private _formatDays(option: ShippingOptionDto): string {
    if (option.isNextDay) return "Next Day";
    if (option.daysFrom === option.daysTo) return `${option.daysFrom} days`;
    return `${option.daysFrom}-${option.daysTo} days`;
  }

  private _renderOption(option: ShippingOptionDto): unknown {
    return html`
      <tr>
        <td>
          <strong>${option.name}</strong>
          ${option.isNextDay ? html`<uui-tag look="positive" size="small">Next Day</uui-tag>` : nothing}
          ${option.allowsDeliveryDateSelection ? html`<uui-tag look="secondary" size="small">Date Selection</uui-tag>` : nothing}
        </td>
        <td>${option.warehouseName ?? "Unknown"}</td>
        <td>${this._formatDays(option)}</td>
        <td>${option.fixedCost != null ? formatCurrency(option.fixedCost) : "-"}</td>
        <td>${option.costCount}</td>
        <td>${option.weightTierCount}</td>
        <td class="actions">
          <uui-button
            look="secondary"
            label="Edit"
            @click=${() => this._openDetailModal(option)}
          >
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-button
            look="secondary"
            color="danger"
            label="Delete"
            @click=${() => this._deleteOption(option)}
          >
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </td>
      </tr>
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading shipping options...</span>
            </div>
          </div>
        </umb-body-layout>
      `;
    }

    if (this._errorMessage) {
      return html`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <uui-box>
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="primary" label="Retry" @click=${this._loadData}>
                  Retry
                </uui-button>
              </div>
            </uui-box>
          </div>
        </umb-body-layout>
      `;
    }

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box>
            <div class="header" slot="header">
              <span class="headline">Shipping Options</span>
              <uui-button
                look="primary"
                label="Add Shipping Option"
                @click=${() => this._openDetailModal()}
              >
                <uui-icon name="icon-add"></uui-icon>
                Add Shipping Option
              </uui-button>
            </div>
            <p class="section-description">
              Configure shipping options for each warehouse. Each option can have location-based costs and weight-based surcharges.
            </p>
            ${this._options.length === 0
              ? html`<p class="no-items">No shipping options configured yet. Click "Add Shipping Option" to create one.</p>`
              : html`
                  <table class="options-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Warehouse</th>
                        <th>Delivery</th>
                        <th>Fixed Cost</th>
                        <th>Costs</th>
                        <th>Weight Tiers</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this._options.map((opt) => this._renderOption(opt))}
                    </tbody>
                  </table>
                `}
          </uui-box>
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
      padding: var(--uui-size-layout-1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .headline {
      font-size: 1.2rem;
      font-weight: 600;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .no-items {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .options-table {
      width: 100%;
      border-collapse: collapse;
    }

    .options-table th,
    .options-table td {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .options-table th {
      font-weight: 600;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .options-table tbody tr:hover {
      background: var(--uui-color-surface-alt);
    }

    .options-table td strong {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    uui-tag {
      margin-left: var(--uui-size-space-2);
    }
  `;
}

export default MerchelloShippingOptionsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-options-list": MerchelloShippingOptionsListElement;
  }
}
