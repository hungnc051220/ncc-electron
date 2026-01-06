import { getOrders } from "@/data/loaders";
import PrintOnlineTicketsClient from "./components/print-online-tickets-client";

interface PrintOnlineTicketsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const PrintOnlineTicketsPage = async ({ searchParams }: PrintOnlineTicketsPageProps) => {
  const filter = await searchParams;
  const searchText = filter?.searchText;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize ? parseInt(filter.pageSize, 10) || 100 : 100;

  const orders = await getOrders({page, pageSize, searchText});

  return <PrintOnlineTicketsClient data={orders} page={page} />;
};

export default PrintOnlineTicketsPage;
