import { LitElement as D, nothing as u, html as i, css as T, property as g, state as n, query as z, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as S } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as M, UMB_MODAL_MANAGER_CONTEXT as O } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as N } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-DFeoGYDY.js";
import { k as R, z as I } from "./navigation-BGhEgega.js";
const F = new M("Merchello.Email.Preview.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var j = Object.defineProperty, L = Object.getOwnPropertyDescriptor, m = (e, t, a, s) => {
  for (var o = s > 1 ? void 0 : s ? L(t, a) : t, p = e.length - 1, _; p >= 0; p--)
    (_ = e[p]) && (o = (s ? _(t, a, o) : _(o)) || o);
  return s && o && j(t, a, o), o;
};
let d = class extends $(D) {
  constructor() {
    super(...arguments), this.value = "", this.tokens = [], this.placeholder = "", this.label = "Expression", this._showDropdown = !1, this._filteredTokens = [], this._selectedIndex = 0, this._cursorPosition = 0;
  }
  _handleInput(e) {
    const t = e.target, a = t.value;
    this._cursorPosition = t.selectionStart ?? 0, this.value = a, this._dispatchValueChanged(), this._checkForAutocomplete(a, this._cursorPosition);
  }
  _checkForAutocomplete(e, t) {
    const a = e.slice(0, t), s = a.lastIndexOf("{{"), o = a.lastIndexOf("}}");
    if (s > o && s !== -1) {
      const p = a.slice(s + 2);
      this._showAutocomplete(p);
    } else
      this._hideAutocomplete();
  }
  _showAutocomplete(e) {
    const t = e.toLowerCase().trim();
    t ? this._filteredTokens = this.tokens.filter(
      (a) => a.path.toLowerCase().includes(t) || a.displayName.toLowerCase().includes(t)
    ) : this._filteredTokens = [...this.tokens], this._selectedIndex = 0, this._showDropdown = this._filteredTokens.length > 0;
  }
  _hideAutocomplete() {
    this._showDropdown = !1, this._filteredTokens = [], this._selectedIndex = 0;
  }
  _handleKeyDown(e) {
    if (this._showDropdown)
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault(), this._selectedIndex = Math.min(this._selectedIndex + 1, this._filteredTokens.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault(), this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
          break;
        case "Enter":
        case "Tab":
          this._filteredTokens.length > 0 && (e.preventDefault(), this._selectToken(this._filteredTokens[this._selectedIndex]));
          break;
        case "Escape":
          e.preventDefault(), this._hideAutocomplete();
          break;
      }
  }
  _selectToken(e) {
    const t = this.value, a = this._cursorPosition, o = t.slice(0, a).lastIndexOf("{{");
    if (o !== -1) {
      const p = t.slice(0, o), _ = t.slice(a), P = `${p}{{${e.path}}}${_}`;
      this.value = P, this._dispatchValueChanged();
      const E = o + e.path.length + 4;
      requestAnimationFrame(() => {
        this._inputElement?.setSelectionRange(E, E), this._inputElement?.focus();
      });
    }
    this._hideAutocomplete();
  }
  _handleBlur() {
    setTimeout(() => {
      this._hideAutocomplete();
    }, 200);
  }
  _handleFocus() {
    if (this._inputElement) {
      const e = this._inputElement.selectionStart ?? 0;
      this._checkForAutocomplete(this.value, e);
    }
  }
  _dispatchValueChanged() {
    this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: this.value },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _renderDropdown() {
    return !this._showDropdown || this._filteredTokens.length === 0 ? u : i`
      <div class="dropdown">
        ${this._filteredTokens.map(
      (e, t) => i`
            <div
              class="dropdown-item ${t === this._selectedIndex ? "selected" : ""}"
              @click=${() => this._selectToken(e)}
              @mouseenter=${() => {
        this._selectedIndex = t;
      }}>
              <code class="token-path">{{${e.path}}}</code>
              <span class="token-name">${e.displayName}</span>
              ${e.description ? i`<span class="token-description">${e.description}</span>` : u}
            </div>
          `
    )}
      </div>
    `;
  }
  render() {
    return i`
      <div class="autocomplete-container">
        <input
          id="input"
          type="text"
          .value=${this.value}
          placeholder=${this.placeholder}
          aria-label=${this.label}
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
          @blur=${this._handleBlur}
          @focus=${this._handleFocus}
        />
        ${this._renderDropdown()}
      </div>
    `;
  }
};
d.styles = [
  T`
      :host {
        display: block;
        position: relative;
      }

      .autocomplete-container {
        position: relative;
      }

      /* Native input styled to match uui-input */
      input {
        width: 100%;
        height: var(--uui-size-11, 36px);
        padding: 0 var(--uui-size-space-3, 9px);
        font-family: inherit;
        font-size: inherit;
        color: var(--uui-color-text);
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius, 3px);
        box-sizing: border-box;
      }

      input:hover {
        border-color: var(--uui-color-border-emphasis);
      }

      input:focus {
        outline: none;
        border-color: var(--uui-color-focus);
        box-shadow: 0 0 0 1px var(--uui-color-focus);
      }

      input::placeholder {
        color: var(--uui-color-text-alt);
      }

      .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 300px;
        overflow-y: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        box-shadow: var(--uui-shadow-depth-3);
        z-index: 100;
        margin-top: 2px;
      }

      .dropdown-item {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-3);
        cursor: pointer;
        border-bottom: 1px solid var(--uui-color-border);
      }

      .dropdown-item:last-child {
        border-bottom: none;
      }

      .dropdown-item:hover,
      .dropdown-item.selected {
        background: var(--uui-color-surface-emphasis);
      }

      .token-path {
        font-family: monospace;
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-interactive);
        background: var(--uui-color-surface-alt);
        padding: 2px 6px;
        border-radius: var(--uui-border-radius);
        align-self: flex-start;
      }

      .token-name {
        font-weight: 500;
        font-size: var(--uui-type-default-size);
      }

      .token-description {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }
    `
];
m([
  g({ type: String })
], d.prototype, "value", 2);
m([
  g({ type: Array })
], d.prototype, "tokens", 2);
m([
  g({ type: String })
], d.prototype, "placeholder", 2);
m([
  g({ type: String })
], d.prototype, "label", 2);
m([
  n()
], d.prototype, "_showDropdown", 2);
m([
  n()
], d.prototype, "_filteredTokens", 2);
m([
  n()
], d.prototype, "_selectedIndex", 2);
m([
  n()
], d.prototype, "_cursorPosition", 2);
m([
  z("#input")
], d.prototype, "_inputElement", 2);
d = m([
  w("merchello-token-autocomplete")
], d);
var B = Object.defineProperty, U = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, c = (e, t, a, s) => {
  for (var o = s > 1 ? void 0 : s ? U(t, a) : t, p = e.length - 1, _; p >= 0; p--)
    (_ = e[p]) && (o = (s ? _(t, a, o) : _(o)) || o);
  return s && o && B(t, a, o), o;
}, A = (e, t, a) => t.has(e) || C("Cannot " + a), l = (e, t, a) => (A(e, t, "read from private field"), t.get(e)), x = (e, t, a) => t.has(e) ? C("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), y = (e, t, a, s) => (A(e, t, "write to private field"), t.set(e, a), a), v, b, h;
function k() {
  return document.createElement("div");
}
let r = class extends $(D) {
  constructor() {
    super(), this._formData = {}, this._topicCategories = [], this._templates = [], this._availableTokens = [], this._availableAttachments = [], this._isSaving = !1, this._isLoadingMetadata = !0, this._activePath = "tab/details", this._routerPath = "", this._fieldErrors = {}, this._isNew = !0, this._testEmailRecipient = "", this._isSendingTest = !1, x(this, v), x(this, b), x(this, h), this._routes = [
      { path: "tab/details", component: k },
      { path: "tab/advanced", component: k },
      { path: "", redirectTo: "tab/details" }
    ], this.consumeContext(S, (e) => {
      y(this, v, e), l(this, v) && (this._isNew = l(this, v).isNew, this.observe(l(this, v).email, (t) => {
        this._email = t, this._isNew = l(this, v)?.isNew ?? !0, t && (this._formData = { ...t }, t.topic && this._loadTokensForTopic(t.topic));
      }, "_email"));
    }), this.consumeContext(O, (e) => {
      y(this, b, e);
    }), this.consumeContext(N, (e) => {
      y(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadMetadata();
  }
  async _loadMetadata() {
    this._isLoadingMetadata = !0;
    const [e, t] = await Promise.all([
      f.getEmailTopicsGrouped(),
      f.getEmailTemplates()
    ]);
    e.data && (this._topicCategories = e.data), t.data && (this._templates = t.data), this._isLoadingMetadata = !1;
  }
  async _loadTokensForTopic(e) {
    const [t, a] = await Promise.all([
      f.getTopicTokens(e),
      f.getTopicAttachments(e)
    ]);
    t.data && (this._availableTokens = t.data), a.data ? this._availableAttachments = a.data : this._availableAttachments = [];
  }
  _handleNameChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, name: t.value }, this._clearFieldError("name");
  }
  _handleDescriptionChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, description: t.value || null };
  }
  _handleTopicChange(e) {
    const a = e.target.value;
    this._formData = { ...this._formData, topic: a, attachmentAliases: [] }, this._clearFieldError("topic"), a ? this._loadTokensForTopic(a) : (this._availableTokens = [], this._availableAttachments = []);
  }
  _handleAttachmentToggle(e, t) {
    const a = this._formData.attachmentAliases || [];
    t ? this._formData = {
      ...this._formData,
      attachmentAliases: [...a, e]
    } : this._formData = {
      ...this._formData,
      attachmentAliases: a.filter((s) => s !== e)
    };
  }
  _handleTemplateChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, templatePath: t.value }, this._clearFieldError("templatePath");
  }
  _handleToExpressionChange(e) {
    this._formData = { ...this._formData, toExpression: e.detail.value }, this._clearFieldError("toExpression");
  }
  _handleSubjectExpressionChange(e) {
    this._formData = { ...this._formData, subjectExpression: e.detail.value }, this._clearFieldError("subjectExpression");
  }
  _handleFromExpressionChange(e) {
    this._formData = { ...this._formData, fromExpression: e.detail.value || null };
  }
  _handleCcExpressionChange(e) {
    this._formData = { ...this._formData, ccExpression: e.detail.value || null };
  }
  _handleBccExpressionChange(e) {
    this._formData = { ...this._formData, bccExpression: e.detail.value || null };
  }
  _handleEnabledChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, enabled: t.checked };
  }
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath ?? "";
  }
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
  }
  _clearFieldError(e) {
    if (this._fieldErrors[e]) {
      const { [e]: t, ...a } = this._fieldErrors;
      this._fieldErrors = a;
    }
  }
  _validate() {
    const e = {};
    return this._formData.name?.trim() || (e.name = "Name is required"), this._formData.topic || (e.topic = "Topic is required"), this._formData.templatePath || (e.templatePath = "Template is required"), this._formData.toExpression?.trim() || (e.toExpression = "To expression is required"), this._formData.subjectExpression?.trim() || (e.subjectExpression = "Subject expression is required"), this._fieldErrors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) {
      l(this, h)?.peek("warning", {
        data: { headline: "Validation error", message: "Please fix the errors before saving." }
      });
      return;
    }
    this._isSaving = !0;
    try {
      if (this._isNew) {
        const e = {
          name: this._formData.name,
          topic: this._formData.topic,
          templatePath: this._formData.templatePath,
          toExpression: this._formData.toExpression,
          subjectExpression: this._formData.subjectExpression,
          enabled: this._formData.enabled ?? !0,
          ccExpression: this._formData.ccExpression,
          bccExpression: this._formData.bccExpression,
          fromExpression: this._formData.fromExpression,
          description: this._formData.description,
          attachmentAliases: this._formData.attachmentAliases || []
        }, { data: t, error: a } = await f.createEmailConfiguration(e);
        if (a) {
          l(this, h)?.peek("danger", {
            data: { headline: "Create failed", message: a.message }
          });
          return;
        }
        if (t) {
          const { data: s } = await f.getEmailConfiguration(t.id);
          s && l(this, v)?.updateEmail(s), l(this, h)?.peek("positive", {
            data: { headline: "Email created", message: `"${t.name}" has been created.` }
          }), R(t.id);
        }
      } else {
        const e = {
          name: this._formData.name,
          topic: this._formData.topic,
          templatePath: this._formData.templatePath,
          toExpression: this._formData.toExpression,
          subjectExpression: this._formData.subjectExpression,
          enabled: this._formData.enabled ?? !0,
          ccExpression: this._formData.ccExpression,
          bccExpression: this._formData.bccExpression,
          fromExpression: this._formData.fromExpression,
          description: this._formData.description,
          attachmentAliases: this._formData.attachmentAliases || []
        }, { data: t, error: a } = await f.updateEmailConfiguration(this._email.id, e);
        if (a) {
          l(this, h)?.peek("danger", {
            data: { headline: "Update failed", message: a.message }
          });
          return;
        }
        if (t) {
          const { data: s } = await f.getEmailConfiguration(t.id);
          s && l(this, v)?.updateEmail(s), l(this, h)?.peek("positive", {
            data: { headline: "Email saved", message: "Changes have been saved." }
          });
        }
      }
    } finally {
      this._isSaving = !1;
    }
  }
  async _handlePreview() {
    this._email?.id && l(this, b)?.open(this, F, {
      data: { configurationId: this._email.id }
    });
  }
  async _handleSendTest() {
    if (!this._email?.id || !this._testEmailRecipient.trim()) return;
    this._isSendingTest = !0;
    const { data: e, error: t } = await f.sendTestEmail(this._email.id, {
      recipient: this._testEmailRecipient.trim()
    });
    if (this._isSendingTest = !1, t) {
      l(this, h)?.peek("danger", {
        data: { headline: "Test failed", message: t.message }
      });
      return;
    }
    e?.success ? (l(this, h)?.peek("positive", {
      data: { headline: "Test sent", message: `Test email sent to ${e.recipient}` }
    }), this._testEmailRecipient = "") : l(this, h)?.peek("danger", {
      data: { headline: "Test failed", message: e?.errorMessage || "Unknown error" }
    });
  }
  _getEmailsListHref() {
    return I();
  }
  _hasDetailsErrors() {
    return !!(this._fieldErrors.name || this._fieldErrors.topic || this._fieldErrors.templatePath || this._fieldErrors.toExpression || this._fieldErrors.subjectExpression);
  }
  _renderTabs() {
    return i`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${this._activePath.includes("tab/details")}>
          Details
          ${this._hasDetailsErrors() ? i`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : u}
        </uui-tab>
        <uui-tab
          label="Advanced"
          href="${this._routerPath}/tab/advanced"
          ?active=${this._activePath.includes("tab/advanced")}>
          Advanced
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderActiveTabContent() {
    return this._activePath.includes("tab/advanced") ? this._renderAdvancedTab() : this._renderDetailsTab();
  }
  _renderTopicOptions() {
    const e = [
      { name: "Select a topic...", value: "", selected: !this._formData.topic }
    ];
    for (const t of this._topicCategories)
      for (const a of t.topics)
        e.push({
          name: `${t.category} - ${a.displayName}`,
          value: a.topic,
          selected: this._formData.topic === a.topic
        });
    return i`
      <uui-select label="Topic" .options=${e} @change=${this._handleTopicChange}></uui-select>
    `;
  }
  _renderTemplateOptions() {
    const e = [
      { name: "Select a template...", value: "", selected: !this._formData.templatePath }
    ];
    for (const t of this._templates)
      e.push({
        name: t.displayName,
        value: t.path,
        selected: this._formData.templatePath === t.path
      });
    return i`
      <uui-select label="Template" .options=${e} @change=${this._handleTemplateChange}></uui-select>
    `;
  }
  _renderDetailsTab() {
    return i`
      <uui-box headline="Email Configuration">
        <umb-property-layout label="Description" description="Optional description for this email">
          <uui-textarea
            slot="editor"
            label="Description"
            .value=${this._formData.description || ""}
            @input=${this._handleDescriptionChange}
            placeholder="Describe when this email is sent...">
          </uui-textarea>
        </umb-property-layout>

        <umb-property-layout label="Topic" description="The notification event that triggers this email" mandatory>
          <div slot="editor">
            ${this._renderTopicOptions()}
            ${this._fieldErrors.topic ? i`<div class="field-error">${this._fieldErrors.topic}</div>` : u}
          </div>
        </umb-property-layout>

        <umb-property-layout label="Template" description="The email template file to use" mandatory>
          <div slot="editor">
            ${this._renderTemplateOptions()}
            ${this._fieldErrors.templatePath ? i`<div class="field-error">${this._fieldErrors.templatePath}</div>` : u}
          </div>
        </umb-property-layout>

        <umb-property-layout
          label="To"
          description="Recipient email address expression. Use {{tokens}} for dynamic values."
          mandatory>
          <div slot="editor">
            <merchello-token-autocomplete
              .value=${this._formData.toExpression || ""}
              .tokens=${this._availableTokens}
              placeholder="e.g., {{customer.email}}"
              @value-changed=${this._handleToExpressionChange}>
            </merchello-token-autocomplete>
            ${this._fieldErrors.toExpression ? i`<div class="field-error">${this._fieldErrors.toExpression}</div>` : u}
          </div>
        </umb-property-layout>

        <umb-property-layout
          label="Subject"
          description="Email subject line expression. Use {{tokens}} for dynamic values."
          mandatory>
          <div slot="editor">
            <merchello-token-autocomplete
              .value=${this._formData.subjectExpression || ""}
              .tokens=${this._availableTokens}
              placeholder="e.g., Order #{{order.orderNumber}} Confirmed"
              @value-changed=${this._handleSubjectExpressionChange}>
            </merchello-token-autocomplete>
            ${this._fieldErrors.subjectExpression ? i`<div class="field-error">${this._fieldErrors.subjectExpression}</div>` : u}
          </div>
        </umb-property-layout>

        <umb-property-layout label="Enabled" description="Enable or disable this email">
          <uui-toggle
            slot="editor"
            label="Enabled"
            .checked=${this._formData.enabled ?? !0}
            @change=${this._handleEnabledChange}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>

      ${this._isNew ? u : i`
            <uui-box headline="Test Email">
              <div class="test-email-row">
                <uui-input
                  type="email"
                  .value=${this._testEmailRecipient}
                  @input=${(e) => {
      this._testEmailRecipient = e.target.value;
    }}
                  placeholder="Enter recipient email..."
                  label="Test recipient">
                </uui-input>
                <uui-button
                  look="secondary"
                  label="Send Test"
                  ?disabled=${!this._testEmailRecipient.trim() || this._isSendingTest}
                  @click=${this._handleSendTest}>
                  ${this._isSendingTest ? "Sending..." : "Send Test"}
                </uui-button>
                <uui-button look="secondary" label="Preview" @click=${this._handlePreview}>
                  <uui-icon name="icon-eye"></uui-icon>
                  Preview
                </uui-button>
              </div>
            </uui-box>
          `}
    `;
  }
  _renderAdvancedTab() {
    return i`
      <uui-box headline="Sender & Recipients">
        <umb-property-layout
          label="From"
          description="Override the default sender address. Leave empty to use system default.">
          <merchello-token-autocomplete
            slot="editor"
            .value=${this._formData.fromExpression || ""}
            .tokens=${this._availableTokens}
            placeholder="e.g., noreply@store.com or {{store.email}}"
            @value-changed=${this._handleFromExpressionChange}>
          </merchello-token-autocomplete>
        </umb-property-layout>

        <umb-property-layout
          label="CC"
          description="Carbon copy recipients. Separate multiple addresses with commas.">
          <merchello-token-autocomplete
            slot="editor"
            .value=${this._formData.ccExpression || ""}
            .tokens=${this._availableTokens}
            placeholder="e.g., manager@store.com"
            @value-changed=${this._handleCcExpressionChange}>
          </merchello-token-autocomplete>
        </umb-property-layout>

        <umb-property-layout
          label="BCC"
          description="Blind carbon copy recipients. Separate multiple addresses with commas.">
          <merchello-token-autocomplete
            slot="editor"
            .value=${this._formData.bccExpression || ""}
            .tokens=${this._availableTokens}
            placeholder="e.g., archive@store.com"
            @value-changed=${this._handleBccExpressionChange}>
          </merchello-token-autocomplete>
        </umb-property-layout>
      </uui-box>

      ${this._availableAttachments.length > 0 ? i`
            <uui-box headline="Attachments">
              <p class="attachments-description">
                Select files to attach to this email. Attachments are generated dynamically
                based on the notification data.
              </p>
              <div class="attachments-list">
                ${this._availableAttachments.map(
      (e) => i`
                    <label class="attachment-item">
                      <uui-checkbox
                        .checked=${(this._formData.attachmentAliases || []).includes(e.alias)}
                        @change=${(t) => {
        const a = t.target;
        this._handleAttachmentToggle(e.alias, a.checked);
      }}>
                      </uui-checkbox>
                      <div class="attachment-info">
                        ${e.iconSvg ? i`<span class="attachment-icon"><uui-icon name="icon-paperclip"></uui-icon></span>` : u}
                        <span class="attachment-name">${e.displayName}</span>
                        ${e.description ? i`<span class="attachment-description">${e.description}</span>` : u}
                      </div>
                    </label>
                  `
    )}
              </div>
            </uui-box>
          ` : this._formData.topic ? i`
              <uui-box headline="Attachments">
                <p class="no-attachments">No attachments available for this topic.</p>
              </uui-box>
            ` : u}

      ${this._availableTokens.length > 0 ? i`
            <uui-box headline="Available Tokens">
              <p class="tokens-description">
                These tokens are available for use in this email's expressions.
                Type <code>{{</code> in any expression field to see autocomplete suggestions.
              </p>
              <div class="tokens-list">
                ${this._availableTokens.map(
      (e) => i`
                    <div class="token-item">
                      <code class="token-path">{{${e.path}}}</code>
                      <span class="token-name">${e.displayName}</span>
                      ${e.description ? i`<span class="token-description">${e.description}</span>` : u}
                    </div>
                  `
    )}
              </div>
            </uui-box>
          ` : u}
    `;
  }
  render() {
    return !this._email || this._isLoadingMetadata ? i`<div class="loading"><uui-loader></uui-loader></div>` : i`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button
          slot="header"
          compact
          href=${this._getEmailsListHref()}
          label="Back to Emails"
          class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header: icon + name input -->
        <div id="header" slot="header">
          <umb-icon name="icon-mailbox"></umb-icon>
          <uui-input
            id="name-input"
            label="Email name"
            .value=${this._formData.name || ""}
            @input=${this._handleNameChange}
            placeholder="Enter email name..."
            ?invalid=${!!this._fieldErrors.name}>
          </uui-input>
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <!-- Router slot for URL tracking (hidden) -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <!-- Tab content -->
          <div class="tab-content">
            ${this._renderActiveTabContent()}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}>
            ${this._isSaving ? "Saving..." : this._isNew ? "Create Email" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
r.styles = [
  T`
      :host {
        display: block;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      #header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex: 1;
        padding: var(--uui-size-space-4) 0;
      }

      #header umb-icon {
        font-size: 24px;
        color: var(--uui-color-text-alt);
      }

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      #name-input[invalid] {
        --uui-input-border-color: var(--uui-color-danger);
      }

      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      uui-tab {
        overflow: visible;
      }

      uui-tab uui-badge {
        position: relative;
        top: -2px;
      }

      umb-router-slot {
        display: none;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
        padding: var(--uui-size-layout-1);
      }

      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      umb-property-layout uui-select {
        width: 100%;
      }

      .field-error {
        color: var(--uui-color-danger);
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-2);
      }

      .test-email-row {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
      }

      .test-email-row uui-input {
        flex: 1;
      }

      .tokens-description {
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-4);
      }

      .tokens-description code {
        background: var(--uui-color-surface-alt);
        padding: 2px 6px;
        border-radius: var(--uui-border-radius);
        font-family: monospace;
      }

      .tokens-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .token-item {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
        align-items: baseline;
        padding: var(--uui-size-space-2);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .token-path {
        font-family: monospace;
        font-size: var(--uui-type-small-size);
        background: var(--uui-color-surface);
        padding: 2px 6px;
        border-radius: var(--uui-border-radius);
        color: var(--uui-color-interactive);
      }

      .token-name {
        font-weight: 500;
      }

      .token-description {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        flex-basis: 100%;
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
      }

      .attachments-description {
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-4);
      }

      .attachments-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .attachment-item {
        display: flex;
        align-items: flex-start;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        cursor: pointer;
      }

      .attachment-item:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .attachment-info {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .attachment-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: var(--uui-color-interactive);
      }

      .attachment-icon svg {
        width: 20px;
        height: 20px;
      }

      .attachment-name {
        font-weight: 500;
      }

      .attachment-description {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        flex-basis: 100%;
        margin-left: 26px;
      }

      .no-attachments {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }
    `
];
c([
  n()
], r.prototype, "_email", 2);
c([
  n()
], r.prototype, "_formData", 2);
c([
  n()
], r.prototype, "_topicCategories", 2);
c([
  n()
], r.prototype, "_templates", 2);
c([
  n()
], r.prototype, "_availableTokens", 2);
c([
  n()
], r.prototype, "_availableAttachments", 2);
c([
  n()
], r.prototype, "_isSaving", 2);
c([
  n()
], r.prototype, "_isLoadingMetadata", 2);
c([
  n()
], r.prototype, "_activePath", 2);
c([
  n()
], r.prototype, "_routerPath", 2);
c([
  n()
], r.prototype, "_fieldErrors", 2);
c([
  n()
], r.prototype, "_isNew", 2);
c([
  n()
], r.prototype, "_testEmailRecipient", 2);
c([
  n()
], r.prototype, "_isSendingTest", 2);
r = c([
  w("merchello-email-editor")
], r);
const J = r;
export {
  r as MerchelloEmailEditorElement,
  J as default
};
//# sourceMappingURL=email-editor.element-C8UaeFfX.js.map
