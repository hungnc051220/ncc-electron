import { getSeatTypes } from "@/data/loaders";
import SeatTypesClient from "./components/seat-types-client";

interface SeatTypesPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const SeatTypesPage = async ({ searchParams }: SeatTypesPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const data = await getSeatTypes({ page, pageSize });

  return <SeatTypesClient data={data} page={page} />;
};

export default SeatTypesPage;
