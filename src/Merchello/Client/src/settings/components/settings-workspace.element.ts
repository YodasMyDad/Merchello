import {
  LitElement,
  css,
  html,
  nothing,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloApi } from "@api/merchello-api.js";
import "@seed-data/components/seed-data-workspace.element.js";
import "@settings/components/store-configuration-tabs.element.js";

@customElement("merchello-settings-workspace")
export class MerchelloSettingsWorkspaceElement extends UmbElementMixin(LitElement) {
  @state()
  private _isLoading = true;

  @state()
  private _showSeedData = false;

  override connectedCallback(): void {
    super.connectedCallback();
    void this._loadStatus();
  }

  private async _loadStatus(): Promise<void> {
    this._isLoading = true;
    const { data } = await MerchelloApi.getSeedDataStatus();
    this._showSeedData = data?.isEnabled === true && data?.isInstalled === false;
    this._isLoading = false;
  }

  private _onSeedDataInstalled(): void {
    this._showSeedData = false;
  }

  override render() {
    if (this._isLoading) return nothing;

    return html`
      <div class="content">
        ${this._showSeedData
          ? html`
              <merchello-seed-data-workspace
                @seed-data-installed=${this._onSeedDataInstalled}
              ></merchello-seed-data-workspace>
            `
          : nothing}

        <merchello-store-configuration-tabs></merchello-store-configuration-tabs>
      </div>
    `;
  }

  static override readonly styles = [
    css`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        padding: var(--uui-size-layout-1);
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }
    `,
  ];
}

export default MerchelloSettingsWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-settings-workspace": MerchelloSettingsWorkspaceElement;
  }
}
