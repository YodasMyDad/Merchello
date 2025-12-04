import { html as d, css as u, state as c, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
var p = Object.defineProperty, h = Object.getOwnPropertyDescriptor, n = (s, t, l, a) => {
  for (var e = a > 1 ? void 0 : a ? h(t, l) : t, r = s.length - 1, o; r >= 0; r--)
    (o = s[r]) && (e = (a ? o(t, l, e) : o(e)) || e);
  return a && e && p(t, l, e), e;
};
let i = class extends v {
  constructor() {
    super(...arguments), this._isSaving = !1;
  }
  async _handleSave() {
    this._isSaving = !0, this._isSaving = !1, this.value = { saved: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    return d`
      <umb-body-layout headline="Edit Order">
        <div id="main">
          <div class="placeholder">
            <uui-icon name="icon-edit"></uui-icon>
            <p>Order edit form will be implemented here</p>
          </div>
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Save"
            look="primary"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
          >
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
i.styles = u`
    #main {
      padding: var(--uui-size-space-4);
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .placeholder uui-icon {
      font-size: 48px;
      margin-bottom: var(--uui-size-space-4);
    }

    .placeholder p {
      margin: 0;
      font-size: 1rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
n([
  c()
], i.prototype, "_isSaving", 2);
i = n([
  m("merchello-edit-order-modal")
], i);
const _ = i;
export {
  i as MerchelloEditOrderModalElement,
  _ as default
};
//# sourceMappingURL=edit-order-modal.element-BttOOn5Z.js.map
