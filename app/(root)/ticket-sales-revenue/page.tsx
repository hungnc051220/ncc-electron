"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useState } from "react";
import TabRevenueByStaff from "./components/tab-revenue-by-staff";
import TabRevenueByFilm from "./components/tab-revenue-by-film";

enum TabCode {
  REVENUE_BY_STAFF,
  REVENUE_BY_FILM,
}

const AccessHistoryPage = () => {
  const [tabCode, setTabCode] = useState<TabCode>(TabCode.REVENUE_BY_STAFF);

  return (
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tra cứu</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Lịch sử hoạt động
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="flex items-center mb-5 gap-2 border-b">
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary transition-colors",
            tabCode === TabCode.REVENUE_BY_STAFF
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => setTabCode(TabCode.REVENUE_BY_STAFF)}
        >
          Doanh thu theo nhân viên
        </div>
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary",
            tabCode === TabCode.REVENUE_BY_FILM
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => setTabCode(TabCode.REVENUE_BY_FILM)}
        >
          Doanh thu theo phim
        </div>
      </div>

      {tabCode === TabCode.REVENUE_BY_STAFF && <TabRevenueByStaff />}
      {tabCode === TabCode.REVENUE_BY_FILM && <TabRevenueByFilm />}
    </div>
  );
};

export default AccessHistoryPage;
