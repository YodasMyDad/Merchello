import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

interface InvoiceData {
  invoiceNumber: string;
  dateCreated: string;
  currencyCode: string;
  paymentStatusDisplay: string;
  fulfillmentStatus: string;
  billingAddress?: { name?: string };
  orders?: Array<{ lineItems?: LineItem[] }>;
  subTotal: number;
  shippingCost: number;
  tax: number;
  total: number;
}

interface LineItem {
  name: string;
  quantity: number;
  calculatedTotal: number;
}

@customElement("merchello-invoice-panel")
export class MerchelloInvoicePanelElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) invoiceId = "";
  @property({ type: String }) actionKey = "";
  @property({ attribute: false }) closeModal: (() => void) | null = null;

  @state() private _data: InvoiceData | null = null;
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
      this._data = await res.json();
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  private _fmt(amount: number | null | undefined, currencyCode: string): string {
    if (amount == null) return "N/A";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
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

  private _fmtDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

    const d = this._data!;
    const fmt = (amount: number | null | undefined) => this._fmt(amount, d.currencyCode);
    const items = (d.orders ?? []).flatMap((o) => o.lineItems ?? []);

    return html`
      <uui-box headline="Invoice Details">
        <div class="field"><span class="label">Invoice Number</span><span>${d.invoiceNumber}</span></div>
        <div class="field"><span class="label">Date Created</span><span>${this._fmtDate(d.dateCreated)}</span></div>
        <div class="field"><span class="label">Currency</span><span>${d.currencyCode}</span></div>
        <div class="field"><span class="label">Payment Status</span><span>${d.paymentStatusDisplay}</span></div>
        <div class="field"><span class="label">Fulfillment Status</span><span>${d.fulfillmentStatus}</span></div>
        <div class="field"><span class="label">Billing Name</span><span>${d.billingAddress?.name ?? "N/A"}</span></div>

        ${items.length > 0
          ? html`
              <h4>Line Items</h4>
              <table>
                <thead><tr><th>Name</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  ${items.map(
                    (li) => html`<tr><td>${li.name}</td><td>${li.quantity}</td><td>${fmt(li.calculatedTotal)}</td></tr>`
                  )}
                </tbody>
              </table>
            `
          : nothing}

        <h4>Summary</h4>
        <div class="field"><span class="label">Subtotal</span><span>${fmt(d.subTotal)}</span></div>
        <div class="field"><span class="label">Shipping</span><span>${fmt(d.shippingCost)}</span></div>
        <div class="field"><span class="label">Tax</span><span>${fmt(d.tax)}</span></div>
        <div class="field"><span class="label">Total</span><span><strong>${fmt(d.total)}</strong></span></div>

        <div class="reference">
          <p>Invoice ID: ${this.invoiceId}</p>
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
    "merchello-invoice-panel": MerchelloInvoicePanelElement;
  }
}
