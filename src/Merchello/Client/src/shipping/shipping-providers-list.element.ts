import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ShippingProviderDto, ShippingProviderConfigurationDto } from "./types.js";
import { MERCHELLO_SHIPPING_PROVIDER_CONFIG_MODAL } from "./shipping-provider-config-modal.token.js";
import { MERCHELLO_SETUP_INSTRUCTIONS_MODAL } from "../payment-providers/setup-instructions-modal.token.js";

@customElement("merchello-shipping-providers-list")
export class MerchelloShippingProvidersListElement extends UmbElementMixin(LitElement) {
  @state() private _availableProviders: ShippingProviderDto[] = [];
  @state() private _configuredProviders: ShippingProviderConfigurationDto[] = [];
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
        MerchelloApi.getAvailableShippingProviders(),
        MerchelloApi.getShippingProviders(),
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

  private _getUnconfiguredProviders(): ShippingProviderDto[] {
    const configuredKeys = new Set(this._configuredProviders.map((p) => p.providerKey));
    return this._availableProviders.filter((p) => !configuredKeys.has(p.key));
  }

  private async _openConfigModal(provider: ShippingProviderDto, configuration?: ShippingProviderConfigurationDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_PROVIDER_CONFIG_MODAL, {
      data: { provider, configuration },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      await this._loadProviders();
    }
  }

  private async _toggleProvider(configuration: ShippingProviderConfigurationDto): Promise<void> {
    const { error } = await MerchelloApi.toggleShippingProvider(configuration.id, !configuration.isEnabled);

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
        message: `${configuration.displayName} ${configuration.isEnabled ? "disabled" : "enabled"}`,
      },
    });

    await this._loadProviders();
  }

  private async _deleteProvider(configuration: ShippingProviderConfigurationDto): Promise<void> {
    if (!confirm(`Are you sure you want to remove ${configuration.displayName}?`)) {
      return;
    }

    const { error } = await MerchelloApi.deleteShippingProvider(configuration.id);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: `${configuration.displayName} removed` },
    });

    await this._loadProviders();
  }

  private _openSetupInstructions(provider: ShippingProviderDto): void {
    if (!this.#modalManager || !provider.setupInstructions) return;

    this.#modalManager.open(this, MERCHELLO_SETUP_INSTRUCTIONS_MODAL, {
      data: {
        providerName: provider.displayName,
        instructions: provider.setupInstructions,
      },
    });
  }

  private _renderConfiguredProvider(configuration: ShippingProviderConfigurationDto): unknown {
    const provider = configuration.provider;

    return html`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${provider?.icon
              ? html`<uui-icon name="${provider.icon}"></uui-icon>`
              : html`<uui-icon name="icon-truck"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${configuration.displayName}</span>
              <span class="provider-key">${configuration.providerKey}</span>
            </div>
          </div>
          <div class="provider-actions">
            <uui-toggle
              .checked=${configuration.isEnabled}
              @change=${() => this._toggleProvider(configuration)}
              label="${configuration.isEnabled ? 'Enabled' : 'Disabled'}"
            ></uui-toggle>
            <uui-button
              look="secondary"
              label="Configure"
              @click=${() => provider && this._openConfigModal(provider, configuration)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove"
              @click=${() => this._deleteProvider(configuration)}
            >
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>
        ${provider?.description
          ? html`<p class="provider-description">${provider.description}</p>`
          : nothing}
        ${provider?.setupInstructions
          ? html`
              <div class="provider-footer">
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(provider)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                  Setup Instructions
                </uui-button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderAvailableProvider(provider: ShippingProviderDto): unknown {
    return html`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${provider.icon
              ? html`<uui-icon name="${provider.icon}"></uui-icon>`
              : html`<uui-icon name="icon-truck"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${provider.displayName}</span>
              <span class="provider-key">${provider.key}</span>
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
          <span>Loading shipping providers...</span>
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
      <uui-box headline="Configured Shipping Providers">
        <p class="section-description">
          These shipping providers are installed and configured.
          Toggle the switch to enable or disable a provider.
        </p>
        ${this._configuredProviders.length === 0
          ? html`<p class="no-items">No shipping providers configured yet.</p>`
          : html`
              <div class="providers-list">
                ${this._configuredProviders.map((config) =>
                  this._renderConfiguredProvider(config)
                )}
              </div>
            `}
      </uui-box>

      <uui-box headline="Available Shipping Providers">
        <p class="section-description">
          These shipping providers are available but not yet configured.
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

    .provider-key {
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
      justify-content: flex-start;
      align-items: center;
      margin-top: var(--uui-size-space-3);
      gap: var(--uui-size-space-3);
    }
  `;
}

export default MerchelloShippingProvidersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-providers-list": MerchelloShippingProvidersListElement;
  }
}
