import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { EmailPreviewDto } from "@email/types/email.types.js";
import type { EmailPreviewModalData, EmailPreviewModalValue } from "@email/modals/email-preview-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-email-preview-modal")
export class MerchelloEmailPreviewModalElement extends UmbModalBaseElement<
  EmailPreviewModalData,
  EmailPreviewModalValue
> {
  @state() private _preview: EmailPreviewDto | null = null;
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _testRecipient = "";
  @state() private _isSendingTest = false;

  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadPreview();
  }

  private async _loadPreview(): Promise<void> {
    if (!this.data?.configurationId) {
      this._errorMessage = "No configuration ID provided";
      this._isLoading = false;
      return;
    }

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.previewEmail(this.data.configurationId);

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._preview = data;
      if (!data.success && data.errorMessage) {
        this._errorMessage = data.errorMessage;
      }
    }

    this._isLoading = false;
  }

  private async _handleSendTest(): Promise<void> {
    if (!this.data?.configurationId || !this._testRecipient.trim()) return;

    this._isSendingTest = true;

    const { data, error } = await MerchelloApi.sendTestEmail(this.data.configurationId, {
      recipient: this._testRecipient.trim(),
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
      this.value = { testSent: true };
      this._testRecipient = "";
    } else {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Test failed", message: data?.errorMessage || "Unknown error" },
      });
    }
  }

  private _handleClose(): void {
    this.modalContext?.submit();
  }

  private _renderLoadingState(): unknown {
    return html`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading preview...</span>
      </div>
    `;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderWarnings(): unknown {
    if (!this._preview?.warnings.length) return nothing;

    return html`
      <div class="warnings">
        <strong>Warnings:</strong>
        <ul>
          ${this._preview.warnings.map((warning) => html`<li>${warning}</li>`)}
        </ul>
      </div>
    `;
  }

  private _renderEmailHeaders(): unknown {
    if (!this._preview) return nothing;

    return html`
      <div class="email-headers">
        <div class="header-row">
          <span class="header-label">From:</span>
          <span class="header-value">${this._preview.from || "—"}</span>
        </div>
        <div class="header-row">
          <span class="header-label">To:</span>
          <span class="header-value">${this._preview.to || "—"}</span>
        </div>
        ${this._preview.cc
          ? html`
              <div class="header-row">
                <span class="header-label">CC:</span>
                <span class="header-value">${this._preview.cc}</span>
              </div>
            `
          : nothing}
        ${this._preview.bcc
          ? html`
              <div class="header-row">
                <span class="header-label">BCC:</span>
                <span class="header-value">${this._preview.bcc}</span>
              </div>
            `
          : nothing}
        <div class="header-row">
          <span class="header-label">Subject:</span>
          <span class="header-value subject">${this._preview.subject || "—"}</span>
        </div>
      </div>
    `;
  }

  private _renderEmailBody(): unknown {
    if (!this._preview?.body) {
      return html`
        <div class="no-body">
          <p>No email body available for preview.</p>
        </div>
      `;
    }

    return html`
      <div class="email-body-container">
        <iframe
          sandbox="allow-same-origin"
          .srcdoc=${this._preview.body}
          title="Email Preview">
        </iframe>
      </div>
    `;
  }

  private _renderTestSection(): unknown {
    return html`
      <div class="test-section">
        <h4>Send Test Email</h4>
        <div class="test-row">
          <uui-input
            type="email"
            .value=${this._testRecipient}
            @input=${(e: Event) => {
              this._testRecipient = (e.target as HTMLInputElement).value;
            }}
            placeholder="Enter recipient email..."
            label="Test recipient">
          </uui-input>
          <uui-button
            look="secondary"
            ?disabled=${!this._testRecipient.trim() || this._isSendingTest}
            @click=${this._handleSendTest}>
            ${this._isSendingTest ? "Sending..." : "Send Test"}
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }

    return html`
      ${this._errorMessage ? this._renderErrorState() : nothing}
      ${this._renderWarnings()}
      ${this._renderEmailHeaders()}
      ${this._renderEmailBody()}
      ${this._renderTestSection()}
    `;
  }

  override render() {
    return html`
      <umb-body-layout headline="Email Preview">
        <div id="main">
          ${this._renderContent()}
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Close" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
      :host {
        display: block;
        height: 100%;
      }

      #main {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
        height: 100%;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }

      .warnings {
        padding: var(--uui-size-space-3);
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
        border-radius: var(--uui-border-radius);
      }

      .warnings ul {
        margin: var(--uui-size-space-2) 0 0 0;
        padding-left: var(--uui-size-space-5);
      }

      .email-headers {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
      }

      .header-row {
        display: flex;
        gap: var(--uui-size-space-3);
      }

      .header-label {
        min-width: 60px;
        font-weight: 600;
        color: var(--uui-color-text-alt);
      }

      .header-value {
        word-break: break-all;
      }

      .header-value.subject {
        font-weight: 500;
      }

      .email-body-container {
        flex: 1;
        min-height: 300px;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .email-body-container iframe {
        width: 100%;
        height: 100%;
        min-height: 300px;
        border: none;
        background: white;
      }

      .no-body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        color: var(--uui-color-text-alt);
      }

      .test-section {
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
      }

      .test-section h4 {
        margin: 0 0 var(--uui-size-space-3) 0;
        font-size: var(--uui-type-default-size);
      }

      .test-row {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
      }

      .test-row uui-input {
        flex: 1;
      }
    `,
  ];
}

export default MerchelloEmailPreviewModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-email-preview-modal": MerchelloEmailPreviewModalElement;
  }
}

