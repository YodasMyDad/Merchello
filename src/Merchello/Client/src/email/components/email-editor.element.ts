import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbRoute, UmbRouterSlotInitEvent, UmbRouterSlotChangeEvent } from "@umbraco-cms/backoffice/router";
import type {
  EmailConfigurationDetailDto,
  EmailTopicCategoryDto,
  EmailTemplateDto,
  TokenInfoDto,
  CreateEmailConfigurationDto,
  UpdateEmailConfigurationDto,
} from "@email/types/email.types.js";
import type { MerchelloEmailsWorkspaceContext } from "../contexts/email-workspace.context.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { navigateToEmailDetail, getEmailsListHref } from "@shared/utils/navigation.js";
import { MERCHELLO_EMAIL_PREVIEW_MODAL } from "../modals/email-preview-modal.token.js";
import "./token-autocomplete.element.js";

function stubComponent(): HTMLElement {
  return document.createElement("div");
}

@customElement("merchello-email-editor")
export class MerchelloEmailEditorElement extends UmbElementMixin(LitElement) {
  @state() private _email: EmailConfigurationDetailDto | undefined;
  @state() private _formData: Partial<EmailConfigurationDetailDto> = {};
  @state() private _topicCategories: EmailTopicCategoryDto[] = [];
  @state() private _templates: EmailTemplateDto[] = [];
  @state() private _availableTokens: TokenInfoDto[] = [];
  @state() private _isSaving = false;
  @state() private _isLoadingMetadata = true;
  @state() private _activePath = "tab/details";
  @state() private _routerPath = "";
  @state() private _fieldErrors: Record<string, string> = {};
  @state() private _isNew = true;
  @state() private _testEmailRecipient = "";
  @state() private _isSendingTest = false;

  #workspaceContext?: MerchelloEmailsWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  private _routes: UmbRoute[] = [
    { path: "tab/details", component: stubComponent },
    { path: "tab/advanced", component: stubComponent },
    { path: "", redirectTo: "tab/details" },
  ];

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloEmailsWorkspaceContext;
      if (!this.#workspaceContext) return;
      this._isNew = this.#workspaceContext.isNew;
      this.observe(this.#workspaceContext.email, (email) => {
        this._email = email;
        this._isNew = this.#workspaceContext?.isNew ?? true;
        if (email) {
          this._formData = { ...email };
          // Load tokens for the selected topic
          if (email.topic) {
            this._loadTokensForTopic(email.topic);
          }
        }
      }, '_email');
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadMetadata();
  }

  private async _loadMetadata(): Promise<void> {
    this._isLoadingMetadata = true;

    const [categoriesResult, templatesResult] = await Promise.all([
      MerchelloApi.getEmailTopicsGrouped(),
      MerchelloApi.getEmailTemplates(),
    ]);

    if (categoriesResult.data) {
      this._topicCategories = categoriesResult.data;
    }
    if (templatesResult.data) {
      this._templates = templatesResult.data;
    }

    this._isLoadingMetadata = false;
  }

  private async _loadTokensForTopic(topic: string): Promise<void> {
    const { data } = await MerchelloApi.getTopicTokens(topic);
    if (data) {
      this._availableTokens = data;
    }
  }

  private _handleNameChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this._formData = { ...this._formData, name: input.value };
    this._clearFieldError("name");
  }

  private _handleDescriptionChange(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this._formData = { ...this._formData, description: textarea.value || null };
  }

  private _handleTopicChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const topic = select.value;
    this._formData = { ...this._formData, topic };
    this._clearFieldError("topic");
    // Load tokens for the new topic
    if (topic) {
      this._loadTokensForTopic(topic);
    } else {
      this._availableTokens = [];
    }
  }

  private _handleTemplateChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._formData = { ...this._formData, templatePath: select.value };
    this._clearFieldError("templatePath");
  }

  private _handleToExpressionChange(e: CustomEvent<{ value: string }>): void {
    this._formData = { ...this._formData, toExpression: e.detail.value };
    this._clearFieldError("toExpression");
  }

  private _handleSubjectExpressionChange(e: CustomEvent<{ value: string }>): void {
    this._formData = { ...this._formData, subjectExpression: e.detail.value };
    this._clearFieldError("subjectExpression");
  }

  private _handleFromExpressionChange(e: CustomEvent<{ value: string }>): void {
    this._formData = { ...this._formData, fromExpression: e.detail.value || null };
  }

  private _handleCcExpressionChange(e: CustomEvent<{ value: string }>): void {
    this._formData = { ...this._formData, ccExpression: e.detail.value || null };
  }

  private _handleBccExpressionChange(e: CustomEvent<{ value: string }>): void {
    this._formData = { ...this._formData, bccExpression: e.detail.value || null };
  }

  private _handleEnabledChange(e: Event): void {
    const toggle = e.target as HTMLInputElement;
    this._formData = { ...this._formData, enabled: toggle.checked };
  }

  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath ?? "";
  }

  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  private _clearFieldError(field: string): void {
    if (this._fieldErrors[field]) {
      const { [field]: _, ...rest } = this._fieldErrors;
      this._fieldErrors = rest;
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._formData.name?.trim()) {
      errors.name = "Name is required";
    }
    if (!this._formData.topic) {
      errors.topic = "Topic is required";
    }
    if (!this._formData.templatePath) {
      errors.templatePath = "Template is required";
    }
    if (!this._formData.toExpression?.trim()) {
      errors.toExpression = "To expression is required";
    }
    if (!this._formData.subjectExpression?.trim()) {
      errors.subjectExpression = "Subject expression is required";
    }

    this._fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation error", message: "Please fix the errors before saving." },
      });
      return;
    }

    this._isSaving = true;

    try {
      if (this._isNew) {
        const createDto: CreateEmailConfigurationDto = {
          name: this._formData.name!,
          topic: this._formData.topic!,
          templatePath: this._formData.templatePath!,
          toExpression: this._formData.toExpression!,
          subjectExpression: this._formData.subjectExpression!,
          enabled: this._formData.enabled ?? true,
          ccExpression: this._formData.ccExpression,
          bccExpression: this._formData.bccExpression,
          fromExpression: this._formData.fromExpression,
          description: this._formData.description,
        };

        const { data, error } = await MerchelloApi.createEmailConfiguration(createDto);

        if (error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Create failed", message: error.message },
          });
          return;
        }

        if (data) {
          // Reload the full detail
          const { data: detail } = await MerchelloApi.getEmailConfiguration(data.id);
          if (detail) {
            this.#workspaceContext?.updateEmail(detail);
          }
          this.#notificationContext?.peek("positive", {
            data: { headline: "Email created", message: `"${data.name}" has been created.` },
          });
          navigateToEmailDetail(data.id);
        }
      } else {
        const updateDto: UpdateEmailConfigurationDto = {
          name: this._formData.name!,
          topic: this._formData.topic!,
          templatePath: this._formData.templatePath!,
          toExpression: this._formData.toExpression!,
          subjectExpression: this._formData.subjectExpression!,
          enabled: this._formData.enabled ?? true,
          ccExpression: this._formData.ccExpression,
          bccExpression: this._formData.bccExpression,
          fromExpression: this._formData.fromExpression,
          description: this._formData.description,
        };

        const { data, error } = await MerchelloApi.updateEmailConfiguration(this._email!.id, updateDto);

        if (error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Update failed", message: error.message },
          });
          return;
        }

        if (data) {
          // Reload the full detail
          const { data: detail } = await MerchelloApi.getEmailConfiguration(data.id);
          if (detail) {
            this.#workspaceContext?.updateEmail(detail);
          }
          this.#notificationContext?.peek("positive", {
            data: { headline: "Email saved", message: "Changes have been saved." },
          });
        }
      }
    } finally {
      this._isSaving = false;
    }
  }

  private async _handlePreview(): Promise<void> {
    if (!this._email?.id) return;

    this.#modalManager?.open(this, MERCHELLO_EMAIL_PREVIEW_MODAL, {
      data: { configurationId: this._email.id },
    });
  }

  private async _handleSendTest(): Promise<void> {
    if (!this._email?.id || !this._testEmailRecipient.trim()) return;

    this._isSendingTest = true;

    const { data, error } = await MerchelloApi.sendTestEmail(this._email.id, {
      recipient: this._testEmailRecipient.trim(),
    });

    this._isSendingTest = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Test failed", message: error.message },
      });
      return;
    }

    if (data?.success) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Test sent", message: `Test email sent to ${data.recipient}` },
      });
      this._testEmailRecipient = "";
    } else {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Test failed", message: data?.errorMessage || "Unknown error" },
      });
    }
  }

  private _getEmailsListHref(): string {
    return getEmailsListHref();
  }

  private _hasDetailsErrors(): boolean {
    return !!(
      this._fieldErrors.name ||
      this._fieldErrors.topic ||
      this._fieldErrors.templatePath ||
      this._fieldErrors.toExpression ||
      this._fieldErrors.subjectExpression
    );
  }

  private _renderTabs(): unknown {
    return html`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${this._activePath.includes("tab/details")}>
          Details
          ${this._hasDetailsErrors()
            ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>`
            : nothing}
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

  private _renderActiveTabContent(): unknown {
    if (this._activePath.includes("tab/advanced")) {
      return this._renderAdvancedTab();
    }
    return this._renderDetailsTab();
  }

  private _renderTopicOptions(): unknown {
    const options: Array<{ name: string; value: string; selected: boolean }> = [
      { name: "Select a topic...", value: "", selected: !this._formData.topic },
    ];

    for (const category of this._topicCategories) {
      for (const topic of category.topics) {
        options.push({
          name: `${category.category} - ${topic.displayName}`,
          value: topic.topic,
          selected: this._formData.topic === topic.topic,
        });
      }
    }

    return html`
      <uui-select .options=${options} @change=${this._handleTopicChange}></uui-select>
    `;
  }

  private _renderTemplateOptions(): unknown {
    const options: Array<{ name: string; value: string; selected: boolean }> = [
      { name: "Select a template...", value: "", selected: !this._formData.templatePath },
    ];

    for (const template of this._templates) {
      options.push({
        name: template.displayName,
        value: template.path,
        selected: this._formData.templatePath === template.path,
      });
    }

    return html`
      <uui-select .options=${options} @change=${this._handleTemplateChange}></uui-select>
    `;
  }

  private _renderDetailsTab(): unknown {
    return html`
      <uui-box headline="Email Configuration">
        <umb-property-layout label="Description" description="Optional description for this email">
          <uui-textarea
            slot="editor"
            .value=${this._formData.description || ""}
            @input=${this._handleDescriptionChange}
            placeholder="Describe when this email is sent...">
          </uui-textarea>
        </umb-property-layout>

        <umb-property-layout label="Topic" description="The notification event that triggers this email" mandatory>
          <div slot="editor">
            ${this._renderTopicOptions()}
            ${this._fieldErrors.topic
              ? html`<div class="field-error">${this._fieldErrors.topic}</div>`
              : nothing}
          </div>
        </umb-property-layout>

        <umb-property-layout label="Template" description="The email template file to use" mandatory>
          <div slot="editor">
            ${this._renderTemplateOptions()}
            ${this._fieldErrors.templatePath
              ? html`<div class="field-error">${this._fieldErrors.templatePath}</div>`
              : nothing}
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
            ${this._fieldErrors.toExpression
              ? html`<div class="field-error">${this._fieldErrors.toExpression}</div>`
              : nothing}
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
            ${this._fieldErrors.subjectExpression
              ? html`<div class="field-error">${this._fieldErrors.subjectExpression}</div>`
              : nothing}
          </div>
        </umb-property-layout>

        <umb-property-layout label="Enabled" description="Enable or disable this email">
          <uui-toggle
            slot="editor"
            .checked=${this._formData.enabled ?? true}
            @change=${this._handleEnabledChange}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>

      ${!this._isNew
        ? html`
            <uui-box headline="Test Email">
              <div class="test-email-row">
                <uui-input
                  type="email"
                  .value=${this._testEmailRecipient}
                  @input=${(e: Event) => {
                    this._testEmailRecipient = (e.target as HTMLInputElement).value;
                  }}
                  placeholder="Enter recipient email..."
                  label="Test recipient">
                </uui-input>
                <uui-button
                  look="secondary"
                  ?disabled=${!this._testEmailRecipient.trim() || this._isSendingTest}
                  @click=${this._handleSendTest}>
                  ${this._isSendingTest ? "Sending..." : "Send Test"}
                </uui-button>
                <uui-button look="secondary" @click=${this._handlePreview}>
                  <uui-icon name="icon-eye"></uui-icon>
                  Preview
                </uui-button>
              </div>
            </uui-box>
          `
        : nothing}
    `;
  }

  private _renderAdvancedTab(): unknown {
    return html`
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

      ${this._availableTokens.length > 0
        ? html`
            <uui-box headline="Available Tokens">
              <p class="tokens-description">
                These tokens are available for use in this email's expressions.
                Type <code>{{</code> in any expression field to see autocomplete suggestions.
              </p>
              <div class="tokens-list">
                ${this._availableTokens.map(
                  (token) => html`
                    <div class="token-item">
                      <code class="token-path">{{${token.path}}}</code>
                      <span class="token-name">${token.displayName}</span>
                      ${token.description
                        ? html`<span class="token-description">${token.description}</span>`
                        : nothing}
                    </div>
                  `
                )}
              </div>
            </uui-box>
          `
        : nothing}
    `;
  }

  override render() {
    if (!this._email || this._isLoadingMetadata) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    return html`
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

  static override readonly styles = [
    css`
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
    `,
  ];
}

export default MerchelloEmailEditorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-email-editor": MerchelloEmailEditorElement;
  }
}
