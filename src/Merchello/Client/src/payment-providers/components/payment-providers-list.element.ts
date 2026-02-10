import { LitElement, html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state, query } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { PaymentProviderDto, PaymentProviderSettingDto } from '@payment-providers/types/payment-providers.types.js';
import { MERCHELLO_PAYMENT_PROVIDER_CONFIG_MODAL } from "@payment-providers/modals/payment-provider-config-modal.token.js";
import { MERCHELLO_PAYMENT_METHODS_CONFIG_MODAL } from "@payment-providers/modals/payment-methods-config-modal.token.js";
import { MERCHELLO_SETUP_INSTRUCTIONS_MODAL } from "@payment-providers/modals/setup-instructions-modal.token.js";
import { MERCHELLO_TEST_PAYMENT_PROVIDER_MODAL } from "@payment-providers/modals/test-provider-modal.token.js";
import type { MerchelloCheckoutPaymentPreviewElement } from "@payment-providers/components/checkout-payment-preview.element.js";
import "@payment-providers/components/checkout-payment-preview.element.js";
import { getProviderIconSvg } from "@payment-providers/utils/brand-icons.js";

@customElement("merchello-payment-providers-list")
export class MerchelloPaymentProvidersListElement extends UmbElementMixin(LitElement) {
  @state() private _availableProviders: PaymentProviderDto[] = [];
  @state() private _configuredProviders: PaymentProviderSettingDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  @query("merchello-checkout-payment-preview")
  private _previewElement?: MerchelloCheckoutPaymentPreviewElement;

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  // Sorter for configured payment providers
  #providerSorter = new UmbSorterController<PaymentProviderSettingDto>(this, {
    getUniqueOfElement: (element) => element.getAttribute("data-provider-id") ?? "",
    getUniqueOfModel: (model) => model.id,
    identifier: "Merchello.PaymentProviders.Sorter",
    itemSelector: ".provider-card.configured",
    containerSelector: ".providers-list.configured",
    onChange: ({ model }) => {
      this._configuredProviders = model;
      this._handleProviderReorder(model.map((p) => p.id));
    },
  });

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
      this.#providerSorter.setModel(this._configuredProviders);
    } catch (err) {
      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load providers";
    }

    this._isLoading = false;

    // Refresh the checkout preview after providers are loaded/reloaded
    await this._previewElement?.loadPreview();
  }

  private async _handleProviderReorder(orderedIds: string[]): Promise<void> {
    const { error } = await MerchelloApi.reorderPaymentProviders(orderedIds);

    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Reorder failed", message: error.message },
      });
      // Reload to restore correct order
      await this._loadProviders();
    } else {
      // Refresh checkout preview to reflect new order
      await this._previewElement?.loadPreview();
    }
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
    if (result?.isSaved) {
      await this._loadProviders();
    }
  }

  private async _openMethodsModal(setting: PaymentProviderSettingDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_PAYMENT_METHODS_CONFIG_MODAL, {
      data: { setting },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isChanged) {
      // Refresh the checkout preview when methods are changed
      await this._previewElement?.loadPreview();
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
    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Remove Payment Provider",
        content: `Are you sure you want to remove ${setting.displayName}? This action cannot be undone.`,
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

  private _openTestModal(setting: PaymentProviderSettingDto): void {
    if (!this.#modalManager) return;

    this.#modalManager.open(this, MERCHELLO_TEST_PAYMENT_PROVIDER_MODAL, {
      data: { setting },
    });
  }

  private _renderProviderIcon(alias: string, iconHtml?: string, fallbackIcon?: string): unknown {
    // Prefer provider-defined iconHtml, fall back to hardcoded brand icons
    const svg = iconHtml ?? getProviderIconSvg(alias);
    if (svg) {
      return html`<span class="provider-icon-svg">${unsafeHTML(svg)}</span>`;
    }
    return html`<uui-icon name="${fallbackIcon ?? 'icon-credit-card'}"></uui-icon>`;
  }

  private _renderConfiguredProvider(setting: PaymentProviderSettingDto): unknown {
    const provider = setting.provider;

    return html`
      <div class="provider-card configured" data-provider-id=${setting.id}>
        <div class="provider-header">
          <div class="provider-left">
            <div class="provider-drag-handle">
              <uui-icon name="icon-navigation"></uui-icon>
            </div>
            <div class="provider-info">
              ${this._renderProviderIcon(setting.providerAlias, provider?.iconHtml, provider?.icon)}
              <div class="provider-details">
                <span class="provider-name">${setting.displayName}</span>
                <span class="provider-alias">${setting.providerAlias}</span>
              </div>
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
              label="Methods"
              title="Configure payment methods"
              @click=${() => this._openMethodsModal(setting)}
            >
              <uui-icon name="icon-list"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              label="Test"
              title="Test this provider configuration"
              @click=${() => this._openTestModal(setting)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
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
        ${provider?.setupInstructions
          ? html`
              <div class="provider-footer provider-footer-actions">
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

  private _renderAvailableProvider(provider: PaymentProviderDto): unknown {
    return html`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(provider.alias, provider.iconHtml, provider.icon)}
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

  override render() {
    const isReady = !this._isLoading && !this._errorMessage;
    const unconfiguredProviders = this._getUnconfiguredProviders();

    return html`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
        ${this._isLoading
          ? html`<div class="loading">
              <uui-loader></uui-loader>
              <span>Loading payment providers...</span>
            </div>`
          : this._errorMessage
            ? html`<uui-box>
                <div class="error">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
                    Retry
                  </uui-button>
                </div>
              </uui-box>`
            : nothing}

        ${isReady
          ? html`<merchello-checkout-payment-preview></merchello-checkout-payment-preview>`
          : nothing}

        <uui-box headline="Configured Payment Providers" ?hidden=${!isReady}>
          <p class="section-description">
            These payment providers are installed and configured.
            Toggle the switch to show or hide a provider from checkout.
            Drag to reorder how providers appear.
          </p>
          <!-- Always render container for sorter -->
          <div class="providers-list configured">
            ${isReady
              ? this._configuredProviders.length === 0
                ? html`<p class="no-items">No payment providers configured yet.</p>`
                : this._configuredProviders.map((setting) =>
                    this._renderConfiguredProvider(setting))
              : nothing}
          </div>
        </uui-box>

        ${isReady
          ? html`<uui-box headline="Available Payment Providers">
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
            </uui-box>`
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

    .provider-drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
      display: flex;
      align-items: center;
      padding-right: var(--uui-size-space-2);
    }

    .provider-drag-handle:active {
      cursor: grabbing;
    }

    .provider-card.--umb-sorter-placeholder {
      visibility: hidden;
      position: relative;
    }

    .provider-card.--umb-sorter-placeholder::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: var(--uui-color-surface-alt);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .provider-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
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

    .provider-footer-actions {
      justify-content: flex-end;
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

  `;
}

export default MerchelloPaymentProvidersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-payment-providers-list": MerchelloPaymentProvidersListElement;
  }
}

