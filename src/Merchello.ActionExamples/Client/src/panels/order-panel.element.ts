import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

interface InvoiceData {
  currencyCode: string;
  orders?: FulfillmentOrder[];
}

interface FulfillmentOrder {
  id: string;
  statusLabel: string;
  deliveryMethod: string;
  shippingCost: number;
  fulfilmentProviderName?: string;
  fulfilmentProviderReference?: string;
  lineItems?: LineItem[];
}

interface LineItem {
  name: string;
  sku: string;
  quantity: number;
  calculatedTotal: number;
}

@customElement("merchello-order-panel")
export class MerchelloOrderPanelElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) invoiceId = "";
  @property({ type: String }) orderId = "";
  @property({ type: String }) actionKey = "";
  @property({ attribute: false }) closeModal: (() => void) | null = null;

  @state() private _order: FulfillmentOrder | null = null;
  @state() private _currencyCode = "";
  @state() private _loading = true;
  @state() private _error: string | null = null;

  #tokenFn?: () => Promise<string | undefined>;
  #baseUrl = "";

  constructor() {
    super();
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      if (!authContext) return;
      const config = authContext.getOpenApiConfiguration();
      this.#tokenFn = config.token;
      this.#baseUrl = config.base ?? "";
      this._fetchData();
    });
  }

  private async _fetchData(): Promise<void> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.#tokenFn) {
        const token = await this.#tokenFn();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${this.#baseUrl}/umbraco/api/v1/orders/${this.invoiceId}`, {
        credentials: "same-origin",
        headers,
      });
      if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
      const data: InvoiceData = await res.json();
      this._currencyCode = data.currencyCode;
      this._order = data.orders?.find((o) => o.id === this.orderId) ?? null;
      if (!this._order) throw new Error("Fulfillment order not found");
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  private _fmt(amount: number | null | undefined): string {
    if (amount == null) return "N/A";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: this._currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  }

  override render() {
    if (this._loading) return html`<uui-loader></uui-loader>`;

    if (this._error) {
      return html`
        <uui-box headline="Error">
          <p class="error">${this._error}</p>
          <uui-button look="secondary" label="Close" @click=${() => this.closeModal?.()}>Close</uui-button>
        </uui-box>
      `;
    }

    const o = this._order!;
    const items = o.lineItems ?? [];

    return html`
      <uui-box headline="Fulfillment Order Details">
        <div class="field"><span class="label">Order Status</span><span>${o.statusLabel}</span></div>
        <div class="field"><span class="label">Delivery Method</span><span>${o.deliveryMethod}</span></div>
        <div class="field"><span class="label">Shipping Cost</span><span>${this._fmt(o.shippingCost)}</span></div>
        <div class="field"><span class="label">Fulfilment Provider</span><span>${o.fulfilmentProviderName ?? "Manual"}</span></div>
        ${o.fulfilmentProviderReference
          ? html`<div class="field"><span class="label">Provider Reference</span><span>${o.fulfilmentProviderReference}</span></div>`
          : nothing}

        ${items.length > 0
          ? html`
              <h4>Line Items</h4>
              <table>
                <thead><tr><th>Name</th><th>SKU</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  ${items.map(
                    (li) => html`<tr><td>${li.name}</td><td>${li.sku}</td><td>${li.quantity}</td><td>${this._fmt(li.calculatedTotal)}</td></tr>`
                  )}
                </tbody>
              </table>
            `
          : nothing}

        <div class="reference">
          <p>Invoice ID: ${this.invoiceId}</p>
          <p>Order ID: ${this.orderId}</p>
          <p>Action Key: ${this.actionKey}</p>
        </div>

        <uui-button look="primary" label="Close" @click=${() => this.closeModal?.()}>Close</uui-button>
      </uui-box>
    `;
  }

  static override styles = css`
    :host { display: block; }
    .field { display: flex; justify-content: space-between; padding: var(--uui-size-space-2) 0; border-bottom: 1px solid var(--uui-color-border); }
    .label { font-weight: 600; font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
    .error { color: var(--uui-color-danger); }
    h4 { margin: var(--uui-size-space-5) 0 var(--uui-size-space-2); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: var(--uui-size-space-2); text-align: left; border-bottom: 1px solid var(--uui-color-border); }
    th { font-weight: 600; font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
    .reference { margin-top: var(--uui-size-space-5); padding-top: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
    .reference p { margin: 0 0 var(--uui-size-space-1); }
    uui-button { margin-top: var(--uui-size-space-4); }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-order-panel": MerchelloOrderPanelElement;
  }
}
