import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import type { TabsProps } from "antd";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import TabRevenueByFilm from "./components/TabRevenueByFilm";
import TabRevenueByStaff from "./components/TabRevenueByStaff";
import dayjs from "dayjs";
import { useState } from "react";
import type { Dayjs } from "dayjs";
import Filter, { getDefaultFilterValues, type FilterValues } from "./components/Filter";

const TicketSalesRevenuePage = () => {
  const queryClient = useQueryClient();
  const isFetchingRevenue = useIsFetching({ queryKey: ["report-ticket-sales-revenue"] }) > 0;
  const [filterValues, setFilterValues] = useState<FilterValues>(() => getDefaultFilterValues());
  const dateRange: [Dayjs, Dayjs] | undefined =
    filterValues.dateRange?.length === 2
      ? [dayjs(filterValues.dateRange[0]), dayjs(filterValues.dateRange[1])]
      : undefined;

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Doanh thu theo nhân viên",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenueByStaff fromDate={dateRange?.[0]} toDate={dateRange?.[1]} />
        </div>
      )
    },
    {
      key: "2",
      label: "Doanh thu theo phim",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenueByFilm fromDate={dateRange?.[0]} toDate={dateRange?.[1]} />
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
              disabled={!dateRange}
              loading={isFetchingRevenue}
              onRefresh={() =>
                queryClient.invalidateQueries({ queryKey: ["report-ticket-sales-revenue"] })
              }
            />
          </>
        }
      />

      <FullHeightTabs defaultActiveKey="1" type="card" items={items} />
    </div>
  );
};

export default TicketSalesRevenuePage;
