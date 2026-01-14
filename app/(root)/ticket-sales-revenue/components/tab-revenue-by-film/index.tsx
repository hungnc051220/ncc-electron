"use client";

import { formatMoney, formatNumber } from "@/lib/utils";
import {
  ReportRevenueFilmProps,
  RevenueByFilmProps
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps, TimeRangePickerProps  } from "antd";
import { Button, DatePicker, Table, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from "react";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps['presets'] = [
  { label: '7 ngày trước', value: [dayjs().add(-7, 'd'), dayjs()] },
  { label: '14 ngày trước', value: [dayjs().add(-14, 'd'), dayjs()] },
  { label: '30 ngày trước', value: [dayjs().add(-30, 'd'), dayjs()] },
  { label: '90 ngày trước', value: [dayjs().add(-90, 'd'), dayjs()] },
];

const TabRevenueByFilm = () => {
  const [current, setCurrent] = useState(1);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs());
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());

  const onChange: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  const {
    data,
    refetch,
    isFetching: isFetchingData,
  } = useQuery({
    queryKey: ["reports-revenue-by-film"],
    queryFn: () => {
      const queryObject: Record<string, unknown> = {
        storeId: 0,
        fromDate: fromDate?.startOf("day"),
        toDate: toDate?.endOf("day"),
        reportType: "FILM",
      };

      return fetch("/api/reports-revenue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryObject),
      }).then((res) => res.json()) as Promise<ReportRevenueFilmProps>;
    },
    enabled: false,
  });

  console.log(data);

  const columns: TableProps<RevenueByFilmProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      width: 50,
      align: "center",
      render: (_, __, index) => (current - 1) * 100 + index + 1,
      fixed: "start",
    },
    {
      title: "Tên phim",
      dataIndex: "filmName",
      key: "filmName",
      width: 400,
      fixed: "start",
    },
    {
      title: "Online",
      dataIndex: "onQuantity",
      key: "onQuantity",
      align: "right",
      render: (_, { onQuantity }) => formatNumber(onQuantity || 0),
    },
    {
      title: "Offline",
      dataIndex: "offQuantity",
      key: "offQuantity",
      align: "right",
      render: (_, { offQuantity }) => formatNumber(offQuantity || 0),
    },
    {
      title: "Tổng vé",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      align: "right",
      render: (_, { totalQuantity }) => formatNumber(totalQuantity || 0),
    },
    {
      title: "Doanh thu VietQR",
      dataIndex: "offSaleVietQr",
      key: "offSaleVietQr",
      align: "right",
      render: (_, { offSaleVietQr }) => formatMoney(offSaleVietQr || 0),
    },
    {
      title: "Doanh thu VNPayQR",
      dataIndex: "offSaleVnPayQr",
      key: "offSaleVnPayQr",
      align: "right",
      render: (_, { offSaleVnPayQr }) => formatMoney(offSaleVnPayQr || 0),
    },
    {
      title: "Doanh thu Offline",
      dataIndex: "actualOffSale",
      key: "actualOffSale",
      align: "right",
      render: (_, { actualOffSale }) => formatMoney(actualOffSale || 0),
    },
    {
      title: "Tiền thực nộp",
      dataIndex: "totalSale",
      key: "totalSale",
      align: "right",
      render: (_, { totalSale }) => formatMoney(totalSale || 0),
    },
  ];

  const onRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates) {
      setFromDate(dates[0]);
      setToDate(dates[0]);
    } else {
      console.log("Clear");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-x-3 gap-y-2 mb-4 flex-wrap">
        <RangePicker
          defaultValue={[fromDate, toDate]}
          format="DD/MM/YYYY"
          onChange={onRangeChange}
          presets={rangePresets}
        />
        <Button
          color="primary"
          variant="outlined"
          onClick={() => refetch()}
          disabled={isFetchingData}
        >
          Lọc dữ liệu
        </Button>
      </div>
      <Table
        dataSource={data?.revenueByFilm || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 360px)" }}
        loading={isFetchingData}
        pagination={{
          current,
          onChange,
          total: data?.revenueByFilm?.length || 0,
          size: "middle",
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} bản ghi`,
          pageSize: 100,
          hideOnSinglePage: true,
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell
                index={0}
                colSpan={2}
                className="font-bold text-center"
              >
                Tổng
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text className="font-bold">
                  {formatNumber(data?.totalByFilm?.onQuantity || 0)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Text className="font-bold">
                  {formatNumber(data?.totalByFilm?.offQuantity || 0)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text className="font-bold">
                  {formatNumber(data?.totalByFilm?.totalQuantity || 0)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <Text className="font-bold">
                  {formatMoney(data?.totalByFilm?.offSaleVietQr || 0)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <Text className="font-bold">
                  {formatMoney(data?.totalByFilm?.offSaleVnPayQr || 0)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <Text className="font-bold">
                  {formatMoney(data?.totalByFilm?.actualOffSale || 0)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <Text className="font-bold">
                  {formatMoney(data?.totalByFilm?.totalSale || 0)}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default TabRevenueByFilm;
