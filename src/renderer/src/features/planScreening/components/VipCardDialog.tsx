import { useCustomer } from "@renderer/hooks/useCustomer";
import { useAvailableVouchersForPos } from "@renderer/hooks/vouchers/useAvailableVouchersForPos";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { BatchProps, ListSeat } from "@shared/types";
import type { DescriptionsProps } from "antd";
import type { InputRef } from "antd";
import { Button, Radio, Descriptions, Input, message, Modal, Space, Table } from "antd";
import { InputStatus } from "antd/es/_util/statusUtils";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TableProps } from "antd";

interface VipCardDialogProps {
  open: boolean;
  onCancel: () => void;
  totalPrice?: number;
  onBooking: (params?: { memberCardCode?: string; voucherCode?: string }) => void;
  planScreenId: number;
  selectedSeats: ListSeat[];
}

const buildSeatFieldsByFloor = (selectedSeats: ListSeat[]) => {
  const floors = [1, 2, 3] as const;

  return floors.reduce<{
    listChairIndexF1?: string;
    listChairValueF1?: string;
    listChairIndexF2?: string;
    listChairValueF2?: string;
    listChairIndexF3?: string;
    listChairValueF3?: string;
  }>((acc, floor) => {
    const seatsByFloor = selectedSeats.filter((seat) => seat.floor === floor);

    if (seatsByFloor.length === 0) {
      return acc;
    }

    const indexKey = `listChairIndexF${floor}` as
      | "listChairIndexF1"
      | "listChairIndexF2"
      | "listChairIndexF3";
    const valueKey = `listChairValueF${floor}` as
      | "listChairValueF1"
      | "listChairValueF2"
      | "listChairValueF3";

    acc[indexKey] = seatsByFloor.map((seat) => seat.seat).join(",");
    acc[valueKey] = seatsByFloor.map((seat) => seat.code).join(",");

    return acc;
  }, {});
};

const VipCardDialog = ({
  open,
  onCancel,
  totalPrice,
  onBooking,
  planScreenId,
  selectedSeats
}: VipCardDialogProps) => {
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [lastSearched, setLastSearched] = useState<string | null>(null);
  const [status, setStatus] = useState<InputStatus>("");
  const [voucherType, setVoucherType] = useState<"campaign" | "u22">("campaign");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const cardInputRef = useRef<InputRef>(null);

  const { data, isFetching, refetch } = useCustomer({
    current: 1,
    pageSize: 1,
    cardCode: searchText
  });

  const customer = useMemo(() => {
    if (!data || data.data.length === 0) return null;

    return data.data[0];
  }, [data]);

  const seatFields = useMemo(() => buildSeatFieldsByFloor(selectedSeats), [selectedSeats]);

  const items: DescriptionsProps["items"] = [
    {
      label: "Họ và tên",
      children: customer?.fullName
    },
    {
      label: "Hạng thẻ",
      children: customer?.cardLevelName
    },
    {
      label: "Ngày sinh",
      children: customer?.birthDay ? dayjs(customer.birthDay).format("DD/MM/YYYY") : ""
    },
    {
      label: "Ngày hết hạn",
      children: customer?.dateExpireCard ? dayjs(customer.dateExpireCard).format("DD/MM/YYYY") : ""
    },
    {
      label: "Điểm tích lũy",
      children: formatNumber(customer?.pointCard || 0)
    },
    {
      label: "Điểm thưởng",
      children: formatNumber(customer?.pointReward || 0)
    },
    {
      label: "Địa chỉ",
      span: 1,
      children: customer?.address
    }
  ];

  const { data: vouchers, isFetching: isFetchingVouchers } = useAvailableVouchersForPos(
    {
      customerId: customer?.id || 0,
      planScreenId,
      ...seatFields
    },
    Boolean(customer?.id)
  );

  const isU22Member = customer?.currentCardId === 12;
  const voucherItems = useMemo(() => vouchers?.items ?? [], [vouchers?.items]);

  useEffect(() => {
    if (!isU22Member && voucherType === "u22") {
      setVoucherType("campaign");
    }
  }, [isU22Member, voucherType]);

  useEffect(() => {
    const defaultBatchId = voucherItems.find((item) => item.vouchers?.length > 0)?.batchId ?? null;

    setSelectedBatchId((current) => {
      if (
        current &&
        voucherItems.some((item) => item.batchId === current && item.vouchers?.length > 0)
      ) {
        return current;
      }

      return defaultBatchId;
    });
  }, [voucherItems]);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      cardInputRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const selectedVoucherCode = useMemo(() => {
    if (!selectedBatchId) return undefined;

    return voucherItems.find((item) => item.batchId === selectedBatchId)?.vouchers?.[0]?.code;
  }, [selectedBatchId, voucherItems]);

  const columns: TableProps<BatchProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Chiến dịch voucher",
      key: "batchName",
      dataIndex: "batchName"
    },
    {
      title: "Giá trị",
      key: "discountValue",
      dataIndex: "discountValue"
    },
    {
      title: "Loại",
      key: "valueTypeName",
      dataIndex: "valueTypeName"
    },
    {
      title: "Bắt đầu từ",
      key: "startAt",
      dataIndex: "startAt",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY")
    },
    {
      title: "Kết thúc",
      key: "endAt",
      dataIndex: "endAt",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY")
    }
  ];

  const onConfirm = () => {
    if (!searchText) {
      message.error("Bạn chưa nhập số thẻ");
      setStatus("error");
      return;
    }

    if (voucherType === "campaign" && !selectedVoucherCode) {
      message.error("Chưa chọn voucher áp dụng");
      return;
    }

    onBooking({
      memberCardCode: searchText,
      voucherCode: voucherType === "u22" ? "U22Ticket" : selectedVoucherCode
    });
    onCancel();
  };

  const onSearch = async () => {
    if (!searchText) {
      message.error("Bạn chưa nhập số thẻ");
      setStatus("error");
      return;
    }

    if (searchText === lastSearched) {
      return;
    }

    setLastSearched(searchText);

    try {
      const res = await refetch();

      const customers = res.data?.data;

      if (!customers || customers.length === 0) {
        message.error("Không tìm thấy khách hàng");
        setStatus("error");
        return;
      }

      setStatus("");
    } catch {
      message.error("Có lỗi xảy ra khi tìm kiếm");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={800}
      title="Sử dụng CTKM cho thành viên"
      centered
      onOk={onConfirm}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4 mt-4">
          <p>Số thẻ</p>
          <Space.Compact className="flex-1">
            <Input
              ref={cardInputRef}
              placeholder="Nhập số thẻ"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setStatus("");
              }}
              status={status}
              onPressEnter={onSearch}
            />
            <Button variant="outlined" color="primary" onClick={onSearch} loading={isFetching}>
              Tìm kiếm
            </Button>
          </Space.Compact>
        </div>

        <Descriptions bordered items={items} column={2} />

        <Radio.Group
          value={voucherType}
          onChange={(e) => setVoucherType(e.target.value)}
          className="flex flex-col gap-2"
        >
          <Radio value="campaign">Áp dụng chương trình khuyến mãi</Radio>
          <Radio value="u22" disabled={!isU22Member}>
            Áp dụng ưu đãi cho thành viên U22
          </Radio>
        </Radio.Group>

        {voucherType === "campaign" && (
          <Table
            rowKey={(record) => record.batchId}
            dataSource={voucherItems}
            columns={columns}
            bordered
            size="small"
            scroll={{ x: "max-content", y: 400 }}
            loading={isFetching || isFetchingVouchers}
            pagination={false}
            rowSelection={{
              type: "radio",
              selectedRowKeys: selectedBatchId ? [selectedBatchId] : [],
              getCheckboxProps: (record) => ({
                disabled: !record.vouchers?.length
              }),
              onChange: (selectedRowKeys) => {
                const nextKey = selectedRowKeys[0];
                setSelectedBatchId(typeof nextKey === "number" ? nextKey : null);
              }
            }}
            onRow={(record) => ({
              onClick: () => {
                if (!record.vouchers?.length) return;
                setSelectedBatchId(record.batchId);
              }
            })}
            rowClassName={(record) =>
              record.vouchers?.length ? "cursor-pointer" : "cursor-not-allowed opacity-60"
            }
          />
        )}

        <div className="bg-gray-100 dark:bg-app-bg-container p-4 rounded-md">
          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="flex justify-between">
                <p>Tiền mua vé:</p>
                <p className="text-primary font-semibold">{formatMoney(totalPrice || 0)}</p>
              </div>
              <div className="flex justify-between">
                <p>Tiền thanh toán sau khuyến mãi:</p>
                <p className="text-red-500 font-semibold">{formatMoney(totalPrice || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VipCardDialog;
