// Element Type types for rendering Umbraco property editors in the product workspace

export interface ElementTypeDto {
  id: string;
  alias: string;
  name: string;
  containers: ElementTypeContainerDto[];
  properties: ElementTypePropertyDto[];
}

export interface ElementTypeContainerDto {
  id: string;
  parentId: string | null;
  name: string | null;
  type: "Tab" | "Group";
  sortOrder: number;
}

export interface ElementTypePropertyDto {
  id: string;
  containerId: string | null;
  alias: string;
  name: string;
  description: string | null;
  sortOrder: number;
  dataTypeId: string;
  propertyEditorUiAlias: string;
  dataTypeConfiguration: unknown;
  mandatory: boolean;
  mandatoryMessage: string | null;
  validationRegex: string | null;
  validationRegexMessage: string | null;
  labelOnTop: boolean;
}
