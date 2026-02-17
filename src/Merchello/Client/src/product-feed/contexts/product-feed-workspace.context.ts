import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbBooleanState, UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_PRODUCT_FEED_ENTITY_TYPE } from "@tree/types/tree.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductFeedDetailDto } from "@product-feed/types/product-feed.types.js";

export const MERCHELLO_PRODUCT_FEED_WORKSPACE_ALIAS = "Merchello.ProductFeed.Workspace";
const PRODUCT_FEED_TOKEN_STORAGE_KEY = "merchello:product-feed:tokens";

export class MerchelloProductFeedWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_PRODUCT_FEED_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);
  #feedId?: string;
  #isNew = false;

  #feed = new UmbObjectState<ProductFeedDetailDto | undefined>(undefined);
  readonly feed = this.#feed.asObservable();

  #isLoading = new UmbBooleanState(false);
  readonly isLoading = this.#isLoading.asObservable();

  #loadError = new UmbObjectState<string | null>(null);
  readonly loadError = this.#loadError.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#normalizeLegacyRoutePath();

    this.#entityContext.setEntityType(MERCHELLO_PRODUCT_FEED_ENTITY_TYPE);
    this.#entityContext.setUnique("product-feeds");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
      {
        path: "edit/product-feed",
        redirectTo: "edit/product-feeds",
      },
      {
        path: "edit/product-feed/create",
        redirectTo: "edit/product-feeds/create",
      },
      {
        path: "edit/product-feed/:id",
        component: () =>
          import("@product-feed/components/product-feed-detail.element.js"),
        setup: (_component, info) => {
          const id = info.match.params.id;
          this.#redirectLegacyPath("/edit/product-feed/", "/edit/product-feeds/");
          this.loadFeed(id);
        },
      },
      {
        path: "edit/product-feeds/create",
        component: () =>
          import("@product-feed/components/product-feed-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#feedId = undefined;
          this.#loadError.setValue(null);
          this.#feed.setValue({
            id: "",
            name: "",
            slug: "",
            isEnabled: true,
            countryCode: "US",
            currencyCode: "USD",
            languageCode: "en",
            includeTaxInPrice: false,
            filterConfig: {
              productTypeIds: [],
              collectionIds: [],
              filterValueGroups: [],
            },
            customLabels: [],
            customFields: [],
            manualPromotions: [],
            lastGeneratedUtc: null,
            lastGenerationError: null,
            hasProductSnapshot: false,
            hasPromotionsSnapshot: false,
            accessToken: null,
          });
        },
      },
      {
        path: "edit/product-feeds/:id",
        component: () =>
          import("@product-feed/components/product-feed-detail.element.js"),
        setup: (_component, info) => {
          const id = info.match.params.id;
          this.loadFeed(id);
        },
      },
      {
        path: "edit/product-feeds",
        component: () =>
          import("@product-feed/components/product-feed-workspace-editor.element.js"),
        setup: () => {
          this.#feedId = undefined;
          this.#isNew = false;
          this.#feed.setValue(undefined);
          this.#loadError.setValue(null);
          this.#isLoading.setValue(false);
        },
      },
      {
        path: "",
        redirectTo: "edit/product-feeds",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_PRODUCT_FEED_ENTITY_TYPE;
  }

  getUnique(): string {
    return this.#feedId ?? "product-feeds";
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  async loadFeed(unique: string): Promise<void> {
    this.#feedId = unique;
    this.#isNew = false;
    this.#isLoading.setValue(true);
    this.#loadError.setValue(null);

    const { data, error } = await MerchelloApi.getProductFeed(unique);
    if (error || !data) {
      this.#loadError.setValue(error?.message ?? "Feed not found.");
      this.#isLoading.setValue(false);
      return;
    }

    // API never returns token hashes as plaintext after save, so keep known tokens
    // from in-memory state and browser storage for this user session.
    const existingFeed = this.#feed.getValue();
    const storedToken = this.#getPersistedToken(data.id);
    const accessToken =
      data.accessToken ??
      (existingFeed?.id === data.id ? existingFeed.accessToken : null) ??
      storedToken;

    this.#persistToken(data.id, accessToken);

    this.#feed.setValue({
      ...data,
      accessToken,
    });
    this.#isLoading.setValue(false);
  }

  async reloadFeed(): Promise<void> {
    if (this.#feedId) {
      await this.loadFeed(this.#feedId);
    }
  }

  updateFeed(feed: ProductFeedDetailDto): void {
    const existingFeed = this.#feed.getValue();
    const storedToken = feed.id ? this.#getPersistedToken(feed.id) : null;
    const accessToken =
      feed.accessToken ??
      (existingFeed?.id === feed.id ? existingFeed.accessToken : null) ??
      storedToken;

    this.#persistToken(feed.id, accessToken);
    this.#feed.setValue({
      ...feed,
      accessToken,
    });
    if (feed.id) {
      this.#feedId = feed.id;
      this.#isNew = false;
    }
  }

  clearFeed(): void {
    this.#feedId = undefined;
    this.#isNew = false;
    this.#feed.setValue(undefined);
    this.#loadError.setValue(null);
    this.#isLoading.setValue(false);
  }

  #redirectLegacyPath(legacyPathFragment: string, canonicalPathFragment: string): void {
    const { pathname, search, hash } = window.location;
    if (!pathname.includes(legacyPathFragment)) {
      return;
    }

    const canonicalPath = pathname.replace(legacyPathFragment, canonicalPathFragment);
    history.replaceState(history.state, "", `${canonicalPath}${search}${hash}`);
  }

  #normalizeLegacyRoutePath(): void {
    const { pathname, search, hash } = window.location;
    let canonicalPath = pathname;

    if (canonicalPath.includes("/edit/product-feed/")) {
      canonicalPath = canonicalPath.replace("/edit/product-feed/", "/edit/product-feeds/");
    } else if (canonicalPath.endsWith("/edit/product-feed")) {
      canonicalPath = canonicalPath.replace("/edit/product-feed", "/edit/product-feeds");
    }

    if (canonicalPath !== pathname) {
      history.replaceState(history.state, "", `${canonicalPath}${search}${hash}`);
    }
  }

  #persistToken(feedId: string | undefined, token: string | null | undefined): void {
    if (!feedId || !token) {
      return;
    }

    try {
      const current = this.#readPersistedTokens();
      current[feedId] = token;
      window.sessionStorage.setItem(PRODUCT_FEED_TOKEN_STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Ignore storage failures (private mode, quota exceeded, etc.).
    }
  }

  #getPersistedToken(feedId: string | undefined): string | null {
    if (!feedId) {
      return null;
    }

    try {
      const current = this.#readPersistedTokens();
      const token = current[feedId];
      return token?.trim() ? token : null;
    } catch {
      return null;
    }
  }

  #readPersistedTokens(): Record<string, string> {
    const raw = window.sessionStorage.getItem(PRODUCT_FEED_TOKEN_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const tokens: Record<string, string> = {};
    for (const [feedId, token] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof token !== "string" || !token.trim()) {
        continue;
      }

      tokens[feedId] = token;
    }

    return tokens;
  }
}

export { MerchelloProductFeedWorkspaceContext as api };
