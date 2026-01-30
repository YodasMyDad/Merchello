import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_WAREHOUSES_ENTITY_TYPE } from "@tree/types/tree.types.js";
import type { WarehouseDetailDto } from "@warehouses/types/warehouses.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_WAREHOUSES_WORKSPACE_ALIAS = "Merchello.Warehouses.Workspace";

/**
 * Unified workspace context for warehouses - handles both list and detail views.
 * Uses single entity type for consistent tree selection.
 */
export class MerchelloWarehousesWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_WAREHOUSES_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // Warehouse detail state
  #warehouseId?: string;
  #isNew = false;
  #warehouse = new UmbObjectState<WarehouseDetailDto | undefined>(undefined);
  readonly warehouse = this.#warehouse.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_WAREHOUSES_ENTITY_TYPE);
    this.#entityContext.setUnique("warehouses");

    this.routes = new UmbWorkspaceRouteManager(host);

    // Routes ordered by specificity (most specific first)
    // All routes nested under "edit/warehouses" so tree item path matching works
    // Tree item path: section/merchello/workspace/merchello-warehouses/edit/warehouses
    this.routes.setRoutes([
      // Create warehouse route (before :id to avoid matching "create" as an id)
      {
        path: "edit/warehouses/create",
        component: () => import("../components/warehouse-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#warehouseId = undefined;
          this.#warehouse.setValue(this._createEmptyWarehouse());
        },
      },
      // Warehouse detail route (GUID parameter)
      {
        path: "edit/warehouses/:id",
        component: () => import("../components/warehouse-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.load(id);
        },
      },
      // Warehouses list route
      {
        path: "edit/warehouses",
        component: () => import("../components/warehouses-workspace-editor.element.js"),
        setup: () => {
          // Reset detail state when viewing list
          this.#warehouseId = undefined;
          this.#warehouse.setValue(undefined);
          this.#isNew = false;
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/warehouses",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_WAREHOUSES_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#warehouseId ?? "warehouses";
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  // Warehouse loading and management

  async load(unique: string): Promise<void> {
    this.#warehouseId = unique;
    const { data, error } = await MerchelloApi.getWarehouseDetail(unique);
    if (error) {
      return;
    }
    this.#warehouse.setValue(data);
  }

  async reload(): Promise<void> {
    if (this.#warehouseId) {
      await this.load(this.#warehouseId);
    }
  }

  updateWarehouse(warehouse: WarehouseDetailDto): void {
    this.#warehouse.setValue(warehouse);
    if (warehouse.id && this.#isNew) {
      this.#warehouseId = warehouse.id;
      this.#isNew = false;
    }
  }

  private _createEmptyWarehouse(): WarehouseDetailDto {
    return {
      id: "",
      name: "",
      code: "",
      supplierId: undefined,
      supplierName: undefined,
      address: {
        name: "",
        company: "",
        addressOne: "",
        addressTwo: "",
        townCity: "",
        countyState: "",
        regionCode: "",
        postalCode: "",
        country: "",
        countryCode: "",
        email: "",
        phone: "",
      },
      serviceRegions: [],
      shippingOptionCount: 0,
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    };
  }
}

export { MerchelloWarehousesWorkspaceContext as api };
