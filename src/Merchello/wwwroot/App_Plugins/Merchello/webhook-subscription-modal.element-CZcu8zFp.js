import { html as i, nothing as r, css as _, state as u, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { W as l, g as b } from "./webhooks.types-BKPXEUdT.js";
import { M as c } from "./merchello-api-658q9849.js";
var v = Object.defineProperty, f = Object.getOwnPropertyDescriptor, o = (e, t, n, a) => {
  for (var h = a > 1 ? void 0 : a ? f(t, n) : t, d = e.length - 1, p; d >= 0; d--)
    (p = e[d]) && (h = (a ? p(t, n, h) : p(h)) || h);
  return a && h && v(t, n, h), h;
};
let s = class extends g {
  constructor() {
    super(...arguments), this._name = "", this._topic = "", this._targetUrl = "", this._authType = l.HmacSha256, this._authHeaderName = "", this._authHeaderValue = "", this._timeoutSeconds = 30, this._isActive = !0, this._secret = "", this._showSecret = !1, this._isSaving = !1, this._isPinging = !1, this._pingResult = null, this._errors = {};
  }
  get _isEditMode() {
    return !!this.data?.subscription;
  }
  get _topics() {
    return this.data?.topics ?? [];
  }
  connectedCallback() {
    if (super.connectedCallback(), this.data?.subscription) {
      const e = this.data.subscription;
      this._name = e.name, this._topic = e.topic, this._targetUrl = e.targetUrl, this._authType = e.authType, this._timeoutSeconds = e.timeoutSeconds, this._isActive = e.isActive, this._secret = e.secret ?? "";
    }
  }
  _validate() {
    const e = {};
    if (this._name.trim() || (e.name = "Name is required"), this._topic || (e.topic = "Topic is required"), !this._targetUrl.trim())
      e.targetUrl = "Target URL is required";
    else
      try {
        new URL(this._targetUrl);
      } catch {
        e.targetUrl = "Invalid URL format";
      }
    return this._authType === l.ApiKey && (this._authHeaderName.trim() || (e.authHeaderName = "Header name is required for API Key auth"), !this._authHeaderValue.trim() && !this._isEditMode && (e.authHeaderValue = "API key value is required")), (this._authType === l.BearerToken || this._authType === l.BasicAuth) && !this._authHeaderValue.trim() && !this._isEditMode && (e.authHeaderValue = "Auth value is required"), (this._timeoutSeconds < 1 || this._timeoutSeconds > 120) && (e.timeoutSeconds = "Timeout must be between 1 and 120 seconds"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handlePingUrl() {
    if (!this._targetUrl.trim()) {
      this._pingResult = { success: !1, message: "Enter a URL first" };
      return;
    }
    this._isPinging = !0, this._pingResult = null;
    const { data: e, error: t } = await c.pingWebhookUrl(this._targetUrl);
    if (this._isPinging = !1, t) {
      this._pingResult = { success: !1, message: t.message };
      return;
    }
    e?.success ? this._pingResult = { success: !0, message: `Connected successfully (${e.durationMs}ms)` } : this._pingResult = { success: !1, message: e?.errorMessage ?? "Connection failed" };
  }
  async _handleRegenerateSecret() {
    if (!this._isEditMode || !this.data?.subscription?.id || !confirm("Regenerate the HMAC secret? The old secret will no longer be valid."))
      return;
    const { data: e, error: t } = await c.regenerateWebhookSecret(this.data.subscription.id);
    if (t) {
      this._errors = { general: t.message };
      return;
    }
    e?.secret && (this._secret = e.secret, this._showSecret = !0);
  }
  async _handleSave() {
    if (this._validate())
      if (this._isSaving = !0, this._isEditMode) {
        const e = this.data?.subscription?.id;
        if (!e) {
          this._errors = { general: "Subscription ID is missing" }, this._isSaving = !1;
          return;
        }
        const t = {
          name: this._name.trim(),
          targetUrl: this._targetUrl.trim(),
          isActive: this._isActive,
          authType: this._authType,
          timeoutSeconds: this._timeoutSeconds
        };
        this._authHeaderName.trim() && (t.authHeaderName = this._authHeaderName.trim()), this._authHeaderValue.trim() && (t.authHeaderValue = this._authHeaderValue.trim());
        const { error: n } = await c.updateWebhookSubscription(e, t);
        if (this._isSaving = !1, n) {
          this._errors = { general: n.message };
          return;
        }
        this.value = { saved: !0 }, this.modalContext?.submit();
      } else {
        const e = {
          name: this._name.trim(),
          topic: this._topic,
          targetUrl: this._targetUrl.trim(),
          authType: this._authType,
          timeoutSeconds: this._timeoutSeconds
        };
        this._authHeaderName.trim() && (e.authHeaderName = this._authHeaderName.trim()), this._authHeaderValue.trim() && (e.authHeaderValue = this._authHeaderValue.trim());
        const { error: t } = await c.createWebhookSubscription(e);
        if (this._isSaving = !1, t) {
          this._errors = { general: t.message };
          return;
        }
        this.value = { saved: !0 }, this.modalContext?.submit();
      }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getTopicOptions() {
    const e = [
      { name: "Select a topic...", value: "" }
    ];
    for (const t of this._topics)
      for (const n of t.topics)
        e.push({
          name: `${t.name}: ${n.displayName}`,
          value: n.key,
          selected: n.key === this._topic
        });
    return e;
  }
  _getAuthTypeSelectOptions() {
    return b().map((e) => ({
      ...e,
      selected: e.value === String(this._authType)
    }));
  }
  _renderAuthFields() {
    return this._authType === l.HmacSha256 || this._authType === l.HmacSha512 ? this._isEditMode ? i`
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
              @click=${() => this._showSecret = !this._showSecret}>
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
      ` : i`
          <div class="info-box">
            <uui-icon name="icon-lock"></uui-icon>
            <span>An HMAC secret will be generated automatically when you save.</span>
          </div>
        ` : this._authType === l.ApiKey ? i`
        <div class="form-row">
          <label for="auth-header-name">Header Name <span class="required">*</span></label>
          <uui-input
            id="auth-header-name"
            .value=${this._authHeaderName}
            @input=${(e) => this._authHeaderName = e.target.value}
            placeholder="e.g., X-API-Key"
            label="Header name">
          </uui-input>
          ${this._errors.authHeaderName ? i`<span class="error">${this._errors.authHeaderName}</span>` : r}
        </div>
        <div class="form-row">
          <label for="auth-header-value">API Key ${this._isEditMode ? r : i`<span class="required">*</span>`}</label>
          <uui-input
            id="auth-header-value"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e) => this._authHeaderValue = e.target.value}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter API key"}
            label="API key">
          </uui-input>
          ${this._errors.authHeaderValue ? i`<span class="error">${this._errors.authHeaderValue}</span>` : r}
        </div>
      ` : this._authType === l.BearerToken ? i`
        <div class="form-row">
          <label for="auth-header-value">Bearer Token ${this._isEditMode ? r : i`<span class="required">*</span>`}</label>
          <uui-input
            id="auth-header-value"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e) => this._authHeaderValue = e.target.value}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter bearer token"}
            label="Bearer token">
          </uui-input>
          <span class="hint">Will be sent as: Authorization: Bearer &lt;token&gt;</span>
          ${this._errors.authHeaderValue ? i`<span class="error">${this._errors.authHeaderValue}</span>` : r}
        </div>
      ` : this._authType === l.BasicAuth ? i`
        <div class="form-row">
          <label for="auth-header-value">Credentials ${this._isEditMode ? r : i`<span class="required">*</span>`}</label>
          <uui-input
            id="auth-header-value"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e) => this._authHeaderValue = e.target.value}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "username:password"}
            label="Basic auth credentials">
          </uui-input>
          <span class="hint">Format: username:password (will be base64 encoded)</span>
          ${this._errors.authHeaderValue ? i`<span class="error">${this._errors.authHeaderValue}</span>` : r}
        </div>
      ` : r;
  }
  render() {
    const e = this._isEditMode ? "Edit Webhook" : "Add Webhook", t = this._isEditMode ? "Save Changes" : "Create Webhook", n = this._isEditMode ? "Saving..." : "Creating...";
    return i`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? i`<div class="error-banner">${this._errors.general}</div>` : r}

          <div class="form-row">
            <label for="webhook-name">Name <span class="required">*</span></label>
            <uui-input
              id="webhook-name"
              .value=${this._name}
              @input=${(a) => this._name = a.target.value}
              placeholder="e.g., Order notifications"
              label="Webhook name">
            </uui-input>
            <span class="hint">A friendly name to identify this webhook</span>
            ${this._errors.name ? i`<span class="error">${this._errors.name}</span>` : r}
          </div>

          <div class="form-row">
            <label for="webhook-topic">Topic <span class="required">*</span></label>
            <uui-select
              id="webhook-topic"
              .options=${this._getTopicOptions()}
              ?disabled=${this._isEditMode}
              @change=${(a) => this._topic = a.target.value}
              label="Webhook topic">
            </uui-select>
            <span class="hint">The event that will trigger this webhook</span>
            ${this._errors.topic ? i`<span class="error">${this._errors.topic}</span>` : r}
          </div>

          <div class="form-row">
            <label for="webhook-url">Target URL <span class="required">*</span></label>
            <div class="url-field">
              <uui-input
                id="webhook-url"
                type="url"
                .value=${this._targetUrl}
                @input=${(a) => {
      this._targetUrl = a.target.value, this._pingResult = null;
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
            ${this._pingResult ? i`
                  <span class=${this._pingResult.success ? "success-message" : "error"}>
                    ${this._pingResult.message}
                  </span>
                ` : r}
            <span class="hint">The endpoint that will receive webhook payloads</span>
            ${this._errors.targetUrl ? i`<span class="error">${this._errors.targetUrl}</span>` : r}
          </div>

          <div class="form-row">
            <label for="auth-type">Authentication</label>
            <uui-select
              id="auth-type"
              .options=${this._getAuthTypeSelectOptions()}
              @change=${(a) => this._authType = Number(a.target.value)}
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
              @input=${(a) => this._timeoutSeconds = Number(a.target.value)}
              min="1"
              max="120"
              label="Timeout">
            </uui-input>
            <span class="hint">Maximum time to wait for a response (1-120 seconds)</span>
            ${this._errors.timeoutSeconds ? i`<span class="error">${this._errors.timeoutSeconds}</span>` : r}
          </div>

          ${this._isEditMode ? i`
                <div class="form-row">
                  <uui-checkbox
                    ?checked=${this._isActive}
                    @change=${(a) => this._isActive = a.target.checked}
                    label="Active">
                    Active
                  </uui-checkbox>
                  <span class="hint">Inactive webhooks will not receive events</span>
                </div>
              ` : r}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${t}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? n : t}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
s.styles = _`
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
o([
  u()
], s.prototype, "_name", 2);
o([
  u()
], s.prototype, "_topic", 2);
o([
  u()
], s.prototype, "_targetUrl", 2);
o([
  u()
], s.prototype, "_authType", 2);
o([
  u()
], s.prototype, "_authHeaderName", 2);
o([
  u()
], s.prototype, "_authHeaderValue", 2);
o([
  u()
], s.prototype, "_timeoutSeconds", 2);
o([
  u()
], s.prototype, "_isActive", 2);
o([
  u()
], s.prototype, "_secret", 2);
o([
  u()
], s.prototype, "_showSecret", 2);
o([
  u()
], s.prototype, "_isSaving", 2);
o([
  u()
], s.prototype, "_isPinging", 2);
o([
  u()
], s.prototype, "_pingResult", 2);
o([
  u()
], s.prototype, "_errors", 2);
s = o([
  m("merchello-webhook-subscription-modal")
], s);
const S = s;
export {
  s as MerchelloWebhookSubscriptionModalElement,
  S as default
};
//# sourceMappingURL=webhook-subscription-modal.element-CZcu8zFp.js.map
