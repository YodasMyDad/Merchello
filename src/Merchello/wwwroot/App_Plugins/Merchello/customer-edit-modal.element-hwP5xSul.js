import { LitElement as v, nothing as h, html as c, css as _, property as p, state as r, query as b, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-B2ha_6NF.js";
import "@umbraco-cms/backoffice/member";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
var w = Object.defineProperty, S = Object.getOwnPropertyDescriptor, u = (e, t, i, o) => {
  for (var s = o > 1 ? void 0 : o ? S(t, i) : t, g = e.length - 1, d; g >= 0; g--)
    (d = e[g]) && (s = (o ? d(t, i, s) : d(s)) || s);
  return o && s && w(t, i, s), s;
};
let n = class extends x(v) {
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
    if (!t || this.tags.map((s) => s.toLowerCase()).includes(t.toLowerCase())) return;
    const o = [...this.tags, t];
    this._dispatchTagsChanged(o), this._inputValue = "", this._showSuggestions = !1, this._filteredSuggestions = [], this._selectedSuggestionIndex = -1;
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
        ` : h}
      </div>
    `;
  }
};
n.styles = _`
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
u([
  p({ type: Array })
], n.prototype, "tags", 2);
u([
  p({ type: Array })
], n.prototype, "suggestions", 2);
u([
  p({ type: String })
], n.prototype, "placeholder", 2);
u([
  r()
], n.prototype, "_inputValue", 2);
u([
  r()
], n.prototype, "_filteredSuggestions", 2);
u([
  r()
], n.prototype, "_showSuggestions", 2);
u([
  r()
], n.prototype, "_selectedSuggestionIndex", 2);
u([
  b("#tag-input")
], n.prototype, "_inputElement", 2);
n = u([
  f("merchello-tag-input")
], n);
var $ = Object.defineProperty, C = Object.getOwnPropertyDescriptor, l = (e, t, i, o) => {
  for (var s = o > 1 ? void 0 : o ? C(t, i) : t, g = e.length - 1, d; g >= 0; g--)
    (d = e[g]) && (s = (o ? d(t, i, s) : d(s)) || s);
  return o && s && $(t, i, s), s;
};
let a = class extends y {
  constructor() {
    super(...arguments), this._email = "", this._firstName = "", this._lastName = "", this._memberKey = "", this._originalMemberKey = "", this._tags = [], this._allTags = [], this._isFlagged = !1, this._acceptsMarketing = !1, this._isSaving = !1, this._errors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.customer && (this._email = this.data.customer.email ?? "", this._firstName = this.data.customer.firstName ?? "", this._lastName = this.data.customer.lastName ?? "", this._memberKey = this.data.customer.memberKey ?? "", this._originalMemberKey = this.data.customer.memberKey ?? "", this._tags = this.data.customer.tags ?? [], this._isFlagged = this.data.customer.isFlagged ?? !1, this._acceptsMarketing = this.data.customer.acceptsMarketing ?? !1), this._loadAllTags();
  }
  async _loadAllTags() {
    const { data: e } = await m.getAllCustomerTags();
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
    this._isSaving = !0;
    const e = this.data?.customer?.id;
    if (!e) {
      this._errors = { general: "Customer ID is missing" }, this._isSaving = !1;
      return;
    }
    const t = this._memberKey !== this._originalMemberKey, i = t && !this._memberKey, { data: o, error: s } = await m.updateCustomer(e, {
      email: this._email.trim(),
      firstName: this._firstName.trim() || null,
      lastName: this._lastName.trim() || null,
      memberKey: t && this._memberKey ? this._memberKey : void 0,
      clearMemberKey: i,
      tags: this._tags,
      isFlagged: this._isFlagged,
      acceptsMarketing: this._acceptsMarketing
    });
    if (this._isSaving = !1, s) {
      this._errors = { general: s.message };
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
    return c`
      <umb-body-layout headline="Edit Customer">
        <div id="main">
          ${this._errors.general ? c`<div class="error-banner">${this._errors.general}</div>` : h}

          <div class="form-row ${this._errors.email ? "has-error" : ""}">
            <label for="customer-email">Email</label>
            <uui-input
              id="customer-email"
              type="email"
              .value=${this._email}
              @input=${(e) => {
      if (this._email = e.target.value, this._errors.email) {
        const { email: t, ...i } = this._errors;
        this._errors = i;
      }
    }}
              placeholder="e.g., customer@example.com"
              label="Email address">
            </uui-input>
            ${this._errors.email ? c`<span class="field-error">${this._errors.email}</span>` : h}
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
a.styles = _`
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
  `;
l([
  r()
], a.prototype, "_email", 2);
l([
  r()
], a.prototype, "_firstName", 2);
l([
  r()
], a.prototype, "_lastName", 2);
l([
  r()
], a.prototype, "_memberKey", 2);
l([
  r()
], a.prototype, "_originalMemberKey", 2);
l([
  r()
], a.prototype, "_tags", 2);
l([
  r()
], a.prototype, "_allTags", 2);
l([
  r()
], a.prototype, "_isFlagged", 2);
l([
  r()
], a.prototype, "_acceptsMarketing", 2);
l([
  r()
], a.prototype, "_isSaving", 2);
l([
  r()
], a.prototype, "_errors", 2);
a = l([
  f("merchello-customer-edit-modal")
], a);
const N = a;
export {
  a as MerchelloCustomerEditModalElement,
  N as default
};
//# sourceMappingURL=customer-edit-modal.element-hwP5xSul.js.map
