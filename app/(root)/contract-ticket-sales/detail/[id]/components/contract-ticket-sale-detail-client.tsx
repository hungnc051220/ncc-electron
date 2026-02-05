"use client";

import { getPlanScreeningDetail } from "@/data/loaders";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Seats from "./seats";

interface ContractTicketSaleDetailClientPageProps {
  contractOrderId: string;
}

const ContractTicketSaleDetailClientPage = ({
  contractOrderId,
}: ContractTicketSaleDetailClientPageProps) => {
  const searchParams = useSearchParams();
  const planScreeningId = searchParams.get("plan-screening");

  const { data: planDetail } = useQuery({
    queryKey: ["plan-screening", planScreeningId],
    queryFn: () => {
      if (!planScreeningId) return null;
      return getPlanScreeningDetail(planScreeningId);
    },
    enabled: !!planScreeningId,
  });

  if (!planDetail) return null;

  return <Seats data={planDetail} contractOrderId={contractOrderId} />;
};

export default ContractTicketSaleDetailClientPage;
