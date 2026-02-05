import { LitElement as g, html as f, css as C, state as h, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as b } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_CONTEXT as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as w } from "@umbraco-cms/backoffice/notification";
import { M as E } from "./merchello-api-DkRa4ImO.js";
var $ = Object.defineProperty, x = Object.getOwnPropertyDescriptor, c = (e) => {
  throw TypeError(e);
}, p = (e, t, a, l) => {
  for (var i = l > 1 ? void 0 : l ? x(t, a) : t, u = e.length - 1, d; u >= 0; u--)
    (d = e[u]) && (i = (l ? d(t, a, i) : d(i)) || i);
  return l && i && $(t, a, i), i;
}, v = (e, t, a) => t.has(e) || c("Cannot " + a), n = (e, t, a) => (v(e, t, "read from private field"), t.get(e)), m = (e, t, a) => t.has(e) ? c("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), _ = (e, t, a, l) => (v(e, t, "write to private field"), t.set(e, a), a), s, o;
let r = class extends b(g) {
  constructor() {
    super(), this._name = "", this._heading = "", this._isSaving = !1, m(this, s), m(this, o), this.consumeContext(M, (e) => {
      _(this, s, e);
    }), this.consumeContext(w, (e) => {
      _(this, o, e);
    });
  }
  _handleNameInput(e) {
    this._name = e.target.value;
  }
  _handleHeadingInput(e) {
    this._heading = e.target.value;
  }
  _handleClose() {
    n(this, s)?.reject();
  }
  async _handleCreate() {
    if (!this._name.trim()) return;
    this._isSaving = !0;
    const { data: e, error: t } = await E.createUpsell({
      name: this._name.trim(),
      heading: this._heading.trim() || this._name.trim(),
      displayLocation: 1
      // Default to Checkout
    });
    if (this._isSaving = !1, t) {
      n(this, o)?.peek("danger", {
        data: { headline: "Error", message: t.message }
      });
      return;
    }
    e?.id && (n(this, o)?.peek("positive", {
      data: { headline: "Upsell created", message: `"${this._name}" has been created` }
    }), n(this, s)?.setValue({ id: e.id }), n(this, s)?.submit());
  }
  render() {
    return f`
      <umb-body-layout headline="Create Upsell">
        <div class="form">
          <umb-property-layout label="Name" description="Internal name for this upsell rule">
            <uui-input
              slot="editor"
              .value=${this._name}
              @input=${this._handleNameInput}
              placeholder="e.g. Bed to Pillow Upsell"
              label="Name"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Heading" description="Customer-facing heading shown with recommendations">
            <uui-input
              slot="editor"
              .value=${this._heading}
              @input=${this._handleHeadingInput}
              placeholder="e.g. Complete your bedroom"
              label="Heading"
            ></uui-input>
          </umb-property-layout>
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Create"
            @click=${this._handleCreate}
            ?disabled=${!this._name.trim() || this._isSaving}
          >
            ${this._isSaving ? "Creating..." : "Create"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
s = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
r.styles = C`
    :host {
      display: block;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
    }

    uui-input {
      width: 100%;
    }
  `;
p([
  h()
], r.prototype, "_name", 2);
p([
  h()
], r.prototype, "_heading", 2);
p([
  h()
], r.prototype, "_isSaving", 2);
r = p([
  y("merchello-create-upsell-modal")
], r);
const T = r;
export {
  r as MerchelloCreateUpsellModalElement,
  T as default
};
//# sourceMappingURL=create-upsell-modal.element-TrdRFEqF.js.map
