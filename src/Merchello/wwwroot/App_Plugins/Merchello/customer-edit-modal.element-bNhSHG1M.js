import { LitElement as k, nothing as g, html as c, css as b, property as p, state as a, query as D, customElement as T } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as L } from "@umbraco-cms/backoffice/modal";
import { M as y } from "./merchello-api-Dp_zU_yi.js";
import "@umbraco-cms/backoffice/member";
import { UmbElementMixin as A } from "@umbraco-cms/backoffice/element-api";
var E = Object.defineProperty, M = Object.getOwnPropertyDescriptor, d = (e, t, i, u) => {
  for (var r = u > 1 ? void 0 : u ? M(t, i) : t, m = e.length - 1, n; m >= 0; m--)
    (n = e[m]) && (r = (u ? n(t, i, r) : n(r)) || r);
  return u && r && E(t, i, r), r;
};
let l = class extends A(k) {
  constructor() {
    super(...arguments), this.tags = [], this.suggestions = [], this.placeholder = "Add tag...", this._inputValue = "", this._filteredSuggestions = [], this._showSuggestions = !1, this._selectedSuggestionIndex = -1;
  }
  _handleInputChange(e) {
    const t = e.target;
    this._inputValue = t.value, this._filterSuggestions();
  }
  _filterSuggestions() {
    if (!this._inputValue.trim()) {
      this._filteredSuggestions = [], this._showSuggestions = !1;
      return;
    }
    const e = this._inputValue.toLowerCase().trim(), t = this.tags.map((i) => i.toLowerCase());
    this._filteredSuggestions = this.suggestions.filter(
      (i) => i.toLowerCase().includes(e) && !t.includes(i.toLowerCase())
    ).slice(0, 8), this._showSuggestions = this._filteredSuggestions.length > 0, this._selectedSuggestionIndex = -1;
  }
  _addTag(e) {
    const t = e.trim();
    if (!t || this.tags.map((r) => r.toLowerCase()).includes(t.toLowerCase())) return;
    const u = [...this.tags, t];
    this._dispatchTagsChanged(u), this._inputValue = "", this._showSuggestions = !1, this._filteredSuggestions = [], this._selectedSuggestionIndex = -1;
  }
  _removeTag(e) {
    const t = this.tags.filter((i) => i !== e);
    this._dispatchTagsChanged(t);
  }
  _dispatchTagsChanged(e) {
    this.dispatchEvent(new CustomEvent("tags-changed", {
      detail: { tags: e },
      bubbles: !0,
      composed: !0
    }));
  }
  _handleKeyDown(e) {
    e.key === "Enter" ? (e.preventDefault(), this._selectedSuggestionIndex >= 0 && this._filteredSuggestions.length > 0 ? this._addTag(this._filteredSuggestions[this._selectedSuggestionIndex]) : this._inputValue.trim() && this._addTag(this._inputValue)) : e.key === "," ? (e.preventDefault(), this._inputValue.trim() && this._addTag(this._inputValue)) : e.key === "Backspace" && !this._inputValue && this.tags.length > 0 ? this._removeTag(this.tags[this.tags.length - 1]) : e.key === "ArrowDown" && this._showSuggestions ? (e.preventDefault(), this._selectedSuggestionIndex = Math.min(
      this._selectedSuggestionIndex + 1,
      this._filteredSuggestions.length - 1
    )) : e.key === "ArrowUp" && this._showSuggestions ? (e.preventDefault(), this._selectedSuggestionIndex = Math.max(this._selectedSuggestionIndex - 1, -1)) : e.key === "Escape" && (this._showSuggestions = !1, this._selectedSuggestionIndex = -1);
  }
  _handleInputFocus() {
    this._inputValue.trim() && this._filterSuggestions();
  }
  _handleInputBlur() {
    setTimeout(() => {
      this._showSuggestions = !1, this._selectedSuggestionIndex = -1;
    }, 200);
  }
  _handleSuggestionClick(e) {
    this._addTag(e), this._inputElement?.focus();
  }
  render() {
    return c`
      <div class="tag-input-container" @click=${() => this._inputElement?.focus()}>
        <div class="tags-wrapper">
          ${this.tags.map((e) => c`
            <span class="tag-chip">
              <span class="tag-text">${e}</span>
              <button
                type="button"
                class="tag-remove"
                @click=${(t) => {
      t.stopPropagation(), this._removeTag(e);
    }}
                aria-label="Remove ${e}">
                <uui-icon name="icon-remove"></uui-icon>
              </button>
            </span>
          `)}
          <input
            id="tag-input"
            type="text"
            .value=${this._inputValue}
            placeholder=${this.tags.length === 0 ? this.placeholder : ""}
            @input=${this._handleInputChange}
            @keydown=${this._handleKeyDown}
            @focus=${this._handleInputFocus}
            @blur=${this._handleInputBlur}
            autocomplete="off"
          />
        </div>
        ${this._showSuggestions ? c`
          <div class="suggestions-dropdown">
            ${this._filteredSuggestions.map((e, t) => c`
              <div
                class="suggestion-item ${t === this._selectedSuggestionIndex ? "selected" : ""}"
                @mousedown=${() => this._handleSuggestionClick(e)}>
                ${e}
              </div>
            `)}
          </div>
        ` : g}
      </div>
    `;
  }
};
l.styles = b`
    :host {
      display: block;
      width: 100%;
    }

    .tag-input-container {
      position: relative;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      min-height: 40px;
      cursor: text;
    }

    .tag-input-container:focus-within {
      outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
    }

    .tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
    }

    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      line-height: 1.2;
    }

    .tag-text {
      color: var(--uui-color-text);
    }

    .tag-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--uui-color-text-alt);
      transition: color 0.1s ease;
    }

    .tag-remove:hover {
      color: var(--uui-color-danger);
    }

    .tag-remove uui-icon {
      font-size: 12px;
    }

    input {
      flex: 1;
      min-width: 120px;
      border: none;
      outline: none;
      background: transparent;
      font-family: inherit;
      font-size: 0.875rem;
      padding: var(--uui-size-space-1);
      color: var(--uui-color-text);
    }

    input::placeholder {
      color: var(--uui-color-text-alt);
    }

    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-top: none;
      border-radius: 0 0 var(--uui-border-radius) var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-1);
      max-height: 200px;
      overflow-y: auto;
    }

    .suggestion-item {
      padding: var(--uui-size-space-3);
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text);
    }

    .suggestion-item:hover,
    .suggestion-item.selected {
      background: var(--uui-color-surface-emphasis);
    }
  `;
d([
  p({ type: Array })
], l.prototype, "tags", 2);
d([
  p({ type: Array })
], l.prototype, "suggestions", 2);
d([
  p({ type: String })
], l.prototype, "placeholder", 2);
d([
  a()
], l.prototype, "_inputValue", 2);
d([
  a()
], l.prototype, "_filteredSuggestions", 2);
d([
  a()
], l.prototype, "_showSuggestions", 2);
d([
  a()
], l.prototype, "_selectedSuggestionIndex", 2);
d([
  D("#tag-input")
], l.prototype, "_inputElement", 2);
l = d([
  T("merchello-tag-input")
], l);
var N = Object.defineProperty, F = Object.getOwnPropertyDescriptor, x = (e) => {
  throw TypeError(e);
}, o = (e, t, i, u) => {
  for (var r = u > 1 ? void 0 : u ? F(t, i) : t, m = e.length - 1, n; m >= 0; m--)
    (n = e[m]) && (r = (u ? n(t, i, r) : n(r)) || r);
  return u && r && N(t, i, r), r;
}, w = (e, t, i) => t.has(e) || x("Cannot " + i), I = (e, t, i) => (w(e, t, "read from private field"), t.get(e)), z = (e, t, i) => t.has(e) ? x("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), f = (e, t, i, u) => (w(e, t, "write to private field"), t.set(e, i), i), h;
const v = "MerchelloCustomerEditForm";
let s = class extends L {
  constructor() {
    super(...arguments), this._email = "", this._firstName = "", this._lastName = "", this._memberKey = "", this._originalMemberKey = "", this._tags = [], this._allTags = [], this._isFlagged = !1, this._acceptsMarketing = !1, this._hasAccountTerms = !1, this._paymentTermsDays = "", this._originalPaymentTermsDays = "", this._creditLimit = "", this._originalCreditLimit = "", this._isSaving = !1, this._errors = {}, z(this, h, !1);
  }
  connectedCallback() {
    super.connectedCallback(), f(this, h, !0), this.data?.customer && (this._email = this.data.customer.email ?? "", this._firstName = this.data.customer.firstName ?? "", this._lastName = this.data.customer.lastName ?? "", this._memberKey = this.data.customer.memberKey ?? "", this._originalMemberKey = this.data.customer.memberKey ?? "", this._tags = this.data.customer.tags ?? [], this._isFlagged = this.data.customer.isFlagged ?? !1, this._acceptsMarketing = this.data.customer.acceptsMarketing ?? !1, this._hasAccountTerms = this.data.customer.hasAccountTerms ?? !1, this._paymentTermsDays = this.data.customer.paymentTermsDays?.toString() ?? "", this._originalPaymentTermsDays = this._paymentTermsDays, this._creditLimit = this.data.customer.creditLimit?.toString() ?? "", this._originalCreditLimit = this._creditLimit), this._loadAllTags();
  }
  firstUpdated() {
    requestAnimationFrame(() => {
      this.renderRoot.querySelector("#customer-email")?.focus();
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, h, !1);
  }
  async _loadAllTags() {
    const { data: e } = await y.getAllCustomerTags();
    I(this, h) && (this._allTags = e ?? []);
  }
  _validateEmail(e) {
    return e.trim() ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) : !1;
  }
  _clearFieldError(e) {
    if (!this._errors[e]) return;
    const { [e]: t, ...i } = this._errors;
    this._errors = i;
  }
  _validateBusinessRules() {
    const e = {};
    if (this._validateEmail(this._email) || (e.email = "Enter a valid email address."), this._hasAccountTerms && this._paymentTermsDays) {
      const t = Number(this._paymentTermsDays);
      (!/^\d+$/.test(this._paymentTermsDays) || !Number.isFinite(t) || t < 1 || t > 365) && (e.paymentTermsDays = "Payment terms must be a whole number from 1 to 365.");
    }
    if (this._hasAccountTerms && this._creditLimit) {
      const t = Number(this._creditLimit);
      (!Number.isFinite(t) || t < 0) && (e.creditLimit = "Credit limit must be zero or greater.");
    }
    return this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validateBusinessRules()) return;
    const e = this.data?.customer?.id;
    if (!e) {
      this._errors = { general: "Customer ID is missing." };
      return;
    }
    this._isSaving = !0;
    const t = this._memberKey !== this._originalMemberKey, i = t && !this._memberKey, u = this._paymentTermsDays !== this._originalPaymentTermsDays, r = u && !this._paymentTermsDays || !this._hasAccountTerms, m = this._hasAccountTerms && u && this._paymentTermsDays ? Number.parseInt(this._paymentTermsDays, 10) : void 0, n = this._creditLimit !== this._originalCreditLimit, S = n && !this._creditLimit || !this._hasAccountTerms, $ = this._hasAccountTerms && n && this._creditLimit ? Number.parseFloat(this._creditLimit) : void 0, { data: C, error: _ } = await y.updateCustomer(e, {
      email: this._email.trim(),
      firstName: this._firstName.trim() || null,
      lastName: this._lastName.trim() || null,
      memberKey: t && this._memberKey ? this._memberKey : void 0,
      clearMemberKey: i,
      tags: this._tags,
      isFlagged: this._isFlagged,
      acceptsMarketing: this._acceptsMarketing,
      hasAccountTerms: this._hasAccountTerms,
      paymentTermsDays: m,
      clearPaymentTermsDays: r,
      creditLimit: $,
      clearCreditLimit: S
    });
    if (this._isSaving = !1, _) {
      this._errors = { general: _.message };
      return;
    }
    this.value = { customer: C, isUpdated: !0 }, this.modalContext?.submit();
  }
  async _handleSubmit(e) {
    e.preventDefault();
    const t = e.currentTarget;
    if (!t.checkValidity()) {
      t.reportValidity();
      return;
    }
    await this._handleSave();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleMemberChange(e) {
    const t = e.target;
    this._memberKey = t.value ?? "";
  }
  _renderDescription(e, t) {
    return this._errors[e] ? c`<span class="field-error" role="alert">${this._errors[e]}</span>` : c`<span class="hint">${t}</span>`;
  }
  render() {
    return c`
      <umb-body-layout headline="Edit customer">
        <div id="main">
          ${this._errors.general ? c`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              ` : g}

          <uui-form>
            <form id=${v} @submit=${this._handleSubmit}>
              <uui-box headline="Customer details">
                <uui-form-layout-item>
                  <uui-label slot="label" for="customer-email" required>Email</uui-label>
                  <uui-input
                    id="customer-email"
                    name="customer-email"
                    type="email"
                    maxlength="254"
                    required
                    .value=${this._email}
                    @input=${(e) => {
      this._email = e.target.value, this._clearFieldError("email");
    }}
                    placeholder="customer@example.com"
                    label="Email address">
                  </uui-input>
                  <div slot="description">
                    ${this._renderDescription("email", "Primary contact and identity for this customer record.")}
                  </div>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="customer-firstName">First name</uui-label>
                  <uui-input
                    id="customer-firstName"
                    name="customer-firstName"
                    maxlength="200"
                    .value=${this._firstName}
                    @input=${(e) => {
      this._firstName = e.target.value;
    }}
                    placeholder="Jane"
                    label="First name">
                  </uui-input>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="customer-lastName">Last name</uui-label>
                  <uui-input
                    id="customer-lastName"
                    name="customer-lastName"
                    maxlength="200"
                    .value=${this._lastName}
                    @input=${(e) => {
      this._lastName = e.target.value;
    }}
                    placeholder="Smith"
                    label="Last name">
                  </uui-input>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Linked member</uui-label>
                  <umb-input-member
                    max="1"
                    .value=${this._memberKey}
                    @change=${this._handleMemberChange}>
                  </umb-input-member>
                  <div slot="description" class="hint">Link this customer to an Umbraco member account.</div>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Tags</uui-label>
                  <merchello-tag-input
                    .tags=${this._tags}
                    .suggestions=${this._allTags}
                    placeholder="Add tag"
                    @tags-changed=${(e) => {
      this._tags = e.detail.tags;
    }}>
                  </merchello-tag-input>
                  <div slot="description" class="hint">Used for segmentation and filtering.</div>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="customer-flagged">Flagged customer</uui-label>
                  <uui-toggle
                    id="customer-flagged"
                    label="Flagged customer"
                    .checked=${this._isFlagged}
                    @change=${(e) => {
      this._isFlagged = e.target.checked;
    }}>
                    <uui-visually-hidden>Flagged customer</uui-visually-hidden>
                  </uui-toggle>
                  <div slot="description" class="hint">Use for customers that need manual review.</div>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label" for="customer-marketing">Accepts marketing</uui-label>
                  <uui-toggle
                    id="customer-marketing"
                    label="Accepts marketing"
                    .checked=${this._acceptsMarketing}
                    @change=${(e) => {
      this._acceptsMarketing = e.target.checked;
    }}>
                    <uui-visually-hidden>Accepts marketing</uui-visually-hidden>
                  </uui-toggle>
                  <div slot="description" class="hint">Customer opted in to marketing messages.</div>
                </uui-form-layout-item>
              </uui-box>

              <uui-box headline="Account terms">
                <uui-form-layout-item>
                  <uui-label slot="label" for="customer-account-terms">Allow account terms</uui-label>
                  <uui-toggle
                    id="customer-account-terms"
                    label="Allow account terms"
                    .checked=${this._hasAccountTerms}
                    @change=${(e) => {
      this._hasAccountTerms = e.target.checked, this._clearFieldError("paymentTermsDays"), this._clearFieldError("creditLimit");
    }}>
                    <uui-visually-hidden>Allow account terms</uui-visually-hidden>
                  </uui-toggle>
                  <div slot="description" class="hint">Allow this customer to order with payment terms.</div>
                </uui-form-layout-item>

                ${this._hasAccountTerms ? c`
                      <uui-form-layout-item>
                        <uui-label slot="label" for="payment-terms">Payment terms (days)</uui-label>
                        <uui-input
                          id="payment-terms"
                          name="payment-terms"
                          type="number"
                          min="1"
                          max="365"
                          .value=${this._paymentTermsDays}
                          @input=${(e) => {
      this._paymentTermsDays = e.target.value, this._clearFieldError("paymentTermsDays");
    }}
                          placeholder="30"
                          label="Payment terms in days">
                        </uui-input>
                        <div slot="description">
                          ${this._renderDescription("paymentTermsDays", "Example: 30 for net 30 or 60 for net 60.")}
                        </div>
                      </uui-form-layout-item>

                      <uui-form-layout-item>
                        <uui-label slot="label" for="credit-limit">Credit limit</uui-label>
                        <uui-input
                          id="credit-limit"
                          name="credit-limit"
                          type="number"
                          min="0"
                          step="0.01"
                          .value=${this._creditLimit}
                          @input=${(e) => {
      this._creditLimit = e.target.value, this._clearFieldError("creditLimit");
    }}
                          placeholder="5000.00"
                          label="Credit limit">
                        </uui-input>
                        <div slot="description">
                          ${this._renderDescription("creditLimit", "Optional. Leave blank for no limit.")}
                        </div>
                      </uui-form-layout-item>
                    ` : g}
              </uui-box>
            </form>
          </uui-form>
        </div>

        <uui-button
          slot="actions"
          label="Cancel"
          look="secondary"
          ?disabled=${this._isSaving}
          @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label="Save changes"
          look="primary"
          color="positive"
          form=${v}
          type="submit"
          ?disabled=${this._isSaving}>
          ${this._isSaving ? "Saving..." : "Save changes"}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
s.styles = b`
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

    uui-form-layout-item {
      margin-bottom: var(--uui-size-space-3);
    }

    uui-input,
    umb-input-member,
    merchello-tag-input {
      width: 100%;
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .field-error {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
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

    .error-banner uui-icon {
      flex-shrink: 0;
    }
  `;
o([
  a()
], s.prototype, "_email", 2);
o([
  a()
], s.prototype, "_firstName", 2);
o([
  a()
], s.prototype, "_lastName", 2);
o([
  a()
], s.prototype, "_memberKey", 2);
o([
  a()
], s.prototype, "_originalMemberKey", 2);
o([
  a()
], s.prototype, "_tags", 2);
o([
  a()
], s.prototype, "_allTags", 2);
o([
  a()
], s.prototype, "_isFlagged", 2);
o([
  a()
], s.prototype, "_acceptsMarketing", 2);
o([
  a()
], s.prototype, "_hasAccountTerms", 2);
o([
  a()
], s.prototype, "_paymentTermsDays", 2);
o([
  a()
], s.prototype, "_originalPaymentTermsDays", 2);
o([
  a()
], s.prototype, "_creditLimit", 2);
o([
  a()
], s.prototype, "_originalCreditLimit", 2);
o([
  a()
], s.prototype, "_isSaving", 2);
o([
  a()
], s.prototype, "_errors", 2);
s = o([
  T("merchello-customer-edit-modal")
], s);
const R = s;
export {
  s as MerchelloCustomerEditModalElement,
  R as default
};
//# sourceMappingURL=customer-edit-modal.element-bNhSHG1M.js.map
