import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import type { WarehouseDetailDto } from "@warehouses/types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export class MerchelloWarehouseDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.Warehouse.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #warehouseId?: string;
  #isNew = false;
  #warehouse = new UmbObjectState<WarehouseDetailDto | undefined>(undefined);
  readonly warehouse = this.#warehouse.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    // Set up routes for create and edit
    this.routes.setRoutes([
      {
        path: "create",
        component: () => import("@warehouses/components/warehouse-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#warehouseId = undefined;
          this.#warehouse.setValue(this._createEmptyWarehouse());
        },
      },
      {
        path: "edit/:id",
        component: () => import("@warehouses/components/warehouse-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.load(id);
        },
      },
    ]);
  }

  getEntityType(): string {
    return "merchello-warehouse";
  }

  getUnique(): string | undefined {
    return this.#warehouseId;
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  async load(unique: string): Promise<void> {
    this.#warehouseId = unique;
    const { data, error } = await MerchelloApi.getWarehouseDetail(unique);
    if (error) {
      console.error("Failed to load warehouse:", error);
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
        countyStateCode: "",
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

export { MerchelloWarehouseDetailWorkspaceContext as api };
