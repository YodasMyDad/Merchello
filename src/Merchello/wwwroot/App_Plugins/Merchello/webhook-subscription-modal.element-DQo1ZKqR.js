import { html as s, nothing as l, css as f, state as o, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as $, UMB_MODAL_MANAGER_CONTEXT as k, UMB_CONFIRM_MODAL as S } from "@umbraco-cms/backoffice/modal";
import { W as h, g as w } from "./webhooks.types-BKPXEUdT.js";
import { M as p } from "./merchello-api-Dp_zU_yi.js";
var H = Object.defineProperty, T = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, u = (e, t, i, a) => {
  for (var n = a > 1 ? void 0 : a ? T(t, i) : t, c = e.length - 1, m; c >= 0; c--)
    (m = e[c]) && (n = (a ? m(t, i, n) : m(n)) || n);
  return a && n && H(t, i, n), n;
}, y = (e, t, i) => t.has(e) || g("Cannot " + i), b = (e, t, i) => (y(e, t, "read from private field"), t.get(e)), M = (e, t, i) => t.has(e) ? g("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), A = (e, t, i, a) => (y(e, t, "write to private field"), t.set(e, i), i), d;
const _ = "MerchelloWebhookSubscriptionForm";
let r = class extends $ {
  constructor() {
    super(), this._name = "", this._topic = "", this._targetUrl = "", this._authType = h.HmacSha256, this._authHeaderName = "", this._authHeaderValue = "", this._timeoutSeconds = 30, this._isActive = !0, this._secret = "", this._showSecret = !1, this._isSaving = !1, this._isPinging = !1, this._pingResult = null, this._errors = {}, M(this, d), this.consumeContext(k, (e) => {
      A(this, d, e);
    });
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
    const e = this.shadowRoot?.querySelector(`#${_}`);
    if (e && !e.checkValidity())
      return e.reportValidity(), !1;
    const t = {};
    if (this._name.trim() || (t.name = "Name is required"), this._topic || (t.topic = "Topic is required"), !this._targetUrl.trim())
      t.targetUrl = "Target URL is required";
    else
      try {
        new URL(this._targetUrl);
      } catch {
        t.targetUrl = "Invalid URL format";
      }
    return this._authType === h.ApiKey && (this._authHeaderName.trim() || (t.authHeaderName = "Header name is required for API Key auth"), !this._authHeaderValue.trim() && !this._isEditMode && (t.authHeaderValue = "API key value is required")), (this._authType === h.BearerToken || this._authType === h.BasicAuth) && !this._authHeaderValue.trim() && !this._isEditMode && (t.authHeaderValue = "Auth value is required"), (this._timeoutSeconds < 1 || this._timeoutSeconds > 120) && (t.timeoutSeconds = "Timeout must be between 1 and 120 seconds"), this._errors = t, Object.keys(t).length === 0;
  }
  async _handlePingUrl() {
    if (this._errors.general) {
      const i = { ...this._errors };
      delete i.general, this._errors = i;
    }
    if (!this._targetUrl.trim()) {
      this._pingResult = { success: !1, message: "Enter a URL first" };
      return;
    }
    this._isPinging = !0, this._pingResult = null;
    const { data: e, error: t } = await p.pingWebhookUrl(this._targetUrl.trim());
    if (this._isPinging = !1, t) {
      this._pingResult = { success: !1, message: t.message };
      return;
    }
    e?.success ? this._pingResult = { success: !0, message: `Connected successfully (${e.durationMs}ms)` } : this._pingResult = { success: !1, message: e?.errorMessage ?? "Connection failed" };
  }
  async _handleRegenerateSecret() {
    if (!this._isEditMode || !this.data?.subscription?.id) return;
    if (!b(this, d)) {
      this._errors = {
        ...this._errors,
        general: "Secret regeneration confirmation is unavailable. Refresh and try again."
      };
      return;
    }
    const e = b(this, d).open(this, S, {
      data: {
        headline: "Regenerate secret",
        content: "Generate a new HMAC secret and invalidate the current one.",
        confirmLabel: "Regenerate",
        color: "warning"
      }
    });
    try {
      await e.onSubmit();
    } catch {
      return;
    }
    const { data: t, error: i } = await p.regenerateWebhookSecret(this.data.subscription.id);
    if (i) {
      this._errors = { ...this._errors, general: i.message };
      return;
    }
    t?.secret && (this._secret = t.secret, this._showSecret = !0);
  }
  async _handleCopySecret() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(this._secret), this._errors = { ...this._errors, general: "" };
    } catch {
      this._errors = {
        ...this._errors,
        general: "Could not copy secret to clipboard."
      };
    }
  }
  async _handleSave(e) {
    if (e?.preventDefault(), this._isSaving || !this._validate()) return;
    if (this._isSaving = !0, this._errors = {}, this._isEditMode) {
      const a = this.data?.subscription?.id;
      if (!a) {
        this._errors = { general: "Subscription ID is missing" }, this._isSaving = !1;
        return;
      }
      const n = {
        name: this._name.trim(),
        targetUrl: this._targetUrl.trim(),
        isActive: this._isActive,
        authType: this._authType,
        timeoutSeconds: this._timeoutSeconds
      };
      this._authHeaderName.trim() && (n.authHeaderName = this._authHeaderName.trim()), this._authHeaderValue.trim() && (n.authHeaderValue = this._authHeaderValue.trim());
      const { error: c } = await p.updateWebhookSubscription(a, n);
      if (this._isSaving = !1, c) {
        this._errors = { general: c.message };
        return;
      }
      this.value = { saved: !0 }, this.modalContext?.submit();
      return;
    }
    const t = {
      name: this._name.trim(),
      topic: this._topic,
      targetUrl: this._targetUrl.trim(),
      authType: this._authType,
      timeoutSeconds: this._timeoutSeconds
    };
    this._authHeaderName.trim() && (t.authHeaderName = this._authHeaderName.trim()), this._authHeaderValue.trim() && (t.authHeaderValue = this._authHeaderValue.trim());
    const { error: i } = await p.createWebhookSubscription(t);
    if (this._isSaving = !1, i) {
      this._errors = { general: i.message };
      return;
    }
    this.value = { saved: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getTopicOptions() {
    const e = [
      { name: "Select a topic...", value: "", selected: !this._topic }
    ];
    for (const t of this._topics)
      for (const i of t.topics)
        e.push({
          name: `${t.name}: ${i.displayName}`,
          value: i.key,
          selected: i.key === this._topic
        });
    return e;
  }
  _getAuthTypeSelectOptions() {
    return w().map((e) => ({
      ...e,
      selected: e.value === String(this._authType)
    }));
  }
  _renderAuthFields() {
    return this._authType === h.HmacSha256 || this._authType === h.HmacSha512 ? this._isEditMode ? s`
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
              @click=${() => this._showSecret = !this._showSecret}>
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
      ` : s`
          <uui-form-layout-item>
            <uui-label slot="label">HMAC Secret</uui-label>
            <div class="info-box">
              <uui-icon name="icon-lock"></uui-icon>
              <span>An HMAC secret will be generated automatically when you save.</span>
            </div>
            <span class="hint">Use this secret to verify webhook signatures in your receiver.</span>
          </uui-form-layout-item>
        ` : this._authType === h.ApiKey ? s`
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-name" required>Header Name</uui-label>
          <uui-input
            id="auth-header-name"
            name="authHeaderName"
            .value=${this._authHeaderName}
            @input=${(e) => this._authHeaderName = e.target.value}
            placeholder="e.g., X-API-Key"
            required
            label="Header name">
          </uui-input>
          ${this._errors.authHeaderName ? s`<span class="error" role="alert">${this._errors.authHeaderName}</span>` : l}
        </uui-form-layout-item>
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-value" ?required=${!this._isEditMode}>API Key</uui-label>
          <uui-input
            id="auth-header-value"
            name="authHeaderValue"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e) => this._authHeaderValue = e.target.value}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter API key"}
            ?required=${!this._isEditMode}
            label="API key">
          </uui-input>
          ${this._errors.authHeaderValue ? s`<span class="error" role="alert">${this._errors.authHeaderValue}</span>` : l}
        </uui-form-layout-item>
      ` : this._authType === h.BearerToken ? s`
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-value" ?required=${!this._isEditMode}>Bearer Token</uui-label>
          <uui-input
            id="auth-header-value"
            name="authHeaderValue"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e) => this._authHeaderValue = e.target.value}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "Enter bearer token"}
            ?required=${!this._isEditMode}
            label="Bearer token">
          </uui-input>
          <span class="hint">Requests include: Authorization: Bearer &lt;token&gt;.</span>
          ${this._errors.authHeaderValue ? s`<span class="error" role="alert">${this._errors.authHeaderValue}</span>` : l}
        </uui-form-layout-item>
      ` : this._authType === h.BasicAuth ? s`
        <uui-form-layout-item>
          <uui-label slot="label" for="auth-header-value" ?required=${!this._isEditMode}>Credentials</uui-label>
          <uui-input
            id="auth-header-value"
            name="authHeaderValue"
            type="password"
            .value=${this._authHeaderValue}
            @input=${(e) => this._authHeaderValue = e.target.value}
            placeholder=${this._isEditMode ? "Leave blank to keep existing" : "username:password"}
            ?required=${!this._isEditMode}
            label="Basic auth credentials">
          </uui-input>
          <span class="hint">Use username:password. Merchello sends the base64 encoded value.</span>
          ${this._errors.authHeaderValue ? s`<span class="error" role="alert">${this._errors.authHeaderValue}</span>` : l}
        </uui-form-layout-item>
      ` : l;
  }
  render() {
    const e = this._isEditMode ? "Edit Webhook" : "Add Webhook", t = this._isEditMode ? "Save Changes" : "Create Webhook", i = this._isEditMode ? "Saving..." : "Creating...";
    return s`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? s`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              ` : l}

          <uui-box>
            <uui-form>
              <form id=${_} @submit=${this._handleSave}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="webhook-name" required>Name</uui-label>
                  <uui-input
                    id="webhook-name"
                    name="webhookName"
                    .value=${this._name}
                    @input=${(a) => this._name = a.target.value}
                    maxlength="255"
                    required
                    placeholder="e.g., Order notifications"
                    label="Webhook name">
                  </uui-input>
                  <span class="hint">A friendly label to identify this webhook in backoffice.</span>
                  ${this._errors.name ? s`<span class="error" role="alert">${this._errors.name}</span>` : l}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="webhook-topic" required>Topic</uui-label>
                  <uui-select
                    id="webhook-topic"
                    .options=${this._getTopicOptions()}
                    ?disabled=${this._isEditMode}
                    @change=${(a) => this._topic = a.target.value}
                    label="Webhook topic">
                  </uui-select>
                  <span class="hint">The event that triggers delivery to your endpoint.</span>
                  ${this._errors.topic ? s`<span class="error" role="alert">${this._errors.topic}</span>` : l}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="webhook-url" required>Target URL</uui-label>
                  <div class="inline-input-actions">
                    <uui-input
                      id="webhook-url"
                      name="targetUrl"
                      type="url"
                      .value=${this._targetUrl}
                      @input=${(a) => {
      this._targetUrl = a.target.value, this._pingResult = null;
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
                  ${this._pingResult ? s`
                        <span class=${this._pingResult.success ? "success-message" : "error"} role="status">
                          ${this._pingResult.message}
                        </span>
                      ` : l}
                  <span class="hint">Use an HTTPS endpoint that accepts JSON POST requests.</span>
                  ${this._errors.targetUrl ? s`<span class="error" role="alert">${this._errors.targetUrl}</span>` : l}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="auth-type">Authentication</uui-label>
                  <uui-select
                    id="auth-type"
                    .options=${this._getAuthTypeSelectOptions()}
                    @change=${(a) => this._authType = Number(a.target.value)}
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
                    @input=${(a) => this._timeoutSeconds = Number(a.target.value)}
                    min="1"
                    max="120"
                    required
                    label="Timeout seconds">
                  </uui-input>
                  <span class="hint">Maximum response wait time before a delivery is treated as failed.</span>
                  ${this._errors.timeoutSeconds ? s`<span class="error" role="alert">${this._errors.timeoutSeconds}</span>` : l}
                </uui-form-layout-item>

                ${this._isEditMode ? s`
                      <uui-form-layout-item>
                        <uui-label slot="label" for="webhook-active">Status</uui-label>
                        <uui-checkbox
                          id="webhook-active"
                          ?checked=${this._isActive}
                          @change=${(a) => this._isActive = a.target.checked}
                          label="Active webhook">
                          Active
                        </uui-checkbox>
                        <span class="hint">Inactive webhooks do not receive events.</span>
                      </uui-form-layout-item>
                    ` : l}
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
          form=${_}
          label=${t}
          look="primary"
          color="positive"
          ?disabled=${this._isSaving}>
          ${this._isSaving ? i : t}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
r.styles = f`
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
u([
  o()
], r.prototype, "_name", 2);
u([
  o()
], r.prototype, "_topic", 2);
u([
  o()
], r.prototype, "_targetUrl", 2);
u([
  o()
], r.prototype, "_authType", 2);
u([
  o()
], r.prototype, "_authHeaderName", 2);
u([
  o()
], r.prototype, "_authHeaderValue", 2);
u([
  o()
], r.prototype, "_timeoutSeconds", 2);
u([
  o()
], r.prototype, "_isActive", 2);
u([
  o()
], r.prototype, "_secret", 2);
u([
  o()
], r.prototype, "_showSecret", 2);
u([
  o()
], r.prototype, "_isSaving", 2);
u([
  o()
], r.prototype, "_isPinging", 2);
u([
  o()
], r.prototype, "_pingResult", 2);
u([
  o()
], r.prototype, "_errors", 2);
r = u([
  v("merchello-webhook-subscription-modal")
], r);
const R = r;
export {
  r as MerchelloWebhookSubscriptionModalElement,
  R as default
};
//# sourceMappingURL=webhook-subscription-modal.element-DQo1ZKqR.js.map
