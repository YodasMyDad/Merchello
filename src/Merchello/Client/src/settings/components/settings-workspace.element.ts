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

    if (!this._showSeedData) return nothing;

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <merchello-seed-data-workspace
            @seed-data-installed=${this._onSeedDataInstalled}
          ></merchello-seed-data-workspace>
        </div>
      </umb-body-layout>
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
        max-width: 64rem;
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
