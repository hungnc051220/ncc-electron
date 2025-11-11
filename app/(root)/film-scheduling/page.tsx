import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import FilmSchedulingClient from "./components/film-scheduling-client";
import { getFilmScheduling } from "@/data/loaders-server";
import AddPlan from "./components/add-plan";

const FilmSchedulingPage = async () => {
  const data = await getFilmScheduling();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Kế hoạch chiếu phim</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Lập kế hoạch chiếu phim</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">Lập kế hoạch chiếu phim</h3>
        </div>
        <AddPlan />
      </div>

      <FilmSchedulingClient data={data} />
    </div>
  );
};

export default FilmSchedulingPage;
