import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface GenerateStatementModalData {
  customerId: string;
  customerName: string;
  currencyCode: string;
}

export interface GenerateStatementModalValue {
  downloaded: boolean;
}

export const MERCHELLO_GENERATE_STATEMENT_MODAL = new UmbModalToken<
  GenerateStatementModalData,
  GenerateStatementModalValue
>("Merchello.GenerateStatement.Modal", {
  modal: {
    type: "dialog",
    size: "medium",
  },
});
