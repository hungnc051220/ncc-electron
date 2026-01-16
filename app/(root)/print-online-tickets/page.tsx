import { getOrders } from "@/data/loaders";
import PrintOnlineTicketsClient from "./components/print-online-tickets-client";

interface PrintOnlineTicketsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const PrintOnlineTicketsPage = async ({
  searchParams,
}: PrintOnlineTicketsPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = 100;
  const orders = await getOrders({ page, pageSize, orderStatusId: 30 });

  return <PrintOnlineTicketsClient data={orders} page={page} />;
};

export default PrintOnlineTicketsPage;
