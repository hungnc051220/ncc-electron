import RetailTicketSaleCard from "@/components/dashboard/retail-ticket-sale-card";
import { getPlanScreeningsByDate } from "@/data/loaders";

const RetailTicketSalesPage = async () => {
  const data = await getPlanScreeningsByDate();

  if (!data) return null;

  return <RetailTicketSaleCard data={data} />;
};

export default RetailTicketSalesPage;
