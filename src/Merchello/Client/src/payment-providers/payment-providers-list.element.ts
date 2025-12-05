import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { PaymentProviderDto, PaymentProviderSettingDto } from "./types.js";
import { MERCHELLO_PAYMENT_PROVIDER_CONFIG_MODAL } from "./payment-provider-config-modal.token.js";
import { MERCHELLO_SETUP_INSTRUCTIONS_MODAL } from "./setup-instructions-modal.token.js";

@customElement("merchello-payment-providers-list")
export class MerchelloPaymentProvidersListElement extends UmbElementMixin(LitElement) {
  @state() private _availableProviders: PaymentProviderDto[] = [];
  @state() private _configuredProviders: PaymentProviderSettingDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadProviders();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadProviders(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    try {
      const [availableResult, configuredResult] = await Promise.all([
        MerchelloApi.getAvailablePaymentProviders(),
        MerchelloApi.getPaymentProviders(),
      ]);

      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (availableResult.error) {
        this._errorMessage = availableResult.error.message;
        this._isLoading = false;
        return;
      }

      if (configuredResult.error) {
        this._errorMessage = configuredResult.error.message;
        this._isLoading = false;
        return;
      }

      this._availableProviders = availableResult.data ?? [];
      this._configuredProviders = configuredResult.data ?? [];
    } catch (err) {
      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load providers";
    }

    this._isLoading = false;
  }

  private _getUnconfiguredProviders(): PaymentProviderDto[] {
    const configuredAliases = new Set(this._configuredProviders.map((p) => p.providerAlias));
    return this._availableProviders.filter((p) => !configuredAliases.has(p.alias));
  }

  private async _openConfigModal(provider: PaymentProviderDto, setting?: PaymentProviderSettingDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_PAYMENT_PROVIDER_CONFIG_MODAL, {
      data: { provider, setting },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      await this._loadProviders();
    }
  }

  private async _toggleProvider(setting: PaymentProviderSettingDto): Promise<void> {
    const { error } = await MerchelloApi.togglePaymentProvider(setting.id, !setting.isEnabled);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Success",
        message: `${setting.displayName} ${setting.isEnabled ? "hidden from checkout" : "now showing in checkout"}`,
      },
    });

    await this._loadProviders();
  }

  private async _deleteProvider(setting: PaymentProviderSettingDto): Promise<void> {
    if (!confirm(`Are you sure you want to remove ${setting.displayName}?`)) {
      return;
    }

    const { error } = await MerchelloApi.deletePaymentProvider(setting.id);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: `${setting.displayName} removed` },
    });

    await this._loadProviders();
  }

  private _openSetupInstructions(provider: PaymentProviderDto): void {
    if (!this.#modalManager || !provider.setupInstructions) return;

    this.#modalManager.open(this, MERCHELLO_SETUP_INSTRUCTIONS_MODAL, {
      data: {
        providerName: provider.displayName,
        instructions: provider.setupInstructions,
      },
    });
  }

  private _renderConfiguredProvider(setting: PaymentProviderSettingDto): unknown {
    const provider = setting.provider;

    return html`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${provider?.icon
              ? html`<uui-icon name="${provider.icon}"></uui-icon>`
              : html`<uui-icon name="icon-credit-card"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${setting.displayName}</span>
              <span class="provider-alias">${setting.providerAlias}</span>
            </div>
          </div>
          <div class="provider-actions">
            <uui-toggle
              .checked=${setting.isEnabled}
              @change=${() => this._toggleProvider(setting)}
              label="${setting.isEnabled ? 'In Checkout' : 'Hide From Checkout'}"
            ></uui-toggle>
            <uui-button
              look="secondary"
              label="Configure"
              @click=${() => provider && this._openConfigModal(provider, setting)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove"
              @click=${() => this._deleteProvider(setting)}
            >
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>
        ${provider?.description
          ? html`<p class="provider-description">${provider.description}</p>`
          : nothing}
        <div class="provider-footer">
          <div class="provider-features">
            ${setting.isTestMode
              ? html`<span class="feature-badge test-mode">Test Mode</span>`
              : html`<span class="feature-badge live-mode">Live</span>`}
            ${provider?.supportsRefunds
              ? html`<span class="feature-badge">Refunds</span>`
              : nothing}
            ${provider?.supportsPartialRefunds
              ? html`<span class="feature-badge">Partial Refunds</span>`
              : nothing}
            ${provider?.usesRedirectCheckout
              ? html`<span class="feature-badge">Redirect Checkout</span>`
              : nothing}
            ${provider?.supportsAuthAndCapture
              ? html`<span class="feature-badge">Auth & Capture</span>`
              : nothing}
          </div>
          ${provider?.setupInstructions
            ? html`
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(provider)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderAvailableProvider(provider: PaymentProviderDto): unknown {
    return html`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${provider.icon
              ? html`<uui-icon name="${provider.icon}"></uui-icon>`
              : html`<uui-icon name="icon-credit-card"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${provider.displayName}</span>
              <span class="provider-alias">${provider.alias}</span>
            </div>
          </div>
          <uui-button
            look="primary"
            label="Install"
            @click=${() => this._openConfigModal(provider)}
          >
            Install
          </uui-button>
        </div>
        <div class="provider-footer">
          ${provider.description
            ? html`<p class="provider-description">${provider.description}</p>`
            : nothing}
          ${provider.setupInstructions
            ? html`
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(provider)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  render() {
    if (this._isLoading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
          <span>Loading payment providers...</span>
        </div>
      `;
    }

    if (this._errorMessage) {
      return html`
        <uui-box>
          <div class="error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._errorMessage}</span>
            <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
              Retry
            </uui-button>
          </div>
        </uui-box>
      `;
    }

    const unconfiguredProviders = this._getUnconfiguredProviders();

    return html`
      <uui-box headline="Configured Payment Providers">
        <p class="section-description">
          These payment providers are installed and configured.
          Toggle the switch to show or hide a provider from checkout.
        </p>
        ${this._configuredProviders.length === 0
          ? html`<p class="no-items">No payment providers configured yet.</p>`
          : html`
              <div class="providers-list">
                ${this._configuredProviders.map((setting) =>
                  this._renderConfiguredProvider(setting)
                )}
              </div>
            `}
      </uui-box>

      <uui-box headline="Available Payment Providers">
        <p class="section-description">
          These payment providers are available but not yet configured.
          Click "Install" to configure and add a provider.
        </p>
        ${unconfiguredProviders.length === 0
          ? html`<p class="no-items">All available providers have been configured.</p>`
          : html`
              <div class="providers-list">
                ${unconfiguredProviders.map((provider) =>
                  this._renderAvailableProvider(provider)
                )}
              </div>
            `}
      </uui-box>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
    }

    uui-box {
      margin-bottom: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .no-items {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .providers-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .provider-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .provider-card.configured {
      border-left: 3px solid var(--uui-color-positive);
    }

    .provider-card.available {
      border-left: 3px solid var(--uui-color-border-emphasis);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .provider-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .provider-info > uui-icon {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
    }

    .provider-details {
      display: flex;
      flex-direction: column;
    }

    .provider-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .provider-alias {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .provider-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .provider-description {
      margin: var(--uui-size-space-3) 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      flex: 1;
    }

    .provider-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: var(--uui-size-space-3);
      gap: var(--uui-size-space-3);
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      flex: 1;
    }

    .help-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--uui-color-border);
      border-radius: 50%;
      background: var(--uui-color-surface);
      color: var(--uui-color-text-alt);
      cursor: pointer;
      transition: all 120ms ease;
      flex-shrink: 0;
    }

    .help-button:hover {
      background: var(--uui-color-surface-emphasis);
      color: var(--uui-color-interactive);
      border-color: var(--uui-color-interactive);
    }

    .help-button uui-icon {
      font-size: 16px;
    }

    .feature-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .feature-badge.test-mode {
      background: #f97316;
      color: #fff;
    }

    .feature-badge.live-mode {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }
  `;
}

export default MerchelloPaymentProvidersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-payment-providers-list": MerchelloPaymentProvidersListElement;
  }
}

