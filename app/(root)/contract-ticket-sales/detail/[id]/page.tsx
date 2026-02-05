import ContractTicketSaleDetailClientPage from "./components/contract-ticket-sale-detail-client";

interface ContractTicketSaleDetailPageProps {
  params: Promise<{ id: string }>;
}

const ContractTicketSaleDetailPage = async ({
  params,
}: ContractTicketSaleDetailPageProps) => {
  const { id } = await params;

  return <ContractTicketSaleDetailClientPage contractOrderId={id} />;
};

export default ContractTicketSaleDetailPage;
