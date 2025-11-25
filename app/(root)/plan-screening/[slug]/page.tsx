import { notFound } from "next/navigation";
import Seats from "./components/seats";
import { getPlanScreeningDetail } from "@/data/loaders";
import { format } from "date-fns";
import CustomerView from "./components/customer-view";
import { formatInTimeZone } from "date-fns-tz";

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
    <div className="pt-4 flex flex-col h-screen overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-chichi text-sm font-medium">
            Buổi {formatInTimeZone(data.projectTime, "UTC", "HH:mm")} - Ngày{" "}
            {format(new Date(data.projectDate), "dd/MM/yyyy")}
          </p>
          <p className="font-bold mt-1">{data.filmInfo.filmName}</p>
        </div>
        <div className="bg-goku py-1 px-2 rounded-lg">
          <p className="text-sm font-bold">Phòng {data.roomInfo.name}</p>
        </div>
      </div>

      <Seats data={data} />
      <CustomerView planScreeningsId={Number(slug)} />
    </div>
  );
};

export default PlanScreeningPage;
