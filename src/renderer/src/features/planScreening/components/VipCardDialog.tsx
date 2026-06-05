import { ordersApi } from "@renderer/api/orders.api";
import { useCustomer } from "@renderer/hooks/useCustomer";
import { useAvailableVouchersForPos } from "@renderer/hooks/vouchers/useAvailableVouchersForPos";
import { useConfigExchangePoints } from "@renderer/hooks/vouchers/useConfigExchangePoints";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { BatchProps, ListSeat } from "@shared/types";
import type { InputRef } from "antd";
import { Button, Input, InputNumber, Modal, Radio, Space, Table } from "antd";
import { InputStatus } from "antd/es/_util/statusUtils";
import dayjs from "dayjs";
import { AlertTriangle, Info, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementRef, ReactNode } from "react";
import type { TableProps } from "antd";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

interface VipCardDialogProps {
  open: boolean;
  onCancel: () => void;
  totalPrice?: number;
  onBooking: (params?: {
    customerId?: number;
    memberCardCode?: string;
    voucherCode?: string;
    pointReward?: number;
  }) => void;
  planScreenId: number;
  selectedSeats: ListSeat[];
  hasSeatTypeDiscount: boolean;
  filmVersionCode?: string;
}

type NoticeTone = "warning" | "info" | "neutral";

const VOUCHER_TYPE_ID = {
  percent: 1,
  amount: 2,
  ticket: 3,
  text: 4
} as const;

interface NoticeCardProps {
  tone: NoticeTone;
  icon: ReactNode;
  children: ReactNode;
}

type CustomerInfoItem = {
  label: string;
  value?: ReactNode;
  full?: boolean;
  valueClassName?: string;
};

const noticeToneClassName: Record<NoticeTone, string> = {
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100 [&_.notice-icon]:bg-amber-100 [&_.notice-icon]:text-amber-600 dark:[&_.notice-icon]:bg-amber-500/16 dark:[&_.notice-icon]:text-amber-300",
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-100 [&_.notice-icon]:bg-sky-100 [&_.notice-icon]:text-sky-600 dark:[&_.notice-icon]:bg-sky-500/16 dark:[&_.notice-icon]:text-sky-300",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/12 dark:bg-white/[0.04] dark:text-slate-200 [&_.notice-icon]:bg-slate-100 [&_.notice-icon]:text-slate-500 dark:[&_.notice-icon]:bg-white/8 dark:[&_.notice-icon]:text-slate-300"
};

const cardLevelBadgeClassName: Record<string, string> = {
  MEMBER:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200",
  U22: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
  VIP: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  VVIP: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-200"
};

const renderCardLevelBadge = (cardLevel?: string | null) => {
  const normalizedCardLevel = cardLevel?.trim();

  if (!normalizedCardLevel) {
    return undefined;
  }

  const className =
    cardLevelBadgeClassName[normalizedCardLevel.toUpperCase()] ||
    "border-primary/25 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {normalizedCardLevel}
    </span>
  );
};

const NoticeCard = ({ tone, icon, children }: NoticeCardProps) => (
  <div
    className={`rounded-xl border px-3 py-2 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm ${noticeToneClassName[tone]}`}
  >
    <div className="flex items-start gap-2.5">
      <span className="notice-icon mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
        {icon}
      </span>
      <span className="pt-px leading-6">{children}</span>
    </div>
  </div>
);

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

const calculateFreeTicketDiscount = (
  selectedSeats: ListSeat[],
  voucher: BatchProps,
  totalPrice: number
) => {
  const freeTicketCount = Math.max(Math.floor(voucher.discountValue || 0), 0);
  if (freeTicketCount === 0) return 0;

  const freeTicketTotal = [...selectedSeats]
    .sort((left, right) => (left.price || 0) - (right.price || 0))
    .slice(0, freeTicketCount)
    .reduce((total, seat) => total + (seat.price || 0), 0);

  return Math.min(freeTicketTotal, totalPrice);
};

const calculateVoucherDiscount = (
  totalPrice: number,
  selectedSeats: ListSeat[],
  voucher?: BatchProps
) => {
  if (!voucher) return 0;

  if (voucher.valueType === VOUCHER_TYPE_ID.percent) {
    return Math.min((totalPrice * (voucher.discountValue || 0)) / 100, totalPrice);
  }

  if (voucher.valueType === VOUCHER_TYPE_ID.amount) {
    return Math.min(voucher.discountValue || 0, totalPrice);
  }

  if (voucher.valueType === VOUCHER_TYPE_ID.ticket) {
    return calculateFreeTicketDiscount(selectedSeats, voucher, totalPrice);
  }

  return 0;
};

const calculatePointRedemptionAmount = (
  points: number,
  basePoint?: number,
  baseAmount?: number
) => {
  if (!basePoint || !baseAmount || basePoint <= 0 || baseAmount <= 0 || points <= 0) {
    return 0;
  }

  return Math.floor((points * baseAmount) / basePoint);
};

const calculateMaxRedeemablePointsByAmount = (
  amount: number,
  basePoint?: number,
  baseAmount?: number
) => {
  if (!basePoint || !baseAmount || basePoint <= 0 || baseAmount <= 0 || amount <= 0) {
    return 0;
  }

  return Math.floor((amount * basePoint) / baseAmount);
};

const normalizeMemberCardCode = (value?: string) => {
  if (!value) return "";

  return value
    .trim()
    .replace(/%(?:20|09|0A|0D)/gi, "")
    .replace(/\+/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9a-z]/gi, "")
    .toUpperCase();
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
  const { message } = useAntdApp();
  const { data: configExchangePoints, isFetching: isFetchingConfigExchangePoints } =
    useConfigExchangePoints({
      url: "/api/v1/Customer/point-config/2",
      method: "GET"
    });

  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [lastSearched, setLastSearched] = useState<string | null>(null);
  const [status, setStatus] = useState<InputStatus>("");
  const [voucherType, setVoucherType] = useState<"campaign" | "u22" | "none">("campaign");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isExchangePointModalOpen, setIsExchangePointModalOpen] = useState(false);
  const [draftExchangePoints, setDraftExchangePoints] = useState<number | null>(0);
  const [exchangePoints, setExchangePoints] = useState(0);
  const [isValidatingU22, setIsValidatingU22] = useState(false);
  const [u22ValidationReason, setU22ValidationReason] = useState<string | null>(null);
  const cardInputRef = useRef<InputRef>(null);
  const exchangePointInputRef = useRef<ElementRef<typeof InputNumber>>(null);

  const {
    data: rawCustomer,
    isError: isCustomerError,
    isFetched: isCustomerFetched,
    isFetching,
    isPlaceholderData
  } = useCustomer(lastSearched ?? undefined);
  const customer = lastSearched && !isPlaceholderData ? rawCustomer : undefined;
  const pointExchangeConfig = configExchangePoints?.data;

  const isCustomerSearched = Boolean(customer);
  const isCurrentCustomerSearched = Boolean(lastSearched && customer);
  const currentPointBalance = Math.max(customer?.cardLevel?.currentPointBalance || 0, 0);
  const pointBalanceAfterExchange = Math.max(currentPointBalance - exchangePoints, 0);
  const normalizedDraftExchangePoints = draftExchangePoints ?? 0;
  const draftPointBalanceAfterExchange = Math.max(
    currentPointBalance - normalizedDraftExchangePoints,
    0
  );

  const seatFields = useMemo(() => buildSeatFieldsByFloor(selectedSeats), [selectedSeats]);

  const customerInfoItems: CustomerInfoItem[] = [
    {
      label: "Họ và tên",
      value: customer?.fullName
    },
    {
      label: "Hạng thẻ",
      value: renderCardLevelBadge(customer?.cardLevel?.currentTierName)
    },
    {
      label: "Ngày sinh",
      value: customer?.birthDay ? dayjs(customer.birthDay).format("DD/MM/YYYY") : ""
    },
    {
      label: "Ngày hết hạn",
      value: customer?.dateExpireCard ? dayjs(customer.dateExpireCard).format("DD/MM/YYYY") : ""
    },
    {
      label: "Điểm tích lũy",
      value: (
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {formatNumber(exchangePoints > 0 ? pointBalanceAfterExchange : currentPointBalance)}
          </span>
          {exchangePoints > 0 && (
            <span className="text-red-500">(-{formatNumber(exchangePoints)})</span>
          )}
          <Button
            size="small"
            type="primary"
            ghost
            className="h-6 rounded-full px-2.5 text-[12px] font-semibold shadow-none"
            disabled={!isCurrentCustomerSearched || currentPointBalance <= 0 || hasSeatTypeDiscount}
            onClick={() => {
              if (hasSeatTypeDiscount) {
                message.warning("Đã áp dụng giảm giá bên ngoài, không thể đổi điểm");
                return;
              }

              setDraftExchangePoints(defaultExchangePoints);
              setIsExchangePointModalOpen(true);
            }}
          >
            Đổi điểm
          </Button>
        </div>
      ),
      valueClassName: "text-emerald-600 dark:text-emerald-300"
    },
    {
      label: "Tổng chi tiêu",
      value: formatMoney(customer?.cardLevel?.totalSpendingThisYear || 0),
      valueClassName: "text-primary dark:text-primary-foreground"
    },
    {
      label: "Địa chỉ",
      value: customer?.address,
      full: true
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
      setExchangePoints(0);
      setDraftExchangePoints(0);
      setIsExchangePointModalOpen(false);
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
    if (!open) return;
  }, [open]);

  useEffect(() => {
    if (!lastSearched || isFetching || isPlaceholderData) {
      return;
    }

    if (isCustomerError) {
      message.error("Có lỗi xảy ra khi tìm kiếm");
      setStatus("error");
      setIsValidatingU22(false);
      setU22ValidationReason(null);
      return;
    }

    if (isCustomerFetched && !customer) {
      message.error("Không tìm thấy khách hàng");
      setStatus("error");
      return;
    }

    if (customer) {
      setStatus("");
    }
  }, [
    customer,
    isCustomerError,
    isCustomerFetched,
    isFetching,
    isPlaceholderData,
    lastSearched,
    message
  ]);

  useEffect(() => {
    if (
      !open ||
      !lastSearched ||
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
          memberCardCode: lastSearched
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
      return calculateVoucherDiscount(baseTotal, selectedSeats, selectedVoucher);
    }

    if (voucherType === "u22" && is2DVersion) {
      return Math.max(baseTotal - 55000, 0);
    }

    return 0;
  }, [hasSeatTypeDiscount, is2DVersion, selectedSeats, selectedVoucher, totalPrice, voucherType]);

  const finalAmount = useMemo(
    () => (totalPrice || 0) - discountAmount,
    [discountAmount, totalPrice]
  );
  const minPointsForRedemption = pointExchangeConfig?.minPointsForRedemption || 0;
  const hasPointExchangeConfig =
    Boolean(pointExchangeConfig?.basePoint) &&
    Boolean(pointExchangeConfig?.baseAmount) &&
    (pointExchangeConfig?.basePoint || 0) > 0 &&
    (pointExchangeConfig?.baseAmount || 0) > 0;
  const maxRedeemablePointsByAmount = useMemo(
    () =>
      calculateMaxRedeemablePointsByAmount(
        finalAmount,
        pointExchangeConfig?.basePoint,
        pointExchangeConfig?.baseAmount
      ),
    [finalAmount, pointExchangeConfig?.baseAmount, pointExchangeConfig?.basePoint]
  );
  const maxRedeemablePoints = Math.max(
    0,
    Math.min(currentPointBalance, maxRedeemablePointsByAmount)
  );
  const defaultExchangePoints =
    maxRedeemablePoints > 0
      ? Math.min(Math.max(exchangePoints || minPointsForRedemption, 0), maxRedeemablePoints)
      : 0;
  const draftPointRedemptionAmount = Math.min(
    calculatePointRedemptionAmount(
      normalizedDraftExchangePoints,
      pointExchangeConfig?.basePoint,
      pointExchangeConfig?.baseAmount
    ),
    finalAmount
  );
  const pointRedemptionAmount = Math.min(
    calculatePointRedemptionAmount(
      exchangePoints,
      pointExchangeConfig?.basePoint,
      pointExchangeConfig?.baseAmount
    ),
    finalAmount
  );
  const amountAfterPointRedemption = Math.max(finalAmount - pointRedemptionAmount, 0);
  const isDraftExchangePointsOutOfRange =
    normalizedDraftExchangePoints > 0 &&
    (normalizedDraftExchangePoints < minPointsForRedemption ||
      normalizedDraftExchangePoints > maxRedeemablePoints);

  useEffect(() => {
    if (exchangePoints <= 0) return;

    if (
      !hasPointExchangeConfig ||
      finalAmount <= 0 ||
      maxRedeemablePoints < minPointsForRedemption
    ) {
      setExchangePoints(0);
      setDraftExchangePoints(0);
      return;
    }

    if (exchangePoints > maxRedeemablePoints) {
      setExchangePoints(maxRedeemablePoints);
      setDraftExchangePoints((current) =>
        current !== null && current > maxRedeemablePoints ? maxRedeemablePoints : current
      );
    }
  }, [
    exchangePoints,
    finalAmount,
    hasPointExchangeConfig,
    maxRedeemablePoints,
    minPointsForRedemption
  ]);

  const columns: TableProps<BatchProps>["columns"] = [
    {
      title: "Chiến dịch voucher",
      key: "batchName",
      dataIndex: "batchName"
    },
    {
      title: "Giá trị",
      key: "discountValue",
      render: (_, record) => formatVoucherValue(record),
      align: "center",
      width: 150
    },
    {
      title: "Bắt đầu từ",
      key: "startAt",
      dataIndex: "startAt",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      width: 120,
      align: "center"
    },
    {
      title: "Kết thúc",
      key: "endAt",
      dataIndex: "endAt",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      width: 120,
      align: "center"
    }
  ];

  const onConfirm = () => {
    const normalizedSearchText = normalizeMemberCardCode(lastSearched ?? undefined);

    if (!normalizedSearchText) {
      message.error("Bạn chưa tìm kiếm số thẻ");
      setStatus("error");
      return;
    }

    if (!hasSeatTypeDiscount && voucherType === "campaign" && !selectedVoucherCode) {
      message.error("Chưa chọn voucher áp dụng");
      return;
    }

    onBooking({
      customerId: customer?.id,
      memberCardCode: normalizedSearchText,
      voucherCode: hasSeatTypeDiscount
        ? undefined
        : voucherType === "none"
          ? undefined
          : voucherType === "u22"
            ? "U22Ticket"
            : selectedVoucherCode,
      pointReward: !hasSeatTypeDiscount && exchangePoints > 0 ? exchangePoints : undefined
    });
    onCancel();
  };

  const onSearch = () => {
    const normalizedSearchText = normalizeMemberCardCode(searchText);

    if (!normalizedSearchText) {
      message.error("Bạn chưa nhập số thẻ");
      setStatus("error");
      return;
    }

    if (normalizedSearchText === lastSearched) {
      return;
    }

    setStatus("");
    setIsValidatingU22(false);
    setU22ValidationReason(null);
    setExchangePoints(0);
    setDraftExchangePoints(0);
    setIsExchangePointModalOpen(false);
    setLastSearched(normalizedSearchText);
  };

  const updateSearchText = (value: string) => {
    const normalizedValue = normalizeMemberCardCode(value);

    setSearchText(normalizedValue);
    setStatus("");
  };

  const onConfirmExchangePoints = () => {
    if (!hasPointExchangeConfig) {
      message.error("Chưa có cấu hình quy đổi điểm");
      return;
    }

    if (hasSeatTypeDiscount) {
      message.error("Đã áp dụng giảm giá bên ngoài, không thể đổi điểm");
      setExchangePoints(0);
      setDraftExchangePoints(0);
      setIsExchangePointModalOpen(false);
      return;
    }

    const normalizedExchangePoints = Math.max(Math.floor(normalizedDraftExchangePoints), 0);

    if (normalizedExchangePoints <= 0) {
      setExchangePoints(0);
      setDraftExchangePoints(0);
      setIsExchangePointModalOpen(false);
      return;
    }

    if (normalizedExchangePoints < minPointsForRedemption) {
      message.error(`Số điểm quy đổi tối thiểu là ${formatNumber(minPointsForRedemption)} điểm`);
      return;
    }

    if (normalizedExchangePoints > currentPointBalance) {
      message.error("Số điểm quy đổi vượt quá điểm tích lũy hiện tại");
      return;
    }

    if (normalizedExchangePoints > maxRedeemablePoints) {
      message.error(
        `Số điểm quy đổi tối đa theo giá trị đơn là ${formatNumber(maxRedeemablePoints)} điểm`
      );
      return;
    }

    setExchangePoints(normalizedExchangePoints);
    setDraftExchangePoints(normalizedExchangePoints);
    setIsExchangePointModalOpen(false);
  };

  const onClearExchangePoints = () => {
    setExchangePoints(0);
    setDraftExchangePoints(0);
    setIsExchangePointModalOpen(false);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        width={900}
        title="Sử dụng CTKM cho thành viên"
        centered
        onOk={onConfirm}
        mask={{ closable: false }}
        style={{ marginTop: 24, marginBottom: 24 }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4 mt-4">
            <p>Số thẻ</p>
            <Space.Compact className="flex-1">
              <Input
                ref={cardInputRef}
                placeholder="Nhập số thẻ"
                value={searchText}
                onChange={(e) => updateSearchText(e.target.value)}
                status={status}
                onPressEnter={onSearch}
              />
              <Button variant="outlined" color="primary" onClick={onSearch} loading={isFetching}>
                Tìm kiếm
              </Button>
            </Space.Compact>
          </div>

          <div className="rounded-xl border border-primary/25 bg-linear-to-br from-primary/8 via-sky-50 to-white p-3 shadow-[0_8px_22px_rgba(70,79,180,0.1)] dark:border-primary/35 dark:from-primary/15 dark:via-sky-500/8 dark:to-slate-950/70">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-foreground">
              Thông tin khách hàng
            </p>

            <div className="grid grid-cols-1 rounded-lg border border-primary/15 bg-white/90 backdrop-blur-sm dark:border-white/12 dark:bg-slate-950/45 sm:grid-cols-2">
              {customerInfoItems.map((item) => (
                <div
                  key={item.label}
                  className={`border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-white/8 sm:nth-last-[-n+2]:border-b-0 ${
                    item.full ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      {item.label}
                    </div>
                    <div
                      className={`min-h-5 wrap-break-word text-[13px] font-semibold ${
                        item.valueClassName || "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {item.value || "--"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Radio.Group
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            className="flex flex-row flex-wrap items-center gap-x-5 gap-y-2"
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
            <NoticeCard tone="warning" icon={<AlertTriangle size={14} strokeWidth={2.25} />}>
              Ưu đãi U22 chỉ áp dụng khi chọn đúng 1 ghế. Vui lòng bỏ bớt ghế nếu muốn dùng ưu đãi
              này.
            </NoticeCard>
          )}

          {!hasSeatTypeDiscount &&
            isCustomerSearched &&
            isValidatingU22 &&
            isSingleSeatSelected && (
              <NoticeCard
                tone="info"
                icon={<LoaderCircle size={14} strokeWidth={2.25} className="animate-spin" />}
              >
                Đang kiểm tra điều kiện sử dụng ưu đãi U22 trong ngày.
              </NoticeCard>
            )}

          {!hasSeatTypeDiscount && isCustomerSearched && isU22UsedToday && (
            <NoticeCard tone="warning" icon={<AlertTriangle size={14} strokeWidth={2.25} />}>
              Thành viên U22 này đã sử dụng voucher hôm nay, nên không thể chọn ưu đãi U22 thêm lần
              nữa.
            </NoticeCard>
          )}

          {!isCustomerSearched && (
            <NoticeCard tone="neutral" icon={<Info size={14} strokeWidth={2.25} />}>
              Nhập số thẻ và tìm kiếm khách hàng để chọn hình thức áp dụng khuyến mãi.
            </NoticeCard>
          )}

          {isCustomerSearched && hasSeatTypeDiscount && (
            <NoticeCard tone="warning" icon={<AlertTriangle size={14} strokeWidth={2.25} />}>
              Đã áp dụng giảm giá theo loại vé. Chỉ được áp mã khách hàng, không thể dùng thêm
              voucher, ưu đãi U22 hoặc đổi điểm.
            </NoticeCard>
          )}

          {isCustomerSearched && !hasSeatTypeDiscount && voucherType === "campaign" && (
            <Table
              rowKey={(record) => record.batchId}
              dataSource={voucherItems}
              columns={columns}
              bordered
              size="small"
              scroll={{ y: 120 }}
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

          <div className="rounded-md border border-slate-200 bg-gray-100 p-4 dark:border-white/10 dark:bg-app-bg-container">
            <div className="space-y-1">
              <div className="flex justify-between">
                <p>Tiền mua vé:</p>
                <p className="font-semibold text-primary">
                  {formatMoney(voucherType === "u22" && is2DVersion ? 55000 : totalPrice || 0)}
                </p>
              </div>
              <div className="flex justify-between">
                <p>Tiền khuyến mãi:</p>
                <p className="font-semibold text-red-500">-{formatMoney(discountAmount)}</p>
              </div>
              <div className="flex justify-between">
                <p>Tiền đổi điểm:</p>
                <p className="font-semibold text-red-500">-{formatMoney(pointRedemptionAmount)}</p>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 dark:border-white/10">
                <p>Thành tiền:</p>
                <p className="text-lg font-bold text-primary dark:text-primary-foreground">
                  {formatMoney(amountAfterPointRedemption)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={isExchangePointModalOpen}
        title="Đổi điểm tích lũy"
        centered
        width={400}
        okText="Xác nhận"
        cancelText="Không đổi điểm"
        mask={{ closable: false }}
        onOk={onConfirmExchangePoints}
        onCancel={onClearExchangePoints}
        afterOpenChange={(isOpen) => {
          if (!isOpen) return;

          window.setTimeout(() => {
            exchangePointInputRef.current?.focus({ cursor: "all" });
          }, 0);
        }}
      >
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/4">
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">Điểm tích lũy hiện tại</p>
            <p className="text-right text-sm font-semibold text-emerald-600 dark:text-emerald-300">
              {formatNumber(currentPointBalance)}
            </p>
          </div>

          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">Điểm quy đổi</p>
            <InputNumber
              ref={exchangePointInputRef}
              className="w-40 justify-self-end text-right text-sm [&_.ant-input-number-input]:text-right"
              min={minPointsForRedemption}
              max={maxRedeemablePoints}
              value={draftExchangePoints}
              status={isDraftExchangePointsOutOfRange ? "error" : undefined}
              controls={false}
              disabled={isFetchingConfigExchangePoints || !hasPointExchangeConfig}
              formatter={(value) => (value || value === 0 ? formatNumber(Number(value)) : "")}
              parser={(value) => {
                const parsedValue = value?.replace(/[^\d]/g, "");
                return parsedValue ? Number(parsedValue) : Number.NaN;
              }}
              onChange={(value) => {
                if (value === null || Number.isNaN(Number(value))) {
                  setDraftExchangePoints(null);
                  return;
                }

                const nextValue = Number(value) || 0;
                setDraftExchangePoints(Math.max(nextValue, 0));
              }}
            />
          </div>

          {isDraftExchangePointsOutOfRange && (
            <p className="-mt-1 text-right text-xs text-red-500">
              Nhập từ {formatNumber(minPointsForRedemption)} đến {formatNumber(maxRedeemablePoints)}{" "}
              điểm.
            </p>
          )}

          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">Điểm sau khi quy đổi</p>
            <p className="text-right text-sm font-semibold text-sky-600 dark:text-sky-300">
              {formatNumber(draftPointBalanceAfterExchange)}
            </p>
          </div>

          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">Tiền được trừ</p>
            <p className="text-right text-sm font-semibold text-red-500">
              -{formatMoney(draftPointRedemptionAmount)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100">
          <Info
            size={14}
            strokeWidth={2.25}
            className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300"
          />
          <div className="space-y-1">
            <p>
              Cấu hình quy đổi:{" "}
              <span className="font-semibold">
                {hasPointExchangeConfig
                  ? `${formatNumber(pointExchangeConfig?.basePoint || 0)} điểm = ${formatMoney(pointExchangeConfig?.baseAmount || 0)}`
                  : "--"}
              </span>
            </p>
            <p>
              Tối thiểu{" "}
              <span className="font-semibold">{formatNumber(minPointsForRedemption)}</span> điểm,
              tối đa <span className="font-semibold">{formatNumber(maxRedeemablePoints)}</span> điểm
              theo giá trị đơn hiện tại.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default VipCardDialog;
