import { getMachineSerials } from "@/data/loaders";
import MachineSerialsClient from "./components/machine-serials-client";

interface MachineSerialsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const MachineSerialsPage = async ({
  searchParams,
}: MachineSerialsPageProps) => {
  const filter = await searchParams;
  const year = filter?.year;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize ? parseInt(filter.pageSize, 100) || 100 : 100;

  const data = await getMachineSerials({ year, page, pageSize });

  return <MachineSerialsClient data={data} page={page} />;
};

export default MachineSerialsPage;
