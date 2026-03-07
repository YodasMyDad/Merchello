import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

interface ProductRootData {
  currencyCode: string;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  costOfGoods: number | null;
  onSale: boolean;
  previousPrice: number | null;
  gtin: string | null;
  availableForPurchase: boolean;
  stockStatusLabel: string;
}

@customElement("merchello-product-panel")
export class MerchelloProductPanelElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) productRootId = "";
  @property({ type: String }) productId = "";
  @property({ type: String }) actionKey = "";
  @property({ attribute: false }) closeModal: (() => void) | null = null;

  @state() private _variant: ProductVariant | null = null;
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
      const res = await fetch(`${this.#baseUrl}/umbraco/api/v1/products/${this.productRootId}`, {
        credentials: "same-origin",
        headers,
      });
      if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
      const data: ProductRootData = await res.json();
      this._currencyCode = data.currencyCode;
      this._variant = data.variants?.find((v) => v.id === this.productId) ?? null;
      if (!this._variant) throw new Error("Product variant not found");
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

    const v = this._variant!;

    return html`
      <uui-box headline="Product Variant Details">
        <div class="field"><span class="label">Name</span><span>${v.name}</span></div>
        <div class="field"><span class="label">SKU</span><span>${v.sku}</span></div>
        <div class="field"><span class="label">Price</span><span>${this._fmt(v.price)}</span></div>
        <div class="field"><span class="label">Cost of Goods</span><span>${this._fmt(v.costOfGoods)}</span></div>
        <div class="field"><span class="label">On Sale</span><span>${v.onSale ? "Yes" : "No"}</span></div>
        ${v.onSale && v.previousPrice != null
          ? html`<div class="field"><span class="label">Previous Price</span><span>${this._fmt(v.previousPrice)}</span></div>`
          : nothing}
        <div class="field"><span class="label">Available for Purchase</span><span>${v.availableForPurchase ? "Yes" : "No"}</span></div>
        <div class="field"><span class="label">Stock Status</span><span>${v.stockStatusLabel ?? "N/A"}</span></div>
        ${v.gtin
          ? html`<div class="field"><span class="label">GTIN</span><span>${v.gtin}</span></div>`
          : nothing}

        <div class="reference">
          <p>Product Root ID: ${this.productRootId}</p>
          <p>Product ID: ${this.productId}</p>
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
    .reference { margin-top: var(--uui-size-space-5); padding-top: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
    .reference p { margin: 0 0 var(--uui-size-space-1); }
    uui-button { margin-top: var(--uui-size-space-4); }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-panel": MerchelloProductPanelElement;
  }
}
