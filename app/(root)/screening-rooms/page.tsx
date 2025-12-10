import { getScreeningRooms } from "@/data/loaders";
import ScreeningRoomsClient from "./components/screening-rooms-client";

interface ScreeningRoomsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const ScreeningRoomsPage = async ({
  searchParams,
}: ScreeningRoomsPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const data = await getScreeningRooms({ page, pageSize });

  return <ScreeningRoomsClient data={data} page={page} />;
};

export default ScreeningRoomsPage;
