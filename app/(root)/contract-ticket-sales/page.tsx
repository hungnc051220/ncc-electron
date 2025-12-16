import {
  getContractTicketSales
} from "@/data/loaders";
import { format } from "date-fns";
import ContractTicketSalesClient from "./components/contract-ticket-sales-client";

interface ContractTicketSalesPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const ContractTicketSalesPage = async ({
  searchParams,
}: ContractTicketSalesPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const fromDate = format(new Date(), "yyyy-MM-dd");
  const toDate = format(new Date(), "yyyy-MM-dd");

  const data = await getContractTicketSales({
    fromDate,
    toDate,
    page,
    pageSize,
  });

  return (
    <ContractTicketSalesClient
      data={data}
      page={page}
    />
  );
};

export default ContractTicketSalesPage;
