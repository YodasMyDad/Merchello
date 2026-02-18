import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UMB_CONFIRM_MODAL, UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type {
  WebhookSubscriptionModalData,
  WebhookSubscriptionModalValue,
  WebhookTopicCategoryDto,
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
} from "@webhooks/types/webhooks.types.js";
import { WebhookAuthType, getAuthTypeOptions } from "@webhooks/types/webhooks.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

const WEBHOOK_SUBSCRIPTION_FORM_ID = "MerchelloWebhookSubscriptionForm";

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

  #modalManager?: UmbModalManagerContext;

  private get _isEditMode(): boolean {
    return !!this.data?.subscription;
  }

  private get _topics(): WebhookTopicCategoryDto[] {
    return this.data?.topics ?? [];
  }

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
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
    const form = this.shadowRoot?.querySelector<HTMLFormElement>(`#${WEBHOOK_SUBSCRIPTION_FORM_ID}`);
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return false;
    }

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
    if (this._errors.general) {
      const remaining = { ...this._errors };
      delete remaining.general;
      this._errors = remaining;
    }

    if (!this._targetUrl.trim()) {
      this._pingResult = { success: false, message: "Enter a URL first" };
      return;
    }

    this._isPinging = true;
    this._pingResult = null;

    const { data, error } = await MerchelloApi.pingWebhookUrl(this._targetUrl.trim());

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

    if (!this.#modalManager) {
      this._errors = {
        ...this._errors,
        general: "Secret regeneration confirmation is unavailable. Refresh and try again.",
      };
      return;
    }

    const modalContext = this.#modalManager.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Regenerate secret",
        content: "Generate a new HMAC secret and invalidate the current one.",
        confirmLabel: "Regenerate",
        color: "warning",
      },
    });

    try {
      await modalContext.onSubmit();
    } catch {
      return;
    }

    const { data, error } = await MerchelloApi.regenerateWebhookSecret(this.data.subscription.id);

    if (error) {
      this._errors = { ...this._errors, general: error.message };
      return;
    }

    if (data?.secret) {
      this._secret = data.secret;
      this._showSecret = true;
    }
  }

  private async _handleCopySecret(): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(this._secret);
      this._errors = { ...this._errors, general: "" };
    } catch {
      this._errors = {
        ...this._errors,
        general: "Could not copy secret to clipboard.",
      };
    }
  }

  private async _handleSave(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this._isSaving) return;
    if (!this._validate()) return;

    this._isSaving = true;
    this._errors = {};

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
      return;
    }

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

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _getTopicOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a topic...", value: "", selected: !this._topic },
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
    if (this._authType === WebhookAuthType.HmacSha256 || this._authType === WebhookAuthType.HmacSha512) {
      if (!this._isEditMode) {
        return html`
          <uui-form-layout-item>
            <uui-label slot="label">HMAC Secret</uui-label>
            <div class="info-box">
              <uui-icon name="icon-lock"></uui-icon>
              <span>An HMAC secret will be generated automatically when you save.</span>
            </div>
            <span class="hint">Use this secret to verify webhook signatures in your receiver.</span>
          </uui-form-layout-item>
        `;
      }

      return html`
        <uui-form-layout-item>
          <uui-label slot="label">HMAC Secret</uui-label>
          <div class="inline-input-actions">
            <uui-input
              type=${this._showSecret ? "text" : "password"}
              .value=${this._secret}
              readonly
              label="HMAC secret">
            </uui-input>
            <uui-button
              type="button"
              look="secondary"
              compact
              label=${this._showSecret ? "Hide" : "Show"}
              @click=${() => (this._showSecret = !this._showSecret)}>
              <uui-icon name=${this._showSecret ? "icon-eye" : "icon-eye-slash"}></uui-icon>
            </uui-button>
            <uui-button
              type="button"
              look="secondary"
              compact
              label="Copy"
              @click=${this._handleCopySecret}>
              <uui-icon name="icon-documents"></uui-icon>
            </uui-button>
            <uui-button
              type="button"
              look="secondary"
              compact
              label="Regenerate"
              @click=${this._handleRegenerateSecret}>
              <uui-icon name="icon-refresh"></uui-icon>
            </uui-button>
          </div>
          <span class="hint">Regenerating immediately invalidates the current secret.</span>
        </uui-form-layout-item>
      `;
    }

    if (this._authType === WebhookAuthType.ApiKey) {
      return html`
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-name" required>Header Name</uui-label>
          <uui-input
            id="auth-header-name"
            name="authHeaderName"
            .value=${this._authHeaderName}
            @input=${(e: Event) => (this._authHeaderName = (e.target as HTMLInputElement).value)}
            placeholder="e.g., X-API-Key"
            required
            label="Header name">
          </uui-input>
          ${this._errors.authHeaderName ? html`<span class="error" role="alert">${this._errors.authHeaderName}</span>` : nothing}
        </uui-form-layout-item>
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-value" ?required=${!this._isEditMode}>API Key</uui-label>
          <uui-input
            id="auth-header-value"
            name="authHeaderValue"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e: Event) => (this._authHeaderValue = (e.target as HTMLInputElement).value)}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter API key"}
            ?required=${!this._isEditMode}
            label="API key">
          </uui-input>
          ${this._errors.authHeaderValue ? html`<span class="error" role="alert">${this._errors.authHeaderValue}</span>` : nothing}
        </uui-form-layout-item>
      `;
    }

    if (this._authType === WebhookAuthType.BearerToken) {
      return html`
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-value" ?required=${!this._isEditMode}>Bearer Token</uui-label>
          <uui-input
            id="auth-header-value"
            name="authHeaderValue"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e: Event) => (this._authHeaderValue = (e.target as HTMLInputElement).value)}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter bearer token"}
            ?required=${!this._isEditMode}
            label="Bearer token">
          </uui-input>
          <span class="hint">Requests include: Authorization: Bearer &lt;token&gt;.</span>
          ${this._errors.authHeaderValue ? html`<span class="error" role="alert">${this._errors.authHeaderValue}</span>` : nothing}
        </uui-form-layout-item>
      `;
    }

    if (this._authType === WebhookAuthType.BasicAuth) {
      return html`
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-value" ?required=${!this._isEditMode}>Credentials</uui-label>
          <uui-input
            id="auth-header-value"
            name="authHeaderValue"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e: Event) => (this._authHeaderValue = (e.target as HTMLInputElement).value)}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "username:password"}
            ?required=${!this._isEditMode}
            label="Basic auth credentials">
          </uui-input>
          <span class="hint">Use username:password. Merchello sends the base64 encoded value.</span>
          ${this._errors.authHeaderValue ? html`<span class="error" role="alert">${this._errors.authHeaderValue}</span>` : nothing}
        </uui-form-layout-item>
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
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              `
            : nothing}

          <uui-box>
            <uui-form>
              <form id=${WEBHOOK_SUBSCRIPTION_FORM_ID} @submit=${this._handleSave}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="webhook-name" required>Name</uui-label>
                  <uui-input
                    id="webhook-name"
                    name="webhookName"
                    .value=${this._name}
                    @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
                    maxlength="255"
                    required
                    placeholder="e.g., Order notifications"
                    label="Webhook name">
                  </uui-input>
                  <span class="hint">A friendly label to identify this webhook in backoffice.</span>
                  ${this._errors.name ? html`<span class="error" role="alert">${this._errors.name}</span>` : nothing}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="webhook-topic" required>Topic</uui-label>
                  <uui-select
                    id="webhook-topic"
                    .options=${this._getTopicOptions()}
                    ?disabled=${this._isEditMode}
                    @change=${(e: Event) => (this._topic = (e.target as HTMLSelectElement).value)}
                    label="Webhook topic">
                  </uui-select>
                  <span class="hint">The event that triggers delivery to your endpoint.</span>
                  ${this._errors.topic ? html`<span class="error" role="alert">${this._errors.topic}</span>` : nothing}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="webhook-url" required>Target URL</uui-label>
                  <div class="inline-input-actions">
                    <uui-input
                      id="webhook-url"
                      name="targetUrl"
                      type="url"
                      .value=${this._targetUrl}
                      @input=${(e: Event) => {
                        this._targetUrl = (e.target as HTMLInputElement).value;
                        this._pingResult = null;
                      }}
                      required
                      placeholder="https://example.com/webhook"
                      label="Target URL">
                    </uui-input>
                    <uui-button
                      type="button"
                      look="secondary"
                      compact
                      label="Test URL"
                      ?disabled=${this._isPinging}
                      @click=${this._handlePingUrl}>
                      ${this._isPinging ? "Testing..." : "Test"}
                    </uui-button>
                  </div>
                  ${this._pingResult
                    ? html`
                        <span class=${this._pingResult.success ? "success-message" : "error"} role="status">
                          ${this._pingResult.message}
                        </span>
                      `
                    : nothing}
                  <span class="hint">Use an HTTPS endpoint that accepts JSON POST requests.</span>
                  ${this._errors.targetUrl ? html`<span class="error" role="alert">${this._errors.targetUrl}</span>` : nothing}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="auth-type">Authentication</uui-label>
                  <uui-select
                    id="auth-type"
                    .options=${this._getAuthTypeSelectOptions()}
                    @change=${(e: Event) => (this._authType = Number((e.target as HTMLSelectElement).value))}
                    label="Authentication type">
                  </uui-select>
                  <span class="hint">How Merchello authenticates requests sent to your endpoint.</span>
                </uui-form-layout-item>

                ${this._renderAuthFields()}

                <uui-form-layout-item>
                  <uui-label slot="label" for="timeout">Timeout (seconds)</uui-label>
                  <uui-input
                    id="timeout"
                    name="timeoutSeconds"
                    type="number"
                    .value=${String(this._timeoutSeconds)}
                    @input=${(e: Event) => (this._timeoutSeconds = Number((e.target as HTMLInputElement).value))}
                    min="1"
                    max="120"
                    required
                    label="Timeout seconds">
                  </uui-input>
                  <span class="hint">Maximum response wait time before a delivery is treated as failed.</span>
                  ${this._errors.timeoutSeconds
                    ? html`<span class="error" role="alert">${this._errors.timeoutSeconds}</span>`
                    : nothing}
                </uui-form-layout-item>

                ${this._isEditMode
                  ? html`
                      <uui-form-layout-item>
                        <uui-label slot="label" for="webhook-active">Status</uui-label>
                        <uui-checkbox
                          id="webhook-active"
                          ?checked=${this._isActive}
                          @change=${(e: Event) => (this._isActive = (e.target as HTMLInputElement).checked)}
                          label="Active webhook">
                          Active
                        </uui-checkbox>
                        <span class="hint">Inactive webhooks do not receive events.</span>
                      </uui-form-layout-item>
                    `
                  : nothing}
              </form>
            </uui-form>
          </uui-box>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          type="submit"
          form=${WEBHOOK_SUBSCRIPTION_FORM_ID}
          label=${saveLabel}
          look="primary"
          color="positive"
          ?disabled=${this._isSaving}>
          ${this._isSaving ? savingLabel : saveLabel}
        </uui-button>
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
      gap: var(--uui-size-space-4);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    uui-input,
    uui-select {
      width: 100%;
    }

    .inline-input-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: flex-start;
    }

    .inline-input-actions uui-input {
      flex: 1;
    }

    .hint {
      display: block;
      margin-top: var(--uui-size-space-1);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .info-box {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
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
      display: block;
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
    }

    .success-message {
      display: block;
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-positive);
      font-size: var(--uui-type-small-size);
    }

    @media (max-width: 768px) {
      .inline-input-actions {
        flex-direction: column;
      }

      .inline-input-actions uui-button {
        width: 100%;
      }
    }
  `;
}

export default MerchelloWebhookSubscriptionModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-webhook-subscription-modal": MerchelloWebhookSubscriptionModalElement;
  }
}

