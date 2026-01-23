import { notFound } from "next/navigation";
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
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Seats slug={slug} />
      <CustomerView planScreeningsId={Number(slug)} />
    </div>
  );
};

export default PlanScreeningPage;
