import { html, css, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("merchello-settings-workspace-editor")
export class MerchelloSettingsWorkspaceEditorElement extends UmbLitElement {
  @state()
  private _isSaving = false;

  @state()
  private _canSave = false;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("merchello:settings-save-state", this.#onSaveStateChange as EventListener);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("merchello:settings-save-state", this.#onSaveStateChange as EventListener);
  }

  #onSaveStateChange = (e: CustomEvent<{ isSaving: boolean; canSave: boolean }>): void => {
    this._isSaving = e.detail.isSaving;
    this._canSave = e.detail.canSave;
  };

  #handleSaveClick(): void {
    window.dispatchEvent(new CustomEvent("merchello:trigger-settings-save"));
  }

  override render() {
    return html`
      <umb-workspace-editor headline="Merchello">
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label="Save settings"
          ?disabled=${this._isSaving || !this._canSave}
          @click=${this.#handleSaveClick}>
          ${this._isSaving ? "Saving..." : "Save settings"}
        </uui-button>
      </umb-workspace-editor>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ];
}

export default MerchelloSettingsWorkspaceEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-settings-workspace-editor": MerchelloSettingsWorkspaceEditorElement;
  }
}
