import { getMachineSerials } from "@/data/loaders";
import MachineSerialsClient from "./components/machine-serials-clienet";

interface MachineSerialsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const MachineSerialsPage = async ({
  searchParams,
}: MachineSerialsPageProps) => {
  const filter = await searchParams;
  const year = filter?.year || "2025";
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize ? parseInt(filter.pageSize, 10) || 10 : 10;

  const data = await getMachineSerials({ year, page, pageSize });

  return <MachineSerialsClient data={data} page={page} />;
};

export default MachineSerialsPage;
