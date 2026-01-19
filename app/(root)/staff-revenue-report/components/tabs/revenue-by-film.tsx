"use client";

import { getReportRevenueByFilm } from "@/data/loaders";
import { formatMoney, formatNumber } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { Table } from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import Filter from "./filter";

export interface ValuesProps {
  roleId?: number;
  searchText?: string;
}
type SummaryGroup = {
  off: Row[];
  on: Row[];
};

type Row = {
  key: string;
  filmName: string;
  projectDate: string;
  projectTime: string;
  isOnline: boolean;
  pricesMap: Record<number, number>; // price -> quantity
  roomName: string;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
  filmRowSpan?: number;
  dateRowSpan?: number;
  onlineRowSpan?: number;
};

const RevenueByFilm = () => {
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const { data, isFetching } = useQuery({
    queryKey: ["revenues-by-film"],
    queryFn: () => {
      return getReportRevenueByFilm({
        fromDate: "2026-01-01T00:00:00+07:00",
        toDate: "2026-01-01T23:59:59+07:00",
      });
    },
  });

  const allPrices = Array.from(
    new Set(
      data?.revenuesByFilm.flatMap((f) =>
        f.planScreens.flatMap((p) => p.prices.map((x) => x.price))
      )
    )
  ).sort((a, b) => b - a);

  const tableData: Row[] = [];
  data?.revenuesByFilm.forEach((film) => {
    const sortedScreens = [...film.planScreens].sort((a, b) => {
      if (a.projectDate !== b.projectDate) {
        return a.projectDate.localeCompare(b.projectDate);
      }
      return (
        new Date(a.projectTime).getTime() - new Date(b.projectTime).getTime()
      );
    });

    const byDate = sortedScreens.reduce<Record<string, typeof sortedScreens>>(
      (acc, cur) => {
        (acc[cur.projectDate] ||= []).push(cur);
        return acc;
      },
      {}
    );

    const totalFilmRows = sortedScreens.length;
    let isFirstFilmRow = true;

    Object.entries(byDate).forEach(([date, screensOfDate]) => {
      const off = screensOfDate.filter((s) => !s.isOnline);
      const on = screensOfDate.filter((s) => s.isOnline);

      const totalDateRows = screensOfDate.length;
      let isFirstDateRow = true;

      const pushBlock = (screens: typeof screensOfDate, isOnline: boolean) => {
        screens.forEach((p, idx) => {
          const pricesMap: Record<number, number> = {};
          p.prices.forEach((pr) => {
            pricesMap[pr.price] = pr.totalQuantity;
          });

          tableData.push({
            key: `${film.filmId}-${p.planScreenId}-${isOnline}`,
            filmName: film.filmName,
            projectDate: date,
            projectTime: p.projectTime,
            roomName: p.roomName,
            isOnline,
            pricesMap,

            filmRowSpan: isFirstFilmRow ? totalFilmRows : 0,
            dateRowSpan: isFirstDateRow ? totalDateRows : 0,
            onlineRowSpan: idx === 0 ? screens.length : 0,

            totalInvitationQuantity: p.totalInvitationQuantity,
            totalContractQuantity: p.totalContractQuantity,
            totalQuantity: p.totalQuantity,
            totalSale: p.totalSale,
            saleVnPayQr: p.saleVnPayQr,
            saleVietQr: p.saleVietQr,
            actualSale: p.actualSale,
          });

          isFirstFilmRow = false;
          isFirstDateRow = false;
        });
      };

      pushBlock(off, false);
      pushBlock(on, true);
    });
  });

  const summaryByDate = tableData.reduce<Record<string, SummaryGroup>>(
    (acc, row) => {
      if (!acc[row.projectDate]) {
        acc[row.projectDate] = { off: [], on: [] };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      row.isOnline
        ? acc[row.projectDate].on.push(row)
        : acc[row.projectDate].off.push(row);
      return acc;
    },
    {}
  );

  const sumGroup = (rows: Row[]) => {
    const prices: Record<number, number> = {};
    let totalQuantity = 0;
    let totalInvitationQuantity = 0;
    let totalContractQuantity = 0;
    let totalSale = 0;
    let saleVnPayQr = 0;
    let saleVietQr = 0;
    let actualSale = 0;

    rows.forEach((r) => {
      totalQuantity += r.totalQuantity;
      totalInvitationQuantity += r.totalInvitationQuantity;
      totalContractQuantity += r.totalContractQuantity;
      totalSale += r.totalSale;
      saleVnPayQr += r.saleVnPayQr;
      saleVietQr += r.saleVietQr;
      actualSale += r.actualSale;

      Object.entries(r.pricesMap).forEach(([price, qty]) => {
        const p = Number(price);
        prices[p] = (prices[p] ?? 0) + qty;
      });
    });

    return {
      prices,
      totalQuantity,
      totalInvitationQuantity,
      totalContractQuantity,
      totalSale,
      saleVnPayQr,
      saleVietQr,
      actualSale,
    };
  };

  const filmColumn = {
    title: "Phim",
    dataIndex: "filmName",
    fixed: "left" as const,
    width: 260,
    onCell: (row: Row) => ({
      rowSpan: row.filmRowSpan,
    }),
  };

  const priceColumns = allPrices.map((price) => ({
    title: (price / 1000).toString(), // hiển thị 150, 140...
    dataIndex: price,
    width: 60,
    align: "center" as const,
    render: (_: unknown, row: Row) => row.pricesMap[price] ?? "",
  }));

  const columns: TableProps<Row>["columns"] = [
    filmColumn,
    {
      title: "Nội dung chi tiết",
      children: [
        {
          title: "Ngày",
          key: "projectDate",
          dataIndex: "projectDate",
          width: 110,
          render: (value: string) =>
            dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
          onCell: (row: Row) => ({ rowSpan: row.dateRowSpan }),
        },
        {
          title: "Giờ",
          key: "projectTime",
          dataIndex: "projectTime",
          width: 80,
        },
        {
          title: "Phòng",
          key: "roomName",
          dataIndex: "roomName",
          width: 60,
        },
        {
          title: "Loại",
          key: "isOnline",
          dataIndex: "isOnline",
          width: 60,
          render: (value: boolean) => (value ? "On" : "Off"),
          onCell: (row: Row) => ({ rowSpan: row.onlineRowSpan }),
        },
      ],
      fixed: "left",
    },
    {
      title: "Loại giá vé (Đơn vị tính: 1000 đồng)",
      children: priceColumns,
    },
    {
      title: "Tổng",
      key: "totalQuantity",
      dataIndex: "totalQuantity",
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "Giấy mời",
      key: "totalInvitationQuantity",
      dataIndex: "totalInvitationQuantity",
      render: (value: number) => formatNumber(value),
      align: "right",
    },
    {
      title: "Hợp đồng",
      key: "totalContractQuantity",
      dataIndex: "totalContractQuantity",
      render: (value: number) => formatNumber(value),
      align: "right",
    },
    {
      title: "Thành tiền",
      key: "totalSale",
      dataIndex: "totalSale",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150,
    },
    {
      title: "Tiền VNPayQR",
      key: "saleVnPayQr",
      dataIndex: "saleVnPayQr",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150,
    },
    {
      title: "Tiền VietQR",
      key: "saleVietQr",
      dataIndex: "saleVietQr",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150,
    },
    {
      title: "Thực nộp",
      key: "actualSale",
      dataIndex: "actualSale",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 150,
    },
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  return (
    <div className="pb-6">
      <div className="flex justify-end mb-4">
        <Filter filterValues={filterValues} onSearch={onSearch} />
      </div>
      <Table
        dataSource={tableData}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 260px)" }}
        loading={isFetching}
        pagination={false}
        summary={() => (
          <Table.Summary fixed>
            {Object.entries(summaryByDate).map(([date, group]) => {
              const offSum = sumGroup(group.off);
              const onSum = sumGroup(group.on);

              return (
                <React.Fragment key={date}>
                  {/* ===== OFF ===== */}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      {dayjs(date).format("DD/MM/YYYY")}
                    </Table.Summary.Cell>

                    {/* bỏ cột Giờ + Phòng */}
                    <Table.Summary.Cell index={4}>Off</Table.Summary.Cell>

                    {/* cột giá vé */}
                    {allPrices.map((p, i) => (
                      <Table.Summary.Cell key={p} index={5 + i} align="center">
                        {offSum.prices[p] ?? ""}
                      </Table.Summary.Cell>
                    ))}

                    <Table.Summary.Cell index={100} align="right">
                      {formatNumber(offSum.totalQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={101} align="right">
                      {formatNumber(offSum.totalInvitationQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={102} align="right">
                      {formatNumber(offSum.totalContractQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={103} align="right">
                      {formatMoney(offSum.totalSale)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={104} align="right">
                      {formatMoney(offSum.saleVnPayQr)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={105} align="right">
                      {formatMoney(offSum.saleVietQr)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={106} align="right">
                      {formatMoney(offSum.actualSale)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>

                  {/* ===== ON ===== */}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      {dayjs(date).format("DD/MM/YYYY")}
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={4}>On</Table.Summary.Cell>

                    {allPrices.map((p, i) => (
                      <Table.Summary.Cell key={p} index={5 + i} align="center">
                        {onSum.prices[p] ?? ""}
                      </Table.Summary.Cell>
                    ))}

                    <Table.Summary.Cell index={200} align="right">
                      {formatNumber(onSum.totalQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={201} align="right">
                      {formatNumber(onSum.totalInvitationQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={202} align="right">
                      {formatNumber(onSum.totalContractQuantity)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={203} align="right">
                      {formatMoney(onSum.totalSale)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={204} align="right">
                      {formatMoney(onSum.saleVnPayQr)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={205} align="right">
                      {formatMoney(onSum.saleVietQr)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={206} align="right">
                      {formatMoney(onSum.actualSale)}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </React.Fragment>
              );
            })}
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default RevenueByFilm;
