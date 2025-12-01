import type { UmbTreeItemModel, UmbTreeRootModel } from "@umbraco-cms/backoffice/tree";

export interface MerchelloTreeItemModel extends UmbTreeItemModel {
  entityType: string;
  unique: string;
  name: string;
  hasChildren: boolean;
  isFolder: boolean;
  icon?: string;
  parent: { unique: string | null; entityType: string };
}

export interface MerchelloTreeRootModel extends UmbTreeRootModel {
  entityType: string;
  unique: null;
  name: string;
  hasChildren: boolean;
  isFolder: boolean;
}

export const MERCHELLO_ROOT_ENTITY_TYPE = "merchello-root";
export const MERCHELLO_SETTINGS_ENTITY_TYPE = "merchello-settings";
