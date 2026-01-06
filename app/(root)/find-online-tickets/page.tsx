import { getOrders } from "@/data/loaders";
import FindOnlineTicketsClient from "./components/find-online-tickets-client";

interface FindOnlineTicketsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const FindOnlineTicketsPage = async ({ searchParams }: FindOnlineTicketsPageProps) => {
  const filter = await searchParams;
  const searchText = filter?.searchText;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize ? parseInt(filter.pageSize, 10) || 100 : 100;

  const orders = await getOrders({page, pageSize, searchText});

  return <FindOnlineTicketsClient data={orders} page={page} />;
};

export default FindOnlineTicketsPage;
