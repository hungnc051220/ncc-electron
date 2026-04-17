import { ContractTicketSalesQuery } from "@renderer/api/contractTicketSales.api";

export const contractTicketSalesKeys = {
  all: ["contract-ticket-sales"] as const,
  getAll: (params: ContractTicketSalesQuery) => ["contract-ticket-sales", params] as const,
  getSummary: (params: ContractTicketSalesQuery) =>
    ["contract-ticket-sales-summary", params] as const
};
