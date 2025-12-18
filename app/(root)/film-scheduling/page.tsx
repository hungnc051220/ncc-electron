import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import FilmSchedulingClient from "./components/film-scheduling-client";
import { getFilmScheduling } from "@/data/loaders";
import AddPlan from "./components/add-plan";

const FilmSchedulingPage = async () => {
  const data = await getFilmScheduling();

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] mt-4">
      <div className="flex items-center justify-between shrink-0 mb-3">
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
                <BreadcrumbPage className="font-bold">
                  Lập kế hoạch chiếu phim
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <AddPlan />
      </div>

      <div className="flex-1 min-h-0">
        <FilmSchedulingClient data={data} />
      </div>
    </div>
  );
};

export default FilmSchedulingPage;
