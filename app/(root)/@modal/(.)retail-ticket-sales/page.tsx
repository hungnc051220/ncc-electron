import RetailTicketSaleCard from "@/components/dashboard/retail-ticket-sale-card";
import RetailTicketSaleDialog from "@/components/dashboard/retail-ticket-sale-dialog";
import { getPlanScreeningsByDate } from "@/data/loaders-server";

const Page = async () => {
  const data = await getPlanScreeningsByDate();
  return (
    <RetailTicketSaleDialog>
      <RetailTicketSaleCard data={data} />
    </RetailTicketSaleDialog>
  );
};

export default Page;
