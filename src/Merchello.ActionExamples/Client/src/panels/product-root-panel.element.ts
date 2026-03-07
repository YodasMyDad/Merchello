import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

interface ProductRootData {
  rootName: string;
  productTypeName: string;
  aggregateStockStatusLabel: string;
  currencyCode: string;
  productOptions?: ProductOption[];
  variants?: ProductVariant[];
}

interface ProductOption {
  name: string;
  isVariant: boolean;
  choices?: Array<{ name: string }>;
}

interface ProductVariant {
  name: string;
  sku: string;
  price: number;
  stockStatusLabel: string;
}

@customElement("merchello-product-root-panel")
export class MerchelloProductRootPanelElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) productRootId = "";
  @property({ type: String }) actionKey = "";
  @property({ attribute: false }) closeModal: (() => void) | null = null;

  @state() private _data: ProductRootData | null = null;
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
      this._data = await res.json();
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  private _fmt(amount: number | null | undefined): string {
    if (amount == null) return "N/A";
    const code = this._data?.currencyCode;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
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

    const d = this._data!;
    const options = d.productOptions ?? [];
    const variants = d.variants ?? [];

    return html`
      <uui-box headline="Product Details">
        <div class="field"><span class="label">Product Name</span><span>${d.rootName}</span></div>
        <div class="field"><span class="label">Product Type</span><span>${d.productTypeName}</span></div>
        <div class="field"><span class="label">Stock Status</span><span>${d.aggregateStockStatusLabel}</span></div>
        <div class="field"><span class="label">Variants</span><span>${variants.length}</span></div>

        ${options.length > 0
          ? html`
              <h4>Options</h4>
              ${options.map(
                (opt) => html`
                  <div class="option">
                    <span class="option-name">${opt.name}</span>
                    <span class="option-type">${opt.isVariant ? "Variant" : "Add-on"}</span>
                    ${opt.choices?.length
                      ? html`<span class="option-choices">${opt.choices.map((c) => c.name).join(", ")}</span>`
                      : nothing}
                  </div>
                `
              )}
            `
          : nothing}

        ${variants.length > 0
          ? html`
              <h4>Variants</h4>
              <table>
                <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th></tr></thead>
                <tbody>
                  ${variants.map(
                    (v) => html`<tr><td>${v.name}</td><td>${v.sku}</td><td>${this._fmt(v.price)}</td><td>${v.stockStatusLabel ?? "N/A"}</td></tr>`
                  )}
                </tbody>
              </table>
            `
          : nothing}

        <div class="reference">
          <p>Product Root ID: ${this.productRootId}</p>
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
    .option { display: flex; gap: var(--uui-size-space-3); padding: var(--uui-size-space-2) 0; border-bottom: 1px solid var(--uui-color-border); }
    .option-name { font-weight: 600; }
    .option-type { font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
    .option-choices { font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
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
    "merchello-product-root-panel": MerchelloProductRootPanelElement;
  }
}
