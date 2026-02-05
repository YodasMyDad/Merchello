import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { CustomerEditModalData, CustomerEditModalValue } from "./customer-edit-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import "@umbraco-cms/backoffice/member";
import "@shared/components/tag-input.element.js";

@customElement("merchello-customer-edit-modal")
export class MerchelloCustomerEditModalElement extends UmbModalBaseElement<
  CustomerEditModalData,
  CustomerEditModalValue
> {
  @state() private _email: string = "";
  @state() private _firstName: string = "";
  @state() private _lastName: string = "";
  @state() private _memberKey: string = "";
  @state() private _originalMemberKey: string = "";
  @state() private _tags: string[] = [];
  @state() private _allTags: string[] = [];
  @state() private _isFlagged: boolean = false;
  @state() private _acceptsMarketing: boolean = false;
  @state() private _hasAccountTerms: boolean = false;
  @state() private _paymentTermsDays: string = "";
  @state() private _originalPaymentTermsDays: string = "";
  @state() private _creditLimit: string = "";
  @state() private _originalCreditLimit: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  override connectedCallback(): void {
    super.connectedCallback();
    // Pre-populate form with existing customer data
    if (this.data?.customer) {
      this._email = this.data.customer.email ?? "";
      this._firstName = this.data.customer.firstName ?? "";
      this._lastName = this.data.customer.lastName ?? "";
      this._memberKey = this.data.customer.memberKey ?? "";
      this._originalMemberKey = this.data.customer.memberKey ?? "";
      this._tags = this.data.customer.tags ?? [];
      this._isFlagged = this.data.customer.isFlagged ?? false;
      this._acceptsMarketing = this.data.customer.acceptsMarketing ?? false;
      this._hasAccountTerms = this.data.customer.hasAccountTerms ?? false;
      this._paymentTermsDays = this.data.customer.paymentTermsDays?.toString() ?? "";
      this._originalPaymentTermsDays = this._paymentTermsDays;
      this._creditLimit = this.data.customer.creditLimit?.toString() ?? "";
      this._originalCreditLimit = this._creditLimit;
    }
    // Load all unique tags for autocomplete
    this._loadAllTags();
  }

  private async _loadAllTags(): Promise<void> {
    const { data } = await MerchelloApi.getAllCustomerTags();
    this._allTags = data ?? [];
  }

  private _validateEmail(email: string): boolean {
    if (!email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async _handleSave(): Promise<void> {
    this._errors = {};

    // Validate email
    if (!this._validateEmail(this._email)) {
      this._errors = { email: "Please enter a valid email address" };
      return;
    }

    // Validate payment terms (must be a positive whole number if provided)
    if (this._paymentTermsDays) {
      const terms = parseInt(this._paymentTermsDays, 10);
      if (isNaN(terms) || terms < 1 || terms > 365 || !Number.isInteger(Number(this._paymentTermsDays))) {
        this._errors = { paymentTermsDays: "Payment terms must be a whole number between 1 and 365" };
        return;
      }
    }

    // Validate credit limit (must be a positive number if provided)
    if (this._creditLimit) {
      const limit = parseFloat(this._creditLimit);
      if (isNaN(limit) || limit < 0) {
        this._errors = { creditLimit: "Credit limit must be a valid positive number" };
        return;
      }
    }

    this._isSaving = true;

    const customerId = this.data?.customer?.id;
    if (!customerId) {
      this._errors = { general: "Customer ID is missing" };
      this._isSaving = false;
      return;
    }

    // Determine if memberKey changed
    const memberKeyChanged = this._memberKey !== this._originalMemberKey;
    const clearMemberKey = memberKeyChanged && !this._memberKey;

    // Determine if payment terms changed
    const paymentTermsChanged = this._paymentTermsDays !== this._originalPaymentTermsDays;
    const clearPaymentTermsDays = paymentTermsChanged && !this._paymentTermsDays;
    const paymentTermsDays = paymentTermsChanged && this._paymentTermsDays
      ? parseInt(this._paymentTermsDays, 10)
      : undefined;

    // Determine if credit limit changed
    const creditLimitChanged = this._creditLimit !== this._originalCreditLimit;
    const clearCreditLimit = creditLimitChanged && !this._creditLimit;
    const creditLimit = creditLimitChanged && this._creditLimit
      ? parseFloat(this._creditLimit)
      : undefined;

    const { data, error } = await MerchelloApi.updateCustomer(customerId, {
      email: this._email.trim(),
      firstName: this._firstName.trim() || null,
      lastName: this._lastName.trim() || null,
      memberKey: memberKeyChanged && this._memberKey ? this._memberKey : undefined,
      clearMemberKey,
      tags: this._tags,
      isFlagged: this._isFlagged,
      acceptsMarketing: this._acceptsMarketing,
      hasAccountTerms: this._hasAccountTerms,
      paymentTermsDays,
      clearPaymentTermsDays,
      creditLimit,
      clearCreditLimit,
    });

    this._isSaving = false;

    if (error) {
      this._errors = { general: error.message };
      return;
    }

    this.value = { customer: data, isUpdated: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _handleMemberChange(e: Event): void {
    const target = e.target as HTMLElement & { value?: string };
    this._memberKey = target.value ?? "";
  }

  override render() {
    return html`
      <umb-body-layout headline="Edit Customer">
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row ${this._errors.email ? 'has-error' : ''}">
            <label for="customer-email">Email</label>
            <uui-input
              id="customer-email"
              type="email"
              maxlength="254"
              .value=${this._email}
              @input=${(e: Event) => {
                this._email = (e.target as HTMLInputElement).value;
                if (this._errors.email) {
                  const { email: _, ...rest } = this._errors;
                  this._errors = rest;
                }
              }}
              placeholder="e.g., customer@example.com"
              label="Email address">
            </uui-input>
            ${this._errors.email
              ? html`<span class="field-error">${this._errors.email}</span>`
              : nothing}
          </div>

          <div class="form-row">
            <label for="customer-firstName">First Name</label>
            <uui-input
              id="customer-firstName"
              maxlength="200"
              .value=${this._firstName}
              @input=${(e: Event) => (this._firstName = (e.target as HTMLInputElement).value)}
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
              @input=${(e: Event) => (this._lastName = (e.target as HTMLInputElement).value)}
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
              @tags-changed=${(e: CustomEvent<{ tags: string[] }>) => this._tags = e.detail.tags}>
            </merchello-tag-input>
            <span class="hint">Tags for segmentation and organization</span>
          </div>

          <div class="form-row toggle-row">
            <uui-toggle
              .checked=${this._isFlagged}
              @change=${(e: Event) => this._isFlagged = (e.target as HTMLInputElement).checked}
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
              @change=${(e: Event) => this._acceptsMarketing = (e.target as HTMLInputElement).checked}
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
              @change=${(e: Event) => this._hasAccountTerms = (e.target as HTMLInputElement).checked}
              label="Account Customer">
            </uui-toggle>
            <div class="toggle-info">
              <label>Account Customer</label>
              <span class="hint">Allow this customer to order on account with payment terms</span>
            </div>
          </div>

          ${this._hasAccountTerms ? html`
            <div class="form-row ${this._errors.paymentTermsDays ? 'has-error' : ''}">
              <label for="payment-terms">Payment Terms (Days)</label>
              <uui-input
                id="payment-terms"
                type="number"
                min="1"
                max="365"
                .value=${this._paymentTermsDays}
                @input=${(e: Event) => this._paymentTermsDays = (e.target as HTMLInputElement).value}
                placeholder="e.g., 30"
                label="Payment terms in days">
              </uui-input>
              ${this._errors.paymentTermsDays
                ? html`<span class="field-error">${this._errors.paymentTermsDays}</span>`
                : html`<span class="hint">e.g., 30 for Net 30, 60 for Net 60</span>`}
            </div>

            <div class="form-row ${this._errors.creditLimit ? 'has-error' : ''}">
              <label for="credit-limit">Credit Limit (Optional)</label>
              <uui-input
                id="credit-limit"
                type="number"
                min="0"
                step="0.01"
                .value=${this._creditLimit}
                @input=${(e: Event) => this._creditLimit = (e.target as HTMLInputElement).value}
                placeholder="e.g., 5000.00"
                label="Credit limit">
              </uui-input>
              ${this._errors.creditLimit
                ? html`<span class="field-error">${this._errors.creditLimit}</span>`
                : html`<span class="hint">Leave blank for no limit. Soft warning only - orders still proceed if exceeded.</span>`}
            </div>
          ` : nothing}
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

  static override readonly styles = css`
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
}

export default MerchelloCustomerEditModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-edit-modal": MerchelloCustomerEditModalElement;
  }
}
