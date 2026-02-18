import { html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { PaymentMethodSettingDto, PaymentMethodRegionDto } from '@payment-providers/types/payment-providers.types.js';
import type {
  PaymentMethodsConfigModalData,
  PaymentMethodsConfigModalValue,
} from "@payment-providers/modals/payment-methods-config-modal.token.js";
import { MERCHELLO_PAYMENT_METHOD_EDIT_MODAL } from "@payment-providers/modals/payment-method-edit-modal.token.js";
import { getBrandIconSvg } from "@payment-providers/utils/brand-icons.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

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
  #notificationContext?: UmbNotificationContext;
  #modalManagerContext?: UmbModalManagerContext;
  #isReorderInFlight = false;
  #pendingReorderMethodAliases: string[] | null = null;
  #reorderDebounceHandle?: number;

  // Sorter for payment methods
  #methodSorter = new UmbSorterController<PaymentMethodSettingDto>(this, {
    getUniqueOfElement: (element) => element.getAttribute("data-method-alias") ?? "",
    getUniqueOfModel: (model) => model.methodAlias,
    identifier: "Merchello.PaymentMethods.Sorter",
    itemSelector: ".method-row",
    containerSelector: ".methods-list",
    onChange: ({ model }) => {
      this._methods = model;
      this._queueMethodReorder(model.map((m) => m.methodAlias));
    },
  });

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManagerContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadMethods();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this.#reorderDebounceHandle !== undefined) {
      window.clearTimeout(this.#reorderDebounceHandle);
      this.#reorderDebounceHandle = undefined;
    }
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
    this.#methodSorter.setModel(this._methods);
    this._isLoading = false;
  }

  private _queueMethodReorder(orderedMethodAliases: string[]): void {
    this.#pendingReorderMethodAliases = [...new Set(orderedMethodAliases)];

    if (this.#reorderDebounceHandle !== undefined) {
      window.clearTimeout(this.#reorderDebounceHandle);
    }

    this.#reorderDebounceHandle = window.setTimeout(() => {
      this.#reorderDebounceHandle = undefined;
      void this._flushMethodReorderQueue();
    }, 200);
  }

  private async _flushMethodReorderQueue(): Promise<void> {
    if (this.#isReorderInFlight) return;

    const setting = this.data?.setting;
    if (!setting) return;

    this.#isReorderInFlight = true;
    try {
      while (this.#pendingReorderMethodAliases && this.#isConnected) {
        const orderedMethodAliases = this.#pendingReorderMethodAliases;
        this.#pendingReorderMethodAliases = null;

        const { error } = await MerchelloApi.reorderPaymentMethods(setting.id, orderedMethodAliases);

        if (!this.#isConnected) return;

        if (error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Reorder failed", message: error.message },
          });
          // Reload to restore persisted order and stop processing queued updates.
          this.#pendingReorderMethodAliases = null;
          await this._loadMethods();
          break;
        }

        this._hasChanges = true;
      }
    } finally {
      this.#isReorderInFlight = false;
    }
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

  private async _openEditModal(method: PaymentMethodSettingDto): Promise<void> {
    const setting = this.data?.setting;
    if (!setting || !this.#modalManagerContext) return;

    const modalContext = this.#modalManagerContext.open(this, MERCHELLO_PAYMENT_METHOD_EDIT_MODAL, {
      data: {
        providerSettingId: setting.id,
        method,
      },
    });

    const result = await modalContext.onSubmit().catch(() => null);
    if (result?.isChanged) {
      this._hasChanges = true;
      // Reload methods to get updated data
      await this._loadMethods();
    }
  }

  private _renderMethodIcon(method: PaymentMethodSettingDto): unknown {
    // Prefer provider-defined iconHtml, fall back to hardcoded brand icons
    const svg = method.iconHtml ?? getBrandIconSvg(method.methodAlias);
    if (svg) {
      return html`<span class="method-icon">${unsafeHTML(svg)}</span>`;
    }
    // Final fallback to UUI icon
    return html`<uui-icon name="${method.icon ?? 'icon-credit-card'}"></uui-icon>`;
  }

  private _renderRegionBadges(regions?: PaymentMethodRegionDto[]): unknown {
    if (!regions || regions.length === 0) return nothing;
    return html`
      ${regions.map(
        (r) => html`
          <span class="region-badge" title="${r.name}">
            ${r.code}
          </span>
        `
      )}
    `;
  }

  private _renderMethod(method: PaymentMethodSettingDto): unknown {
    return html`
      <div class="method-row" data-method-alias=${method.methodAlias}>
        <div class="method-left">
          <div class="method-drag-handle">
            <uui-icon name="icon-navigation"></uui-icon>
          </div>
          <div class="method-info">
            ${this._renderMethodIcon(method)}
            <div class="method-details">
              <span class="method-name">${method.displayName}</span>
              ${method.isExpressCheckout
                ? html`<span class="express-badge">Express</span>`
                : nothing}
              ${this._renderRegionBadges(method.supportedRegions)}
            </div>
          </div>
        </div>
        <div class="method-actions">
          <uui-button
            compact
            label="Edit"
            look="secondary"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._openEditModal(method);
            }}
          >
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-toggle
            .checked=${method.isEnabled}
            ?disabled=${this._isSaving}
            @change=${() => this._handleToggle(method)}
            label="${method.isEnabled ? 'Enabled' : 'Disabled'}"
          ></uui-toggle>
        </div>
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
            : nothing}

          ${!this._isLoading && this._errorMessage
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

          ${!this._isLoading
            ? html`
                <p class="description">
                  Enable or disable individual payment methods for this provider.
                  Drag to reorder. Click Edit to customize display name, icon, and styling.
                </p>
              `
            : nothing}

          <!-- Always render container for sorter -->
          <div class="methods-list">
            ${!this._isLoading && !this._errorMessage
              ? this._methods.map((m) => this._renderMethod(m))
              : nothing}
          </div>

          ${!this._isLoading && !this._errorMessage && this._methods.length === 0
            ? html`<p class="no-methods">This provider has no configurable methods.</p>`
            : nothing}
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

  static override readonly styles = [
    modalLayoutStyles,
    css`
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

    .method-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .method-drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
      display: flex;
      align-items: center;
      padding-right: var(--uui-size-space-2);
    }

    .method-drag-handle:active {
      cursor: grabbing;
    }

    .method-row.--umb-sorter-placeholder {
      visibility: hidden;
      position: relative;
    }

    .method-row.--umb-sorter-placeholder::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: var(--uui-color-surface-alt);
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

    .region-badge {
      display: inline-block;
      padding: 2px 6px;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
      border-radius: 10px;
      font-size: 0.625rem;
      font-weight: 500;
    }

    .method-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .method-actions uui-button {
      --uui-button-height: 28px;
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
  `,
  ];
}

export default MerchelloPaymentMethodsConfigModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-payment-methods-config-modal": MerchelloPaymentMethodsConfigModalElement;
  }
}

