import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import type { TabsProps } from "antd";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import TabActivityLogDetail from "./components/TabActivityLogDetail";
import TabActivityLog from "./components/TabActivityLog";
import Filter, { type AccessHistoryFilterValues } from "./components/Filter";
import { useState } from "react";

const AccessHistoryPage = () => {
  const queryClient = useQueryClient();
  const isFetchingAuditLog = useIsFetching({ queryKey: ["audit-log"] }) > 0;
  const [filterValues, setFilterValues] = useState<AccessHistoryFilterValues>({});

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Xem người cập nhật cuối",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <TabActivityLog filterValues={filterValues} />
        </div>
      )
    },
    {
      key: "2",
      label: "Xem chi tiết lịch sử thay đổi",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <TabActivityLogDetail filterValues={filterValues} />
        </div>
      )
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <Filter filterValues={filterValues} onSearch={setFilterValues} />
            <RefreshButton
              loading={isFetchingAuditLog}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["audit-log"] })}
            />
          </>
        }
      />

      <FullHeightTabs type="card" defaultActiveKey="1" items={items} />
    </div>
  );
};

export default AccessHistoryPage;
