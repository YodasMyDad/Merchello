import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  WebhookSubscriptionModalData,
  WebhookSubscriptionModalValue,
  WebhookTopicCategoryDto,
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
} from "@webhooks/types/webhooks.types.js";
import { WebhookAuthType, getAuthTypeOptions } from "@webhooks/types/webhooks.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-webhook-subscription-modal")
export class MerchelloWebhookSubscriptionModalElement extends UmbModalBaseElement<
  WebhookSubscriptionModalData,
  WebhookSubscriptionModalValue
> {
  @state() private _name = "";
  @state() private _topic = "";
  @state() private _targetUrl = "";
  @state() private _authType: WebhookAuthType = WebhookAuthType.HmacSha256;
  @state() private _authHeaderName = "";
  @state() private _authHeaderValue = "";
  @state() private _timeoutSeconds = 30;
  @state() private _isActive = true;
  @state() private _secret = "";
  @state() private _showSecret = false;
  @state() private _isSaving = false;
  @state() private _isPinging = false;
  @state() private _pingResult: { success: boolean; message: string } | null = null;
  @state() private _errors: Record<string, string> = {};

  private get _isEditMode(): boolean {
    return !!this.data?.subscription;
  }

  private get _topics(): WebhookTopicCategoryDto[] {
    return this.data?.topics ?? [];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.data?.subscription) {
      const sub = this.data.subscription;
      this._name = sub.name;
      this._topic = sub.topic;
      this._targetUrl = sub.targetUrl;
      this._authType = sub.authType;
      this._timeoutSeconds = sub.timeoutSeconds;
      this._isActive = sub.isActive;
      this._secret = sub.secret ?? "";
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Name is required";
    }

    if (!this._topic) {
      errors.topic = "Topic is required";
    }

    if (!this._targetUrl.trim()) {
      errors.targetUrl = "Target URL is required";
    } else {
      try {
        new URL(this._targetUrl);
      } catch {
        errors.targetUrl = "Invalid URL format";
      }
    }

    if (this._authType === WebhookAuthType.ApiKey) {
      if (!this._authHeaderName.trim()) {
        errors.authHeaderName = "Header name is required for API Key auth";
      }
      if (!this._authHeaderValue.trim() && !this._isEditMode) {
        errors.authHeaderValue = "API key value is required";
      }
    }

    if (this._authType === WebhookAuthType.BearerToken || this._authType === WebhookAuthType.BasicAuth) {
      if (!this._authHeaderValue.trim() && !this._isEditMode) {
        errors.authHeaderValue = "Auth value is required";
      }
    }

    if (this._timeoutSeconds < 1 || this._timeoutSeconds > 120) {
      errors.timeoutSeconds = "Timeout must be between 1 and 120 seconds";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handlePingUrl(): Promise<void> {
    if (!this._targetUrl.trim()) {
      this._pingResult = { success: false, message: "Enter a URL first" };
      return;
    }

    this._isPinging = true;
    this._pingResult = null;

    const { data, error } = await MerchelloApi.pingWebhookUrl(this._targetUrl);

    this._isPinging = false;

    if (error) {
      this._pingResult = { success: false, message: error.message };
      return;
    }

    if (data?.success) {
      this._pingResult = { success: true, message: `Connected successfully (${data.durationMs}ms)` };
    } else {
      this._pingResult = { success: false, message: data?.errorMessage ?? "Connection failed" };
    }
  }

  private async _handleRegenerateSecret(): Promise<void> {
    if (!this._isEditMode || !this.data?.subscription?.id) return;

    if (!confirm("Regenerate the HMAC secret? The old secret will no longer be valid.")) {
      return;
    }

    const { data, error } = await MerchelloApi.regenerateWebhookSecret(this.data.subscription.id);

    if (error) {
      this._errors = { general: error.message };
      return;
    }

    if (data?.secret) {
      this._secret = data.secret;
      this._showSecret = true;
    }
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    if (this._isEditMode) {
      const subscriptionId = this.data?.subscription?.id;
      if (!subscriptionId) {
        this._errors = { general: "Subscription ID is missing" };
        this._isSaving = false;
        return;
      }

      const updateData: UpdateWebhookSubscriptionDto = {
        name: this._name.trim(),
        targetUrl: this._targetUrl.trim(),
        isActive: this._isActive,
        authType: this._authType,
        timeoutSeconds: this._timeoutSeconds,
      };

      // Only include auth values if they are provided (to not overwrite existing)
      if (this._authHeaderName.trim()) {
        updateData.authHeaderName = this._authHeaderName.trim();
      }
      if (this._authHeaderValue.trim()) {
        updateData.authHeaderValue = this._authHeaderValue.trim();
      }

      const { error } = await MerchelloApi.updateWebhookSubscription(subscriptionId, updateData);

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { saved: true };
      this.modalContext?.submit();
    } else {
      const createData: CreateWebhookSubscriptionDto = {
        name: this._name.trim(),
        topic: this._topic,
        targetUrl: this._targetUrl.trim(),
        authType: this._authType,
        timeoutSeconds: this._timeoutSeconds,
      };

      if (this._authHeaderName.trim()) {
        createData.authHeaderName = this._authHeaderName.trim();
      }
      if (this._authHeaderValue.trim()) {
        createData.authHeaderValue = this._authHeaderValue.trim();
      }

      const { error } = await MerchelloApi.createWebhookSubscription(createData);

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { saved: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _getTopicOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a topic...", value: "" },
    ];

    for (const category of this._topics) {
      for (const topic of category.topics) {
        options.push({
          name: `${category.name}: ${topic.displayName}`,
          value: topic.key,
          selected: topic.key === this._topic,
        });
      }
    }

    return options;
  }

  private _getAuthTypeSelectOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    return getAuthTypeOptions().map((opt) => ({
      ...opt,
      selected: opt.value === String(this._authType),
    }));
  }

  private _renderAuthFields(): unknown {
    // HMAC auth types show the secret
    if (this._authType === WebhookAuthType.HmacSha256 || this._authType === WebhookAuthType.HmacSha512) {
      if (!this._isEditMode) {
        return html`
          <div class="info-box">
            <uui-icon name="icon-lock"></uui-icon>
            <span>An HMAC secret will be generated automatically when you save.</span>
          </div>
        `;
      }

      return html`
        <div class="form-row">
          <label>HMAC Secret</label>
          <div class="secret-field">
            <uui-input
              type=${this._showSecret ? "text" : "password"}
              .value=${this._secret}
              readonly
              label="HMAC Secret">
            </uui-input>
            <uui-button
              look="secondary"
              compact
              label=${this._showSecret ? "Hide" : "Show"}
              @click=${() => (this._showSecret = !this._showSecret)}>
              <uui-icon name=${this._showSecret ? "icon-eye" : "icon-eye-slash"}></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Copy"
              @click=${() => navigator.clipboard.writeText(this._secret)}>
              <uui-icon name="icon-documents"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              color="warning"
              label="Regenerate"
              @click=${this._handleRegenerateSecret}>
              <uui-icon name="icon-refresh"></uui-icon>
            </uui-button>
          </div>
          <span class="hint">Use this secret to verify webhook signatures</span>
        </div>
      `;
    }

    // API Key auth
    if (this._authType === WebhookAuthType.ApiKey) {
      return html`
        <div class="form-row">
          <label for="auth-header-name">Header Name <span class="required">*</span></label>
          <uui-input
            id="auth-header-name"
            .value=${this._authHeaderName}
            @input=${(e: Event) => (this._authHeaderName = (e.target as HTMLInputElement).value)}
            placeholder="e.g., X-API-Key"
            label="Header name">
          </uui-input>
          ${this._errors.authHeaderName ? html`<span class="error">${this._errors.authHeaderName}</span>` : nothing}
        </div>
        <div class="form-row">
          <label for="auth-header-value">API Key ${!this._isEditMode ? html`<span class="required">*</span>` : nothing}</label>
          <uui-input
            id="auth-header-value"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e: Event) => (this._authHeaderValue = (e.target as HTMLInputElement).value)}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter API key"}
            label="API key">
          </uui-input>
          ${this._errors.authHeaderValue ? html`<span class="error">${this._errors.authHeaderValue}</span>` : nothing}
        </div>
      `;
    }

    // Bearer Token auth
    if (this._authType === WebhookAuthType.BearerToken) {
      return html`
        <div class="form-row">
          <label for="auth-header-value">Bearer Token ${!this._isEditMode ? html`<span class="required">*</span>` : nothing}</label>
          <uui-input
            id="auth-header-value"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e: Event) => (this._authHeaderValue = (e.target as HTMLInputElement).value)}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter bearer token"}
            label="Bearer token">
          </uui-input>
          <span class="hint">Will be sent as: Authorization: Bearer &lt;token&gt;</span>
          ${this._errors.authHeaderValue ? html`<span class="error">${this._errors.authHeaderValue}</span>` : nothing}
        </div>
      `;
    }

    // Basic Auth
    if (this._authType === WebhookAuthType.BasicAuth) {
      return html`
        <div class="form-row">
          <label for="auth-header-value">Credentials ${!this._isEditMode ? html`<span class="required">*</span>` : nothing}</label>
          <uui-input
            id="auth-header-value"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e: Event) => (this._authHeaderValue = (e.target as HTMLInputElement).value)}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "username:password"}
            label="Basic auth credentials">
          </uui-input>
          <span class="hint">Format: username:password (will be base64 encoded)</span>
          ${this._errors.authHeaderValue ? html`<span class="error">${this._errors.authHeaderValue}</span>` : nothing}
        </div>
      `;
    }

    return nothing;
  }

  override render() {
    const headline = this._isEditMode ? "Edit Webhook" : "Add Webhook";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Webhook";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row">
            <label for="webhook-name">Name <span class="required">*</span></label>
            <uui-input
              id="webhook-name"
              .value=${this._name}
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Order notifications"
              label="Webhook name">
            </uui-input>
            <span class="hint">A friendly name to identify this webhook</span>
            ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
          </div>

          <div class="form-row">
            <label for="webhook-topic">Topic <span class="required">*</span></label>
            <uui-select
              id="webhook-topic"
              .options=${this._getTopicOptions()}
              ?disabled=${this._isEditMode}
              @change=${(e: Event) => (this._topic = (e.target as HTMLSelectElement).value)}
              label="Webhook topic">
            </uui-select>
            <span class="hint">The event that will trigger this webhook</span>
            ${this._errors.topic ? html`<span class="error">${this._errors.topic}</span>` : nothing}
          </div>

          <div class="form-row">
            <label for="webhook-url">Target URL <span class="required">*</span></label>
            <div class="url-field">
              <uui-input
                id="webhook-url"
                type="url"
                .value=${this._targetUrl}
                @input=${(e: Event) => {
                  this._targetUrl = (e.target as HTMLInputElement).value;
                  this._pingResult = null;
                }}
                placeholder="https://example.com/webhook"
                label="Target URL">
              </uui-input>
              <uui-button
                look="secondary"
                compact
                label="Test"
                ?disabled=${this._isPinging}
                @click=${this._handlePingUrl}>
                ${this._isPinging ? "Testing..." : "Test"}
              </uui-button>
            </div>
            ${this._pingResult
              ? html`
                  <span class=${this._pingResult.success ? "success-message" : "error"}>
                    ${this._pingResult.message}
                  </span>
                `
              : nothing}
            <span class="hint">The endpoint that will receive webhook payloads</span>
            ${this._errors.targetUrl ? html`<span class="error">${this._errors.targetUrl}</span>` : nothing}
          </div>

          <div class="form-row">
            <label for="auth-type">Authentication</label>
            <uui-select
              id="auth-type"
              .options=${this._getAuthTypeSelectOptions()}
              @change=${(e: Event) => (this._authType = Number((e.target as HTMLSelectElement).value))}
              label="Authentication type">
            </uui-select>
            <span class="hint">How to authenticate requests to the webhook endpoint</span>
          </div>

          ${this._renderAuthFields()}

          <div class="form-row">
            <label for="timeout">Timeout (seconds)</label>
            <uui-input
              id="timeout"
              type="number"
              .value=${String(this._timeoutSeconds)}
              @input=${(e: Event) => (this._timeoutSeconds = Number((e.target as HTMLInputElement).value))}
              min="1"
              max="120"
              label="Timeout">
            </uui-input>
            <span class="hint">Maximum time to wait for a response (1-120 seconds)</span>
            ${this._errors.timeoutSeconds ? html`<span class="error">${this._errors.timeoutSeconds}</span>` : nothing}
          </div>

          ${this._isEditMode
            ? html`
                <div class="form-row">
                  <uui-checkbox
                    ?checked=${this._isActive}
                    @change=${(e: Event) => (this._isActive = (e.target as HTMLInputElement).checked)}
                    label="Active">
                    Active
                  </uui-checkbox>
                  <span class="hint">Inactive webhooks will not receive events</span>
                </div>
              `
            : nothing}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${saveLabel}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? savingLabel : saveLabel}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .required {
      color: var(--uui-color-danger);
    }

    uui-input,
    uui-select {
      width: 100%;
    }

    .url-field,
    .secret-field {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .url-field uui-input,
    .secret-field uui-input {
      flex: 1;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .info-box {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
    }

    .success-message {
      color: var(--uui-color-positive);
      font-size: 0.75rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloWebhookSubscriptionModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-webhook-subscription-modal": MerchelloWebhookSubscriptionModalElement;
  }
}
