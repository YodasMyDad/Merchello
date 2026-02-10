import { UMB_AUTH_CONTEXT as d } from "@umbraco-cms/backoffice/auth";
import { s as r } from "./merchello-api-DFeoGYDY.js";
import { p as m } from "./store-settings-BfPYtFfT.js";
const a = "merchello-modal-width", s = "umb-backoffice-modal-container", u = `
  uui-modal-dialog > uui-dialog {
    max-width: calc(100vw - 2rem);
    min-width: min(36rem, calc(100vw - 2rem));
  }

  @media (max-width: 768px) {
    uui-modal-dialog > uui-dialog {
      max-width: calc(100vw - 1rem);
      min-width: calc(100vw - 1rem);
    }
  }
`;
let o = null;
const c = (t) => {
  if (!(t instanceof HTMLElement)) return;
  const e = t.shadowRoot;
  if (!e || e.getElementById(a)) return;
  const n = document.createElement("style");
  n.id = a, n.textContent = u, e.appendChild(n);
}, l = (t) => {
  t instanceof Element && (t.matches(s) && c(t), t.querySelectorAll(s).forEach((e) => {
    c(e);
  }));
}, E = () => {
  l(document.documentElement), customElements.whenDefined(s).then(() => {
    l(document.documentElement);
  }), !o && (o = new MutationObserver((t) => {
    t.forEach((e) => {
      e.addedNodes.forEach((n) => {
        l(n);
      });
    });
  }), o.observe(document.documentElement, { childList: !0, subtree: !0 }));
}, h = () => {
  o?.disconnect(), o = null;
}, g = (t, e) => {
  E(), t.consumeContext(d, async (n) => {
    const i = n?.getOpenApiConfiguration();
    r({
      token: i?.token,
      baseUrl: i?.base ?? "",
      credentials: i?.credentials ?? "same-origin"
    }), m();
  });
}, w = (t, e) => {
  h();
};
export {
  g as onInit,
  w as onUnload
};
//# sourceMappingURL=entrypoint-BI72tPee.js.map
