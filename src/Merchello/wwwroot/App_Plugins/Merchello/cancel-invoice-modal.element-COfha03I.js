import { nothing as d, html as u, css as v, state as c, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as p } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-Z_Hs6xGH.js";
var h = Object.defineProperty, f = Object.getOwnPropertyDescriptor, n = (i, e, s, o) => {
  for (var a = o > 1 ? void 0 : o ? f(e, s) : e, t = i.length - 1, l; t >= 0; t--)
    (l = i[t]) && (a = (o ? l(e, s, a) : l(a)) || a);
  return o && a && h(e, s, a), a;
};
let r = class extends p {
  constructor() {
    super(...arguments), this._reason = "", this._isSaving = !1, this._errorMessage = null;
  }
  async _handleConfirm() {
    const i = this.data?.invoiceId;
    if (!i) return;
    if (!this._reason.trim()) {
      this._errorMessage = "Cancellation reason is required";
      return;
    }
    this._isSaving = !0, this._errorMessage = null;
    const { data: e, error: s } = await m.cancelInvoice(i, this._reason);
    if (s) {
      this._errorMessage = s.message, this._isSaving = !1;
      return;
    }
    if (e && !e.success) {
      this._errorMessage = e.errorMessage ?? "Failed to cancel invoice", this._isSaving = !1;
      return;
    }
    this._isSaving = !1, this.value = {
      cancelled: !0,
      cancelledOrderCount: e?.cancelledOrderCount
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const i = this.data?.invoiceNumber ?? "Invoice";
    return u`
      <umb-body-layout headline="Cancel Invoice">
        <div id="main">
          ${this._errorMessage ? u`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : d}

          <div class="warning-box">
            <uui-icon name="icon-alert"></uui-icon>
            <div>
              <strong>Are you sure you want to cancel ${i}?</strong>
              <p>This will:</p>
              <ul>
                <li>Mark the invoice as cancelled</li>
                <li>Cancel all unfulfilled orders</li>
                <li>Release reserved stock back to inventory</li>
              </ul>
              <p><strong>Note:</strong> Orders that are already shipped or completed will not be affected. Refunds must be processed separately.</p>
            </div>
          </div>

          <div class="form-field">
            <label for="reason">Reason for Cancellation *</label>
            <uui-textarea
              id="reason"
              .value=${this._reason}
              placeholder="Enter the reason for cancelling this invoice..."
              required
              @input=${(e) => {
      this._reason = e.target.value;
    }}
            ></uui-textarea>
          </div>
        </div>

        <div slot="actions">
          <uui-button
            label="Keep Invoice"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Keep Invoice
          </uui-button>
          <uui-button
            label="Cancel Invoice"
            look="primary"
            color="danger"
            @click=${this._handleConfirm}
            ?disabled=${this._isSaving || !this._reason.trim()}
          >
            ${this._isSaving ? u`<uui-loader-circle></uui-loader-circle>` : d}
            Cancel Invoice
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = v`
    :host {
      display: block;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .warning-box {
      display: flex;
      gap: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-5);
    }

    .warning-box uui-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-box p {
      margin: var(--uui-size-space-2) 0;
    }

    .warning-box ul {
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-5);
    }

    .warning-box li {
      margin: var(--uui-size-space-1) 0;
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    uui-textarea {
      width: 100%;
      min-height: 100px;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
n([
  c()
], r.prototype, "_reason", 2);
n([
  c()
], r.prototype, "_isSaving", 2);
n([
  c()
], r.prototype, "_errorMessage", 2);
r = n([
  g("merchello-cancel-invoice-modal")
], r);
const x = r;
export {
  r as MerchelloCancelInvoiceModalElement,
  x as default
};
//# sourceMappingURL=cancel-invoice-modal.element-COfha03I.js.map
