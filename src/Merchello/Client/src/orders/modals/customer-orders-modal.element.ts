import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { OrderListItemDto } from "@orders/types/order.types.js";
import { COMPACT_ORDER_COLUMNS } from "@orders/types/order.types.js";
import "@orders/components/order-table.element.js";
import type { OrderClickEventDetail } from "@orders/components/order-table.element.js";
import "@shared/components/merchello-empty-state.element.js";
import { navigateToOrderDetail } from "@shared/utils/navigation.js";
import type {
  CustomerOrdersModalData,
  CustomerOrdersModalValue,
} from "./customer-orders-modal.token.js";

@customElement("merchello-customer-orders-modal")
export class MerchelloCustomerOrdersModalElement extends UmbModalBaseElement<
  CustomerOrdersModalData,
  CustomerOrdersModalValue
> {
  @state() private _orders: OrderListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._loadOrders();
  }

  private async _loadOrders(): Promise<void> {
    const email = this.data?.email;
    if (!email) {
      this._errorMessage = "No customer email provided";
      this._isLoading = false;
      return;
    }

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getCustomerOrders(email);

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._orders = data ?? [];
    this._isLoading = false;
  }

  private _handleOrderClick(e: CustomEvent<OrderClickEventDetail>): void {
    this.value = { navigatedToOrder: true };
    this.modalContext?.submit();
    // Navigate using SPA routing
    navigateToOrderDetail(e.detail.orderId);
  }

  private _handleClose(): void {
    this.value = { navigatedToOrder: false };
    this.modalContext?.reject();
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        ${this._errorMessage}
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="This customer has no orders.">
      </merchello-empty-state>
    `;
  }

  private _renderOrdersTable(): unknown {
    return html`
      <merchello-order-table
        .orders=${this._orders}
        .columns=${COMPACT_ORDER_COLUMNS}
        @order-click=${this._handleOrderClick}
      ></merchello-order-table>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._orders.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderOrdersTable();
  }

  render() {
    const customerName = this.data?.customerName ?? "Customer";
    const orderCount = this._orders.length;

    return html`
      <umb-body-layout headline="Orders for ${customerName}">
        <div id="main">
          ${!this._isLoading && !this._errorMessage && orderCount > 0
            ? html`
                <div class="summary">
                  ${orderCount} order${orderCount !== 1 ? "s" : ""} found
                </div>
              `
            : nothing}
          ${this._renderContent()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .summary {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloCustomerOrdersModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-orders-modal": MerchelloCustomerOrdersModalElement;
  }
}
