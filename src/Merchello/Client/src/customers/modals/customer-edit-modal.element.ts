import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { CustomerEditModalData, CustomerEditModalValue } from "@customers/modals/customer-edit-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import "@umbraco-cms/backoffice/member";
import "@shared/components/tag-input.element.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

const CUSTOMER_EDIT_FORM_ID = "MerchelloCustomerEditForm";

@customElement("merchello-customer-edit-modal")
export class MerchelloCustomerEditModalElement extends UmbModalBaseElement<
  CustomerEditModalData,
  CustomerEditModalValue
> {
  @state() private _email = "";
  @state() private _firstName = "";
  @state() private _lastName = "";
  @state() private _memberKey = "";
  @state() private _originalMemberKey = "";
  @state() private _tags: string[] = [];
  @state() private _allTags: string[] = [];
  @state() private _isFlagged = false;
  @state() private _acceptsMarketing = false;
  @state() private _hasAccountTerms = false;
  @state() private _paymentTermsDays = "";
  @state() private _originalPaymentTermsDays = "";
  @state() private _creditLimit = "";
  @state() private _originalCreditLimit = "";
  @state() private _isSaving = false;
  @state() private _errors: Record<string, string> = {};

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;

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

    this._loadAllTags();
  }

  protected override firstUpdated(): void {
    requestAnimationFrame(() => {
      const emailInput = this.renderRoot.querySelector<HTMLElement>("#customer-email");
      emailInput?.focus();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadAllTags(): Promise<void> {
    const { data } = await MerchelloApi.getAllCustomerTags();
    if (!this.#isConnected) return;
    this._allTags = data ?? [];
  }

  private _validateEmail(email: string): boolean {
    if (!email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private _clearFieldError(field: string): void {
    if (!this._errors[field]) return;
    const { [field]: _fieldError, ...rest } = this._errors;
    this._errors = rest;
  }

  private _validateBusinessRules(): boolean {
    const errors: Record<string, string> = {};

    if (!this._validateEmail(this._email)) {
      errors.email = "Enter a valid email address.";
    }

    if (this._hasAccountTerms && this._paymentTermsDays) {
      const terms = Number(this._paymentTermsDays);
      const isWholeNumber = /^\d+$/.test(this._paymentTermsDays);
      if (!isWholeNumber || !Number.isFinite(terms) || terms < 1 || terms > 365) {
        errors.paymentTermsDays = "Payment terms must be a whole number from 1 to 365.";
      }
    }

    if (this._hasAccountTerms && this._creditLimit) {
      const limit = Number(this._creditLimit);
      if (!Number.isFinite(limit) || limit < 0) {
        errors.creditLimit = "Credit limit must be zero or greater.";
      }
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validateBusinessRules()) return;

    const customerId = this.data?.customer?.id;
    if (!customerId) {
      this._errors = { general: "Customer ID is missing." };
      return;
    }

    this._isSaving = true;

    const memberKeyChanged = this._memberKey !== this._originalMemberKey;
    const clearMemberKey = memberKeyChanged && !this._memberKey;

    const paymentTermsChanged = this._paymentTermsDays !== this._originalPaymentTermsDays;
    const clearPaymentTermsDays = (paymentTermsChanged && !this._paymentTermsDays) || !this._hasAccountTerms;
    const paymentTermsDays = this._hasAccountTerms && paymentTermsChanged && this._paymentTermsDays
      ? Number.parseInt(this._paymentTermsDays, 10)
      : undefined;

    const creditLimitChanged = this._creditLimit !== this._originalCreditLimit;
    const clearCreditLimit = (creditLimitChanged && !this._creditLimit) || !this._hasAccountTerms;
    const creditLimit = this._hasAccountTerms && creditLimitChanged && this._creditLimit
      ? Number.parseFloat(this._creditLimit)
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

  private async _handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    await this._handleSave();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _handleMemberChange(e: Event): void {
    const target = e.target as HTMLElement & { value?: string };
    this._memberKey = target.value ?? "";
  }

  private _renderDescription(field: string, fallbackText: string): unknown {
    if (this._errors[field]) {
      return html`<span class="field-error" role="alert">${this._errors[field]}</span>`;
    }

    return html`<span class="hint">${fallbackText}</span>`;
  }

  override render() {
    return html`
      <umb-body-layout headline="Edit customer">
        <div id="main">
          ${this._errors.general
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              `
            : nothing}

          <uui-form>
            <form id=${CUSTOMER_EDIT_FORM_ID} @submit=${this._handleSubmit}>
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
                    @input=${(e: Event) => {
                      this._email = (e.target as HTMLInputElement).value;
                      this._clearFieldError("email");
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
                    @input=${(e: Event) => {
                      this._firstName = (e.target as HTMLInputElement).value;
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
                    @input=${(e: Event) => {
                      this._lastName = (e.target as HTMLInputElement).value;
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
                    @tags-changed=${(e: CustomEvent<{ tags: string[] }>) => {
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
                    @change=${(e: Event) => {
                      this._isFlagged = (e.target as HTMLInputElement).checked;
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
                    @change=${(e: Event) => {
                      this._acceptsMarketing = (e.target as HTMLInputElement).checked;
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
                    @change=${(e: Event) => {
                      this._hasAccountTerms = (e.target as HTMLInputElement).checked;
                      this._clearFieldError("paymentTermsDays");
                      this._clearFieldError("creditLimit");
                    }}>
                    <uui-visually-hidden>Allow account terms</uui-visually-hidden>
                  </uui-toggle>
                  <div slot="description" class="hint">Allow this customer to order with payment terms.</div>
                </uui-form-layout-item>

                ${this._hasAccountTerms
                  ? html`
                      <uui-form-layout-item>
                        <uui-label slot="label" for="payment-terms">Payment terms (days)</uui-label>
                        <uui-input
                          id="payment-terms"
                          name="payment-terms"
                          type="number"
                          min="1"
                          max="365"
                          .value=${this._paymentTermsDays}
                          @input=${(e: Event) => {
                            this._paymentTermsDays = (e.target as HTMLInputElement).value;
                            this._clearFieldError("paymentTermsDays");
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
                          @input=${(e: Event) => {
                            this._creditLimit = (e.target as HTMLInputElement).value;
                            this._clearFieldError("creditLimit");
                          }}
                          placeholder="5000.00"
                          label="Credit limit">
                        </uui-input>
                        <div slot="description">
                          ${this._renderDescription("creditLimit", "Optional. Leave blank for no limit.")}
                        </div>
                      </uui-form-layout-item>
                    `
                  : nothing}
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
          form=${CUSTOMER_EDIT_FORM_ID}
          type="submit"
          ?disabled=${this._isSaving}>
          ${this._isSaving ? "Saving..." : "Save changes"}
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
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
  `,
  ];
}

export default MerchelloCustomerEditModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-edit-modal": MerchelloCustomerEditModalElement;
  }
}

