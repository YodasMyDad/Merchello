import { unsafeHTML as l, html as d, css as h, state as p, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { d as c, p as b } from "./purify.es-Cuv6u9x0.js";
var f = Object.defineProperty, y = Object.getOwnPropertyDescriptor, u = (o, r, n, a) => {
  for (var e = a > 1 ? void 0 : a ? y(r, n) : r, s = o.length - 1, i; s >= 0; s--)
    (i = o[s]) && (e = (a ? i(r, n, e) : i(e)) || e);
  return a && e && f(r, n, e), e;
};
const v = `
## Headers

Every webhook request includes these headers:

| Header | Description |
|--------|-------------|
| \`X-Merchello-Hmac-SHA256\` | HMAC-SHA256 signature (when using HMAC-SHA256 auth) |
| \`X-Merchello-Hmac-SHA512\` | HMAC-SHA512 signature (when using HMAC-SHA512 auth) |
| \`X-Merchello-Topic\` | Event type (e.g., \`order.created\`) |
| \`X-Merchello-Delivery-Id\` | Unique ID for this delivery |
| \`X-Merchello-Timestamp\` | Unix timestamp when sent |
| \`Content-Type\` | \`application/json\` |
| \`User-Agent\` | \`Merchello-Webhooks/1.0\` |

---

## Verifying Signatures

To verify a webhook is genuinely from Merchello and hasn't been tampered with:

1. Get the signature from the \`X-Merchello-Hmac-SHA256\` header
2. Compute HMAC-SHA256 of the **raw request body** using your secret
3. Compare the signatures using constant-time comparison

### C# Example

\`\`\`csharp
using System.Security.Cryptography;
using System.Text;

public bool VerifyWebhook(string body, string signature, string secret)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
    var expected = Convert.ToBase64String(hash);
    return signature == expected;
}

// Usage in ASP.NET Core
[HttpPost("webhook")]
public async Task<IActionResult> HandleWebhook()
{
    using var reader = new StreamReader(Request.Body);
    var body = await reader.ReadToEndAsync();
    var signature = Request.Headers["X-Merchello-Hmac-SHA256"].FirstOrDefault();

    if (!VerifyWebhook(body, signature, _webhookSecret))
        return Unauthorized();

    // Process the webhook...
    return Ok();
}
\`\`\`

### Node.js Example

\`\`\`javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Usage in Express
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-merchello-hmac-sha256'];
  const body = req.body.toString();

  if (!verifyWebhook(body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(body);
  // Process the webhook...
  res.status(200).send('OK');
});
\`\`\`

### Python Example

\`\`\`python
import hmac
import hashlib
import base64

def verify_webhook(body: str, signature: str, secret: str) -> bool:
    expected = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha256
        ).digest()
    ).decode('utf-8')
    return hmac.compare_digest(signature, expected)

# Usage in Flask
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Merchello-Hmac-SHA256')
    body = request.get_data(as_text=True)

    if not verify_webhook(body, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401

    payload = request.get_json()
    # Process the webhook...
    return 'OK', 200
\`\`\`

---

## Payload Structure

\`\`\`json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "topic": "order.created",
  "timestamp": "2024-01-09T12:00:00Z",
  "apiVersion": "2024-01",
  "data": {
    // Event-specific data
  }
}
\`\`\`

---

## Best Practices

1. **Always verify signatures** - Never process webhooks without validating the HMAC signature first

2. **Respond quickly** - Return a 2xx status within 5 seconds. Queue the webhook for background processing if needed

3. **Handle retries** - Merchello retries failed deliveries with exponential backoff. Use the \`X-Merchello-Delivery-Id\` header to detect and ignore duplicates

4. **Use HTTPS** - Always use HTTPS endpoints to protect the webhook payload in transit

5. **Log everything** - Keep logs of received webhooks for debugging and auditing
`;
let t = class extends g {
  constructor() {
    super(...arguments), this._renderedContent = "";
  }
  connectedCallback() {
    super.connectedCallback(), this._renderMarkdown();
  }
  async _renderMarkdown() {
    c.setOptions({
      breaks: !0,
      gfm: !0
    });
    const o = await c.parse(v);
    this._renderedContent = b.sanitize(o);
  }
  _handleClose() {
    this.modalContext?.submit();
  }
  render() {
    return d`
      <umb-body-layout headline="Webhook Integration Guide">
        <div id="main">
          <uui-box>
            <div class="markdown-content">
              ${this._renderedContent ? l(this._renderedContent) : d`<div class="loading"><uui-loader></uui-loader></div>`}
            </div>
          </uui-box>
        </div>

        <uui-button slot="actions" label="Close" look="secondary" @click=${this._handleClose}>
          Close
        </uui-button>
      </umb-body-layout>
    `;
  }
};
t.styles = h`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
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

    .markdown-content h2 {
      font-size: 1.25rem;
      border-bottom: 1px solid var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
    }

    .markdown-content h3 {
      font-size: 1.1rem;
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
      font-family: var(--uui-font-monospace, monospace);
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

    .markdown-content hr {
      border: none;
      border-top: 1px solid var(--uui-color-border);
      margin: var(--uui-size-space-5) 0;
    }

    .markdown-content strong {
      font-weight: 600;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }
  `;
u([
  p()
], t.prototype, "_renderedContent", 2);
t = u([
  m("merchello-webhook-integration-guide-modal")
], t);
const H = t;
export {
  t as MerchelloWebhookIntegrationGuideModalElement,
  H as default
};
//# sourceMappingURL=webhook-integration-guide-modal.element-DX6ep0bN.js.map
