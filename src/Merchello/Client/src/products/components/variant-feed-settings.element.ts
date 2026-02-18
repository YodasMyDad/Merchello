import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UmbPropertyDatasetElement, UmbPropertyValueData } from "@umbraco-cms/backoffice/property";
import type { ProductVariantDto } from "@products/types/product.types.js";

/**
 * Shared component for editing variant shopping feed settings.
 * Used by both product-detail (single-variant mode) and variant-detail.
 *
 * @fires variant-change - Fired when any field changes, with updated form data in detail
 */
@customElement("merchello-variant-feed-settings")
export class MerchelloVariantFeedSettingsElement extends UmbElementMixin(LitElement) {
  @property({ type: Object }) formData: Partial<ProductVariantDto> = {};

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

  private _getBooleanFromPropertyValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return fallback;
  }

  private _getDatasetValue(): UmbPropertyValueData[] {
    return [
      { alias: "removeFromFeed", value: this.formData.removeFromFeed ?? false },
      { alias: "shoppingFeedTitle", value: this.formData.shoppingFeedTitle ?? "" },
      { alias: "shoppingFeedDescription", value: this.formData.shoppingFeedDescription ?? "" },
      { alias: "shoppingFeedColour", value: this.formData.shoppingFeedColour ?? "" },
      { alias: "shoppingFeedMaterial", value: this.formData.shoppingFeedMaterial ?? "" },
      { alias: "shoppingFeedSize", value: this.formData.shoppingFeedSize ?? "" },
      { alias: "shoppingFeedBrand", value: this.formData.shoppingFeedBrand ?? "" },
      { alias: "shoppingFeedCondition", value: this.formData.shoppingFeedCondition ?? "" },
      { alias: "shoppingFeedWidth", value: this.formData.shoppingFeedWidth ?? "" },
      { alias: "shoppingFeedHeight", value: this.formData.shoppingFeedHeight ?? "" },
    ];
  }

  private _handleDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    const updated: Partial<ProductVariantDto> = {
      ...this.formData,
      removeFromFeed: this._getBooleanFromPropertyValue(values.removeFromFeed, false),
      shoppingFeedTitle: this._getStringFromPropertyValue(values.shoppingFeedTitle),
      shoppingFeedDescription: this._getStringFromPropertyValue(values.shoppingFeedDescription),
      shoppingFeedColour: this._getStringFromPropertyValue(values.shoppingFeedColour),
      shoppingFeedMaterial: this._getStringFromPropertyValue(values.shoppingFeedMaterial),
      shoppingFeedSize: this._getStringFromPropertyValue(values.shoppingFeedSize),
      shoppingFeedBrand: this._getStringFromPropertyValue(values.shoppingFeedBrand),
      shoppingFeedCondition: this._getStringFromPropertyValue(values.shoppingFeedCondition),
      shoppingFeedWidth: this._getStringFromPropertyValue(values.shoppingFeedWidth),
      shoppingFeedHeight: this._getStringFromPropertyValue(values.shoppingFeedHeight),
    };

    this._dispatchVariantChange(updated);
  }

  override render() {
    return html`
      <umb-property-dataset
        .value=${this._getDatasetValue()}
        @input=${this._handleDatasetChange}
        @change=${this._handleDatasetChange}>
        <uui-box headline="Shopping Feed Settings">
          <umb-property
            alias="removeFromFeed"
            label="Remove from Feed"
            description="Exclude this product from shopping feeds"
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>

          ${!(this.formData.removeFromFeed ?? false)
            ? html`
                <umb-property
                  alias="shoppingFeedTitle"
                  label="Feed Title"
                  description="Title for shopping feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 150 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedDescription"
                  label="Feed Description"
                  description="Description for shopping feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"
                  .config=${[{ alias: "maxChars", value: 1000 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedColour"
                  label="Colour"
                  description="Product colour for feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedMaterial"
                  label="Material"
                  description="Product material for feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedSize"
                  label="Size"
                  description="Product size for feed"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedBrand"
                  label="Brand Override"
                  description="Optional variant brand override. Leave blank to use product default."
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 150 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedCondition"
                  label="Condition Override"
                  description="Optional variant condition override. Leave blank to use product default."
                  property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
                  .config=${[{
                    alias: "items",
                    value: [
                      { name: "Use product default", value: "" },
                      { name: "New", value: "new" },
                      { name: "Used", value: "used" },
                      { name: "Refurbished", value: "refurbished" },
                    ],
                  }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedWidth"
                  label="Width"
                  description="Product width for feed (e.g. 10 cm)"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>

                <umb-property
                  alias="shoppingFeedHeight"
                  label="Height"
                  description="Product height for feed (e.g. 15 cm)"
                  property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
                  .config=${[{ alias: "maxChars", value: 100 }]}>
                </umb-property>
              `
            : nothing}
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

    umb-property uui-input,
    umb-property uui-textarea {
      width: 100%;
    }
  `;
}

export default MerchelloVariantFeedSettingsElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-variant-feed-settings": MerchelloVariantFeedSettingsElement;
  }
}
