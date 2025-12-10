import { LitElement as g, html as v, css as w, state as h, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as W } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT as M } from "@umbraco-cms/backoffice/current-user";
import { M as d } from "./merchello-api-gshzVGsw.js";
var U = Object.defineProperty, T = Object.getOwnPropertyDescriptor, y = (t) => {
  throw TypeError(t);
}, u = (t, e, r, a) => {
  for (var o = a > 1 ? void 0 : a ? T(e, r) : e, c = t.length - 1, m; c >= 0; c--)
    (m = t[c]) && (o = (a ? m(e, r, o) : m(o)) || o);
  return a && o && U(e, r, o), o;
}, b = (t, e, r) => e.has(t) || y("Cannot " + r), s = (t, e, r) => (b(t, e, "read from private field"), r ? r.call(t) : e.get(t)), l = (t, e, r) => e.has(t) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r), E = (t, e, r, a) => (b(t, e, "write to private field"), e.set(t, r), r), n, p, f, _;
let i = class extends x(g) {
  constructor() {
    super(), this._yourName = "Press the button!", l(this, n), l(this, p, async (t) => {
      const e = t.target;
      e.state = "waiting";
      const { data: r, error: a } = await d.whoAmI();
      if (a) {
        e.state = "failed";
        return;
      }
      r !== void 0 && (this._serverUserData = r, e.state = "success"), s(this, n) && s(this, n).peek("warning", {
        data: {
          headline: `You are ${this._serverUserData?.name}`,
          message: `Your email is ${this._serverUserData?.email}`
        }
      });
    }), l(this, f, async (t) => {
      const e = t.target;
      e.state = "waiting";
      const { data: r, error: a } = await d.whatsTheTimeMrWolf();
      if (a) {
        e.state = "failed";
        return;
      }
      r !== void 0 && (this._timeFromMrWolf = new Date(r), e.state = "success");
    }), l(this, _, async (t) => {
      const e = t.target;
      e.state = "waiting";
      const { data: r, error: a } = await d.whatsMyName();
      if (a) {
        e.state = "failed";
        return;
      }
      this._yourName = r, e.state = "success";
    }), this.consumeContext(W, (t) => {
      E(this, n, t);
    }), this.consumeContext(M, (t) => {
      this.observe(
        t?.currentUser,
        (e) => {
          this._contextCurrentUser = e;
        },
        "_contextCurrentUser"
      );
    });
  }
  render() {
    return v`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <uui-box headline="Who am I?">
        <div slot="header">[Server]</div>
        <h2>
          <uui-icon name="icon-user"></uui-icon>${this._serverUserData?.email ? this._serverUserData.email : "Press the button!"}
        </h2>
        <ul>
          ${this._serverUserData?.groups.map(
      (t) => v`<li>${t.name}</li>`
    )}
        </ul>
        <uui-button
          color="default"
          look="primary"
          @click="${s(this, p)}"
        >
          Who am I?
        </uui-button>
        <p>
          This endpoint gets your current user from the server and displays your
          email and list of user groups. It also displays a Notification with
          your details.
        </p>
      </uui-box>

      <uui-box headline="What's my Name?">
        <div slot="header">[Server]</div>
        <h2><uui-icon name="icon-user"></uui-icon> ${this._yourName}</h2>
        <uui-button
          color="default"
          look="primary"
          @click="${s(this, _)}"
        >
          Whats my name?
        </uui-button>
        <p>
          This endpoint has a forced delay to show the button 'waiting' state
          for a few seconds before completing the request.
        </p>
      </uui-box>

      <uui-box headline="What's the Time?">
        <div slot="header">[Server]</div>
        <h2>
          <uui-icon name="icon-alarm-clock"></uui-icon> ${this._timeFromMrWolf ? this._timeFromMrWolf.toLocaleString() : "Press the button!"}
        </h2>
        <uui-button
          color="default"
          look="primary"
          @click="${s(this, f)}"
        >
          Whats the time Mr Wolf?
        </uui-button>
        <p>This endpoint gets the current date and time from the server.</p>
      </uui-box>

      <uui-box headline="Who am I?" class="wide">
        <div slot="header">[Context]</div>
        <p>Current user email: <b>${this._contextCurrentUser?.email}</b></p>
        <p>
          This is the JSON object available by consuming the
          'UMB_CURRENT_USER_CONTEXT' context:
        </p>
        <umb-code-block language="json" copy
          >${JSON.stringify(this._contextCurrentUser, null, 2)}</umb-code-block
        >
      </uui-box>
      </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
i.styles = [
  w`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        display: grid;
        gap: var(--uui-size-layout-1);
        padding: var(--uui-size-layout-1);
        grid-template-columns: 1fr 1fr 1fr;
      }

      uui-box {
        margin-bottom: var(--uui-size-layout-1);
      }

      h2 {
        margin-top: 0;
      }

      .wide {
        grid-column: span 3;
      }
    `
];
u([
  h()
], i.prototype, "_yourName", 2);
u([
  h()
], i.prototype, "_timeFromMrWolf", 2);
u([
  h()
], i.prototype, "_serverUserData", 2);
u([
  h()
], i.prototype, "_contextCurrentUser", 2);
i = u([
  C("merchello-dashboard")
], i);
const S = i;
export {
  i as MerchelloDashboardElement,
  S as default
};
//# sourceMappingURL=dashboard.element-B-ACd7qC.js.map
