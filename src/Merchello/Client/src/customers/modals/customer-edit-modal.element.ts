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
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  connectedCallback(): void {
    super.connectedCallback();
    // Pre-populate form with existing customer data
    if (this.data?.customer) {
      this._email = this.data.customer.email ?? "";
      this._firstName = this.data.customer.firstName ?? "";
      this._lastName = this.data.customer.lastName ?? "";
      this._memberKey = this.data.customer.memberKey ?? "";
      this._originalMemberKey = this.data.customer.memberKey ?? "";
      this._tags = this.data.customer.tags ?? [];
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

    const { data, error } = await MerchelloApi.updateCustomer(customerId, {
      email: this._email.trim(),
      firstName: this._firstName.trim() || null,
      lastName: this._lastName.trim() || null,
      memberKey: memberKeyChanged && this._memberKey ? this._memberKey : undefined,
      clearMemberKey,
      tags: this._tags,
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

  render() {
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

  static styles = css`
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
}

export default MerchelloCustomerEditModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-edit-modal": MerchelloCustomerEditModalElement;
  }
}
