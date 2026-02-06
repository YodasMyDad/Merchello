import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CreateUpsellModalData, CreateUpsellModalValue } from "@upsells/modals/create-upsell-modal.token.js";

@customElement("merchello-create-upsell-modal")
export class MerchelloCreateUpsellModalElement extends UmbElementMixin(LitElement) {
  @state() private _name = "";
  @state() private _heading = "";
  @state() private _isSaving = false;

  #modalContext?: UmbModalContext<CreateUpsellModalData, CreateUpsellModalValue>;
  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_CONTEXT, (context) => {
      this.#modalContext = context as UmbModalContext<CreateUpsellModalData, CreateUpsellModalValue>;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  private _handleNameInput(e: Event): void {
    this._name = (e.target as HTMLInputElement).value;
  }

  private _handleHeadingInput(e: Event): void {
    this._heading = (e.target as HTMLInputElement).value;
  }

  private _handleClose(): void {
    this.#modalContext?.reject();
  }

  private async _handleCreate(): Promise<void> {
    if (!this._name.trim()) return;

    this._isSaving = true;

    const { data, error } = await MerchelloApi.createUpsell({
      name: this._name.trim(),
      heading: this._heading.trim() || this._name.trim(),
      displayLocation: 1, // Default to Checkout
    });

    this._isSaving = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    if (data?.id) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Upsell created", message: `"${this._name}" has been created` },
      });
      this.#modalContext?.setValue({ id: data.id });
      this.#modalContext?.submit();
    }
  }

  override render() {
    return html`
      <umb-body-layout headline="Create Upsell">
        <div class="form">
          <umb-property-layout label="Name" description="Internal name for this upsell rule">
            <uui-input
              slot="editor"
              .value=${this._name}
              @input=${this._handleNameInput}
              placeholder="e.g. Bed to Pillow Upsell"
              label="Name"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Heading" description="Customer-facing heading shown with recommendations">
            <uui-input
              slot="editor"
              .value=${this._heading}
              @input=${this._handleHeadingInput}
              placeholder="e.g. Complete your bedroom"
              label="Heading"
            ></uui-input>
          </umb-property-layout>
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Create"
            @click=${this._handleCreate}
            ?disabled=${!this._name.trim() || this._isSaving}
          >
            ${this._isSaving ? "Creating..." : "Create"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
    }

    uui-input {
      width: 100%;
    }
  `;
}

export default MerchelloCreateUpsellModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-create-upsell-modal": MerchelloCreateUpsellModalElement;
  }
}
