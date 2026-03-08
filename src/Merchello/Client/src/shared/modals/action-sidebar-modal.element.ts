import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { ActionSidebarModalData } from "@shared/modals/action-sidebar-modal.token.js";

@customElement("merchello-action-sidebar-modal")
export class MerchelloActionSidebarModalElement extends UmbModalBaseElement<
  ActionSidebarModalData,
  undefined
> {
  @state() private _loadError: string | null = null;

  override async firstUpdated(): Promise<void> {
    if (!this.data?.elementTag) {
      this._loadError = "No element tag specified for this action.";
      return;
    }

    try {
      // Dynamically import the JS module if specified
      if (this.data.sidebarJsModule) {
        await import(/* @vite-ignore */ this.data.sidebarJsModule);
      }

      // Create and append the custom element
      const container = this.shadowRoot?.getElementById("action-content");
      if (!container) return;

      const element = document.createElement(this.data.elementTag);
      const elementAny = element as unknown as Record<string, unknown>;

      // Pass entity IDs as properties
      if (this.data.invoiceId) elementAny.invoiceId = this.data.invoiceId;
      if (this.data.orderId) elementAny.orderId = this.data.orderId;
      if (this.data.productRootId) elementAny.productRootId = this.data.productRootId;
      if (this.data.productId) elementAny.productId = this.data.productId;
      if (this.data.customerId) elementAny.customerId = this.data.customerId;
      if (this.data.warehouseId) elementAny.warehouseId = this.data.warehouseId;
      if (this.data.supplierId) elementAny.supplierId = this.data.supplierId;
      elementAny.actionKey = this.data.actionKey;

      // Provide a close callback so the custom element can close the modal
      elementAny.closeModal = () => this.modalContext?.submit();

      container.appendChild(element);
    } catch (error) {
      this._loadError = `Failed to load action UI: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private _handleClose(): void {
    this.modalContext?.reject();
  }

  override render() {
    return html`
      <umb-body-layout headline="Action">
        <div id="main">
          ${this._loadError
            ? html`<uui-box>
                <p class="error">${this._loadError}</p>
              </uui-box>`
            : html`<div id="action-content"></div>`}
        </div>
        <div slot="actions">
          <uui-button label="Close" @click=${this._handleClose}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
      }

      #main {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      #action-content {
        min-height: 200px;
      }

      .error {
        color: var(--uui-color-danger);
      }
    `,
  ];
}

export default MerchelloActionSidebarModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-action-sidebar-modal": MerchelloActionSidebarModalElement;
  }
}
