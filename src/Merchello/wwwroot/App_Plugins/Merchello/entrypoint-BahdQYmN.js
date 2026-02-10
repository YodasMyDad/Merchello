import { UMB_AUTH_CONTEXT as a } from "@umbraco-cms/backoffice/auth";
import { s as m } from "./merchello-api-BuImeZL2.js";
import { p as c } from "./store-settings-ovrk2IWq.js";
const o = "merchello-modal-width", d = () => {
  if (document.getElementById(o)) return;
  const e = document.createElement("style");
  e.id = o, e.textContent = `
    umb-backoffice-modal-container uui-modal-dialog > uui-dialog {
      width: min(36rem, calc(100vw - 2rem));
      min-width: min(36rem, calc(100vw - 2rem));
    }

    @media (max-width: 768px) {
      umb-backoffice-modal-container uui-modal-dialog > uui-dialog {
        width: calc(100vw - 1rem);
        min-width: calc(100vw - 1rem);
      }
    }
  `, document.head.appendChild(e);
}, u = (e, i) => {
  d(), e.consumeContext(a, async (n) => {
    const t = n?.getOpenApiConfiguration();
    m({
      token: t?.token,
      baseUrl: t?.base ?? "",
      credentials: t?.credentials ?? "same-origin"
    }), c();
  });
}, g = (e, i) => {
};
export {
  u as onInit,
  g as onUnload
};
//# sourceMappingURL=entrypoint-BahdQYmN.js.map
