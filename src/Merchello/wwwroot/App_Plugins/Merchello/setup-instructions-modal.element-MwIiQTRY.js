import { unsafeHTML as u, html as l, css as m, state as p, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
import { d, p as f } from "./purify.es-Cuv6u9x0.js";
import { m as b } from "./modal-layout.styles-C2OaUji5.js";
var w = Object.defineProperty, k = Object.getOwnPropertyDescriptor, c = (e, t, a, n) => {
  for (var o = n > 1 ? void 0 : n ? k(t, a) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (o = (n ? s(t, a, o) : s(o)) || o);
  return n && o && w(t, a, o), o;
};
let r = class extends h {
  constructor() {
    super(...arguments), this._renderedContent = "";
  }
  connectedCallback() {
    super.connectedCallback(), this._renderMarkdown();
  }
  async _renderMarkdown() {
    const e = this.data?.instructions ?? "";
    d.setOptions({
      breaks: !0,
      gfm: !0
    });
    const t = await d.parse(e);
    this._renderedContent = f.sanitize(t);
  }
  _handleClose() {
    this.modalContext?.submit();
  }
  render() {
    const e = this.data?.providerName ?? "Provider";
    return l`
      <umb-body-layout headline="${e} - Setup Instructions">
        <div id="main">
          <div class="markdown-content">
            ${u(this._renderedContent)}
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
};
r.styles = [
  b,
  m`
    :host {
      display: block;
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
  `
];
c([
  p()
], r.prototype, "_renderedContent", 2);
r = c([
  v("merchello-setup-instructions-modal")
], r);
const _ = r;
export {
  r as MerchelloSetupInstructionsModalElement,
  _ as default
};
//# sourceMappingURL=setup-instructions-modal.element-MwIiQTRY.js.map
