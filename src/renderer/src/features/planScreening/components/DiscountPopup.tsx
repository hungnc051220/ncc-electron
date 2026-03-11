import { formatMoney } from "@renderer/lib/utils";
import { DiscountProps, ListSeat } from "@shared/types";
import { Button, Empty, Modal, Table, Tag } from "antd";
import type { TableProps } from "antd";
import { useEffect, useMemo, useState } from "react";

interface DiscountPopupProps {
  data?: DiscountProps[];
  openDiscount: boolean;
  selectedSeats: ListSeat[];
  value: Record<string, number | undefined>;
  setOpenDiscount: (open: boolean) => void;
  onChange: (value: Record<string, number | undefined>) => void;
}

interface SeatDiscountItem {
  key: string;
  label: string;
  price: number;
  seat: ListSeat;
}

const getSeatDiscountKey = (seat: ListSeat) => `${seat.floor}-${seat.seat}`;

const buildSeatDiscountItems = (selectedSeats: ListSeat[]): SeatDiscountItem[] => {
  return [...selectedSeats]
    .sort((a, b) => a.code.localeCompare(b.code, "vi"))
    .map((seat) => ({
      key: getSeatDiscountKey(seat),
      label: seat.code,
      price: seat.price,
      seat
    }));
};

const DiscountPopup = ({
  data,
  openDiscount,
  selectedSeats,
  value,
  setOpenDiscount,
  onChange
}: DiscountPopupProps) => {
  const seatItems = useMemo(() => buildSeatDiscountItems(selectedSeats), [selectedSeats]);
  const discountsById = useMemo(
    () => new Map((data || []).map((discount) => [discount.id, discount])),
    [data]
  );
  const [draftValue, setDraftValue] = useState<Record<string, number | undefined>>({});
  const [activeSeatKey, setActiveSeatKey] = useState<string | null>(null);

  useEffect(() => {
    if (!openDiscount) return;

    const allowedKeys = new Set(seatItems.map((item) => item.key));
    const nextDraft = Object.fromEntries(
      Object.entries(value).filter(([key, discountId]) => allowedKeys.has(key) && discountId)
    );

    setDraftValue(nextDraft);
    setActiveSeatKey((current) => {
      if (current && allowedKeys.has(current)) return current;
      return seatItems[0]?.key ?? null;
    });
  }, [openDiscount, seatItems, value]);

  const activeSeat = useMemo(
    () => seatItems.find((item) => item.key === activeSeatKey),
    [activeSeatKey, seatItems]
  );

  const selectedDiscountId = activeSeat ? draftValue[activeSeat.key] : undefined;

  const columns: TableProps<DiscountProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      width: 64,
      render: (_, __, index: number) => index + 1
    },
    {
      title: "Khuyến mại, giảm giá",
      dataIndex: "discountName",
      key: "discountName"
    },
    {
      title: "Hình thức",
      dataIndex: "discountType",
      key: "discountType"
    },
    {
      title: "Số tiền",
      dataIndex: "discountAmount",
      key: "discountAmount",
      render: (value: number) => (value ? formatMoney(value) : "-"),
      align: "right"
    },
    {
      title: "Tỷ lệ (%)",
      dataIndex: "discountRate",
      key: "discountRate",
      render: (value: number) => (value ? `${value}%` : "-"),
      align: "right"
    }
  ];

  const applyDiscount = (discountId?: number) => {
    if (!activeSeat) return;

    setDraftValue((prev) => {
      const next = { ...prev };

      if (discountId) {
        next[activeSeat.key] = discountId;
      } else {
        delete next[activeSeat.key];
      }

      return next;
    });
  };

  const onOk = () => {
    onChange(draftValue);
    setOpenDiscount(false);
  };

  const onRemoveAllDiscount = () => {
    setDraftValue({});
    onChange({});
    setOpenDiscount(false);
  };

  return (
    <Modal
      title="Chọn giảm giá theo loại vé"
      open={openDiscount}
      onOk={onOk}
      onCancel={() => setOpenDiscount(false)}
      width={1100}
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <CancelBtn />
          <Button variant="outlined" color="red" onClick={onRemoveAllDiscount}>
            Bỏ tất cả giảm giá
          </Button>
          <OkBtn />
        </>
      )}
    >
      {seatItems.length === 0 ? (
        <Empty description="Chưa có ghế nào được chọn" />
      ) : (
        <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-3">
              <p className="text-sm font-semibold">Danh sách ghế</p>
              <p className="text-xs text-gray-500">
                Chọn từng ghế bên dưới rồi gán giảm giá tương ứng.
              </p>
            </div>

            <div className="flex max-h-[460px] flex-col gap-2 overflow-y-auto pr-1">
              {seatItems.map((item) => {
                const appliedDiscount = draftValue[item.key]
                  ? discountsById.get(draftValue[item.key]!)
                  : undefined;
                const isActive = activeSeatKey === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      "rounded-lg border p-3 text-left transition",
                      isActive
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    ].join(" ")}
                    onClick={() => setActiveSeatKey(item.key)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-gray-500">
                          {item.seat.positionName || "Ghế"} x {formatMoney(item.price)}
                        </p>
                      </div>
                      {appliedDiscount ? (
                        <Tag color="green" className="mr-0">
                          {appliedDiscount.discountName}
                        </Tag>
                      ) : (
                        <Tag className="mr-0">Chưa chọn</Tag>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      <Tag className="mr-0">Tầng {item.seat.floor}</Tag>
                      <Tag className="mr-0">Mã ghế {item.seat.seat}</Tag>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold">
                  {activeSeat ? `Giảm giá cho ghế ${activeSeat.label}` : "Chọn ghế"}
                </p>
                {activeSeat && (
                  <p className="text-xs text-gray-500">
                    {activeSeat.seat.positionName || "Ghế"} | Giá vé {formatMoney(activeSeat.price)}
                  </p>
                )}
              </div>
              <Button
                variant="outlined"
                color="red"
                disabled={!activeSeat || !selectedDiscountId}
                onClick={() => applyDiscount(undefined)}
              >
                Bỏ giảm giá ghế này
              </Button>
            </div>

            <Table
              rowKey={(row) => row.id}
              dataSource={data || []}
              columns={columns}
              size="small"
              pagination={false}
              rowSelection={{
                type: "radio",
                selectedRowKeys: selectedDiscountId ? [selectedDiscountId] : [],
                onChange: (selectedRowKeys) => {
                  const nextDiscountId = selectedRowKeys[0];
                  applyDiscount(typeof nextDiscountId === "number" ? nextDiscountId : undefined);
                }
              }}
              onRow={(record) => ({
                onClick: () => applyDiscount(record.id)
              })}
              rowClassName="cursor-pointer"
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DiscountPopup;
