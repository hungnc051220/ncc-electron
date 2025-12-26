import { getPlanScreeningDetail } from "@/data/loaders";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import BackButton from "./components/back-button";
import CustomerView from "./components/customer-view";
import Seats from "./components/seats";

interface PlanScreeningPageProps {
  params: Promise<{ slug: string }>;
}

const PlanScreeningPage = async ({ params }: PlanScreeningPageProps) => {
  const slug = (await params).slug;

  if (!slug) {
    notFound();
  }

  const data = await getPlanScreeningDetail(slug);

  if (!data) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Seats data={data} />
      <CustomerView planScreeningsId={Number(slug)} />
    </div>
  );
};

export default PlanScreeningPage;
