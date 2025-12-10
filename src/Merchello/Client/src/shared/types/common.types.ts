/** Generic select option for dropdown/combo fields */
export interface SelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

/** Warning/error item for validation display */
export interface WarningItem {
  type: "error" | "warning";
  message: string;
}
