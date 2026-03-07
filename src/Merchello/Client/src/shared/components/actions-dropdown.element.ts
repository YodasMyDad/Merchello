import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_ACTION_SIDEBAR_MODAL } from "@shared/modals/action-sidebar-modal.token.js";
import type { ActionDto } from "@shared/types/action.types.js";

@customElement("merchello-actions-dropdown")
export class MerchelloActionsDropdownElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) category = "";
  @property({ type: String }) invoiceId?: string;
  @property({ type: String }) orderId?: string;
  @property({ type: String }) productRootId?: string;
  @property({ type: String }) productId?: string;

  @state() private _actions: ActionDto[] = [];
  @state() private _isOpen = false;
  @state() private _isExecuting = false;

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadActions();
    document.addEventListener("click", this._handleOutsideClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("click", this._handleOutsideClick);
  }

  private _handleOutsideClick = (e: MouseEvent): void => {
    if (!this._isOpen) return;
    // Close if click is outside this component
    if (!this.contains(e.target as Node)) {
      this._closeDropdown();
    }
  };

  private async _loadActions(): Promise<void> {
    if (!this.category) return;
    const { data, error } = await MerchelloApi.getActions(this.category);
    if (error || !data) return;
    this._actions = data;
  }

  private _toggleDropdown(e: Event): void {
    e.stopPropagation();
    if (this._isOpen) {
      this._closeDropdown();
    } else {
      this._openDropdown();
    }
  }

  private _openDropdown(): void {
    this._isOpen = true;
    this.updateComplete.then(() => {
      this._positionDropdown();
    });
  }

  private _closeDropdown(): void {
    this._isOpen = false;
  }

  private _positionDropdown(): void {
    const button = this.shadowRoot?.querySelector("uui-button");
    const menu = this.shadowRoot?.querySelector<HTMLElement>(".dropdown-menu");
    if (!button || !menu) return;

    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom}px`;
    menu.style.left = `${rect.right}px`;
  }

  private async _handleActionClick(action: ActionDto): Promise<void> {
    this._closeDropdown();

    switch (action.behavior) {
      case "serverSide":
        await this._executeServerSide(action);
        break;
      case "download":
        await this._executeDownload(action);
        break;
      case "sidebar":
        await this._openSidebar(action);
        break;
    }
  }

  private async _executeServerSide(action: ActionDto): Promise<void> {
    this._isExecuting = true;
    const { data, error } = await MerchelloApi.executeAction({
      actionKey: action.key,
      invoiceId: this.invoiceId,
      orderId: this.orderId,
      productRootId: this.productRootId,
      productId: this.productId,
    });
    this._isExecuting = false;

    if (error) {
      this.#notificationContext?.peek("danger", { data: { headline: "Action Failed", message: error.message } });
      return;
    }

    if (data?.success) {
      this.#notificationContext?.peek("positive", { data: { headline: action.displayName, message: data.message ?? "Action completed successfully." } });
    } else {
      this.#notificationContext?.peek("danger", { data: { headline: action.displayName, message: data?.message ?? "Action failed." } });
    }
  }

  private async _executeDownload(action: ActionDto): Promise<void> {
    this._isExecuting = true;
    const { blob, filename, error } = await MerchelloApi.downloadAction({
      actionKey: action.key,
      invoiceId: this.invoiceId,
      orderId: this.orderId,
      productRootId: this.productRootId,
      productId: this.productId,
    });
    this._isExecuting = false;

    if (error || !blob) {
      this.#notificationContext?.peek("danger", { data: { headline: "Download Failed", message: error?.message ?? "Download failed." } });
      return;
    }

    // Trigger browser download — stop propagation to prevent Umbraco's
    // anchor interceptor from calling pushState with the blob URL.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "download";
    a.style.display = "none";
    a.addEventListener("click", (e) => e.stopImmediatePropagation());
    this.shadowRoot?.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private async _openSidebar(action: ActionDto): Promise<void> {
    if (!this.#modalManager || !action.sidebarElementTag) return;

    // Dynamically import the JS module if specified
    if (action.sidebarJsModule) {
      try {
        await import(/* @vite-ignore */ action.sidebarJsModule);
      } catch (error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Action Failed", message: `Failed to load action UI: ${error instanceof Error ? error.message : String(error)}` },
        });
        return;
      }
    }

    const modal = this.#modalManager.open(this, MERCHELLO_ACTION_SIDEBAR_MODAL, {
      data: {
        elementTag: action.sidebarElementTag,
        actionKey: action.key,
        sidebarJsModule: action.sidebarJsModule,
        invoiceId: this.invoiceId,
        orderId: this.orderId,
        productRootId: this.productRootId,
        productId: this.productId,
      },
      modal: { type: "sidebar", size: action.sidebarSize as "small" | "medium" | "large" },
    });

    await modal.onSubmit().catch(() => undefined);
  }

  override render() {
    // Hidden when no actions
    if (this._actions.length === 0) return nothing;

    return html`
      <div class="actions-dropdown">
        <uui-button
          look="secondary"
          label="Actions"
          @click=${this._toggleDropdown}
          ?disabled=${this._isExecuting}
        >
          Actions
          <uui-icon name="icon-arrow-down" class="caret"></uui-icon>
        </uui-button>
        ${this._isOpen
          ? html`
              <div class="dropdown-menu" popover="manual">
                ${this._actions.map(
                  (action) => html`
                    <uui-menu-item
                      label=${action.displayName}
                      title=${action.description ?? ""}
                      @click-label=${() => this._handleActionClick(action)}
                    >
                      ${action.icon ? html`<uui-icon slot="icon" name=${action.icon}></uui-icon>` : nothing}
                    </uui-menu-item>
                  `
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    // Show/hide the popover when _isOpen changes
    if (changed.has("_isOpen")) {
      const menu = this.shadowRoot?.querySelector<HTMLElement>(".dropdown-menu");
      if (menu) {
        if (this._isOpen) {
          menu.showPopover();
          this._positionDropdown();
        } else {
          try { menu.hidePopover(); } catch { /* already hidden */ }
        }
      }
    }
  }

  static override styles = [
    css`
      :host {
        display: inline-block;
        position: relative;
      }

      .actions-dropdown {
        position: relative;
      }

      .caret {
        font-size: var(--uui-size-space-3);
        margin-left: var(--uui-size-space-1);
      }

      .dropdown-menu {
        /* Popover API renders in top layer, escaping all overflow:hidden ancestors */
        position: fixed;
        margin: 0;
        padding: var(--uui-size-space-2) 0;
        min-width: 200px;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        box-shadow: var(--uui-shadow-depth-3, 0 2px 12px rgba(0, 0, 0, 0.15));
        display: flex;
        flex-direction: column;
        transform: translateX(-100%);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-actions-dropdown": MerchelloActionsDropdownElement;
  }
}
