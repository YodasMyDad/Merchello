import { UMB_AUTH_CONTEXT as s } from "@umbraco-cms/backoffice/auth";
import { s as i } from "./merchello-api-BM4-Q40x.js";
import { p as r } from "./store-settings-DKmhm5Dt.js";
const g = (n, t) => {
  n.consumeContext(s, async (e) => {
    const o = e?.getOpenApiConfiguration();
    i({
      token: o?.token,
      baseUrl: o?.base ?? "",
      credentials: o?.credentials ?? "same-origin"
    }), r();
  });
}, m = (n, t) => {
};
export {
  g as onInit,
  m as onUnload
};
//# sourceMappingURL=entrypoint-iW_nXkIB.js.map
