import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ProductVariantDto } from "@products/types/product.types.js";

/**
 * Shared component for editing variant basic info fields.
 * Used by both product-detail (single-variant mode) and variant-detail.
 *
 * @fires variant-change - Fired when any field changes, with updated form data in detail
 */
@customElement("merchello-variant-basic-info")
export class MerchelloVariantBasicInfoElement extends UmbElementMixin(LitElement) {
  @property({ type: Object }) formData: Partial<ProductVariantDto> = {};
  @property({ type: Object }) fieldErrors: Record<string, string> = {};
  @property({ type: Boolean }) showVariantName = false;

  private _updateField<K extends keyof ProductVariantDto>(field: K, value: ProductVariantDto[K]): void {
    const updated = { ...this.formData, [field]: value };
    this.dispatchEvent(new CustomEvent("variant-change", { detail: updated, bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <uui-box headline="Identification">
        ${this.showVariantName
          ? html`
              <umb-property-layout label="Variant Name" description="If empty, generated from option values">
                <uui-input
                  slot="editor"
                  label="Variant name"
                  maxlength="500"
                  .value=${this.formData.name || ""}
                  @input=${(e: Event) => this._updateField("name", (e.target as HTMLInputElement).value)}
                  placeholder="e.g., Blue T-Shirt - Large">
                </uui-input>
              </umb-property-layout>
            `
          : nothing}

        <umb-property-layout label="SKU" description="Stock Keeping Unit - unique product identifier" ?mandatory=${true}>
          <uui-input
            slot="editor"
            label="SKU"
            maxlength="150"
            .value=${this.formData.sku || ""}
            @input=${(e: Event) => this._updateField("sku", (e.target as HTMLInputElement).value)}
            placeholder="PROD-001"
            ?invalid=${!!this.fieldErrors.sku}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="GTIN/Barcode" description="Global Trade Item Number (EAN/UPC)">
          <uui-input
            slot="editor"
            label="GTIN/Barcode"
            maxlength="150"
            .value=${this.formData.gtin || ""}
            @input=${(e: Event) => this._updateField("gtin", (e.target as HTMLInputElement).value)}
            placeholder="012345678905">
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="Supplier SKU" description="Your supplier's product code">
          <uui-input
            slot="editor"
            label="Supplier SKU"
            maxlength="150"
            .value=${this.formData.supplierSku || ""}
            @input=${(e: Event) => this._updateField("supplierSku", (e.target as HTMLInputElement).value)}
            placeholder="SUP-001">
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="HS Code" description="Harmonized System code for customs/tariff classification">
          <uui-input
            slot="editor"
            label="HS Code"
            .value=${this.formData.hsCode || ""}
            @input=${(e: Event) => this._updateField("hsCode", (e.target as HTMLInputElement).value)}
            placeholder="6109.10"
            maxlength="10">
          </uui-input>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="Pricing">
        <umb-property-layout label="Price" description="Customer-facing price (excluding tax)" ?mandatory=${true}>
          <uui-input
            slot="editor"
            label="Price"
            type="number"
            step="0.01"
            .value=${String(this.formData.price ?? 0)}
            @input=${(e: Event) => this._updateField("price", parseFloat((e.target as HTMLInputElement).value) || 0)}
            ?invalid=${!!this.fieldErrors.price}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="Cost of Goods" description="Your cost for profit margin calculation">
          <uui-input
            slot="editor"
            label="Cost of goods"
            type="number"
            step="0.01"
            .value=${String(this.formData.costOfGoods ?? 0)}
            @input=${(e: Event) => this._updateField("costOfGoods", parseFloat((e.target as HTMLInputElement).value) || 0)}>
          </uui-input>
        </umb-property-layout>

        <umb-property-layout label="On Sale" description="Enable sale pricing">
          <uui-toggle
            slot="editor"
            label="On Sale"
            .checked=${this.formData.onSale ?? false}
            @change=${(e: Event) => this._updateField("onSale", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>

        ${this.formData.onSale
          ? html`
              <umb-property-layout label="Previous Price (Was)" description="Original price to show discount">
                <uui-input
                  slot="editor"
                  label="Previous price"
                  type="number"
                  step="0.01"
                  .value=${String(this.formData.previousPrice ?? 0)}
                  @input=${(e: Event) => this._updateField("previousPrice", parseFloat((e.target as HTMLInputElement).value) || 0)}>
                </uui-input>
              </umb-property-layout>
            `
          : nothing}
      </uui-box>

      <uui-box headline="Availability">
        <umb-property-layout label="Visible on Website" description="Show on storefront and allow adding to cart">
          <uui-toggle
            slot="editor"
            label="Visible on Website"
            .checked=${this.formData.availableForPurchase ?? true}
            @change=${(e: Event) => this._updateField("availableForPurchase", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Allow Purchase" description="Enable checkout (used for stock/inventory validation)">
          <uui-toggle
            slot="editor"
            label="Allow Purchase"
            .checked=${this.formData.canPurchase ?? true}
            @change=${(e: Event) => this._updateField("canPurchase", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>
    `;
  }

  static override readonly styles = css`
    :host {
      display: contents;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    uui-box + uui-box {
      margin-top: var(--uui-size-space-5);
    }

    umb-property-layout uui-input,
    umb-property-layout uui-textarea {
      width: 100%;
    }
  `;
}

export default MerchelloVariantBasicInfoElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-variant-basic-info": MerchelloVariantBasicInfoElement;
  }
}
