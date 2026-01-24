import { LitElement, html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  FulfilmentProviderDto,
  FulfilmentProviderListItemDto,
} from "@fulfilment-providers/types/fulfilment-providers.types.js";
import { MERCHELLO_FULFILMENT_PROVIDER_CONFIG_MODAL } from "../modals/fulfilment-provider-config-modal.token.js";
import { MERCHELLO_TEST_FULFILMENT_PROVIDER_MODAL } from "../modals/test-provider-modal.token.js";
import { getFulfilmentProviderIconSvg } from "../utils/brand-icons.js";
import "./sync-logs-list.element.js";

@customElement("merchello-fulfilment-providers-list")
export class MerchelloFulfilmentProvidersListElement extends UmbElementMixin(LitElement) {
  @state() private _availableProviders: FulfilmentProviderDto[] = [];
  @state() private _configuredProviders: FulfilmentProviderListItemDto[] = [];
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
        MerchelloApi.getAvailableFulfilmentProviders(),
        MerchelloApi.getFulfilmentProviderConfigurations(),
      ]);

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
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load providers";
    }

    this._isLoading = false;
  }

  private _getUnconfiguredProviders(): FulfilmentProviderDto[] {
    const configuredKeys = new Set(this._configuredProviders.map((p) => p.key));
    return this._availableProviders.filter((p) => !configuredKeys.has(p.key));
  }

  private async _openConfigModal(provider: FulfilmentProviderDto, configured?: FulfilmentProviderListItemDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_FULFILMENT_PROVIDER_CONFIG_MODAL, {
      data: { provider, configured },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved) {
      await this._loadProviders();
    }
  }

  private async _toggleProvider(provider: FulfilmentProviderListItemDto): Promise<void> {
    if (!provider.configurationId) return;

    const { error } = await MerchelloApi.toggleFulfilmentProvider(provider.configurationId, !provider.isEnabled);

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
        message: `${provider.displayName} ${provider.isEnabled ? "disabled" : "enabled"}`,
      },
    });

    await this._loadProviders();
  }

  private async _deleteProvider(provider: FulfilmentProviderListItemDto): Promise<void> {
    if (!provider.configurationId) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Remove Fulfilment Provider",
        content: `Are you sure you want to remove ${provider.displayName}? This action cannot be undone.`,
        confirmLabel: "Remove",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return;

    const { error } = await MerchelloApi.deleteFulfilmentProvider(provider.configurationId);

    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: `${provider.displayName} removed` },
    });

    await this._loadProviders();
  }

  private _openTestModal(provider: FulfilmentProviderListItemDto): void {
    if (!this.#modalManager) return;

    this.#modalManager.open(this, MERCHELLO_TEST_FULFILMENT_PROVIDER_MODAL, {
      data: { provider },
    });
  }

  private _renderProviderIcon(key: string, iconSvg?: string, fallbackIcon?: string): unknown {
    const svg = iconSvg ?? getFulfilmentProviderIconSvg(key);
    if (svg) {
      return html`<span class="provider-icon-svg">${unsafeHTML(svg)}</span>`;
    }
    return html`<uui-icon name="${fallbackIcon ?? 'icon-box'}"></uui-icon>`;
  }


  private _renderConfiguredProvider(provider: FulfilmentProviderListItemDto): unknown {
    const availableProvider = this._availableProviders.find(p => p.key === provider.key);

    return html`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(provider.key, provider.iconSvg, provider.icon)}
            <div class="provider-details">
              <span class="provider-name">${provider.displayName}</span>
              <span class="provider-key">${provider.key}</span>
            </div>
          </div>
          <div class="provider-actions">
            <uui-toggle
              .checked=${provider.isEnabled}
              @change=${() => this._toggleProvider(provider)}
              label="${provider.isEnabled ? 'Enabled' : 'Disabled'}"
            ></uui-toggle>
            <uui-button
              look="secondary"
              label="Test"
              title="Test this provider connection"
              @click=${() => this._openTestModal(provider)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              label="Configure"
              @click=${() => availableProvider && this._openConfigModal(availableProvider, provider)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove"
              @click=${() => this._deleteProvider(provider)}
            >
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>
        ${provider.description
          ? html`<p class="provider-description">${provider.description}</p>`
          : nothing}
        <div class="provider-footer">
          <div class="provider-features">
            <span class="feature-badge api-style">${provider.apiStyleLabel}</span>
            <span class="feature-badge sync-mode">Sync: ${provider.inventorySyncModeLabel}</span>
            ${provider.supportsOrderSubmission
              ? html`<span class="feature-badge">Orders</span>`
              : nothing}
            ${provider.supportsWebhooks
              ? html`<span class="feature-badge">Webhooks</span>`
              : nothing}
            ${provider.supportsProductSync
              ? html`<span class="feature-badge">Product Sync</span>`
              : nothing}
            ${provider.supportsInventorySync
              ? html`<span class="feature-badge">Inventory Sync</span>`
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private _renderAvailableProvider(provider: FulfilmentProviderDto): unknown {
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
          <div class="provider-features">
            <span class="feature-badge api-style">${provider.apiStyleLabel}</span>
            ${provider.supportsOrderSubmission
              ? html`<span class="feature-badge">Orders</span>`
              : nothing}
            ${provider.supportsWebhooks
              ? html`<span class="feature-badge">Webhooks</span>`
              : nothing}
            ${provider.supportsProductSync
              ? html`<span class="feature-badge">Product Sync</span>`
              : nothing}
            ${provider.supportsInventorySync
              ? html`<span class="feature-badge">Inventory Sync</span>`
              : nothing}
          </div>
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
              <span>Loading fulfilment providers...</span>
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

    return html`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <uui-box headline="Configured Fulfilment Providers">
        <p class="section-description">
          These fulfilment providers are installed and configured. Toggle the switch to enable or disable a provider.
        </p>
        <div class="providers-list">
          ${this._configuredProviders.length === 0
            ? html`<p class="no-items">No fulfilment providers configured yet.</p>`
            : this._configuredProviders.map((provider) =>
                this._renderConfiguredProvider(provider)
              )}
        </div>
      </uui-box>

      <uui-box headline="Available Fulfilment Providers">
        <p class="section-description">
          These fulfilment providers are available but not yet configured.
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

      <merchello-sync-logs-list></merchello-sync-logs-list>
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

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
      font-family: monospace;
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
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-3);
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .feature-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .feature-badge.api-style {
      background: var(--uui-color-default-emphasis);
      color: var(--uui-color-default-contrast);
    }

    .feature-badge.sync-mode {
      background: var(--uui-color-interactive-emphasis);
      color: var(--uui-color-interactive-contrast);
    }
  `;
}

export default MerchelloFulfilmentProvidersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-fulfilment-providers-list": MerchelloFulfilmentProvidersListElement;
  }
}
