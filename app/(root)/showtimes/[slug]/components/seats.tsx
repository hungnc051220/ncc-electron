"use client";

import { getSeats } from "@/data/loaders";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import Legend from "./legend";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const rows = "ABCDEFGHIJKL".split("");
const cols = Array.from({ length: 18 }, (_, i) => i + 1);

const seatColors = {
  new: "bg-jiren text-trunks",
  selected: "bg-blue-500 text-white",
  sold: "bg-trunks text-white",
  contract: "bg-roshi text-white",
  vip: "bg-krillin text-white",
};

const Seats = () => {
  const [data, setData] = useState<any>([]);

  useEffect(() => {
    const fetchSeats = async () => {
      const response = await getSeats();
      setData(response);
    };

    fetchSeats();
  });

  const [selected, setSelected] = useState<string[]>([]);

  const toggleSeat = (seatId: string) => {
    setSelected((prev) =>
      prev.includes(seatId)
        ? prev.filter((s) => s !== seatId)
        : [...prev, seatId]
    );
  };

  const getSeatStatus = (row: string, col: number): keyof typeof seatColors => {
    const seatId = `${row}${col}`;
    if (selected.includes(seatId)) return "selected";
    if (["H7", "H8", "I9"].includes(seatId)) return "sold";
    if (["E7", "E8", "E9", "E10"].includes(seatId)) return "contract";
    if (["J6", "J7", "J8", "J9", "J10", "K6", "K7", "K8"].includes(seatId))
      return "vip";
    return "new";
  };

  return (
    <div>
      <div className="bg-goku mt-8 py-6 px-4 rounded-[12px]">
        <div className="w-[922px] h-[4px] bg-jiren mx-auto"></div>
        <p className="mt-2 text-center text-sm font-bold text-trunks">
          Màn hình
        </p>

        <div className="mt-6">
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row} className="flex justify-center gap-2">
                <span className="w-[50px] h-[44px] text-right font-medium flex items-center justify-center text-trunks text-lg">
                  {row}
                </span>
                {cols.map((col) => {
                  const status = getSeatStatus(row, col);
                  const seatId = `${row}${col}`;
                  return (
                    <button
                      key={seatId}
                      className={cn(
                        "min-w-[50px] min-h-[44px] rounded-md flex items-center justify-center text-lg font-semibold transition-colors text-trunks",
                        seatColors[status],
                        "hover:opacity-80"
                      )}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <Legend color="bg-jiren" label="Ghế mới" />
            <Legend color="bg-whis" label="Đang chọn" />
            <Legend color="bg-trunks" label="Ghế đã bán" />
            <Legend color="bg-krillin" label="Ghế hợp đồng" />
            <Legend color="bg-chichi" label="Ghế VIP" />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-beerus">
        <div className="py-4 container flex gap-3">
          <div className="flex-1">
            <div className="flex gap-3">
              <div className="w-3/5">
                <div className="flex items-center">
                  <p className="text-sm text-trunks">Ghế đã chọn</p>
                </div>
              </div>
              <div className="w-2/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox id="terms" />
                    <Label htmlFor="terms">Chọn hủy vé</Label>
                  </div>
                  <Button
                    className="h-6 border border-chichi/60 text-chichi font-bold text-xs rounded-sm"
                    variant="outline"
                  >
                    Hủy vé
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex mt-[10px] gap-3">
              <div className="w-3/5 bg-goku p-4 rounded-sm">
                <div className="grid grid-cols-2 border-b pb-2 text-sm">
                  <div>
                    <div className="flex items-center">
                      <p className="min-w-[100px] text-trunks">Số vé:</p>
                      <p className="text-whis font-bold">5</p>
                    </div>
                    <div className="flex items-center mt-1">
                      <p className="min-w-[100px] text-trunks">Giảm giá:</p>
                      <p className="text-hit font-bold">0đ</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center">
                      <p className="min-w-[100px] text-trunks">Tiền vé:</p>
                      <p className="font-bold">200.000đ</p>
                    </div>
                    <div className="flex items-center mt-1">
                      <p className="min-w-[100px] text-trunks">Còn lại:</p>
                      <p className="font-bold">0đ</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-sm">
                  <p className="text-trunks">Tiền đã bán:</p>
                  <p className="text-primary font-bold text-base">500.000đ</p>
                </div>
              </div>
              <div className="w-2/5 bg-goku p-4 text-sm rounded-sm">
                <p className="font-bold">Phương thức</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="flex items-center gap-3">
                    <Checkbox id="vip" />
                    <Label htmlFor="vip">Quẹt thẻ VIP</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="vnpay" />
                    <Label htmlFor="vnpay">Quét VNpayQR</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="vietqr" />
                    <Label htmlFor="vietqr">Vé Viet QR</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex h-full gap-3">
              <div className="grid grid-cols-2 h-full gap-2">
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/restart_alt.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span>Đổi vé</span>
                </div>
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/living.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span>Giữ chỗ</span>
                </div>
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/close.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span className="text-dodoria">Hủy chỗ</span>
                </div>
                <div className="cursor-pointer hover:bg-jiren h-full border border-beerus min-w-[90px] text-xs font-bold flex items-center justify-center rounded-sm gap-1">
                  <Image
                    src="/images/card_giftcard.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span>Đổi quà</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button className="w-full flex-1 flex flex-col">
                  <Image
                    src="/images/ticket.svg"
                    width={24}
                    height={24}
                    alt="icon"
                  />
                  <span className="text-base font-bold">In vé</span>
                </Button>
                <div className="flex items-center gap-3">
                  <Checkbox id="export" />
                  <Label htmlFor="export" className="text-xs">
                    Xuất hóa đơn
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Seats;
