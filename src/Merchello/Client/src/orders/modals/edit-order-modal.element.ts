import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { EditOrderModalData, EditOrderModalValue } from "./edit-order-modal.token.js";

@customElement("merchello-edit-order-modal")
export class MerchelloEditOrderModalElement extends UmbModalBaseElement<
  EditOrderModalData,
  EditOrderModalValue
> {
  @state() private _isSaving: boolean = false;

  private async _handleSave(): Promise<void> {
    this._isSaving = true;

    // TODO: Implement save logic

    this._isSaving = false;
    this.value = { saved: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  render() {
    return html`
      <umb-body-layout headline="Edit Order">
        <div id="main">
          <div class="placeholder">
            <uui-icon name="icon-edit"></uui-icon>
            <p>Order edit form will be implemented here</p>
          </div>
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Save"
            look="primary"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
          >
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    #main {
      padding: var(--uui-size-space-4);
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .placeholder uui-icon {
      font-size: 48px;
      margin-bottom: var(--uui-size-space-4);
    }

    .placeholder p {
      margin: 0;
      font-size: 1rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloEditOrderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-edit-order-modal": MerchelloEditOrderModalElement;
  }
}
