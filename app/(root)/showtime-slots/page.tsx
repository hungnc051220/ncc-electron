import { getDayParts } from "@/data/loaders";
import ShowtimeSlotsClient from "./components/showtime-slots-client";

interface ShowtimeSlotsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const ShowtimeSlotsPage = async ({ searchParams }: ShowtimeSlotsPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const data = await getDayParts({ page, pageSize });

  return (
    <ShowtimeSlotsClient
      data={data}
      page={page}
    />
  );
};

export default ShowtimeSlotsPage;

