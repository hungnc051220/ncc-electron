"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { ListSeat } from "@/types";
import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Legend from "./legend";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent",
};

interface SeatsProps {
  seats: ListSeat[][];
}

const Seats = ({ seats }: SeatsProps) => {
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);

  const handleSelectSeat = (seat: ListSeat) => {
    setSelectedSeats((prev) => {
      if (prev.find((s) => s.seat === seat.seat)) {
        return prev.filter((s) => s.seat !== seat.seat);
      } else {
        return [...prev, seat];
      }
    });
  };

  const totalPrice = selectedSeats.reduce((acc, cur) => acc + cur.price, 0);
  const formattedTotalPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(totalPrice);

  return (
    <div>
      <div className="bg-goku mt-8 py-6 px-4 rounded-[12px]">
        <div className="mb-6 flex flex-wrap justify-center gap-4 text-sm">
          <Legend color="bg-jiren" label="Ghế mới" />
          <Legend color="bg-whis" label="Đang chọn" />
          <Legend color="bg-roshi" label="Đang giữ chỗ" />
          <Legend color="bg-trunks" label="Ghế đã bán" />
          <Legend color="bg-krillin" label="Ghế VIP" />
          <Legend color="bg-raditz" label="Ghế hợp đồng" />
          <Legend color="bg-chichi" label="Ghế đôi" />
        </div>

        <div className="w-[922px] h-[4px] bg-jiren mx-auto"></div>
        <p className="mt-2 text-center text-sm font-bold text-trunks">
          Màn hình
        </p>

        <div className="mt-6">
          <div className="space-y-[6px] -mx-4">
            {seats?.map((item, index) => (
              <div
                key={index}
                className="flex gap-[6px] items-center justify-center seat"
              >
                <div className="text-trunks font-medium h-[44px] w-[50px] flex items-center justify-center text-base">
                  {item[4].code.charAt(0)}
                </div>
                {item.map((seat) => (
                  <div
                    key={seat.seat}
                    className={cn(
                      "relative rounded-lg flex items-center justify-center h-[44px] w-[50px]",
                      colorMap[seat.type],
                      seat.type !== 12 && seat.status !== 1 && "cursor-pointer",
                      selectedSeats.some((s) => s.code === seat.code) &&
                        "bg-whis text-white",
                      seat.isContract && "bg-raditz text-white",
                      seat.isHold && "bg-roshi text-white"
                    )}
                    onClick={() => handleSelectSeat(seat)}
                  >
                    {/* {bookedIcon && seat.status === 1 && (
                      <Image
                        src={bookedIcon}
                        alt="icon"
                        fill
                        className="rounded-[4px]"
                      />
                    )} */}
                    <p className="text-sm">
                      {seat.type !== 12 && seat.status !== 1 ? seat.code : ""}
                    </p>
                    {seat.status == 1 && (
                      <X className="text-gray-300 md:text-gray-500 h-2 w-2 md:h-6 md:w-6" />
                    )}
                  </div>
                ))}
                <div className="text-trunks font-medium h-[44px] w-[50px] flex items-center justify-center text-base">
                  {item[4].code.charAt(0)}
                </div>
              </div>
            ))}
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
                <div className="grid grid-cols-2 border-b pb-2 text-sm gap-6">
                  <div>
                    <div className="flex items-center">
                      <p className="min-w-[100px] text-trunks">Số vé:</p>
                      <p className="text-whis font-bold flex-1 text-right">5</p>
                    </div>
                    <div className="flex items-center mt-1">
                      <p className="min-w-[100px] text-trunks">Giảm giá:</p>
                      <p className="text-hit font-bold flex-1 text-right">0đ</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center">
                      <p className="min-w-[100px] text-trunks">Tiền vé:</p>
                      <p className="font-bold text-right flex-1">
                        {formattedTotalPrice}
                      </p>
                    </div>
                    <div className="flex items-center mt-1">
                      <p className="min-w-[100px] text-trunks">Còn lại:</p>
                      <p className="font-bold text-right flex-1">0đ</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-sm">
                  <p className="text-trunks">Tiền đã bán:</p>
                  <p className="text-primary font-bold text-base text-right flex-1">
                    {formattedTotalPrice}
                  </p>
                </div>
              </div>
              <div className="w-2/5 bg-goku p-4 text-sm rounded-sm">
                <p className="font-bold">Phương thức</p>
                <RadioGroup
                  defaultValue="r1"
                  className="grid grid-cols-2 gap-4 mt-4"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="cash" id="r1" />
                    <Label htmlFor="r1">Tiền mặt</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="vip" id="r2" />
                    <Label htmlFor="r2">Quẹt thẻ VIP</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="vnpayqr" id="r3" />
                    <Label htmlFor="r3">Quét VNpayQR</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="vietqr" id="r4" />
                    <Label htmlFor="r4">Quét VietQR</Label>
                  </div>
                </RadioGroup>
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
                    src="/images/card_giftcard.svg"
                    width={16}
                    height={16}
                    alt="icon"
                  />
                  <span>Đổi quà</span>
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
                  <span className="text-dodoria">Hủy giữ</span>
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
