import { getCancellationTickets } from "@/data/loaders";
import { endOfDay, parse, startOfDay } from "date-fns";
import CancellationTicketsClient from "./components/cancellation-tickets-client";

interface CancellationTicketsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const CancellationTicketsPage = async ({
  searchParams,
}: CancellationTicketsPageProps) => {
  const filter = await searchParams;
  const filmId = filter?.filmId;
  const userId = filter?.userId;
  const fromDate = filter?.fromDate;
  const toDate = filter?.toDate;
  const parsedFromDate = fromDate
    ? startOfDay(parse(fromDate, "yyyy-MM-dd", new Date()))
    : undefined;
  const parsedToDate = toDate
    ? endOfDay(parse(toDate, "yyyy-MM-dd", new Date()))
    : undefined;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const tickets = await getCancellationTickets({
    page,
    pageSize,
    filmId,
    userId,
    fromDate: parsedFromDate ? parsedFromDate.toISOString() : undefined,
    toDate: parsedToDate ? parsedToDate.toISOString() : undefined,
  });

  return <CancellationTicketsClient data={tickets} page={page} />;
};

export default CancellationTicketsPage;
