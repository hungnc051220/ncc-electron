import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import TabRevenueByFilm from "./components/TabRevenueByFilm";
import TabRevenueByStaff from "./components/TabRevenueByStaff";
import dayjs from "dayjs";
import { useState } from "react";
import type { Dayjs } from "dayjs";
import Filter, { type FilterValues } from "./components/Filter";

const TicketSalesRevenuePage = () => {
  const [filterValues, setFilterValues] = useState<FilterValues>({});
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
        right={<Filter filterValues={filterValues} onSearch={setFilterValues} />}
      />

      <Tabs
        defaultActiveKey="1"
        type="card"
        items={items}
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
      />
    </div>
  );
};

export default TicketSalesRevenuePage;
