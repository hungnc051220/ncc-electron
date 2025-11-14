import RetailTicketSaleCard from "@/components/dashboard/retail-ticket-sale-card";
import RetailTicketSaleDialog from "@/components/dashboard/retail-ticket-sale-dialog";
import { getPlanScreeningsByDate } from "@/data/loaders";

const Page = async () => {
  const data = await getPlanScreeningsByDate();

  if (!data) return null;

  return (
    <RetailTicketSaleDialog>
      <RetailTicketSaleCard data={data} />
    </RetailTicketSaleDialog>
  );
};

export default Page;
