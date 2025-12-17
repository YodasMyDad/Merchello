import { nothing as c, html as u, css as d, state as l, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as p } from "@umbraco-cms/backoffice/modal";
import { M as _ } from "./merchello-api-DgfpLvp2.js";
import "@umbraco-cms/backoffice/member";
var b = Object.defineProperty, v = Object.getOwnPropertyDescriptor, i = (e, t, s, o) => {
  for (var a = o > 1 ? void 0 : o ? v(t, s) : t, m = e.length - 1, n; m >= 0; m--)
    (n = e[m]) && (a = (o ? n(t, s, a) : n(a)) || a);
  return o && a && b(t, s, a), a;
};
let r = class extends p {
  constructor() {
    super(...arguments), this._email = "", this._firstName = "", this._lastName = "", this._memberKey = "", this._originalMemberKey = "", this._isSaving = !1, this._errors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.customer && (this._email = this.data.customer.email ?? "", this._firstName = this.data.customer.firstName ?? "", this._lastName = this.data.customer.lastName ?? "", this._memberKey = this.data.customer.memberKey ?? "", this._originalMemberKey = this.data.customer.memberKey ?? "");
  }
  _validateEmail(e) {
    return e.trim() ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) : !1;
  }
  async _handleSave() {
    if (this._errors = {}, !this._validateEmail(this._email)) {
      this._errors = { email: "Please enter a valid email address" };
      return;
    }
    this._isSaving = !0;
    const e = this.data?.customer?.id;
    if (!e) {
      this._errors = { general: "Customer ID is missing" }, this._isSaving = !1;
      return;
    }
    const t = this._memberKey !== this._originalMemberKey, s = t && !this._memberKey, { data: o, error: a } = await _.updateCustomer(e, {
      email: this._email.trim(),
      firstName: this._firstName.trim() || null,
      lastName: this._lastName.trim() || null,
      memberKey: t && this._memberKey ? this._memberKey : void 0,
      clearMemberKey: s
    });
    if (this._isSaving = !1, a) {
      this._errors = { general: a.message };
      return;
    }
    this.value = { customer: o, isUpdated: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleMemberChange(e) {
    const t = e.target;
    this._memberKey = t.value ?? "";
  }
  render() {
    return u`
      <umb-body-layout headline="Edit Customer">
        <div id="main">
          ${this._errors.general ? u`<div class="error-banner">${this._errors.general}</div>` : c}

          <div class="form-row ${this._errors.email ? "has-error" : ""}">
            <label for="customer-email">Email</label>
            <uui-input
              id="customer-email"
              type="email"
              .value=${this._email}
              @input=${(e) => {
      if (this._email = e.target.value, this._errors.email) {
        const { email: t, ...s } = this._errors;
        this._errors = s;
      }
    }}
              placeholder="e.g., customer@example.com"
              label="Email address">
            </uui-input>
            ${this._errors.email ? u`<span class="field-error">${this._errors.email}</span>` : c}
          </div>

          <div class="form-row">
            <label for="customer-firstName">First Name</label>
            <uui-input
              id="customer-firstName"
              .value=${this._firstName}
              @input=${(e) => this._firstName = e.target.value}
              placeholder="e.g., John"
              label="First name">
            </uui-input>
          </div>

          <div class="form-row">
            <label for="customer-lastName">Last Name</label>
            <uui-input
              id="customer-lastName"
              .value=${this._lastName}
              @input=${(e) => this._lastName = e.target.value}
              placeholder="e.g., Smith"
              label="Last name">
            </uui-input>
          </div>

          <div class="form-row">
            <label>Linked Member</label>
            <umb-input-member
              max="1"
              .value=${this._memberKey}
              @change=${this._handleMemberChange}>
            </umb-input-member>
            <span class="hint">Link this customer to an Umbraco member account</span>
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Save Changes"
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? "Saving..." : "Save Changes"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = d`
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

    uui-input {
      width: 100%;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .form-row.has-error uui-input {
      --uui-input-border-color: var(--uui-color-danger);
    }

    .field-error {
      font-size: 0.75rem;
      color: var(--uui-color-danger);
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

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
i([
  l()
], r.prototype, "_email", 2);
i([
  l()
], r.prototype, "_firstName", 2);
i([
  l()
], r.prototype, "_lastName", 2);
i([
  l()
], r.prototype, "_memberKey", 2);
i([
  l()
], r.prototype, "_originalMemberKey", 2);
i([
  l()
], r.prototype, "_isSaving", 2);
i([
  l()
], r.prototype, "_errors", 2);
r = i([
  h("merchello-customer-edit-modal")
], r);
const C = r;
export {
  r as MerchelloCustomerEditModalElement,
  C as default
};
//# sourceMappingURL=customer-edit-modal.element-Bf4vRJxw.js.map
