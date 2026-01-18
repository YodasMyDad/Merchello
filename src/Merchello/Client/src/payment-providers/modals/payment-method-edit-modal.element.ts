import { html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  PaymentMethodCheckoutStyleDto,
  UpdatePaymentMethodSettingDto,
} from "@payment-providers/types/payment-providers.types.js";
import type {
  PaymentMethodEditModalData,
  PaymentMethodEditModalValue,
} from "./payment-method-edit-modal.token.js";
import { getBrandIconSvg } from "../utils/brand-icons.js";

@customElement("merchello-payment-method-edit-modal")
export class MerchelloPaymentMethodEditModalElement extends UmbModalBaseElement<
  PaymentMethodEditModalData,
  PaymentMethodEditModalValue
> {
  @state() private _displayNameOverride = "";
  @state() private _iconMediaKey: string | null = null;
  @state() private _backgroundColor = "";
  @state() private _borderColor = "";
  @state() private _textColor = "";
  @state() private _useSelectedColors = false;
  @state() private _selectedBackgroundColor = "";
  @state() private _selectedBorderColor = "";
  @state() private _selectedTextColor = "";
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;

  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._initializeFromMethod();
  }

  private _initializeFromMethod(): void {
    const method = this.data?.method;
    if (!method) return;

    this._displayNameOverride = method.displayNameOverride ?? "";
    this._iconMediaKey = method.iconMediaKey ?? null;

    // Initialize style fields from checkoutStyleOverride
    const style = method.checkoutStyleOverride;
    if (style) {
      this._backgroundColor = style.backgroundColor ?? "";
      this._borderColor = style.borderColor ?? "";
      this._textColor = style.textColor ?? "";

      // Check if any selected-state colors are set
      const hasSelectedColors =
        style.selectedBackgroundColor ||
        style.selectedBorderColor ||
        style.selectedTextColor;
      this._useSelectedColors = Boolean(hasSelectedColors);

      if (hasSelectedColors) {
        this._selectedBackgroundColor = style.selectedBackgroundColor ?? "";
        this._selectedBorderColor = style.selectedBorderColor ?? "";
        this._selectedTextColor = style.selectedTextColor ?? "";
      }
    }
  }

  private _handleDisplayNameChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this._displayNameOverride = target.value;
  }

  private _handleMediaChange(e: Event): void {
    const target = e.target as HTMLElement & { value?: Array<{ mediaKey?: string }> };
    const value = target?.value || [];
    this._iconMediaKey = value.length > 0 ? value[0].mediaKey || null : null;
  }

  private _clearIcon(): void {
    this._iconMediaKey = null;
  }

  private _handleColorChange(field: string, e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = target.value || "";

    switch (field) {
      case "backgroundColor":
        this._backgroundColor = value;
        break;
      case "borderColor":
        this._borderColor = value;
        break;
      case "textColor":
        this._textColor = value;
        break;
      case "selectedBackgroundColor":
        this._selectedBackgroundColor = value;
        break;
      case "selectedBorderColor":
        this._selectedBorderColor = value;
        break;
      case "selectedTextColor":
        this._selectedTextColor = value;
        break;
    }
  }

  private _toggleUseSelectedColors(): void {
    this._useSelectedColors = !this._useSelectedColors;
    if (!this._useSelectedColors) {
      // Clear selected colors when toggling off
      this._selectedBackgroundColor = "";
      this._selectedBorderColor = "";
      this._selectedTextColor = "";
    }
  }

  private _resetToDefaults(): void {
    this._displayNameOverride = "";
    this._iconMediaKey = null;
    this._backgroundColor = "";
    this._borderColor = "";
    this._textColor = "";
    this._useSelectedColors = false;
    this._selectedBackgroundColor = "";
    this._selectedBorderColor = "";
    this._selectedTextColor = "";
  }

  private async _handleSave(): Promise<void> {
    const { providerSettingId, method } = this.data ?? {};
    if (!providerSettingId || !method) return;

    this._isSaving = true;
    this._errorMessage = null;

    // Build the update request
    const request: UpdatePaymentMethodSettingDto = {
      displayNameOverride: this._displayNameOverride || null,
    };

    // Handle icon
    if (this._iconMediaKey) {
      request.iconMediaKey = this._iconMediaKey;
    } else if (method.iconMediaKey) {
      // Icon was cleared
      request.clearIcon = true;
    }

    // Handle style override
    const hasAnyStyle =
      this._backgroundColor ||
      this._borderColor ||
      this._textColor ||
      this._selectedBackgroundColor ||
      this._selectedBorderColor ||
      this._selectedTextColor;

    if (hasAnyStyle) {
      const styleOverride: PaymentMethodCheckoutStyleDto = {};
      if (this._backgroundColor) styleOverride.backgroundColor = this._backgroundColor;
      if (this._borderColor) styleOverride.borderColor = this._borderColor;
      if (this._textColor) styleOverride.textColor = this._textColor;
      if (this._useSelectedColors) {
        if (this._selectedBackgroundColor)
          styleOverride.selectedBackgroundColor = this._selectedBackgroundColor;
        if (this._selectedBorderColor)
          styleOverride.selectedBorderColor = this._selectedBorderColor;
        if (this._selectedTextColor)
          styleOverride.selectedTextColor = this._selectedTextColor;
      }
      request.checkoutStyleOverride = styleOverride;
    } else if (method.checkoutStyleOverride) {
      // Style was cleared
      request.clearCheckoutStyle = true;
    }

    const { error } = await MerchelloApi.updatePaymentMethodSetting(
      providerSettingId,
      method.methodAlias,
      request
    );

    if (error) {
      this._errorMessage = error.message;
      this._isSaving = false;
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Saved", message: "Payment method settings updated" },
    });

    this.value = { isChanged: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.value = { isChanged: false };
    this.modalContext?.reject();
  }

  private _getPreviewDisplayName(): string {
    const method = this.data?.method;
    return this._displayNameOverride || method?.defaultDisplayName || method?.displayName || "Payment Method";
  }

  private _renderPreview(): unknown {
    const method = this.data?.method;

    // Determine styles for preview
    const bgColor = this._backgroundColor || "var(--uui-color-surface)";
    const borderCol = this._borderColor || "var(--uui-color-border)";
    const txtColor = this._textColor || "var(--uui-color-text)";

    // Get icon - custom media URL takes precedence
    let iconHtml: unknown = nothing;
    if (this._iconMediaKey && method?.iconMediaUrl) {
      iconHtml = html`<img src="${method.iconMediaUrl}" alt="${this._getPreviewDisplayName()}" />`;
    } else if (method?.iconHtml) {
      iconHtml = unsafeHTML(method.iconHtml);
    } else {
      const brandSvg = getBrandIconSvg(method?.methodAlias ?? "");
      if (brandSvg) {
        iconHtml = unsafeHTML(brandSvg);
      } else {
        iconHtml = html`<uui-icon name="${method?.icon ?? 'icon-credit-card'}"></uui-icon>`;
      }
    }

    return html`
      <uui-box headline="Checkout Preview">
        <div class="checkout-preview">
          <div
            class="preview-method"
            style="
              background-color: ${bgColor};
              border-color: ${borderCol};
              color: ${txtColor};
            "
          >
            <span class="preview-method-icon">${iconHtml}</span>
            <span class="preview-method-name">${this._getPreviewDisplayName()}</span>
            <span class="preview-radio"></span>
          </div>
          <p class="preview-hint">Shows how this method appears at checkout</p>
        </div>
      </uui-box>
    `;
  }

  private _renderDisplaySection(): unknown {
    const method = this.data?.method;
    const mediaValue = this._iconMediaKey
      ? [{ key: this._iconMediaKey, mediaKey: this._iconMediaKey }]
      : [];

    return html`
      <uui-box headline="Display">
        <div class="form-section">
          <div class="form-row">
            <label>Display Name</label>
            <uui-input
              .value=${this._displayNameOverride}
              placeholder="${method?.defaultDisplayName ?? 'Enter display name'}"
              @input=${this._handleDisplayNameChange}
            ></uui-input>
            <span class="hint">
              Leave empty to use: "${method?.defaultDisplayName ?? 'default'}"
            </span>
          </div>

          <div class="form-row">
            <label>Custom Icon</label>
            <umb-input-rich-media
              .value=${mediaValue}
              ?multiple=${false}
              @change=${this._handleMediaChange}
            ></umb-input-rich-media>
            ${this._iconMediaKey
              ? html`
                  <uui-button
                    label="Remove icon"
                    look="placeholder"
                    compact
                    @click=${this._clearIcon}
                  >
                    <uui-icon name="icon-trash"></uui-icon> Remove custom icon
                  </uui-button>
                `
              : nothing}
            <span class="hint">64x64px recommended. PNG or uploaded SVG.</span>
          </div>
        </div>
      </uui-box>
    `;
  }

  private _renderColorPicker(
    label: string,
    value: string,
    field: string
  ): unknown {
    return html`
      <div class="color-field">
        <label>${label}</label>
        <div class="color-picker-row">
          <uui-color-picker
            label="${label}"
            .value=${value}
            @change=${(e: Event) => this._handleColorChange(field, e)}
          ></uui-color-picker>
          ${value
            ? html`
                <div class="color-preview">
                  <span class="color-swatch" style="background-color: ${value}"></span>
                  <span class="color-value">${value}</span>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderStyleSection(): unknown {
    return html`
      <uui-box headline="Checkout Styling">
        <div class="form-section">
          <div class="color-row">
            ${this._renderColorPicker("Background Color", this._backgroundColor, "backgroundColor")}
            ${this._renderColorPicker("Border Color", this._borderColor, "borderColor")}
          </div>

          <div class="color-row">
            ${this._renderColorPicker("Text Color", this._textColor, "textColor")}
          </div>

          <div class="selected-toggle">
            <uui-checkbox
              label="Use different colors when selected"
              ?checked=${this._useSelectedColors}
              @change=${this._toggleUseSelectedColors}
            >
              Use different colors when selected
            </uui-checkbox>
          </div>

          ${this._useSelectedColors
            ? html`
                <div class="selected-colors">
                  <div class="color-row">
                    ${this._renderColorPicker(
                      "Selected Background",
                      this._selectedBackgroundColor,
                      "selectedBackgroundColor"
                    )}
                    ${this._renderColorPicker(
                      "Selected Border",
                      this._selectedBorderColor,
                      "selectedBorderColor"
                    )}
                  </div>
                  <div class="color-row">
                    ${this._renderColorPicker(
                      "Selected Text",
                      this._selectedTextColor,
                      "selectedTextColor"
                    )}
                  </div>
                </div>
              `
            : nothing}

          <div class="reset-section">
            <uui-button
              label="Reset to Provider Defaults"
              look="secondary"
              @click=${this._resetToDefaults}
            >
              <uui-icon name="icon-undo"></uui-icon>
              Reset to Provider Defaults
            </uui-button>
          </div>
        </div>
      </uui-box>
    `;
  }

  override render() {
    const method = this.data?.method;

    return html`
      <umb-body-layout headline="Edit Payment Method">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

          <p class="method-info">
            <strong>${method?.displayName}</strong>
            ${method?.isExpressCheckout
              ? html`<span class="express-badge">Express</span>`
              : nothing}
          </p>

          ${this._renderPreview()}
          ${this._renderDisplaySection()}
          ${this._renderStyleSection()}
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Save"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving
              ? html`<uui-loader-circle></uui-loader-circle>`
              : nothing}
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .method-info {
      margin: 0 0 var(--uui-size-space-4) 0;
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .express-badge {
      display: inline-block;
      padding: 2px 6px;
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: 10px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    uui-box {
      margin-bottom: var(--uui-size-space-5);
    }

    /* Checkout Preview */
    .checkout-preview {
      padding: var(--uui-size-space-4);
    }

    .preview-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      max-width: 300px;
      margin: 0 auto;
    }

    .preview-method-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-method-icon img,
    .preview-method-icon svg {
      max-width: 100%;
      max-height: 100%;
    }

    .preview-method-name {
      flex: 1;
      font-weight: 500;
    }

    .preview-radio {
      width: 18px;
      height: 18px;
      border: 2px solid currentColor;
      border-radius: 50%;
      opacity: 0.6;
    }

    .preview-hint {
      text-align: center;
      margin-top: var(--uui-size-space-3);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    /* Form sections */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-row label {
      font-weight: 500;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    /* Color picker */
    .color-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 600px) {
      .color-row {
        grid-template-columns: 1fr;
      }
    }

    .color-field {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .color-field label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .color-picker-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .color-preview {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .color-swatch {
      width: 20px;
      height: 20px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .color-value {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    /* Selected toggle */
    .selected-toggle {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .selected-colors {
      margin-top: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Reset button */
    .reset-section {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    /* Actions */
    [slot="actions"] {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
    }
  `;
}

export default MerchelloPaymentMethodEditModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-payment-method-edit-modal": MerchelloPaymentMethodEditModalElement;
  }
}
