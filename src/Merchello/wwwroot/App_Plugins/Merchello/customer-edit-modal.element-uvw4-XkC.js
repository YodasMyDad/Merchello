import { LitElement as T, nothing as h, html as l, css as v, property as p, state as s, query as $, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as S } from "@umbraco-cms/backoffice/modal";
import { M as f } from "./merchello-api-DkRa4ImO.js";
import "@umbraco-cms/backoffice/member";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
var L = Object.defineProperty, k = Object.getOwnPropertyDescriptor, d = (e, t, a, n) => {
  for (var r = n > 1 ? void 0 : n ? k(t, a) : t, m = e.length - 1, c; m >= 0; m--)
    (c = e[m]) && (r = (n ? c(t, a, r) : c(r)) || r);
  return n && r && L(t, a, r), r;
};
let u = class extends C(T) {
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
    const e = this._inputValue.toLowerCase().trim(), t = this.tags.map((a) => a.toLowerCase());
    this._filteredSuggestions = this.suggestions.filter(
      (a) => a.toLowerCase().includes(e) && !t.includes(a.toLowerCase())
    ).slice(0, 8), this._showSuggestions = this._filteredSuggestions.length > 0, this._selectedSuggestionIndex = -1;
  }
  _addTag(e) {
    const t = e.trim();
    if (!t || this.tags.map((r) => r.toLowerCase()).includes(t.toLowerCase())) return;
    const n = [...this.tags, t];
    this._dispatchTagsChanged(n), this._inputValue = "", this._showSuggestions = !1, this._filteredSuggestions = [], this._selectedSuggestionIndex = -1;
  }
  _removeTag(e) {
    const t = this.tags.filter((a) => a !== e);
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
    return l`
      <div class="tag-input-container" @click=${() => this._inputElement?.focus()}>
        <div class="tags-wrapper">
          ${this.tags.map((e) => l`
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
        ${this._showSuggestions ? l`
          <div class="suggestions-dropdown">
            ${this._filteredSuggestions.map((e, t) => l`
              <div
                class="suggestion-item ${t === this._selectedSuggestionIndex ? "selected" : ""}"
                @mousedown=${() => this._handleSuggestionClick(e)}>
                ${e}
              </div>
            `)}
          </div>
        ` : h}
      </div>
    `;
  }
};
u.styles = v`
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
], u.prototype, "tags", 2);
d([
  p({ type: Array })
], u.prototype, "suggestions", 2);
d([
  p({ type: String })
], u.prototype, "placeholder", 2);
d([
  s()
], u.prototype, "_inputValue", 2);
d([
  s()
], u.prototype, "_filteredSuggestions", 2);
d([
  s()
], u.prototype, "_showSuggestions", 2);
d([
  s()
], u.prototype, "_selectedSuggestionIndex", 2);
d([
  $("#tag-input")
], u.prototype, "_inputElement", 2);
u = d([
  y("merchello-tag-input")
], u);
var D = Object.defineProperty, M = Object.getOwnPropertyDescriptor, o = (e, t, a, n) => {
  for (var r = n > 1 ? void 0 : n ? M(t, a) : t, m = e.length - 1, c; m >= 0; m--)
    (c = e[m]) && (r = (n ? c(t, a, r) : c(r)) || r);
  return n && r && D(t, a, r), r;
};
let i = class extends S {
  constructor() {
    super(...arguments), this._email = "", this._firstName = "", this._lastName = "", this._memberKey = "", this._originalMemberKey = "", this._tags = [], this._allTags = [], this._isFlagged = !1, this._acceptsMarketing = !1, this._hasAccountTerms = !1, this._paymentTermsDays = "", this._originalPaymentTermsDays = "", this._creditLimit = "", this._originalCreditLimit = "", this._isSaving = !1, this._errors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.customer && (this._email = this.data.customer.email ?? "", this._firstName = this.data.customer.firstName ?? "", this._lastName = this.data.customer.lastName ?? "", this._memberKey = this.data.customer.memberKey ?? "", this._originalMemberKey = this.data.customer.memberKey ?? "", this._tags = this.data.customer.tags ?? [], this._isFlagged = this.data.customer.isFlagged ?? !1, this._acceptsMarketing = this.data.customer.acceptsMarketing ?? !1, this._hasAccountTerms = this.data.customer.hasAccountTerms ?? !1, this._paymentTermsDays = this.data.customer.paymentTermsDays?.toString() ?? "", this._originalPaymentTermsDays = this._paymentTermsDays, this._creditLimit = this.data.customer.creditLimit?.toString() ?? "", this._originalCreditLimit = this._creditLimit), this._loadAllTags();
  }
  async _loadAllTags() {
    const { data: e } = await f.getAllCustomerTags();
    this._allTags = e ?? [];
  }
  _validateEmail(e) {
    return e.trim() ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) : !1;
  }
  async _handleSave() {
    if (this._errors = {}, !this._validateEmail(this._email)) {
      this._errors = { email: "Please enter a valid email address" };
      return;
    }
    if (this._paymentTermsDays) {
      const g = parseInt(this._paymentTermsDays, 10);
      if (isNaN(g) || g < 1 || g > 365 || !Number.isInteger(Number(this._paymentTermsDays))) {
        this._errors = { paymentTermsDays: "Payment terms must be a whole number between 1 and 365" };
        return;
      }
    }
    if (this._creditLimit) {
      const g = parseFloat(this._creditLimit);
      if (isNaN(g) || g < 0) {
        this._errors = { creditLimit: "Credit limit must be a valid positive number" };
        return;
      }
    }
    this._isSaving = !0;
    const e = this.data?.customer?.id;
    if (!e) {
      this._errors = { general: "Customer ID is missing" }, this._isSaving = !1;
      return;
    }
    const t = this._memberKey !== this._originalMemberKey, a = t && !this._memberKey, n = this._paymentTermsDays !== this._originalPaymentTermsDays, r = n && !this._paymentTermsDays, m = n && this._paymentTermsDays ? parseInt(this._paymentTermsDays, 10) : void 0, c = this._creditLimit !== this._originalCreditLimit, b = c && !this._creditLimit, w = c && this._creditLimit ? parseFloat(this._creditLimit) : void 0, { data: x, error: _ } = await f.updateCustomer(e, {
      email: this._email.trim(),
      firstName: this._firstName.trim() || null,
      lastName: this._lastName.trim() || null,
      memberKey: t && this._memberKey ? this._memberKey : void 0,
      clearMemberKey: a,
      tags: this._tags,
      isFlagged: this._isFlagged,
      acceptsMarketing: this._acceptsMarketing,
      hasAccountTerms: this._hasAccountTerms,
      paymentTermsDays: m,
      clearPaymentTermsDays: r,
      creditLimit: w,
      clearCreditLimit: b
    });
    if (this._isSaving = !1, _) {
      this._errors = { general: _.message };
      return;
    }
    this.value = { customer: x, isUpdated: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleMemberChange(e) {
    const t = e.target;
    this._memberKey = t.value ?? "";
  }
  render() {
    return l`
      <umb-body-layout headline="Edit Customer">
        <div id="main">
          ${this._errors.general ? l`<div class="error-banner">${this._errors.general}</div>` : h}

          <div class="form-row ${this._errors.email ? "has-error" : ""}">
            <label for="customer-email">Email</label>
            <uui-input
              id="customer-email"
              type="email"
              maxlength="254"
              .value=${this._email}
              @input=${(e) => {
      if (this._email = e.target.value, this._errors.email) {
        const { email: t, ...a } = this._errors;
        this._errors = a;
      }
    }}
              placeholder="e.g., customer@example.com"
              label="Email address">
            </uui-input>
            ${this._errors.email ? l`<span class="field-error">${this._errors.email}</span>` : h}
          </div>

          <div class="form-row">
            <label for="customer-firstName">First Name</label>
            <uui-input
              id="customer-firstName"
              maxlength="200"
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
              maxlength="200"
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

          <div class="form-row">
            <label>Tags</label>
            <merchello-tag-input
              .tags=${this._tags}
              .suggestions=${this._allTags}
              placeholder="Add tag..."
              @tags-changed=${(e) => this._tags = e.detail.tags}>
            </merchello-tag-input>
            <span class="hint">Tags for segmentation and organization</span>
          </div>

          <div class="form-row toggle-row">
            <uui-toggle
              .checked=${this._isFlagged}
              @change=${(e) => this._isFlagged = e.target.checked}
              label="Flagged Customer">
            </uui-toggle>
            <div class="toggle-info">
              <label>Flagged Customer</label>
              <span class="hint">Mark this customer as requiring attention</span>
            </div>
          </div>

          <div class="form-row toggle-row">
            <uui-toggle
              .checked=${this._acceptsMarketing}
              @change=${(e) => this._acceptsMarketing = e.target.checked}
              label="Accepts Marketing">
            </uui-toggle>
            <div class="toggle-info">
              <label>Accepts Marketing</label>
              <span class="hint">Customer has opted in to receive marketing communications</span>
            </div>
          </div>

          <div class="section-divider"></div>
          <h4 class="section-header">Account Settings</h4>

          <div class="form-row toggle-row">
            <uui-toggle
              .checked=${this._hasAccountTerms}
              @change=${(e) => this._hasAccountTerms = e.target.checked}
              label="Account Customer">
            </uui-toggle>
            <div class="toggle-info">
              <label>Account Customer</label>
              <span class="hint">Allow this customer to order on account with payment terms</span>
            </div>
          </div>

          ${this._hasAccountTerms ? l`
            <div class="form-row ${this._errors.paymentTermsDays ? "has-error" : ""}">
              <label for="payment-terms">Payment Terms (Days)</label>
              <uui-input
                id="payment-terms"
                type="number"
                min="1"
                max="365"
                .value=${this._paymentTermsDays}
                @input=${(e) => this._paymentTermsDays = e.target.value}
                placeholder="e.g., 30"
                label="Payment terms in days">
              </uui-input>
              ${this._errors.paymentTermsDays ? l`<span class="field-error">${this._errors.paymentTermsDays}</span>` : l`<span class="hint">e.g., 30 for Net 30, 60 for Net 60</span>`}
            </div>

            <div class="form-row ${this._errors.creditLimit ? "has-error" : ""}">
              <label for="credit-limit">Credit Limit (Optional)</label>
              <uui-input
                id="credit-limit"
                type="number"
                min="0"
                step="0.01"
                .value=${this._creditLimit}
                @input=${(e) => this._creditLimit = e.target.value}
                placeholder="e.g., 5000.00"
                label="Credit limit">
              </uui-input>
              ${this._errors.creditLimit ? l`<span class="field-error">${this._errors.creditLimit}</span>` : l`<span class="hint">Leave blank for no limit. Soft warning only - orders still proceed if exceeded.</span>`}
            </div>
          ` : h}
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
i.styles = v`
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

    .toggle-row {
      flex-direction: row;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
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

    .section-divider {
      border-top: 1px solid var(--uui-color-border);
      margin: var(--uui-size-space-2) 0;
    }

    .section-header {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0 0 var(--uui-size-space-2) 0;
      color: var(--uui-color-text);
    }
  `;
o([
  s()
], i.prototype, "_email", 2);
o([
  s()
], i.prototype, "_firstName", 2);
o([
  s()
], i.prototype, "_lastName", 2);
o([
  s()
], i.prototype, "_memberKey", 2);
o([
  s()
], i.prototype, "_originalMemberKey", 2);
o([
  s()
], i.prototype, "_tags", 2);
o([
  s()
], i.prototype, "_allTags", 2);
o([
  s()
], i.prototype, "_isFlagged", 2);
o([
  s()
], i.prototype, "_acceptsMarketing", 2);
o([
  s()
], i.prototype, "_hasAccountTerms", 2);
o([
  s()
], i.prototype, "_paymentTermsDays", 2);
o([
  s()
], i.prototype, "_originalPaymentTermsDays", 2);
o([
  s()
], i.prototype, "_creditLimit", 2);
o([
  s()
], i.prototype, "_originalCreditLimit", 2);
o([
  s()
], i.prototype, "_isSaving", 2);
o([
  s()
], i.prototype, "_errors", 2);
i = o([
  y("merchello-customer-edit-modal")
], i);
const K = i;
export {
  i as MerchelloCustomerEditModalElement,
  K as default
};
//# sourceMappingURL=customer-edit-modal.element-uvw4-XkC.js.map
