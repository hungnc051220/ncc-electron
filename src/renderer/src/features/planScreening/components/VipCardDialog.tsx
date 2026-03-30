import { ordersApi } from "@renderer/api/orders.api";
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
  onBooking: (params?: {
    customerId?: number;
    memberCardCode?: string;
    voucherCode?: string;
  }) => void;
  planScreenId: number;
  selectedSeats: ListSeat[];
  hasSeatTypeDiscount: boolean;
  filmVersionCode?: string;
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

const formatVoucherValue = (voucher?: BatchProps) => {
  if (!voucher) return "-";

  const isPercentType =
    voucher.valueTypeName?.includes("%") ||
    voucher.valueTypeName?.toLowerCase().includes("phần trăm") ||
    voucher.valueTypeName?.toLowerCase().includes("phan tram");

  return isPercentType ? `${voucher.discountValue}%` : formatMoney(voucher.discountValue);
};

const calculateVoucherDiscount = (totalPrice: number, voucher?: BatchProps) => {
  if (!voucher) return 0;

  const isPercentType =
    voucher.valueTypeName?.includes("%") ||
    voucher.valueTypeName?.toLowerCase().includes("phần trăm") ||
    voucher.valueTypeName?.toLowerCase().includes("phan tram");

  if (isPercentType) {
    return Math.min((totalPrice * voucher.discountValue) / 100, totalPrice);
  }

  return Math.min(voucher.discountValue || 0, totalPrice);
};

const VipCardDialog = ({
  open,
  onCancel,
  totalPrice,
  onBooking,
  planScreenId,
  selectedSeats,
  hasSeatTypeDiscount,
  filmVersionCode
}: VipCardDialogProps) => {
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [lastSearched, setLastSearched] = useState<string | null>(null);
  const [status, setStatus] = useState<InputStatus>("");
  const [voucherType, setVoucherType] = useState<"campaign" | "u22" | "none">("campaign");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isValidatingU22, setIsValidatingU22] = useState(false);
  const [u22ValidationReason, setU22ValidationReason] = useState<string | null>(null);
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
  const isCustomerSearched = Boolean(customer);
  const isCurrentCustomerSearched = Boolean(searchText && lastSearched === searchText && customer);

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
    Boolean(customer?.id) && !hasSeatTypeDiscount
  );

  const isU22Member = customer?.currentCardId === 12;
  const voucherItems = useMemo(() => vouchers?.items ?? [], [vouchers?.items]);
  const isSingleSeatSelected = selectedSeats.length === 1;
  const isU22UsedToday = u22ValidationReason === "used_today";
  const isU22Disabled =
    !isCurrentCustomerSearched ||
    hasSeatTypeDiscount ||
    !isU22Member ||
    !isSingleSeatSelected ||
    isValidatingU22 ||
    isU22UsedToday;

  useEffect(() => {
    if (isU22Disabled && voucherType === "u22") {
      setVoucherType("campaign");
    }
  }, [isU22Disabled, voucherType]);

  useEffect(() => {
    if (hasSeatTypeDiscount) {
      setVoucherType("none");
      setSelectedBatchId(null);
    }
  }, [hasSeatTypeDiscount]);

  useEffect(() => {
    if (!isCustomerSearched) {
      setSelectedBatchId(null);
      setVoucherType(hasSeatTypeDiscount ? "none" : "campaign");
    }
  }, [hasSeatTypeDiscount, isCustomerSearched]);

  useEffect(() => {
    if (!isSingleSeatSelected) {
      setU22ValidationReason(null);
      setIsValidatingU22(false);
    }
  }, [isSingleSeatSelected]);

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
    if (open) {
      setVoucherType(hasSeatTypeDiscount ? "none" : "campaign");
    }
  }, [hasSeatTypeDiscount, open]);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      cardInputRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (
      !open ||
      !searchText ||
      lastSearched !== searchText ||
      !customer?.id ||
      customer.currentCardId !== 12 ||
      !isSingleSeatSelected
    ) {
      return;
    }

    let isCancelled = false;

    const validateU22Voucher = async () => {
      setIsValidatingU22(true);
      setU22ValidationReason(null);

      try {
        const validation = await ordersApi.validateVoucher({
          customerId: customer.id,
          planScreenId,
          ...seatFields,
          voucherCode: "U22Ticket",
          memberCardCode: searchText
        });

        if (!isCancelled) {
          setU22ValidationReason(validation.isValid ? null : validation.reason || "invalid");
        }
      } catch {
        if (!isCancelled) {
          setU22ValidationReason(null);
        }
      } finally {
        if (!isCancelled) {
          setIsValidatingU22(false);
        }
      }
    };

    void validateU22Voucher();

    return () => {
      isCancelled = true;
    };
  }, [
    customer?.currentCardId,
    customer?.id,
    lastSearched,
    open,
    planScreenId,
    searchText,
    seatFields,
    isSingleSeatSelected
  ]);

  const selectedVoucherCode = useMemo(() => {
    if (!selectedBatchId || voucherType === "none") return undefined;

    return voucherItems.find((item) => item.batchId === selectedBatchId)?.vouchers?.[0]?.code;
  }, [selectedBatchId, voucherItems, voucherType]);

  const selectedVoucher = useMemo(() => {
    if (!selectedBatchId || voucherType === "none") return undefined;

    return voucherItems.find((item) => item.batchId === selectedBatchId);
  }, [selectedBatchId, voucherItems, voucherType]);

  const is2DVersion = useMemo(
    () => filmVersionCode?.toUpperCase().includes("2D") ?? false,
    [filmVersionCode]
  );

  const discountAmount = useMemo(() => {
    const baseTotal = totalPrice || 0;

    if (voucherType === "none" || hasSeatTypeDiscount) {
      return 0;
    }

    if (voucherType === "campaign") {
      return calculateVoucherDiscount(baseTotal, selectedVoucher);
    }

    if (voucherType === "u22" && is2DVersion) {
      return Math.max(baseTotal - 55000, 0);
    }

    return 0;
  }, [hasSeatTypeDiscount, is2DVersion, selectedVoucher, totalPrice, voucherType]);

  const finalAmount = useMemo(
    () => (totalPrice || 0) - discountAmount,
    [discountAmount, totalPrice]
  );

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
      render: (_, record) => formatVoucherValue(record),
      align: "right"
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

    if (!hasSeatTypeDiscount && voucherType === "campaign" && !selectedVoucherCode) {
      message.error("Chưa chọn voucher áp dụng");
      return;
    }

    onBooking({
      customerId: customer?.id,
      memberCardCode: searchText,
      voucherCode: hasSeatTypeDiscount
        ? undefined
        : voucherType === "none"
          ? undefined
          : voucherType === "u22"
            ? "U22Ticket"
            : selectedVoucherCode
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
      setIsValidatingU22(false);
      setU22ValidationReason(null);
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
                setLastSearched(null);
                setIsValidatingU22(false);
                setU22ValidationReason(null);
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
          <Radio value="campaign" disabled={!isCustomerSearched || hasSeatTypeDiscount}>
            Áp dụng chương trình khuyến mãi
          </Radio>
          <Radio value="u22" disabled={isU22Disabled}>
            Áp dụng ưu đãi cho thành viên U22
          </Radio>
          <Radio value="none" disabled={!isCustomerSearched}>
            Không áp dụng khuyến mãi
          </Radio>
        </Radio.Group>

        {!hasSeatTypeDiscount && selectedSeats.length > 1 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Ưu đãi U22 chỉ áp dụng khi chọn đúng 1 ghế. Vui lòng bỏ bớt ghế nếu muốn dùng ưu đãi
            này.
          </div>
        )}

        {!hasSeatTypeDiscount && isCustomerSearched && isValidatingU22 && isSingleSeatSelected && (
          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            Đang kiểm tra điều kiện sử dụng ưu đãi U22 trong ngày.
          </div>
        )}

        {!hasSeatTypeDiscount && isCustomerSearched && isU22UsedToday && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Thành viên U22 này đã sử dụng voucher hôm nay, nên không thể chọn ưu đãi U22 thêm lần
            nữa.
          </div>
        )}

        {!isCustomerSearched && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Nhập số thẻ và tìm kiếm khách hàng để chọn hình thức áp dụng khuyến mãi.
          </div>
        )}

        {isCustomerSearched && hasSeatTypeDiscount && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Đã áp dụng giảm giá theo loại vé ở ngoài. Chỉ được áp mã khách hàng, không thể dùng thêm
            voucher hoặc ưu đãi U22.
          </div>
        )}

        {isCustomerSearched && !hasSeatTypeDiscount && voucherType === "campaign" && (
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

        {isCustomerSearched && !hasSeatTypeDiscount && voucherType === "u22" && !is2DVersion && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Suất chiếu 3D không tính ưu đãi U22. Giá vé giữ nguyên theo giá hiện tại.
          </div>
        )}

        <div className="bg-gray-100 dark:bg-app-bg-container p-4 rounded-md">
          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="flex justify-between">
                <p>Tiền mua vé:</p>
                <p className="text-primary font-semibold">
                  {formatMoney(voucherType === "u22" && is2DVersion ? 55000 : totalPrice || 0)}
                </p>
              </div>
              <div className="flex justify-between">
                <p>Tiền thanh toán sau khuyến mãi:</p>
                <p className="text-red-500 font-semibold">{formatMoney(finalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VipCardDialog;
