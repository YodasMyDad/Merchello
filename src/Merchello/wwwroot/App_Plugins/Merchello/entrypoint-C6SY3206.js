import { UMB_AUTH_CONTEXT as s } from "@umbraco-cms/backoffice/auth";
import { s as i } from "./merchello-api-Z_Hs6xGH.js";
import { p as r } from "./store-settings-jKwDIG8t.js";
const c = (e, n) => {
  console.log("Hello from my extension 🎉"), e.consumeContext(s, async (t) => {
    const o = t?.getOpenApiConfiguration();
    i({
      token: o?.token,
      baseUrl: o?.base ?? "",
      credentials: o?.credentials ?? "same-origin"
    }), r();
  });
}, g = (e, n) => {
  console.log("Goodbye from my extension 👋");
};
export {
  c as onInit,
  g as onUnload
};
//# sourceMappingURL=entrypoint-C6SY3206.js.map
