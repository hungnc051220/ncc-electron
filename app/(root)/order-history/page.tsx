import { getOrders } from "@/data/loaders";
import OrderHistoryClient from "./components/order-history-client";
import { endOfDay, parse, startOfDay } from "date-fns";

interface OrderHistoryPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const OrderHistoryPage = async ({ searchParams }: OrderHistoryPageProps) => {
  const filter = await searchParams;
  const searchText = filter?.searchText;
  const isOnline = filter?.isOnline;
  const id = filter?.id;
  const phoneNumber = filter?.phoneNumber;
  const email = filter?.email;
  const barCode = filter?.barCode;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;
  const fromDate = filter?.fromDate;
  const toDate = filter?.toDate;
  const parsedFromDate = fromDate
    ? startOfDay(parse(fromDate, "yyyy-MM-dd", new Date()))
    : undefined;
  const parsedToDate = toDate
    ? endOfDay(parse(toDate, "yyyy-MM-dd", new Date()))
    : undefined;

  const orders = await getOrders({
    page,
    pageSize,
    searchText,
    isOnline,
    barCode,
    id,
    phoneNumber,
    email,
    fromDate: parsedFromDate ? parsedFromDate.toISOString() : undefined,
    toDate: parsedToDate ? parsedToDate.toISOString() : undefined,
  });

  return <OrderHistoryClient data={orders} page={page} />;
};

export default OrderHistoryPage;
