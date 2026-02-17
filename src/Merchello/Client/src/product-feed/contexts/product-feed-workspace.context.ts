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

    this.#entityContext.setEntityType(MERCHELLO_PRODUCT_FEED_ENTITY_TYPE);
    this.#entityContext.setUnique("product-feed");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
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
    return this.#feedId ?? "product-feed";
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

    this.#feed.setValue(data);
    this.#isLoading.setValue(false);
  }

  async reloadFeed(): Promise<void> {
    if (this.#feedId) {
      await this.loadFeed(this.#feedId);
    }
  }

  updateFeed(feed: ProductFeedDetailDto): void {
    this.#feed.setValue(feed);
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
}

export { MerchelloProductFeedWorkspaceContext as api };
