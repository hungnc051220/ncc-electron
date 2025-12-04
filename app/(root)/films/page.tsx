import { getFilmsList } from "@/data/loaders";
import FilmsClient from "./components/films-client";

interface FilmsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const FilmsPage = async ({ searchParams }: FilmsPageProps) => {
  const filter = await searchParams;
  const filmName = filter?.filmName;
  const premieredDay = filter?.premieredDay;
  const tabCode = filter?.tabCode || "ALL";
  const manufacturerId =
    filter?.manufacturerId && filter?.manufacturerId !== "all"
      ? Number(filter.manufacturerId)
      : undefined;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize ? parseInt(filter.pageSize, 10) || 10 : 10;

  const films = await getFilmsList({
    filmName,
    manufacturerId,
    premieredDay,
    page,
    pageSize,
    tabCode,
  });

  return <FilmsClient data={films} page={page} />;
};

export default FilmsPage;
