import { html as a, nothing as n, css as h, state as u, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-B76CV0sD.js";
import { m as _ } from "./modal-layout.styles-C2OaUji5.js";
var b = Object.defineProperty, v = Object.getOwnPropertyDescriptor, r = (e, t, s, o) => {
  for (var l = o > 1 ? void 0 : o ? v(t, s) : t, c = e.length - 1, d; c >= 0; c--)
    (d = e[c]) && (l = (o ? d(t, s, l) : d(l)) || l);
  return o && l && b(t, s, l), l;
};
const f = 25;
let i = class extends g {
  constructor() {
    super(...arguments), this._items = [], this._isLoading = !1, this._currentPage = 1, this._totalItems = 0, this._totalPages = 0, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadPage(1);
  }
  async _loadPage(e) {
    const t = this.data?.alias;
    if (!t) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: s, error: o } = await m.getHealthCheckDetail(t, e, f);
    if (this._isLoading = !1, o || !s) {
      this._errorMessage = o?.message ?? "Failed to load details.";
      return;
    }
    this._items = s.items, this._currentPage = s.page, this._totalItems = s.totalItems, this._totalPages = s.totalPages;
  }
  _goToPage(e) {
    e < 1 || e > this._totalPages || this._loadPage(e);
  }
  _navigateToItem(e) {
    e.editPath && (window.history.pushState({}, "", e.editPath), this._close());
  }
  _close() {
    this.value = { refreshed: !0 }, this.modalContext?.submit();
  }
  _renderItems() {
    return this._isLoading ? a`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? a`
        <div class="error-banner">
          <umb-icon name="icon-alert"></umb-icon>
          <span>${this._errorMessage}</span>
        </div>
      ` : this._items.length === 0 ? a`<p class="hint">No affected items found.</p>` : a`
      <div class="items-table-wrap">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Details</uui-table-head-cell>
            <uui-table-head-cell style="width: 80px"></uui-table-head-cell>
          </uui-table-head>
          ${this._items.map((e) => a`
            <uui-table-row>
              <uui-table-cell>
                <span class="item-name">${e.name}</span>
              </uui-table-cell>
              <uui-table-cell>
                ${e.description ? a`<span class="item-description">${e.description}</span>` : n}
              </uui-table-cell>
              <uui-table-cell>
                ${e.editPath ? a`
                      <uui-button
                        compact
                        look="secondary"
                        label="Edit ${e.name}"
                        @click=${() => this._navigateToItem(e)}>
                        Edit
                      </uui-button>
                    ` : n}
              </uui-table-cell>
            </uui-table-row>
          `)}
        </uui-table>
      </div>
    `;
  }
  _renderPagination() {
    return this._totalPages <= 1 ? n : a`
      <div class="pagination">
        <uui-button
          compact
          look="secondary"
          label="Previous page"
          ?disabled=${this._currentPage <= 1 || this._isLoading}
          @click=${() => this._goToPage(this._currentPage - 1)}>
          Previous
        </uui-button>

        <span class="pagination-info">
          Page ${this._currentPage} of ${this._totalPages}
          (${this._totalItems} item${this._totalItems === 1 ? "" : "s"})
        </span>

        <uui-button
          compact
          look="secondary"
          label="Next page"
          ?disabled=${this._currentPage >= this._totalPages || this._isLoading}
          @click=${() => this._goToPage(this._currentPage + 1)}>
          Next
        </uui-button>
      </div>
    `;
  }
  render() {
    const e = this.data?.name ?? "Health Check", t = this.data?.description ?? "";
    return a`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${t ? a`<p class="check-description">${t}</p>` : n}

          ${this._renderItems()}
          ${this._renderPagination()}
        </div>

        <uui-button slot="actions" look="secondary" label="Close" @click=${this._close}>
          Close
        </uui-button>
      </umb-body-layout>
    `;
  }
};
i.styles = [
  _,
  h`
      :host {
        display: block;
      }

      #main {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .check-description {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-default-size);
        line-height: 1.5;
      }

      .items-table-wrap {
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow-x: auto;
      }

      .item-name {
        font-weight: 600;
        color: var(--uui-color-text);
      }

      .item-description {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3) 0;
      }

      .pagination-info {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-5);
      }

      .hint {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        text-align: center;
        padding: var(--uui-size-space-5);
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
      }
    `
];
r([
  u()
], i.prototype, "_items", 2);
r([
  u()
], i.prototype, "_isLoading", 2);
r([
  u()
], i.prototype, "_currentPage", 2);
r([
  u()
], i.prototype, "_totalItems", 2);
r([
  u()
], i.prototype, "_totalPages", 2);
r([
  u()
], i.prototype, "_errorMessage", 2);
i = r([
  p("merchello-health-check-detail-modal")
], i);
const z = i;
export {
  i as MerchelloHealthCheckDetailModalElement,
  z as default
};
//# sourceMappingURL=health-check-detail-modal.element-C3XeVhJW.js.map
