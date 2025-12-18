import { getHolidays } from "@/data/loaders";
import HolidaysClient from "./components/holidays-client";

interface HolidaysPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const HolidaysPage = async ({ searchParams }: HolidaysPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;
  const dateTypeId = filter?.tabCode ? parseInt(filter.tabCode, 10) || 1 : 1;
  const year = filter?.year ? filter.year : new Date().getFullYear().toString();

  const data = await getHolidays({ page, pageSize, dateTypeId, year });

  return <HolidaysClient data={data} page={page} />;
};

export default HolidaysPage;
