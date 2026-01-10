import { getBackgrounds, getOrders } from "@/data/loaders";
import { OrderStatus } from "@/types";
import InvitationTicketsClient from "./components/invitation-tickets-client";

interface InvitationTicketsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const InvitationTicketsPage = async ({
  searchParams,
}: InvitationTicketsPageProps) => {
  const filter = await searchParams;
  const page = filter?.page ? parseInt(filter.page, 10) || 1 : 1;
  const pageSize = filter?.pageSize
    ? parseInt(filter.pageSize, 10) || 100
    : 100;

  const data = await getOrders({
    page,
    pageSize,
    isInvitation: true,
    orderStatusId: OrderStatus.COMPLETED,
  });

  const backgrounds = await getBackgrounds();

  return (
    <InvitationTicketsClient
      data={data}
      page={page}
      backgrounds={backgrounds}
    />
  );
};

export default InvitationTicketsPage;
