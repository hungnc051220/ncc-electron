import { getManufacturers } from "@/data/loaders";
import ManufacturesClient from "./components/manufacturers-client";

interface ManufacturesPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const ManufacturesPage = async ({ searchParams }: ManufacturesPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const data = await getManufacturers({ page, pageSize });

  return <ManufacturesClient data={data} page={page} />;
};

export default ManufacturesPage;
