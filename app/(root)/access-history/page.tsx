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
import TabActivityLog from "./components/tab-activity-log";
import TabActivityLogDetail from "./components/tab-activity-log-detail";

enum TabCode {
  ACTIVITY_LOG,
  ACTIVITY_LOG_DETAIL,
}

const AccessHistoryPage = () => {
  const [tabCode, setTabCode] = useState<TabCode>(TabCode.ACTIVITY_LOG);

  return (
    <div className="space-y-3 mt-4">
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
            tabCode === TabCode.ACTIVITY_LOG
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => setTabCode(TabCode.ACTIVITY_LOG)}
        >
          Xem người cập nhật cuối
        </div>
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary",
            tabCode === TabCode.ACTIVITY_LOG_DETAIL
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => setTabCode(TabCode.ACTIVITY_LOG_DETAIL)}
        >
          Xem chi tiết lịch sử thay đổi
        </div>
      </div>

      {tabCode === TabCode.ACTIVITY_LOG && <TabActivityLog />}
      {tabCode === TabCode.ACTIVITY_LOG_DETAIL && <TabActivityLogDetail />}
    </div>
  );
};

export default AccessHistoryPage;
