import { getCancellationReasons } from "@/data/loaders";
import CancellationReasonsClient from "./components/cancellation-reasons-client";

interface CancellationReasonsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const CancellationReasonsPage = async ({ searchParams }: CancellationReasonsPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const data = await getCancellationReasons({ page, pageSize });

  return <CancellationReasonsClient data={data} page={page} />;
};

export default CancellationReasonsPage;
