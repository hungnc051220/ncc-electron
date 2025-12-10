import { getDiscounts } from "@/data/loaders";
import DiscountSettingsClient from "./components/discount-settings-client";

interface DiscountSettingsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const DiscountSettingsPage = async ({ searchParams }: DiscountSettingsPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const data = await getDiscounts({ page, pageSize });

  return <DiscountSettingsClient data={data} page={page} />;
};

export default DiscountSettingsPage;
