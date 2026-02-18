import { LitElement, html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { TaxProviderDto } from "@tax/types/tax.types.js";
import { MERCHELLO_TAX_PROVIDER_CONFIG_MODAL } from "@tax/modals/tax-provider-config-modal.token.js";
import { MERCHELLO_TEST_TAX_PROVIDER_MODAL } from "@tax/modals/test-tax-provider-modal.token.js";
import { getTaxProviderIconSvg } from "@tax/utils/brand-icons.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-tax-providers-list")
export class MerchelloTaxProvidersListElement extends UmbElementMixin(LitElement) {
  @state() private _providers: TaxProviderDto[] = [];
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
    this._loadData();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadData(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    try {
      const { data, error } = await MerchelloApi.getTaxProviders();

      if (!this.#isConnected) return;

      if (error) {
        this._errorMessage = error.message;
        this._isLoading = false;
        return;
      }

      this._providers = data ?? [];
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to load providers";
    }

    this._isLoading = false;
  }

  private async _activateProvider(provider: TaxProviderDto): Promise<void> {
    if (provider.isActive) return;

    const { error } = await MerchelloApi.activateTaxProvider(provider.alias);

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
        message: `${provider.displayName} is now the active tax provider`,
      },
    });

    await this._loadData();
  }

  private _openConfigModal(provider: TaxProviderDto): void {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_TAX_PROVIDER_CONFIG_MODAL, {
      data: { provider },
    });

    modal.onSubmit().then((result) => {
      if (result?.isSaved) {
        this._loadData();
      }
    }).catch(() => {
      // Modal was closed without saving
    });
  }

  private _openTestModal(provider: TaxProviderDto): void {
    if (!this.#modalManager) return;

    this.#modalManager.open(this, MERCHELLO_TEST_TAX_PROVIDER_MODAL, {
      data: { provider },
    });
  }

  private _renderProviderIcon(alias: string, iconSvg?: string, fallbackIcon?: string): unknown {
    const svg = iconSvg ?? getTaxProviderIconSvg(alias);
    if (svg) {
      return html`<span class="provider-icon-svg">${unsafeHTML(svg)}</span>`;
    }
    return html`<uui-icon name="${fallbackIcon ?? 'icon-calculator'}"></uui-icon>`;
  }

  private _renderProvider(provider: TaxProviderDto): unknown {
    return html`
      <div class="provider-card ${provider.isActive ? "active" : ""}">
        <div class="provider-main">
          <div class="provider-info">
            <div class="provider-icon">
              ${this._renderProviderIcon(provider.alias, provider.iconSvg, provider.icon)}
            </div>
            <div class="provider-details">
              <span class="provider-name">${provider.displayName}</span>
              <span class="provider-alias">${provider.alias}</span>
              ${provider.description
                ? html`<p class="provider-description">${provider.description}</p>`
                : nothing}
            </div>
          </div>

          <div class="provider-actions">
            ${provider.isActive
              ? html`<span class="active-badge"><uui-icon name="icon-check"></uui-icon> Active</span>`
              : html`
                  <uui-button
                    look="secondary"
                    label="Set Active"
                    @click=${() => this._activateProvider(provider)}
                  >
                    Set Active
                  </uui-button>
                `}
            <uui-button
              look="secondary"
              compact
              label="Test"
              title="Test this provider"
              @click=${() => this._openTestModal(provider)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Configure"
              title="Configure this provider"
              @click=${() => this._openConfigModal(provider)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
          </div>
        </div>

      </div>
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content layout-container">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading tax providers...</span>
            </div>
          </div>
        </umb-body-layout>
      `;
    }

    if (this._errorMessage) {
      return html`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content layout-container">
            <uui-box>
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="primary" label="Retry" @click=${this._loadData}>
                  Retry
                </uui-button>
              </div>
            </uui-box>
          </div>
        </umb-body-layout>
      `;
    }

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content layout-container">
          <uui-box headline="Available Providers">
            <p class="section-description">
              Select which tax provider to use for tax calculations.
              Only one provider can be active at a time.
            </p>
            ${this._providers.length === 0
              ? html`
                  <div class="empty-state">
                    <uui-icon name="icon-calculator"></uui-icon>
                    <p>No tax providers discovered.</p>
                    <p class="empty-hint">Tax providers are discovered automatically from installed packages.</p>
                  </div>
                `
              : html`
                  <div class="providers-list">
                    ${this._providers.map((provider) => this._renderProvider(provider))}
                  </div>
                `}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    collectionLayoutStyles,
    css`
    :host {
      display: block;
      height: 100%;
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

    /* Provider Cards */
    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-4);
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
    }

    .empty-hint {
      font-size: 0.875rem;
      margin-top: var(--uui-size-space-2) !important;
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
      padding: var(--uui-size-space-5);
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }

    .provider-card:hover {
      border-color: var(--uui-color-border-emphasis);
    }

    .provider-card.active {
      border-left: 4px solid var(--uui-color-positive);
      background: linear-gradient(90deg, var(--uui-color-positive-standalone) 0%, var(--uui-color-surface) 100px);
    }

    .provider-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-4);
    }

    .provider-info {
      display: flex;
      gap: var(--uui-size-space-4);
      flex: 1;
      min-width: 0;
    }

    .provider-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      flex-shrink: 0;
    }

    .provider-icon uui-icon {
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

    .provider-card.active .provider-icon {
      background: var(--uui-color-positive-standalone);
    }

    .provider-card.active .provider-icon uui-icon {
      color: var(--uui-color-positive-contrast);
    }

    .provider-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      min-width: 0;
    }

    .provider-name {
      font-weight: 700;
      font-size: 1.1rem;
    }

    .provider-alias {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .provider-description {
      margin: var(--uui-size-space-2) 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .provider-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-shrink: 0;
    }

    .active-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .active-badge uui-icon {
      font-size: 0.875rem;
    }

  `,
  ];
}

export default MerchelloTaxProvidersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-providers-list": MerchelloTaxProvidersListElement;
  }
}
