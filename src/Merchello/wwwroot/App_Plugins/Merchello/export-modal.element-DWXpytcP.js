import { nothing as m, html as p, css as f, state as d, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as _ } from "./merchello-api-B1skiL_A.js";
import { c } from "./formatting-BB_-NCdW.js";
function h(e) {
  if (e == null)
    return "";
  const t = String(e);
  return t.includes(",") || t.includes('"') || t.includes(`
`) ? `"${t.replace(/"/g, '""')}"` : t;
}
function v(e, t) {
  const i = t.map((o) => h(o.header)).join(","), a = e.map(
    (o) => t.map((s) => h(s.accessor(o))).join(",")
  );
  return [i, ...a].join(`
`);
}
function D(e, t) {
  const a = new Blob(["\uFEFF" + e], { type: "text/csv;charset=utf-8;" }), o = document.createElement("a"), s = URL.createObjectURL(a);
  o.setAttribute("href", s), o.setAttribute("download", t), o.style.visibility = "hidden", document.body.appendChild(o), o.click(), document.body.removeChild(o), URL.revokeObjectURL(s);
}
function x(e) {
  return new Date(e).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}
var y = Object.defineProperty, E = Object.getOwnPropertyDescriptor, u = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? E(t, i) : t, s = e.length - 1, l; s >= 0; s--)
    (l = e[s]) && (o = (a ? l(t, i, o) : l(o)) || o);
  return a && o && y(t, i, o), o;
};
let n = class extends b {
  constructor() {
    super(...arguments), this._fromDate = "", this._toDate = "", this._isExporting = !1, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback();
    const e = /* @__PURE__ */ new Date(), t = new Date(e);
    t.setDate(e.getDate() - 30), this._toDate = this._formatDateForInput(e), this._fromDate = this._formatDateForInput(t);
  }
  _formatDateForInput(e) {
    return e.toISOString().split("T")[0];
  }
  async _handleExport() {
    if (!this._fromDate || !this._toDate) {
      this._errorMessage = "Please select both from and to dates";
      return;
    }
    const e = new Date(this._fromDate), t = new Date(this._toDate);
    if (e > t) {
      this._errorMessage = "From date must be before or equal to To date";
      return;
    }
    this._isExporting = !0, this._errorMessage = null;
    const { data: i, error: a } = await _.exportOrders({
      fromDate: this._fromDate,
      toDate: this._toDate
    });
    if (a) {
      this._errorMessage = a.message, this._isExporting = !1;
      return;
    }
    if (!i || i.length === 0) {
      this._errorMessage = "No orders found in the selected date range", this._isExporting = !1;
      return;
    }
    const s = v(i, [
      { header: "Inv #", accessor: (r) => r.invoiceNumber },
      { header: "Inv Date", accessor: (r) => x(r.invoiceDate) },
      { header: "Payment Status", accessor: (r) => r.paymentStatus },
      { header: "Billing Name", accessor: (r) => r.billingName },
      { header: "Product Sub Total", accessor: (r) => c(r.subTotal, 2) },
      { header: "Tax", accessor: (r) => c(r.tax, 2) },
      { header: "Shipping", accessor: (r) => c(r.shipping, 2) },
      { header: "Total", accessor: (r) => c(r.total, 2) }
    ]), l = `orders-export-${this._fromDate}-to-${this._toDate}.csv`;
    D(s, l), this._isExporting = !1, this.value = { exported: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    return p`
      <umb-body-layout headline="Export Orders">
        <div id="main">
          ${this._errorMessage ? p`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : m}

          <p class="description">
            Export orders within a date range to CSV format. The export includes invoice number,
            date, payment status, billing name, subtotal, tax, shipping, and total.
          </p>

          <div class="form-field">
            <label for="fromDate">From Date *</label>
            <uui-input
              id="fromDate"
              type="date"
              .value=${this._fromDate}
              required
              @input=${(e) => {
      this._fromDate = e.target.value;
    }}
            ></uui-input>
          </div>

          <div class="form-field">
            <label for="toDate">To Date *</label>
            <uui-input
              id="toDate"
              type="date"
              .value=${this._toDate}
              required
              @input=${(e) => {
      this._toDate = e.target.value;
    }}
            ></uui-input>
          </div>
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isExporting}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Export"
            look="primary"
            color="positive"
            @click=${this._handleExport}
            ?disabled=${this._isExporting || !this._fromDate || !this._toDate}
          >
            ${this._isExporting ? p`<uui-loader-circle></uui-loader-circle>` : m}
            ${this._isExporting ? "Exporting..." : "Export to CSV"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n.styles = f`
    :host {
      display: block;
    }

    .description {
      margin: 0 0 var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      line-height: 1.5;
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

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    uui-input {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    uui-button uui-loader-circle {
      margin-right: var(--uui-size-space-2);
    }
  `;
u([
  d()
], n.prototype, "_fromDate", 2);
u([
  d()
], n.prototype, "_toDate", 2);
u([
  d()
], n.prototype, "_isExporting", 2);
u([
  d()
], n.prototype, "_errorMessage", 2);
n = u([
  g("merchello-export-modal")
], n);
const S = n;
export {
  n as MerchelloExportModalElement,
  S as default
};
//# sourceMappingURL=export-modal.element-DWXpytcP.js.map
