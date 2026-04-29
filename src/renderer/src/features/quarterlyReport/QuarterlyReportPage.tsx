import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import type { TabsProps } from "antd";
import { Tabs, Typography } from "antd";
import { useMemo, useState } from "react";
import Filter from "./components/Filter";
import Tab2 from "./components/tab2";
import Tab3 from "./components/tab3";
import Tab1 from "./components/tab1";
import { QuarterlyReportFilterValues } from "./types";
import { formatQuarterLabel } from "./utils";

const QuarterlyReportPage = () => {
  const [filterValues, setFilterValues] = useState<QuarterlyReportFilterValues>({});

  const onSearch = (values: QuarterlyReportFilterValues) => {
    setFilterValues(values.fromDate ? values : {});
  };

  const filterTitle = useMemo(() => {
    if (!filterValues.fromDate) {
      return "";
    }

    const fromLabel = formatQuarterLabel(filterValues.fromDate);

    if (filterValues.compareDate) {
      return `So sánh giữa ${fromLabel} và ${formatQuarterLabel(filterValues.compareDate)}`;
    }

    return `Báo cáo ${fromLabel}`;
  }, [filterValues]);

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Thống kê buổi chiếu phim",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <Tab1 filterValues={filterValues} />
        </div>
      )
    },
    {
      key: "2",
      label: "Thống kê doanh thu theo từng loại vé",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <Tab2 filterValues={filterValues} />
        </div>
      )
    },
    {
      key: "3",
      label: "Thống kê doanh thu, khán giả theo phòng chiếu",
      forceRender: true,
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <Tab3 filterValues={filterValues} />
        </div>
      )
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader left={<AppBreadcrumb />} />

      <Tabs
        defaultActiveKey="1"
        type="card"
        items={items}
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
        tabBarExtraContent={
          <div className="mb-2 flex max-w-full items-center justify-end gap-3">
            {filterTitle && (
              <Typography.Text strong className="max-w-130 truncate text-sm">
                {filterTitle}
              </Typography.Text>
            )}
            <Filter filterValues={filterValues} onSearch={onSearch} />
          </div>
        }
      />
    </div>
  );
};

export default QuarterlyReportPage;
