import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
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

  private _updateField<K extends keyof ProductVariantDto>(field: K, value: ProductVariantDto[K]): void {
    const updated = { ...this.formData, [field]: value };
    this.dispatchEvent(new CustomEvent("variant-change", { detail: updated, bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <uui-box headline="Shopping Feed Settings">
        <umb-property-layout label="Remove from Feed" description="Exclude this product from shopping feeds">
          <uui-toggle
            slot="editor"
            label="Remove from Feed"
            .checked=${this.formData.removeFromFeed ?? false}
            @change=${(e: Event) => this._updateField("removeFromFeed", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>

        ${!this.formData.removeFromFeed
          ? html`
              <umb-property-layout label="Feed Title" description="Title for shopping feed">
                <uui-input
                  slot="editor"
                  label="Feed title"
                  maxlength="200"
                  .value=${this.formData.shoppingFeedTitle || ""}
                  @input=${(e: Event) => this._updateField("shoppingFeedTitle", (e.target as HTMLInputElement).value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Feed Description" description="Description for shopping feed">
                <uui-textarea
                  slot="editor"
                  label="Feed description"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedDescription || ""}
                  @input=${(e: Event) => this._updateField("shoppingFeedDescription", (e.target as HTMLTextAreaElement).value)}>
                </uui-textarea>
              </umb-property-layout>

              <umb-property-layout label="Colour" description="Product colour for feed">
                <uui-input
                  slot="editor"
                  label="Colour"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedColour || ""}
                  @input=${(e: Event) => this._updateField("shoppingFeedColour", (e.target as HTMLInputElement).value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Material" description="Product material for feed">
                <uui-input
                  slot="editor"
                  label="Material"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedMaterial || ""}
                  @input=${(e: Event) => this._updateField("shoppingFeedMaterial", (e.target as HTMLInputElement).value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Size" description="Product size for feed">
                <uui-input
                  slot="editor"
                  label="Size"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedSize || ""}
                  @input=${(e: Event) => this._updateField("shoppingFeedSize", (e.target as HTMLInputElement).value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Width" description="Product width for feed (e.g. 10 cm)">
                <uui-input
                  slot="editor"
                  label="Width"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedWidth || ""}
                  @input=${(e: Event) => this._updateField("shoppingFeedWidth", (e.target as HTMLInputElement).value)}>
                </uui-input>
              </umb-property-layout>

              <umb-property-layout label="Height" description="Product height for feed (e.g. 15 cm)">
                <uui-input
                  slot="editor"
                  label="Height"
                  maxlength="100"
                  .value=${this.formData.shoppingFeedHeight || ""}
                  @input=${(e: Event) => this._updateField("shoppingFeedHeight", (e.target as HTMLInputElement).value)}>
                </uui-input>
              </umb-property-layout>
            `
          : nothing}
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

    umb-property-layout uui-input,
    umb-property-layout uui-textarea {
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
