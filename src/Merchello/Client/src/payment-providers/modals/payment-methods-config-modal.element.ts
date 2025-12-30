import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { PaymentMethodSettingDto } from '@payment-providers/types/payment-providers.types.js';
import type {
  PaymentMethodsConfigModalData,
  PaymentMethodsConfigModalValue,
} from "./payment-methods-config-modal.token.js";
import { getBrandIconSvg } from "../shared/brand-icons.js";

@customElement("merchello-payment-methods-config-modal")
export class MerchelloPaymentMethodsConfigModalElement extends UmbModalBaseElement<
  PaymentMethodsConfigModalData,
  PaymentMethodsConfigModalValue
> {
  @state() private _methods: PaymentMethodSettingDto[] = [];
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _hasChanges = false;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadMethods();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadMethods(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const setting = this.data?.setting;
    if (!setting) {
      this._errorMessage = "No provider specified";
      this._isLoading = false;
      return;
    }

    const { data, error } = await MerchelloApi.getPaymentProviderMethods(setting.id);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._methods = data ?? [];
    this._isLoading = false;
  }

  private async _handleToggle(method: PaymentMethodSettingDto): Promise<void> {
    const setting = this.data?.setting;
    if (!setting) return;

    this._isSaving = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.updatePaymentMethodSetting(
      setting.id,
      method.methodAlias,
      { isEnabled: !method.isEnabled }
    );

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isSaving = false;
      return;
    }

    // Update local state with returned methods
    this._methods = data ?? this._methods;
    this._hasChanges = true;
    this._isSaving = false;
  }

  private _handleClose(): void {
    this.value = { isChanged: this._hasChanges };
    this.modalContext?.submit();
  }

  private _renderMethodIcon(method: PaymentMethodSettingDto): unknown {
    const svg = getBrandIconSvg(method.methodAlias);
    if (svg) {
      return html`<span class="method-icon" .innerHTML=${svg}></span>`;
    }
    // Fallback to UUI icon if no brand SVG available
    return html`<uui-icon name="${method.icon ?? 'icon-credit-card'}"></uui-icon>`;
  }

  private _renderMethod(method: PaymentMethodSettingDto): unknown {
    return html`
      <div class="method-row">
        <div class="method-info">
          ${this._renderMethodIcon(method)}
          <div class="method-details">
            <span class="method-name">${method.displayName}</span>
            ${method.isExpressCheckout
              ? html`<span class="express-badge">Express</span>`
              : nothing}
          </div>
        </div>
        <uui-toggle
          .checked=${method.isEnabled}
          ?disabled=${this._isSaving}
          @change=${() => this._handleToggle(method)}
          label="${method.isEnabled ? 'Enabled' : 'Disabled'}"
        ></uui-toggle>
      </div>
    `;
  }

  override render() {
    const setting = this.data?.setting;

    return html`
      <umb-body-layout headline="Payment Methods - ${setting?.displayName ?? 'Provider'}">
        <div id="main">
          ${this._isLoading
            ? html`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading methods...</span>
                </div>
              `
            : html`
                ${this._errorMessage
                  ? html`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    `
                  : nothing}

                <p class="description">
                  Enable or disable individual payment methods for this provider.
                  Disabled methods will not appear at checkout.
                </p>

                <div class="methods-list">
                  ${this._methods.map((m) => this._renderMethod(m))}
                </div>

                ${this._methods.length === 0
                  ? html`<p class="no-methods">This provider has no configurable methods.</p>`
                  : nothing}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="primary"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
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

    .description {
      color: var(--uui-color-text-alt);
      margin: 0 0 var(--uui-size-space-5) 0;
    }

    .methods-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .method-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .method-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .method-info > uui-icon {
      font-size: 1.25rem;
      color: var(--uui-color-text-alt);
    }

    .method-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .method-icon svg {
      width: 100%;
      height: 100%;
    }

    .method-details {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .method-name {
      font-weight: 500;
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

    .no-methods {
      color: var(--uui-color-text-alt);
      font-style: italic;
      text-align: center;
      padding: var(--uui-size-space-4);
    }

    [slot="actions"] {
      display: flex;
      justify-content: flex-end;
    }
  `;
}

export default MerchelloPaymentMethodsConfigModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-payment-methods-config-modal": MerchelloPaymentMethodsConfigModalElement;
  }
}
