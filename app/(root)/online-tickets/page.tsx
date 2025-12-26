import { getOrders } from "@/data/loaders";
import OnlineTicketsClient from "./components/online-ticket-printing-client";

interface OnlineTicketsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const OnlineTicketsPage = async ({ searchParams }: OnlineTicketsPageProps) => {
  const filter = await searchParams;
  const searchText = filter?.searchText;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize ? parseInt(filter.pageSize, 10) || 100 : 100;

  const orders = await getOrders({page, pageSize, searchText});

  return <OnlineTicketsClient data={orders} page={page} />;
};

export default OnlineTicketsPage;
