import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import FullHeightTabs from "@renderer/components/FullHeightTabs";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import type { TabsProps } from "antd";
import { Typography } from "antd";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Filter from "./components/Filter";
import Tab2 from "./components/tab2";
import Tab3 from "./components/tab3";
import Tab1 from "./components/tab1";
import { QuarterlyReportFilterValues } from "./types";
import { formatQuarterLabel } from "./utils";

const QuarterlyReportPage = () => {
  const queryClient = useQueryClient();
  const isFetchingQuarterly = useIsFetching({ queryKey: ["report-quarterly"] }) > 0;
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

      <FullHeightTabs
        defaultActiveKey="1"
        type="card"
        items={items}
        tabBarExtraContent={
          <div className="mb-2 flex max-w-full items-center justify-end gap-3">
            {filterTitle && (
              <Typography.Text strong className="max-w-130 truncate text-sm">
                {filterTitle}
              </Typography.Text>
            )}
            <Filter filterValues={filterValues} onSearch={onSearch} />
            <RefreshButton
              disabled={!filterValues.fromDate}
              loading={isFetchingQuarterly}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["report-quarterly"] })}
            />
          </div>
        }
      />
    </div>
  );
};

export default QuarterlyReportPage;
