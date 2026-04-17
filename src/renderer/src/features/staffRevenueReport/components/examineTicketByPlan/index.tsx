import { useReportExamineTicketByPlan } from "@renderer/hooks/reports/useReportExamineTicketByPlan";
import { filterEmptyValues, formatNumber } from "@renderer/lib/utils";
import { ExamineTicketsByFilmProps } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import DateRangeRequiredEmptyState from "../DateRangeRequiredEmptyState";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";

export interface ValuesProps {
  userId?: number;
  userName?: string;
  manufacturerId?: number;
  filmId?: number;
  dateRange?: [string, string];
}

export type TableRow = {
  key: string;
  filmName?: string;
  isSummary?: boolean;
  projectDate?: string;
  projectTime?: string;
  roomName?: string;
  isOnline?: boolean;
  vip?: number;
  regular?: number;
  contract?: number;
  vipCI?: number;
  regularCI?: number;
  contractCI?: number;
  invitation?: number;
  total?: number;
  notCI?: number;
  ci?: number;
  dateRowSpan?: number;
  timeRowSpan?: number;
  children?: TableRow[];
};

const ExamineTicketByPlan = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(() => {
    const { dateRange, ...rest } = filterValues;
    const filtered = filterEmptyValues(rest as Record<string, unknown>);

    if (dateRange && dateRange.length === 2) {
      filtered.fromDate = dayjs(dateRange[0]).startOf("day").format();
      filtered.toDate = dayjs(dateRange[1]).endOf("day").format();
    }

    return filtered;
  }, [filterValues]);

  const hasDateRange = filterValues.dateRange?.length === 2;
  const { data, isFetching } = useReportExamineTicketByPlan(params, hasDateRange);
  const reportData = hasDateRange ? data : undefined;

  const buildTreeTable = (films: ExamineTicketsByFilmProps[]): TableRow[] => {
    return films.map((film) => {
      const children: TableRow[] = film.planScreens.map((p) => ({
        key: `ps-${p.planScreenId}-${p.isOnline}`,
        projectDate: p.projectDate,
        projectTime: p.projectTime,
        roomName: p.roomName,
        isOnline: p.isOnline,
        vip: p.vipQuantity,
        regular: p.regularQuantity,
        contract: p.contractQuantity,
        vipCI: p.vipCIQuantity,
        regularCI: p.regularCIQuantity,
        contractCI: p.contractCIQuantity,
        invitation: p.invitationQuantity,
        total: p.totalQuantity,
        notCI: p.totalNotCIQuantity,
        ci: p.totalCIQuantity
      }));

      return {
        key: `film-${film.filmId}`,
        filmName: film.filmName,
        isSummary: true,
        vip: film.totalVipQuantity,
        regular: film.totalRegularQuantity,
        contract: film.totalContractQuantity,
        vipCI: film.totalVipCIQuantity,
        regularCI: film.totalRegularCIQuantity,
        contractCI: film.totalContractCIQuantity,
        invitation: film.totalInvitationQuantity,
        total: film.totalQuantity,
        notCI: film.totalNotCIQuantity,
        ci: film.totalCIQuantity,
        children
      };
    });
  };

  const tableData = useMemo(
    () => buildTreeTable(reportData?.examineTicketsByFilm || []),
    [reportData]
  );

  const columns: ColumnsType<TableRow> = [
    {
      title: "Phim / Ngày",
      dataIndex: "filmName",
      fixed: "left",
      width: "20%",
      render: (_, row) =>
        row.filmName ? <strong>{row.filmName}</strong> : dayjs(row.projectDate).format("DD/MM/YYYY")
    },
    {
      title: "Giờ",
      dataIndex: "projectTime",
      width: 80,
      align: "center",
      fixed: "left"
    },
    { title: "Phòng", dataIndex: "roomName", width: 60, align: "right" },
    {
      title: "Loại",
      dataIndex: "isOnline",
      width: 70,
      render: (v) => (v === undefined ? "" : v ? "On" : "Off"),
      align: "center"
    },

    {
      title: "Vé bán",
      children: [
        {
          title: "VIP",
          dataIndex: "vip",
          align: "right",
          width: 80,
          render: (value) => formatNumber(value)
        },
        {
          title: "Thường",
          dataIndex: "regular",
          align: "right",
          width: 90,
          render: (value) => formatNumber(value)
        },
        {
          title: "Hợp đồng",
          dataIndex: "contract",
          align: "right",
          width: 100,
          render: (value) => formatNumber(value)
        }
      ]
    },
    {
      title: "Vé Checkin",
      children: [
        {
          title: "VIP",
          dataIndex: "vipCI",
          align: "right",
          width: 80,
          render: (value) => formatNumber(value)
        },
        {
          title: "Thường",
          dataIndex: "regularCI",
          align: "right",
          width: 90,
          render: (value) => formatNumber(value)
        },
        {
          title: "Hợp đồng",
          dataIndex: "contractCI",
          align: "right",
          width: 100,
          render: (value) => formatNumber(value)
        }
      ]
    },
    {
      title: "Giấy mời",
      dataIndex: "invitation",
      align: "right",
      width: 80,
      render: (value) => formatNumber(value)
    },
    {
      title: "Tổng",
      dataIndex: "total",
      align: "right",
      width: 90,
      render: (value) => formatNumber(value)
    },
    {
      title: "Chưa Checkin",
      dataIndex: "notCI",
      align: "right",
      width: 120,
      render: (value) => formatNumber(value)
    },
    {
      title: "Đã Checkin",
      dataIndex: "ci",
      align: "right",
      width: 120,
      render: (value) => formatNumber(value)
    }
  ];

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      forceRender: true,
      children: hasDateRange ? (
        <div className="flex h-full min-h-0 flex-col">
          <TabRevenue
            tableData={tableData}
            columns={columns}
            isFetching={isFetching}
            total={reportData?.total}
            totalOnline={reportData?.totalOnline}
            totalOffline={reportData?.totalOffline}
          />
        </div>
      ) : (
        <DateRangeRequiredEmptyState />
      )
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(filterEmptyValues(values as Record<string, unknown>) as ValuesProps);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs
        items={items}
        defaultActiveKey="1"
        className="flex h-full min-h-0 flex-col [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:min-h-0"
        tabBarExtraContent={
          <div className="flex justify-end gap-3 mr-2">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            {filterValues.dateRange?.length === 2 && (
              <ExportRevenueExcelButton
                tableData={tableData}
                fromDate={filterValues.dateRange[0]}
                toDate={filterValues.dateRange[1]}
                employeeName={filterValues?.userName}
                total={reportData?.total}
                totalOnline={reportData?.totalOnline}
                totalOffline={reportData?.totalOffline}
              />
            )}
          </div>
        }
      />
    </div>
  );
};

export default ExamineTicketByPlan;
