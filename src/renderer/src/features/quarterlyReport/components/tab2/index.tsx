import { useReportQuarterly } from "@renderer/hooks/reports/useReportQuarterly";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { Manufacturer2, MonthlyReportTicketProps } from "@shared/types";
import type { TabsProps } from "antd";
import { Tabs } from "antd";
import { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ExportRevenueExcelButton from "./ExportExcel";
import Filter from "./Filter";
import TabRevenue from "./TabRevenue";

export interface ValuesProps {
  fromDate: string;
}

export interface TreeRow {
  key: string;
  name?: string;
  date?: string;
  time?: string;
  version?: string;
  totalTickets?: number;
  totalRevenue?: number;
  [priceKey: string]:
    | {
        tickets: number;
        revenue: number;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | any;

  children?: TreeRow[];
}

const Tab2 = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({
    fromDate: dayjs().startOf("quarter").format()
  });

  const params = useMemo(() => {
    const { fromDate } = filterValues;
    const payload = {
      year: dayjs(fromDate).year(),
      quarter: dayjs(fromDate).quarter(),
      reportType: "TICKET"
    };
    return payload;
  }, [filterValues]);

  const { data, isFetching } = useReportQuarterly(params);
  const formatData = data as MonthlyReportTicketProps;

  function collectAllPrices(data: Manufacturer2[]) {
    const set = new Set<number>();

    data.forEach((m) =>
      m.films.forEach((f) =>
        f.projects.forEach((p) =>
          p.versions.forEach((v) => v.prices.forEach((pr) => set.add(pr.unitPriceInclTax)))
        )
      )
    );

    return Array.from(set).sort((a, b) => a - b);
  }

  function mapApiToPivotTree(data: Manufacturer2[], allPrices: number[]): TreeRow[] {
    return data.map((m) => ({
      key: `m-${m.manufacturerId}`,
      name: m.manufacturerName,

      children: m.films.map((f) => ({
        key: `f-${f.filmId}`,
        name: f.filmName,

        children: f.projects.map((p, pi) => {
          const version = p.versions[0];

          const row: TreeRow = {
            key: `p-${f.filmId}-${pi}`,
            date: dayjs(p.projectDate).format("DD/MM/YYYY"),
            time: p.projectTime,
            version: version.versionCode,
            totalTickets: 0,
            totalRevenue: 0
          };

          // init online + offline per price
          allPrices.forEach((price) => {
            row[`price_${price}_online`] = { tickets: 0, revenue: 0 };
            row[`price_${price}_offline`] = { tickets: 0, revenue: 0 };
          });

          // fill data
          version.prices.forEach((pr) => {
            const key =
              `price_${pr.unitPriceInclTax}_${pr.isOnline ? "online" : "offline"}` as const;

            row[key].tickets += pr.totalTickets;
            row[key].revenue += pr.totalRevenue;

            row.totalTickets! += pr.totalTickets;
            row.totalRevenue! += pr.totalRevenue;
          });

          return row;
        })
      }))
    }));
  }

  const baseColumns: ColumnsType<TreeRow> = [
    {
      title: "Hãng phim / Phim",
      dataIndex: "name",
      width: 350,
      render: (v) => v && <div style={{ whiteSpace: "pre-wrap" }}>{v}</div>,
      fixed: "left"
    },
    {
      title: "Ngày",
      dataIndex: "date",
      width: 110,
      fixed: "left",
      align: "center"
    },
    {
      title: "Giờ",
      dataIndex: "time",
      width: 90,
      fixed: "left",
      align: "center"
    },
    {
      title: "Version",
      dataIndex: "version",
      width: 70,
      fixed: "left",
      align: "center"
    }
  ];

  function buildPriceColumns(prices: number[]): ColumnsType<TreeRow> {
    return prices.map((price) => ({
      title: (price / 1000).toString(),
      children: [
        {
          title: "Online",
          children: [
            {
              title: "Số vé",
              align: "right",
              width: 100,
              render: (_, row) => row[`price_${price}_online`]?.tickets || ""
            },
            {
              title: "Thành tiền",
              align: "right",
              width: 100,
              render: (_, row) =>
                row[`price_${price}_online`]?.revenue
                  ? formatMoney(row[`price_${price}_online`]?.revenue)
                  : ""
            }
          ]
        },
        {
          title: "Offline",
          children: [
            {
              title: "Số vé",
              align: "right",
              width: 100,
              render: (_, row) => row[`price_${price}_offline`]?.tickets || ""
            },
            {
              title: "Thành tiền",
              align: "right",
              width: 100,
              render: (_, row) =>
                row[`price_${price}_offline`]?.revenue
                  ? formatMoney(row[`price_${price}_offline`]?.revenue)
                  : ""
            }
          ]
        }
      ]
    }));
  }

  const totalColumns: ColumnsType<TreeRow> = [
    {
      title: "Tổng vé",
      dataIndex: "totalTickets",
      align: "right",
      width: 90,
      fixed: "right",
      render: (value: number) => (value ? formatNumber(value) : "")
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalRevenue",
      align: "right",
      width: 140,
      render: (v) => (typeof v === "number" ? formatMoney(v) : ""),
      fixed: "right"
    }
  ];

  function addRowTotal(target: TreeRow, source: TreeRow, allPrices: number[]) {
    allPrices.forEach((price) => {
      const onlineKey = `price_${price}_online`;
      const offlineKey = `price_${price}_offline`;

      target[onlineKey].tickets += source[onlineKey].tickets;
      target[onlineKey].revenue += source[onlineKey].revenue;

      target[offlineKey].tickets += source[offlineKey].tickets;
      target[offlineKey].revenue += source[offlineKey].revenue;
    });

    target.totalTickets! += source.totalTickets || 0;
    target.totalRevenue! += source.totalRevenue || 0;
  }

  function initPriceFields(row: TreeRow, allPrices: number[]) {
    row.totalTickets = 0;
    row.totalRevenue = 0;

    allPrices.forEach((price) => {
      row[`price_${price}_online`] = { tickets: 0, revenue: 0 };
      row[`price_${price}_offline`] = { tickets: 0, revenue: 0 };
    });
  }

  function calculateTreeTotals(tree: TreeRow[], allPrices: number[]) {
    tree.forEach((m) => {
      // init manufacturer total
      initPriceFields(m, allPrices);

      m.children?.forEach((f) => {
        initPriceFields(f, allPrices);

        f.children?.forEach((p) => {
          // cộng project → film
          addRowTotal(f, p, allPrices);
        });

        // cộng film → manufacturer
        addRowTotal(m, f, allPrices);
      });
    });
  }

  const allPrices = useMemo(() => collectAllPrices(formatData?.data || []), [formatData]);

  const treeData = useMemo(() => {
    const tree = mapApiToPivotTree(formatData?.data || [], allPrices);
    calculateTreeTotals(tree, allPrices);
    return tree;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, allPrices]);

  const columns = useMemo(
    () => [
      ...baseColumns,
      {
        title: "Loại giá vé (Đơn vị tính 1.000 đồng)",
        children: buildPriceColumns(allPrices)
      },
      ...totalColumns
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allPrices]
  );

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "Chi tiết",
      children: <TabRevenue tableData={treeData} columns={columns} isFetching={isFetching} />
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  return (
    <div className="pb-6">
      <Tabs
        items={items}
        defaultActiveKey="1"
        type="card"
        size="small"
        tabBarExtraContent={
          <div className="flex justify-end mb-2 gap-3">
            <Filter filterValues={filterValues} onSearch={onSearch} />
            <ExportRevenueExcelButton
              treeData={treeData}
              allPrices={allPrices}
              fromDate={filterValues.fromDate!}
            />
          </div>
        }
      />
    </div>
  );
};

export default Tab2;
