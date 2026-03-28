import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import type { MerchelloPresenceContext } from "./presence.context.js";

export const MERCHELLO_PRESENCE_CONTEXT = new UmbContextToken<MerchelloPresenceContext>(
  "MerchelloPresenceContext",
);
