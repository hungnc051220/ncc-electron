import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { useVouchers } from "@renderer/hooks/vouchers/useVouchers";
import { formatMoney, formatNumber, compareText, compareNumber } from "@renderer/lib/utils";
import { BatchVoucherProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

const VOUCHER_TYPE_ID = {
  percent: 1,
  amount: 2,
  ticket: 3,
  text: 4
} as const;

const getVoucherValueLabel = (voucher: BatchVoucherProps) => {
  switch (voucher.valueType) {
    case VOUCHER_TYPE_ID.percent:
      return `${voucher.discountValue}%`;
    case VOUCHER_TYPE_ID.amount:
      return formatMoney(voucher.discountValue || 0);
    case VOUCHER_TYPE_ID.ticket:
      return `${formatNumber(voucher.discountValue || 1)} vé miễn phí`;
    case VOUCHER_TYPE_ID.text:
      return voucher.rewardTextValue || "Hiện vật / mô tả";
    default:
      return voucher.rewardTextValue || "--";
  }
};

const getCustomerGroupBadgeClassName = (memberTierName: string) => {
  const normalizedName = memberTierName.trim().toLowerCase();

  if (normalizedName === "vip") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200";
  }

  if (normalizedName === "vvip") {
    return "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200";
  }

  return "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200";
};

const VouchersPage = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(
    () => ({
      url: "/api/v1/Voucher/voucher-batch",
      method: "POST",
      data: {
        pageIndex: current,
        pageSize: pageSize,
        status: 1
      }
    }),
    [current, pageSize]
  );

  const { data: vouchers, isFetching, refetch } = useVouchers(params);

  const columns: TableProps<BatchVoucherProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 64,
      fixed: "left"
    },
    {
      title: "Chiến dịch voucher",
      key: "name",
      dataIndex: "name",
      width: 300,
      sorter: (a, b) => compareText(a.name, b.name),
      render: (value: string) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{value || "--"}</span>
      ),
      fixed: "left"
    },
    {
      title: "Mô tả",
      key: "description",
      dataIndex: "description",
      width: 400,
      sorter: (a, b) => compareText(a.description, b.description),
      render: (value: string) => (
        <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {value || "--"}
        </span>
      )
    },
    {
      title: "Nhóm khách hàng",
      key: "distributionRules",
      dataIndex: "distributionRules",
      width: 200,
      render: (value: BatchVoucherProps["distributionRules"]) => {
        if (!value || value.length === 0) {
          return (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
              Tất cả khách hàng
            </span>
          );
        }

        const visibleRules = value.slice(0, 2);
        const hiddenCount = value.length - visibleRules.length;

        return (
          <div className="flex flex-wrap gap-1.5 py-1">
            {visibleRules.map((rule) => (
              <span
                key={rule.memberTierId}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${getCustomerGroupBadgeClassName(rule.memberTierName)}`}
              >
                {rule.memberTierName}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                +{hiddenCount} nhóm
              </span>
            )}
          </div>
        );
      }
    },
    {
      title: "Giá trị",
      key: "valueType",
      dataIndex: "valueType",
      width: 190,
      sorter: (a, b) => compareText(getVoucherValueLabel(a), getVoucherValueLabel(b)),
      render: (_: number, record) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {getVoucherValueLabel(record)}
        </span>
      ),
      align: "right"
    },
    {
      title: "Giá trị đơn tối thiểu",
      key: "minOrderAmount",
      dataIndex: "minOrderAmount",
      width: 180,
      align: "right",
      sorter: (a, b) => compareNumber(a.minOrderAmount, b.minOrderAmount),
      render: (value: number) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {value > 0 ? formatMoney(value) : "Không yêu cầu"}
        </span>
      )
    },
    {
      title: "Áp dụng tối đa/khách",
      key: "perCustomerLimit",
      dataIndex: "perCustomerLimit",
      width: 200,
      align: "right",
      sorter: (a, b) => compareNumber(a.perCustomerLimit, b.perCustomerLimit),
      render: (value: number) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {value > 0 ? formatNumber(value) : "Không giới hạn"}
        </span>
      )
    },
    {
      title: "Tổng số lượng",
      key: "totalQuantity",
      dataIndex: "totalQuantity",
      width: 130,
      align: "right",
      sorter: (a, b) => compareNumber(a.totalQuantity, b.totalQuantity),
      render: (value: number) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {formatNumber(value || 0)}
        </span>
      )
    },
    {
      title: "Đã sử dụng",
      key: "usedCount",
      dataIndex: "usedCount",
      width: 130,
      align: "right",
      sorter: (a, b) => compareNumber(a.usedCount, b.usedCount),
      render: (value: number) => {
        return (
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatNumber(value || 0)}
          </span>
        );
      }
    },
    {
      title: "Bắt đầu từ",
      key: "startAt",
      dataIndex: "startAt",
      width: 120,
      sorter: (a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf(),
      render: (value: string) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {dayjs(value).format("DD/MM/YYYY")}
        </span>
      )
    },
    {
      title: "Kết thúc",
      key: "endAt",
      dataIndex: "endAt",
      width: 120,
      sorter: (a, b) => dayjs(a.endAt).valueOf() - dayjs(b.endAt).valueOf(),
      render: (value: string) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {dayjs(value).format("DD/MM/YYYY")}
        </span>
      )
    }
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={<RefreshButton loading={isFetching} onRefresh={() => refetch()} />}
      />

      <AutoHeightTable
        rowKey="id"
        dataSource={vouchers?.data?.items || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: vouchers?.data.totalItems || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />
    </div>
  );
};

export default VouchersPage;
