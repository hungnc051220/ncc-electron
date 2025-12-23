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
    <div className="pt-4 flex flex-col h-screen overflow-hidden">
      <div className="flex items-start justify-between px-4">
        <div className="flex-1 flex items-center gap-3">
          <BackButton />
          <div>
            <p className="text-chichi text-sm xl:text-lg font-medium">
              Buổi {formatInTimeZone(data.projectTime, "UTC", "HH:mm")} - Ngày{" "}
              {format(new Date(data.projectDate), "dd/MM/yyyy")}
            </p>
            <p className="font-bold mt-1 text-base xl:text-xl">{data.filmInfo.filmName}</p>
          </div>
        </div>
        <div className="bg-goku py-1 px-2 rounded-lg">
          <p className="text-sm xl:text-base font-bold">Phòng {data.roomInfo.name}</p>
        </div>
      </div>

      <Seats data={data} />
      <CustomerView planScreeningsId={Number(slug)} />
    </div>
  );
};

export default PlanScreeningPage;
