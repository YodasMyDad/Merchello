import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UmbPropertyDatasetElement, UmbPropertyValueData } from "@umbraco-cms/backoffice/property";
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

  private _dispatchVariantChange(updated: Partial<ProductVariantDto>): void {
    this.dispatchEvent(new CustomEvent("variant-change", { detail: updated, bubbles: true, composed: true }));
  }

  private _toPropertyValueMap(values: UmbPropertyValueData[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const value of values) {
      map[value.alias] = value.value;
    }
    return map;
  }

  private _getStringFromPropertyValue(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private _getNumberFromPropertyValue(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private _getBooleanFromPropertyValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return fallback;
  }

  private _getDatasetValue(): UmbPropertyValueData[] {
    const values: UmbPropertyValueData[] = [
      { alias: "sku", value: this.formData.sku ?? "" },
      { alias: "gtin", value: this.formData.gtin ?? "" },
      { alias: "supplierSku", value: this.formData.supplierSku ?? "" },
      { alias: "hsCode", value: this.formData.hsCode ?? "" },
      { alias: "price", value: this.formData.price ?? 0 },
      { alias: "costOfGoods", value: this.formData.costOfGoods ?? 0 },
      { alias: "onSale", value: this.formData.onSale ?? false },
      { alias: "previousPrice", value: this.formData.previousPrice ?? 0 },
      { alias: "availableForPurchase", value: this.formData.availableForPurchase ?? true },
      { alias: "canPurchase", value: this.formData.canPurchase ?? true },
    ];

    if (this.showVariantName) {
      values.unshift({ alias: "name", value: this.formData.name ?? "" });
    }

    return values;
  }

  private _handleDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);
    const hasPreviousPrice = Object.prototype.hasOwnProperty.call(values, "previousPrice");

    const updated: Partial<ProductVariantDto> = {
      ...this.formData,
      ...(this.showVariantName ? { name: this._getStringFromPropertyValue(values.name) } : {}),
      sku: this._getStringFromPropertyValue(values.sku),
      gtin: this._getStringFromPropertyValue(values.gtin),
      supplierSku: this._getStringFromPropertyValue(values.supplierSku),
      hsCode: this._getStringFromPropertyValue(values.hsCode),
      price: this._getNumberFromPropertyValue(values.price, 0),
      costOfGoods: this._getNumberFromPropertyValue(values.costOfGoods, 0),
      onSale: this._getBooleanFromPropertyValue(values.onSale, false),
      availableForPurchase: this._getBooleanFromPropertyValue(values.availableForPurchase, true),
      canPurchase: this._getBooleanFromPropertyValue(values.canPurchase, true),
    };

    if (hasPreviousPrice) {
      updated.previousPrice = this._getNumberFromPropertyValue(values.previousPrice, 0);
    }

    this._dispatchVariantChange(updated);
  }

  override render() {
    const errorMessages = Object.values(this.fieldErrors).filter((error): error is string => !!error);

    return html`
      ${errorMessages.length > 0
        ? html`
            <div class="error-summary">
              ${errorMessages.map((message) => html`<div>${message}</div>`)}
            </div>
          `
        : nothing}

      <umb-property-dataset
        .value=${this._getDatasetValue()}
        @change=${this._handleDatasetChange}>
        <uui-box headline="Identification">
          ${this.showVariantName
            ? html`
                <umb-property
                  alias="name"
                  label="Variant Name"
                  description="If empty, generated from option values"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 500 }]}>
                </umb-property>
              `
            : nothing}

          <umb-property
            alias="sku"
            label="SKU"
            description="Stock Keeping Unit - unique product identifier"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 150 }]}
            .validation=${{ mandatory: true }}>
          </umb-property>

          <umb-property
            alias="gtin"
            label="GTIN/Barcode"
            description="Global Trade Item Number (EAN/UPC)"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 150 }]}>
          </umb-property>

          <umb-property
            alias="supplierSku"
            label="Supplier SKU"
            description="Your supplier's product code"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 150 }]}>
          </umb-property>

          <umb-property
            alias="hsCode"
            label="HS Code"
            description="Harmonized System code for customs/tariff classification"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .config=${[{ alias: "maxChars", value: 10 }]}>
          </umb-property>
        </uui-box>

        <uui-box headline="Pricing">
          <umb-property
            alias="price"
            label="Price"
            description="Customer-facing price (excluding tax)"
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}
            .validation=${{ mandatory: true }}>
          </umb-property>

          <umb-property
            alias="costOfGoods"
            label="Cost of Goods"
            description="Your cost for profit margin calculation"
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}>
          </umb-property>

          <umb-property
            alias="onSale"
            label="On Sale"
            description="Enable sale pricing"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>

          ${(this.formData.onSale ?? false)
            ? html`
                <umb-property
                  alias="previousPrice"
                  label="Previous Price (Was)"
                  description="Original price to show discount"
                  property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
                  .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}>
                </umb-property>
              `
            : nothing}
        </uui-box>

        <uui-box headline="Availability">
          <umb-property
            alias="availableForPurchase"
            label="Visible on Website"
            description="Show on storefront and allow adding to cart"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>

          <umb-property
            alias="canPurchase"
            label="Allow Purchase"
            description="Enable checkout (used for stock/inventory validation)"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
        </uui-box>
      </umb-property-dataset>
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

    .error-summary {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
    }

    umb-property uui-input,
    umb-property uui-textarea {
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
