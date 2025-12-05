import { html, css, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type {
  SetupInstructionsModalData,
  SetupInstructionsModalValue,
} from "./setup-instructions-modal.token.js";

@customElement("merchello-setup-instructions-modal")
export class MerchelloSetupInstructionsModalElement extends UmbModalBaseElement<
  SetupInstructionsModalData,
  SetupInstructionsModalValue
> {
  @state() private _renderedContent: string = "";

  connectedCallback(): void {
    super.connectedCallback();
    this._renderMarkdown();
  }

  private async _renderMarkdown(): Promise<void> {
    const instructions = this.data?.instructions ?? "";
    
    // Configure marked for safe rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    const parsed = await marked.parse(instructions);
    // Sanitize the HTML to prevent XSS attacks
    this._renderedContent = DOMPurify.sanitize(parsed);
  }

  private _handleClose(): void {
    this.modalContext?.submit();
  }

  render() {
    const providerName = this.data?.providerName ?? "Provider";

    return html`
      <umb-body-layout headline="${providerName} - Setup Instructions">
        <div id="main">
          <div class="markdown-content">
            ${unsafeHTML(this._renderedContent)}
          </div>
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="primary"
            @click=${this._handleClose}
          >
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    #main {
      padding: var(--uui-size-space-4);
    }

    .markdown-content {
      line-height: 1.6;
      color: var(--uui-color-text);
    }

    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3 {
      margin-top: var(--uui-size-space-5);
      margin-bottom: var(--uui-size-space-3);
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .markdown-content h1:first-child,
    .markdown-content h2:first-child,
    .markdown-content h3:first-child {
      margin-top: 0;
    }

    .markdown-content h1 {
      font-size: 1.5rem;
      border-bottom: 1px solid var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
    }

    .markdown-content h2 {
      font-size: 1.25rem;
    }

    .markdown-content h3 {
      font-size: 1.1rem;
    }

    .markdown-content h4 {
      font-size: 1rem;
      font-weight: 600;
      margin-top: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-2);
    }

    .markdown-content p {
      margin: var(--uui-size-space-3) 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: var(--uui-size-space-3) 0;
      padding-left: var(--uui-size-space-6);
    }

    .markdown-content li {
      margin: var(--uui-size-space-2) 0;
    }

    .markdown-content code {
      background: var(--uui-color-surface-alt);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
      font-size: 0.875em;
    }

    .markdown-content pre {
      background: var(--uui-color-surface-alt);
      padding: var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
      margin: var(--uui-size-space-4) 0;
    }

    .markdown-content pre code {
      background: none;
      padding: 0;
      font-size: 0.85em;
      line-height: 1.5;
    }

    .markdown-content a {
      color: var(--uui-color-interactive);
      text-decoration: none;
    }

    .markdown-content a:hover {
      text-decoration: underline;
    }

    .markdown-content table {
      width: 100%;
      border-collapse: collapse;
      margin: var(--uui-size-space-4) 0;
    }

    .markdown-content th,
    .markdown-content td {
      border: 1px solid var(--uui-color-border);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      text-align: left;
    }

    .markdown-content th {
      background: var(--uui-color-surface-alt);
      font-weight: 600;
    }

    .markdown-content blockquote {
      border-left: 3px solid var(--uui-color-border-emphasis);
      margin: var(--uui-size-space-4) 0;
      padding-left: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    .markdown-content hr {
      border: none;
      border-top: 1px solid var(--uui-color-border);
      margin: var(--uui-size-space-5) 0;
    }

    .markdown-content strong {
      font-weight: 600;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloSetupInstructionsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-setup-instructions-modal": MerchelloSetupInstructionsModalElement;
  }
}

