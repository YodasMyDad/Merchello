import { nothing as p, html as c, css as h, state as u, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { M as _ } from "./merchello-api-COnU_HX2.js";
var v = Object.defineProperty, b = Object.getOwnPropertyDescriptor, l = (e, a, t, o) => {
  for (var r = o > 1 ? void 0 : o ? b(a, t) : a, s = e.length - 1, d; s >= 0; s--)
    (d = e[s]) && (r = (o ? d(a, t, r) : d(r)) || r);
  return o && r && v(a, t, r), r;
};
let i = class extends f {
  constructor() {
    super(...arguments), this._periodOption = "last30", this._customStartDate = "", this._customEndDate = "", this._isGenerating = !1, this._error = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._customEndDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const e = /* @__PURE__ */ new Date();
    e.setDate(e.getDate() - 30), this._customStartDate = e.toISOString().split("T")[0];
  }
  _getDateRange() {
    const e = /* @__PURE__ */ new Date(), a = e.toISOString().split("T")[0];
    switch (this._periodOption) {
      case "last30": {
        const t = /* @__PURE__ */ new Date();
        return t.setDate(t.getDate() - 30), { periodStart: t.toISOString().split("T")[0], periodEnd: a };
      }
      case "last60": {
        const t = /* @__PURE__ */ new Date();
        return t.setDate(t.getDate() - 60), { periodStart: t.toISOString().split("T")[0], periodEnd: a };
      }
      case "last90": {
        const t = /* @__PURE__ */ new Date();
        return t.setDate(t.getDate() - 90), { periodStart: t.toISOString().split("T")[0], periodEnd: a };
      }
      case "thisMonth":
        return { periodStart: new Date(e.getFullYear(), e.getMonth(), 1).toISOString().split("T")[0], periodEnd: a };
      case "custom":
        return {
          periodStart: this._customStartDate || void 0,
          periodEnd: this._customEndDate || void 0
        };
      default:
        return {};
    }
  }
  async _handleGenerate() {
    const e = this.data?.customerId;
    if (!e) return;
    if (this._periodOption === "custom") {
      if (!this._customStartDate || !this._customEndDate) {
        this._error = "Please select both start and end dates for custom range";
        return;
      }
      if (new Date(this._customStartDate) > new Date(this._customEndDate)) {
        this._error = "Start date must be before end date";
        return;
      }
    }
    this._isGenerating = !0, this._error = null;
    const { periodStart: a, periodEnd: t } = this._getDateRange(), { blob: o, filename: r, error: s } = await _.downloadCustomerStatement(
      e,
      a,
      t
    );
    if (this._isGenerating = !1, s || !o) {
      this._error = s?.message ?? "Failed to generate statement";
      return;
    }
    const d = URL.createObjectURL(o), n = document.createElement("a");
    n.href = d, n.download = r ?? "statement.pdf", n.style.display = "none", document.body.appendChild(n), n.addEventListener("click", (m) => m.stopPropagation(), { once: !0 }), n.click(), document.body.removeChild(n), URL.revokeObjectURL(d), this.value = { downloaded: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.value = { downloaded: !1 }, this.modalContext?.reject();
  }
  render() {
    const e = this.data?.customerName ?? "Customer";
    return c`
      <umb-body-layout headline="Generate Statement">
        <div id="main">
          ${this._error ? c`<div class="error-banner">${this._error}</div>` : p}

          <p class="description">
            Generate a PDF statement for <strong>${e}</strong> showing all
            invoices, payments, and outstanding balance for the selected period.
          </p>

          <div class="form-row">
            <label>Statement Period</label>
            <div class="period-options">
              ${this._renderPeriodOption("last30", "Last 30 Days")}
              ${this._renderPeriodOption("last60", "Last 60 Days")}
              ${this._renderPeriodOption("last90", "Last 90 Days")}
              ${this._renderPeriodOption("thisMonth", "This Month")}
              ${this._renderPeriodOption("custom", "Custom Range")}
            </div>
          </div>

          ${this._periodOption === "custom" ? c`
                <div class="date-range">
                  <div class="form-row">
                    <label for="start-date">From</label>
                    <uui-input
                      id="start-date"
                      type="date"
                      .value=${this._customStartDate}
                      @input=${(a) => this._customStartDate = a.target.value}
                      label="Start date"
                    ></uui-input>
                  </div>
                  <div class="form-row">
                    <label for="end-date">To</label>
                    <uui-input
                      id="end-date"
                      type="date"
                      .value=${this._customEndDate}
                      @input=${(a) => this._customEndDate = a.target.value}
                      label="End date"
                    ></uui-input>
                  </div>
                </div>
              ` : p}

          <div class="info-note">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              The statement includes an aging summary showing current and overdue
              amounts.
            </span>
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Download Statement"
            look="primary"
            color="positive"
            ?disabled=${this._isGenerating}
            @click=${this._handleGenerate}
          >
            ${this._isGenerating ? "Generating..." : "Download PDF"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderPeriodOption(e, a) {
    const t = this._periodOption === e;
    return c`
      <uui-button
        label=${a}
        look=${t ? "primary" : "outline"}
        @click=${() => this._periodOption = e}
      >
        ${a}
      </uui-button>
    `;
  }
};
i.styles = h`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .description {
      font-size: 0.9375rem;
      line-height: 1.5;
      margin: 0;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-row label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .period-options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .period-options uui-button {
      flex: 0 0 auto;
    }

    .date-range {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    .date-range uui-input {
      width: 100%;
    }

    .info-note {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .info-note uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-current);
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
  u()
], i.prototype, "_periodOption", 2);
l([
  u()
], i.prototype, "_customStartDate", 2);
l([
  u()
], i.prototype, "_customEndDate", 2);
l([
  u()
], i.prototype, "_isGenerating", 2);
l([
  u()
], i.prototype, "_error", 2);
i = l([
  g("merchello-generate-statement-modal")
], i);
const w = i;
export {
  i as MerchelloGenerateStatementModalElement,
  w as default
};
//# sourceMappingURL=generate-statement-modal.element-CZrDhwMU.js.map
