import { LitElement, html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ShippingProviderDto, ShippingProviderConfigurationDto } from "@shipping/types/shipping.types.js";
import { MERCHELLO_SHIPPING_PROVIDER_CONFIG_MODAL } from "@shipping/modals/shipping-provider-config-modal.token.js";
import { MERCHELLO_TEST_SHIPPING_PROVIDER_MODAL } from "@shipping/modals/test-provider-modal.token.js";
import { MERCHELLO_SETUP_INSTRUCTIONS_MODAL } from "@payment-providers/modals/setup-instructions-modal.token.js";
import { getShippingProviderIconSvg } from "@shipping/utils/brand-icons.js";

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

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadProviders();
  }

  override disconnectedCallback(): void {
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
    // Only show providers that require global config and haven't been configured yet
    return this._availableProviders.filter(
      (p) => !configuredKeys.has(p.key) && p.configCapabilities?.requiresGlobalConfig
    );
  }

  private _getBuiltInProviders(): ShippingProviderDto[] {
    // Providers that don't require global configuration (always available)
    return this._availableProviders.filter((p) => !p.configCapabilities?.requiresGlobalConfig);
  }

  private async _openConfigModal(provider: ShippingProviderDto, configuration?: ShippingProviderConfigurationDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_PROVIDER_CONFIG_MODAL, {
      data: { provider, configuration },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved) {
      await this._loadProviders();
    }
  }

  private _openTestModal(configuration: ShippingProviderConfigurationDto): void {
    if (!this.#modalManager) return;

    this.#modalManager.open(this, MERCHELLO_TEST_SHIPPING_PROVIDER_MODAL, {
      data: { configuration },
    });
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
    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Remove Shipping Provider",
        content: `Remove ${configuration.displayName} from shipping providers.`,
        confirmLabel: "Remove",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

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

  private _renderProviderIcon(key: string, iconSvg?: string, fallbackIcon?: string): unknown {
    const svg = iconSvg ?? getShippingProviderIconSvg(key);
    if (svg) {
      return html`<span class="provider-icon-svg">${unsafeHTML(svg)}</span>`;
    }
    return html`<uui-icon name="${fallbackIcon ?? 'icon-truck'}"></uui-icon>`;
  }

  private _renderConfiguredProvider(configuration: ShippingProviderConfigurationDto): unknown {
    const provider = configuration.provider;

    return html`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(configuration.providerKey, provider?.iconSvg, provider?.icon)}
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
              label="Test"
              title="Test this provider with sample data"
              @click=${() => this._openTestModal(configuration)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
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
                <div></div>
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(provider)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderBuiltInProvider(provider: ShippingProviderDto): unknown {
    return html`
      <div class="provider-card built-in">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(provider.key, provider.iconSvg, provider.icon)}
            <div class="provider-details">
              <span class="provider-name">${provider.displayName}</span>
              <span class="provider-key">${provider.key}</span>
            </div>
          </div>
        </div>
        ${provider.description
          ? html`<p class="provider-description">${provider.description}</p>`
          : nothing}
      </div>
    `;
  }

  private _renderAvailableProvider(provider: ShippingProviderDto): unknown {
    return html`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(provider.key, provider.iconSvg, provider.icon)}
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

  override render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading shipping providers...</span>
            </div>
          </div>
        </umb-body-layout>
      `;
    }

    if (this._errorMessage) {
      return html`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <uui-box>
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
                  Retry
                </uui-button>
              </div>
            </uui-box>
          </div>
        </umb-body-layout>
      `;
    }

    const unconfiguredProviders = this._getUnconfiguredProviders();
    const builtInProviders = this._getBuiltInProviders();

    return html`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <!-- Built-in Providers (always available, no config needed) -->
      ${builtInProviders.length > 0
        ? html`
            <uui-box headline="Built-in Providers">
              <p class="section-description">
                These providers are built-in and always available. No configuration required.
                Add shipping methods using these providers in your <strong>Warehouses</strong>.
              </p>
              <div class="providers-list">
                ${builtInProviders.map((provider) => this._renderBuiltInProvider(provider))}
              </div>
            </uui-box>
          `
        : nothing}

      <!-- Configured Third-Party Providers -->
      <uui-box headline="Configured Shipping Providers">
        <p class="section-description">
          These shipping providers are installed and configured.
          Toggle the switch to enable or disable a provider.
        </p>
        ${this._configuredProviders.length === 0
          ? html`<p class="no-items">No third-party shipping providers configured yet.</p>`
          : html`
              <div class="providers-list">
                ${this._configuredProviders.map((config) =>
                  this._renderConfiguredProvider(config)
                )}
              </div>
            `}
      </uui-box>

      <!-- Available Third-Party Providers -->
      ${unconfiguredProviders.length > 0
        ? html`
            <uui-box headline="Available Shipping Providers">
              <p class="section-description">
                These shipping providers require API credentials. Click "Install" to configure.
              </p>
              <div class="providers-list">
                ${unconfiguredProviders.map((provider) =>
                  this._renderAvailableProvider(provider)
                )}
              </div>
            </uui-box>
          `
        : nothing}
      </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .content {
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

    .provider-card.built-in {
      border-left: 3px solid var(--uui-color-positive);
      background: var(--uui-color-surface-alt);
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

    .provider-icon-svg {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .provider-icon-svg svg {
      width: 100%;
      height: 100%;
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
      justify-content: space-between;
      align-items: flex-end;
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
