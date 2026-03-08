import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

interface CustomerData {
  email: string;
  firstName: string | null;
  lastName: string | null;
  dateCreated: string;
  orderCount: number;
  isFlagged: boolean;
  acceptsMarketing: boolean;
  tags: string[];
}

@customElement("merchello-customer-panel")
export class MerchelloCustomerPanelElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) customerId = "";
  @property({ type: String }) actionKey = "";
  @property({ attribute: false }) closeModal: (() => void) | null = null;

  @state() private _data: CustomerData | null = null;
  @state() private _loading = true;
  @state() private _error: string | null = null;

  #tokenFn?: () => Promise<string | undefined>;
  #baseUrl = "";

  constructor() {
    super();
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      if (!authContext) return;
      const config = authContext.getOpenApiConfiguration();
      this.#tokenFn = config.token;
      this.#baseUrl = config.base ?? "";
      this._fetchData();
    });
  }

  private async _fetchData(): Promise<void> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.#tokenFn) {
        const token = await this.#tokenFn();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${this.#baseUrl}/umbraco/api/v1/customers/${this.customerId}`, {
        credentials: "same-origin",
        headers,
      });
      if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
      this._data = await res.json();
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  private _fmtDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  override render() {
    if (this._loading) return html`<uui-loader></uui-loader>`;

    if (this._error) {
      return html`
        <uui-box headline="Error">
          <p class="error">${this._error}</p>
          <uui-button look="secondary" label="Close" @click=${() => this.closeModal?.()}>Close</uui-button>
        </uui-box>
      `;
    }

    const d = this._data!;

    return html`
      <uui-box headline="Customer Details">
        <div class="field"><span class="label">Email</span><span>${d.email}</span></div>
        <div class="field"><span class="label">First Name</span><span>${d.firstName ?? "N/A"}</span></div>
        <div class="field"><span class="label">Last Name</span><span>${d.lastName ?? "N/A"}</span></div>
        <div class="field"><span class="label">Date Created</span><span>${this._fmtDate(d.dateCreated)}</span></div>
        <div class="field"><span class="label">Order Count</span><span>${d.orderCount}</span></div>
        <div class="field"><span class="label">Flagged</span><span>${d.isFlagged ? "Yes" : "No"}</span></div>
        <div class="field"><span class="label">Accepts Marketing</span><span>${d.acceptsMarketing ? "Yes" : "No"}</span></div>
        <div class="field"><span class="label">Tags</span><span>${d.tags?.join(", ") || "None"}</span></div>

        <div class="reference">
          <p>Customer ID: ${this.customerId}</p>
          <p>Action Key: ${this.actionKey}</p>
        </div>

        <uui-button look="primary" label="Close" @click=${() => this.closeModal?.()}>Close</uui-button>
      </uui-box>
    `;
  }

  static override styles = css`
    :host { display: block; }
    .field { display: flex; justify-content: space-between; padding: var(--uui-size-space-2) 0; border-bottom: 1px solid var(--uui-color-border); }
    .label { font-weight: 600; font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
    .error { color: var(--uui-color-danger); }
    .reference { margin-top: var(--uui-size-space-5); padding-top: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); font-size: var(--uui-type-small-size); color: var(--uui-color-text-alt); }
    .reference p { margin: 0 0 var(--uui-size-space-1); }
    uui-button { margin-top: var(--uui-size-space-4); }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-customer-panel": MerchelloCustomerPanelElement;
  }
}
