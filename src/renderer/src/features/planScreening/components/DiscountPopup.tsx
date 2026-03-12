import { formatMoney } from "@renderer/lib/utils";
import { DiscountProps, ListSeat } from "@shared/types";
import { Button, Checkbox, Empty, Modal, Table, Tag } from "antd";
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
  const [selectedSeatKeys, setSelectedSeatKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!openDiscount) return;

    const allowedKeys = new Set(seatItems.map((item) => item.key));
    const nextDraft = Object.fromEntries(
      Object.entries(value).filter(([key, discountId]) => allowedKeys.has(key) && discountId)
    );

    setDraftValue(nextDraft);
    setSelectedSeatKeys((current) => {
      const nextSelected = current.filter((key) => allowedKeys.has(key));
      return nextSelected.length > 0 ? nextSelected : seatItems.slice(0, 1).map((item) => item.key);
    });
  }, [openDiscount, seatItems, value]);

  const selectedSeatItems = useMemo(
    () => seatItems.filter((item) => selectedSeatKeys.includes(item.key)),
    [seatItems, selectedSeatKeys]
  );

  const selectedDiscountId = useMemo(() => {
    if (selectedSeatItems.length === 0) return undefined;

    const discountIds = Array.from(
      new Set(selectedSeatItems.map((item) => draftValue[item.key]).filter(Boolean))
    );

    if (discountIds.length !== 1) return undefined;

    return discountIds[0];
  }, [draftValue, selectedSeatItems]);

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
    if (selectedSeatKeys.length === 0) return;

    setDraftValue((prev) => {
      const next = { ...prev };

      selectedSeatKeys.forEach((seatKey) => {
        if (discountId) {
          next[seatKey] = discountId;
        } else {
          delete next[seatKey];
        }
      });

      return next;
    });
  };

  const toggleSeatSelection = (seatKey: string) => {
    setSelectedSeatKeys((prev) =>
      prev.includes(seatKey) ? prev.filter((key) => key !== seatKey) : [...prev, seatKey]
    );
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Danh sách ghế</p>
                  <p className="text-xs text-gray-500">
                    Chọn nhiều ghế rồi áp một mức giảm giá trong một lần.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={() => setSelectedSeatKeys(seatItems.map((item) => item.key))}
                  >
                    Chọn tất cả
                  </Button>
                  <Button size="small" onClick={() => setSelectedSeatKeys([])}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex max-h-115 flex-col gap-2 overflow-y-auto pr-1">
              {seatItems.map((item) => {
                const appliedDiscount = draftValue[item.key]
                  ? discountsById.get(draftValue[item.key]!)
                  : undefined;
                const isSelected = selectedSeatKeys.includes(item.key);

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      "rounded-lg border p-3 text-left transition",
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    ].join(" ")}
                    onClick={() => toggleSeatSelection(item.key)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSeatSelection(item.key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <p className="text-sm font-semibold">{item.label}</p>
                        </div>
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
                  {selectedSeatItems.length > 0
                    ? `Áp dụng cho ${selectedSeatItems.length} ghế`
                    : "Chọn ghế"}
                </p>
                {selectedSeatItems.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {selectedSeatItems.map((item) => item.label).join(", ")}
                  </p>
                )}
              </div>
              <Button
                variant="outlined"
                color="red"
                disabled={selectedSeatItems.length === 0 || !selectedDiscountId}
                onClick={() => applyDiscount(undefined)}
              >
                Bỏ giảm giá các ghế đã chọn
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
