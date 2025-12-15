import { getDayParts, getSeatTypes, getTicketPrices } from "@/data/loaders";
import TicketPricesClient from "./components/ticket-prices-client";

interface TicketPricesPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const TicketPricesPage = async ({ searchParams }: TicketPricesPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const [data, positionsData, dayPartsData] = await Promise.all([
    getTicketPrices({ page, pageSize }),
    getSeatTypes({ page: 1, pageSize: 1000 }),
    getDayParts({ page: 1, pageSize: 1000 }),
  ]);

  return (
    <TicketPricesClient
      data={data}
      page={page}
      positions={positionsData.data}
      dayParts={dayPartsData.data}
    />
  );
};

export default TicketPricesPage;
