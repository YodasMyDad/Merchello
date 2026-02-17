import { LitElement as w, nothing as u, html as a, css as D, property as g, state as n, query as z, customElement as T } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as S } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as M, UMB_MODAL_MANAGER_CONTEXT as I } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as O } from "@umbraco-cms/backoffice/notification";
import { M as v } from "./merchello-api-Cd16th0c.js";
import { k as L, B as N } from "./navigation-DfYj5Lv5.js";
const R = new M("Merchello.Email.Preview.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var j = Object.defineProperty, F = Object.getOwnPropertyDescriptor, _ = (e, t, i, o) => {
  for (var s = o > 1 ? void 0 : o ? F(t, i) : t, p = e.length - 1, f; p >= 0; p--)
    (f = e[p]) && (s = (o ? f(t, i, s) : f(s)) || s);
  return o && s && j(t, i, s), s;
};
let d = class extends $(w) {
  constructor() {
    super(...arguments), this.value = "", this.tokens = [], this.placeholder = "", this.label = "Expression", this._showDropdown = !1, this._filteredTokens = [], this._selectedIndex = 0, this._cursorPosition = 0;
  }
  _handleInput(e) {
    const t = e.target, i = t.value;
    this._cursorPosition = t.selectionStart ?? 0, this.value = i, this._dispatchValueChanged(), this._checkForAutocomplete(i, this._cursorPosition);
  }
  _checkForAutocomplete(e, t) {
    const i = e.slice(0, t), o = i.lastIndexOf("{{"), s = i.lastIndexOf("}}");
    if (o > s && o !== -1) {
      const p = i.slice(o + 2);
      this._showAutocomplete(p);
    } else
      this._hideAutocomplete();
  }
  _showAutocomplete(e) {
    const t = e.toLowerCase().trim();
    t ? this._filteredTokens = this.tokens.filter(
      (i) => i.path.toLowerCase().includes(t) || i.displayName.toLowerCase().includes(t)
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
    const t = this.value, i = this._cursorPosition, s = t.slice(0, i).lastIndexOf("{{");
    if (s !== -1) {
      const p = t.slice(0, s), f = t.slice(i), P = `${p}{{${e.path}}}${f}`;
      this.value = P, this._dispatchValueChanged();
      const E = s + e.path.length + 4;
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
    return !this._showDropdown || this._filteredTokens.length === 0 ? u : a`
      <div class="dropdown">
        ${this._filteredTokens.map(
      (e, t) => a`
            <div
              class="dropdown-item ${t === this._selectedIndex ? "selected" : ""}"
              @click=${() => this._selectToken(e)}
              @mouseenter=${() => {
        this._selectedIndex = t;
      }}>
              <code class="token-path">{{${e.path}}}</code>
              <span class="token-name">${e.displayName}</span>
              ${e.description ? a`<span class="token-description">${e.description}</span>` : u}
            </div>
          `
    )}
      </div>
    `;
  }
  render() {
    return a`
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
  D`
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
_([
  g({ type: String })
], d.prototype, "value", 2);
_([
  g({ type: Array })
], d.prototype, "tokens", 2);
_([
  g({ type: String })
], d.prototype, "placeholder", 2);
_([
  g({ type: String })
], d.prototype, "label", 2);
_([
  n()
], d.prototype, "_showDropdown", 2);
_([
  n()
], d.prototype, "_filteredTokens", 2);
_([
  n()
], d.prototype, "_selectedIndex", 2);
_([
  n()
], d.prototype, "_cursorPosition", 2);
_([
  z("#input")
], d.prototype, "_inputElement", 2);
d = _([
  T("merchello-token-autocomplete")
], d);
var B = Object.defineProperty, U = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, c = (e, t, i, o) => {
  for (var s = o > 1 ? void 0 : o ? U(t, i) : t, p = e.length - 1, f; p >= 0; p--)
    (f = e[p]) && (s = (o ? f(t, i, s) : f(s)) || s);
  return o && s && B(t, i, s), s;
}, A = (e, t, i) => t.has(e) || C("Cannot " + i), l = (e, t, i) => (A(e, t, "read from private field"), t.get(e)), x = (e, t, i) => t.has(e) ? C("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), y = (e, t, i, o) => (A(e, t, "write to private field"), t.set(e, i), i), h, b, m;
function k() {
  return document.createElement("div");
}
let r = class extends $(w) {
  constructor() {
    super(), this._formData = {}, this._topicCategories = [], this._templates = [], this._availableTokens = [], this._availableAttachments = [], this._isSaving = !1, this._isLoadingMetadata = !0, this._activePath = "tab/details", this._routerPath = "", this._fieldErrors = {}, this._isNew = !0, this._testEmailRecipient = "", this._isSendingTest = !1, this._workspaceIsLoading = !1, this._workspaceError = null, x(this, h), x(this, b), x(this, m), this._routes = [
      { path: "tab/details", component: k },
      { path: "tab/advanced", component: k },
      { path: "", redirectTo: "tab/details" }
    ], this.consumeContext(S, (e) => {
      y(this, h, e), l(this, h) && (this._isNew = l(this, h).isNew, this.observe(l(this, h).email, (t) => {
        this._email = t, this._isNew = l(this, h)?.isNew ?? !0, t && (this._formData = { ...t }, t.topic && this._loadTokensForTopic(t.topic));
      }, "_email"), this.observe(l(this, h).isLoading, (t) => {
        this._workspaceIsLoading = t ?? !1;
      }, "_workspaceIsLoading"), this.observe(l(this, h).loadError, (t) => {
        this._workspaceError = t ?? null;
      }, "_workspaceError"));
    }), this.consumeContext(I, (e) => {
      y(this, b, e);
    }), this.consumeContext(O, (e) => {
      y(this, m, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadMetadata();
  }
  async _loadMetadata() {
    this._isLoadingMetadata = !0;
    const [e, t] = await Promise.all([
      v.getEmailTopicsGrouped(),
      v.getEmailTemplates()
    ]);
    e.data && (this._topicCategories = e.data), t.data && (this._templates = t.data), this._isLoadingMetadata = !1;
  }
  async _loadTokensForTopic(e) {
    const [t, i] = await Promise.all([
      v.getTopicTokens(e),
      v.getTopicAttachments(e)
    ]);
    t.data && (this._availableTokens = t.data), i.data ? this._availableAttachments = i.data : this._availableAttachments = [];
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
    const i = e.target.value;
    this._formData = { ...this._formData, topic: i, attachmentAliases: [] }, this._clearFieldError("topic"), i ? this._loadTokensForTopic(i) : (this._availableTokens = [], this._availableAttachments = []);
  }
  _handleAttachmentToggle(e, t) {
    const i = this._formData.attachmentAliases || [];
    t ? this._formData = {
      ...this._formData,
      attachmentAliases: [...i, e]
    } : this._formData = {
      ...this._formData,
      attachmentAliases: i.filter((o) => o !== e)
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
      const { [e]: t, ...i } = this._fieldErrors;
      this._fieldErrors = i;
    }
  }
  _validate() {
    const e = {};
    return this._formData.name?.trim() || (e.name = "Name is required"), this._formData.topic || (e.topic = "Topic is required"), this._formData.templatePath || (e.templatePath = "Template is required"), this._formData.toExpression?.trim() || (e.toExpression = "To expression is required"), this._formData.subjectExpression?.trim() || (e.subjectExpression = "Subject expression is required"), this._fieldErrors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) {
      l(this, m)?.peek("warning", {
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
        }, { data: t, error: i } = await v.createEmailConfiguration(e);
        if (i) {
          l(this, m)?.peek("danger", {
            data: { headline: "Create failed", message: i.message }
          });
          return;
        }
        if (t) {
          const { data: o } = await v.getEmailConfiguration(t.id);
          o && l(this, h)?.updateEmail(o), l(this, m)?.peek("positive", {
            data: { headline: "Email created", message: `"${t.name}" has been created.` }
          }), L(t.id);
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
        }, { data: t, error: i } = await v.updateEmailConfiguration(this._email.id, e);
        if (i) {
          l(this, m)?.peek("danger", {
            data: { headline: "Update failed", message: i.message }
          });
          return;
        }
        if (t) {
          const { data: o } = await v.getEmailConfiguration(t.id);
          o && l(this, h)?.updateEmail(o), l(this, m)?.peek("positive", {
            data: { headline: "Email saved", message: "Changes have been saved." }
          });
        }
      }
    } finally {
      this._isSaving = !1;
    }
  }
  async _handlePreview() {
    this._email?.id && l(this, b)?.open(this, R, {
      data: { configurationId: this._email.id }
    });
  }
  async _handleSendTest() {
    if (!this._email?.id || !this._testEmailRecipient.trim()) return;
    this._isSendingTest = !0;
    const { data: e, error: t } = await v.sendTestEmail(this._email.id, {
      recipient: this._testEmailRecipient.trim()
    });
    if (this._isSendingTest = !1, t) {
      l(this, m)?.peek("danger", {
        data: { headline: "Test failed", message: t.message }
      });
      return;
    }
    e?.success ? (l(this, m)?.peek("positive", {
      data: { headline: "Test sent", message: `Test email sent to ${e.recipient}` }
    }), this._testEmailRecipient = "") : l(this, m)?.peek("danger", {
      data: { headline: "Test failed", message: e?.errorMessage || "Unknown error" }
    });
  }
  _getEmailsListHref() {
    return N();
  }
  _hasDetailsErrors() {
    return !!(this._fieldErrors.name || this._fieldErrors.topic || this._fieldErrors.templatePath || this._fieldErrors.toExpression || this._fieldErrors.subjectExpression);
  }
  _renderTabs() {
    return a`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${this._activePath.includes("tab/details")}>
          Details
          ${this._hasDetailsErrors() ? a`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : u}
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
      for (const i of t.topics)
        e.push({
          name: `${t.category} - ${i.displayName}`,
          value: i.topic,
          selected: this._formData.topic === i.topic
        });
    return a`
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
    return a`
      <uui-select label="Template" .options=${e} @change=${this._handleTemplateChange}></uui-select>
    `;
  }
  _renderDetailsTab() {
    return a`
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
            ${this._fieldErrors.topic ? a`<div class="field-error">${this._fieldErrors.topic}</div>` : u}
          </div>
        </umb-property-layout>

        <umb-property-layout label="Template" description="The email template file to use" mandatory>
          <div slot="editor">
            ${this._renderTemplateOptions()}
            ${this._fieldErrors.templatePath ? a`<div class="field-error">${this._fieldErrors.templatePath}</div>` : u}
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
            ${this._fieldErrors.toExpression ? a`<div class="field-error">${this._fieldErrors.toExpression}</div>` : u}
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
            ${this._fieldErrors.subjectExpression ? a`<div class="field-error">${this._fieldErrors.subjectExpression}</div>` : u}
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

      ${this._isNew ? u : a`
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
    return a`
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

      ${this._availableAttachments.length > 0 ? a`
            <uui-box headline="Attachments">
              <p class="attachments-description">
                Select files to attach to this email. Attachments are generated dynamically
                based on the notification data.
              </p>
              <div class="attachments-list">
                ${this._availableAttachments.map(
      (e) => a`
                    <label class="attachment-item">
                      <uui-checkbox
                        .checked=${(this._formData.attachmentAliases || []).includes(e.alias)}
                        @change=${(t) => {
        const i = t.target;
        this._handleAttachmentToggle(e.alias, i.checked);
      }}>
                      </uui-checkbox>
                      <div class="attachment-info">
                        ${e.iconSvg ? a`<span class="attachment-icon"><uui-icon name="icon-paperclip"></uui-icon></span>` : u}
                        <span class="attachment-name">${e.displayName}</span>
                        ${e.description ? a`<span class="attachment-description">${e.description}</span>` : u}
                      </div>
                    </label>
                  `
    )}
              </div>
            </uui-box>
          ` : this._formData.topic ? a`
              <uui-box headline="Attachments">
                <p class="no-attachments">No attachments available for this topic.</p>
              </uui-box>
            ` : u}

      ${this._availableTokens.length > 0 ? a`
            <uui-box headline="Available Tokens">
              <p class="tokens-description">
                These tokens are available for use in this email's expressions.
                Type <code>{{</code> in any expression field to see autocomplete suggestions.
              </p>
              <div class="tokens-list">
                ${this._availableTokens.map(
      (e) => a`
                    <div class="token-item">
                      <code class="token-path">{{${e.path}}}</code>
                      <span class="token-name">${e.displayName}</span>
                      ${e.description ? a`<span class="token-description">${e.description}</span>` : u}
                    </div>
                  `
    )}
              </div>
            </uui-box>
          ` : u}
    `;
  }
  render() {
    return this._workspaceIsLoading || this._isLoadingMetadata ? a`<div class="loading"><uui-loader></uui-loader></div>` : this._workspaceError ? a`
        <div class="load-error">
          <uui-icon name="icon-alert"></uui-icon>
          <h2>Unable to load email configuration</h2>
          <p>${this._workspaceError}</p>
          <uui-button look="secondary" href=${this._getEmailsListHref()} label="Back to Emails">
            Back to Emails
          </uui-button>
        </div>
      ` : this._email ? a`
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
    ` : a`
        <div class="load-error">
          <uui-icon name="icon-alert"></uui-icon>
          <h2>Email configuration not found</h2>
          <p>The requested email configuration could not be found.</p>
          <uui-button look="secondary" href=${this._getEmailsListHref()} label="Back to Emails">
            Back to Emails
          </uui-button>
        </div>
      `;
  }
};
h = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
r.styles = [
  D`
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

      .load-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--uui-size-space-2);
        text-align: center;
        height: 100%;
        padding: var(--uui-size-layout-1);
      }

      .load-error h2 {
        margin: 0;
      }

      .load-error p {
        margin: 0 0 var(--uui-size-space-3);
        color: var(--uui-color-text-alt);
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
c([
  n()
], r.prototype, "_workspaceIsLoading", 2);
c([
  n()
], r.prototype, "_workspaceError", 2);
r = c([
  T("merchello-email-editor")
], r);
const J = r;
export {
  r as MerchelloEmailEditorElement,
  J as default
};
//# sourceMappingURL=email-editor.element-D-WIZZqE.js.map
