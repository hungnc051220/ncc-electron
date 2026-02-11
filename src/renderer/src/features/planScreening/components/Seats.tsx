"use client";

// import { useSocketContext } from "@/providers/socket-provider";
import { EditOutlined } from "@ant-design/icons";
import BackButton from "@renderer/components/BackButton";
import Legend from "@renderer/components/legend";
import { cn, formatMoney } from "@renderer/lib/utils";
import {
  BookingTicketBodyProps,
  DiscountProps,
  ListSeat,
  PaymentType,
  QrCodeResponseProps
} from "@renderer/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps, GetProp } from "antd";
import { Button, Checkbox, Descriptions, Tag } from "antd";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import Selecto from "react-selecto";
import DiscountPopup from "./DiscountPopup";
// import QrCodeDialog from "./QrCodeDialog";
import { useDiscounts } from "@renderer/hooks/discounts/useDiscounts";
import { usePlanScreeningDetail } from "@renderer/hooks/planScreenings/usePlanScreeningDetail";

const colorMap: { [key: string]: string } = {
  0: "bg-jiren text-trunks",
  1: "bg-krillin text-white",
  2: "bg-chichi text-white",
  12: "bg-transparent"
};

const paymentTypes = [
  {
    value: PaymentType.VNPAY,
    label: "Quét VietQR"
  },
  {
    value: PaymentType.VIETQR,
    label: "Quét VNPayQR"
  }
];

interface SeatsProps {
  slug: string;
}
// Tách component Seat riêng để tối ưu render
const Seat = memo(
  ({
    seat,
    isSelected,
    onSelect,
    size
  }: {
    seat: ListSeat;
    isSelected: boolean;
    onSelect: (seat: ListSeat) => void;
    size: number;
  }) => {
    const canSelect = seat.type !== 12 && seat.status !== 1;

    const handleClick = useCallback(() => {
      if (canSelect) {
        onSelect(seat);
      }
    }, [canSelect, onSelect, seat]);

    return (
      <div
        className={cn(
          "relative rounded-sm flex items-center justify-center selectable-seat",
          colorMap[seat.type],
          canSelect && "cursor-pointer",
          isSelected && "bg-whis text-white",
          seat.isContract && "bg-raditz text-white",
          seat.isHold && "bg-roshi text-white",
          seat.status === 1 && "bg-trunks text-white cursor-not-allowed"
        )}
        style={{
          width: `${size * 1.1}px`,
          height: `${size}px`
        }}
        onClick={handleClick}
        data-seat-code={seat.code}
        data-seat-floor={seat.floor}
        data-seat-unique-key={`${seat.floor}-${seat.code}`}
      >
        <p className="text-xs" style={{ fontSize: `${Math.max(10, size * 0.25)}px` }}>
          {seat.type !== 12 ? seat.code : ""}
        </p>
      </div>
    );
  }
);

Seat.displayName = "Seat";

// Helper function để tạo unique key cho ghế (kết hợp floor và code)
const getSeatUniqueKey = (seat: ListSeat): string => {
  return `${seat.floor}-${seat.code}`;
};

const Seats = ({ slug }: SeatsProps) => {
  const queryClient = useQueryClient();
  // const socketRef = useSocketContext();
  const [searchParams] = useSearchParams();
  const isCustomerView = searchParams.get("view") === "customer";
  const [selectedSeats, setSelectedSeats] = useState<ListSeat[]>([]);
  const [vipCard, setVipCard] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.POS);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [qrDialogData, setQrDialogData] = useState<{
    dataQr: QrCodeResponseProps;
    filmName: string;
    roomName: string;
    projectDate: string;
    projectTime: string;
    selectedSeats: string;
    orderTotal?: number;
    orderDiscount?: number;
    orderCreatedAt?: string;
  } | null>(null);
  const [openDiscount, setOpenDiscount] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountProps | undefined>(undefined);

  // Refs cho react-selecto
  const seatContainerRef = useRef<HTMLDivElement>(null);
  const selectoRef = useRef<Selecto>(null);
  const isSelectingRef = useRef(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [seatSize, setSeatSize] = useState(44);

  const { data: discounts } = useDiscounts({ current: 1, pageSize: 100 });
  const { data } = usePlanScreeningDetail(Number(slug));

  const seats = data?.listSeats;

  // Tính toán số tầng có sẵn
  const availableFloors = useMemo(() => {
    const floors = new Set<number>();
    seats?.forEach((row) => {
      row.forEach((seat) => {
        if (seat.floor) {
          floors.add(seat.floor);
        }
      });
    });
    return Array.from(floors).sort((a, b) => a - b);
  }, [seats]);

  // State cho tầng được chọn bởi người dùng
  const [userSelectedFloor, setUserSelectedFloor] = useState<number | null>(null);

  // Tính toán tầng được chọn: ưu tiên userSelectedFloor, nếu không hợp lệ thì dùng tầng đầu tiên
  const selectedFloor = useMemo(() => {
    if (availableFloors.length === 0) return 1;
    if (userSelectedFloor && availableFloors.includes(userSelectedFloor)) {
      return userSelectedFloor;
    }
    return availableFloors[0];
  }, [availableFloors, userSelectedFloor]);

  // Không filter selectedSeats khi đổi tầng - cho phép chọn ghế từ nhiều tầng cùng lúc

  // Filter seats theo tầng được chọn
  const filteredSeats = useMemo(() => {
    if (!seats) return [];
    return seats
      .map((row) => row.filter((seat) => seat.floor === selectedFloor))
      .filter((row) => row.length > 0);
  }, [seats, selectedFloor]);

  // Key prop trên Selecto component sẽ force re-mount khi selectedFloor thay đổi
  // Điều này đảm bảo Selecto nhận biết các element mới sau khi chuyển tầng

  // Tạo map để tra cứu ghế từ unique key (kết hợp floor và code để tránh trùng)
  const seatMap = useMemo(() => {
    const map: Record<string, ListSeat> = {};
    seats?.forEach((row) => {
      row.forEach((seat) => {
        if (seat.type !== 12 && seat.status !== 1) {
          const uniqueKey = getSeatUniqueKey(seat);
          map[uniqueKey] = seat;
        }
      });
    });
    return map;
  }, [seats]);

  // Socket effects - giữ nguyên
  // useEffect(() => {
  //   if (!socketRef) return;

  //   const handleOrderPaymentUpdated = (payload: { orderStatus?: number }) => {
  //     if (payload?.orderStatus === 30) {
  //       message.success("Thanh toán thành công");
  //       setOpenQrDialog(false);
  //       setQrDialogData(null);
  //       setSelectedSeats([]);
  //       if (!isCustomerView) {
  //         window.electron?.sendQrDialogClose();
  //       }
  //     }
  //   };

  //   socketRef.on("orderPaymentUpdated", handleOrderPaymentUpdated);

  //   return () => {
  //     socketRef.off("orderPaymentUpdated", handleOrderPaymentUpdated);
  //   };
  // }, [socketRef, router, isCustomerView]);

  const bookingMutation = useMutation({
    mutationFn: async (body: BookingTicketBodyProps) => {
      const res = await fetch("/api/booking-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (!res.ok || result?.success === false) {
        throw new Error(result?.error || result?.message || "Tạo đơn thất bại");
      }

      return result;
    },
    onSuccess: async (result) => {
      // setState(result);
      // // Làm tươi lại thông tin suất chiếu
      // await queryClient.invalidateQueries({
      //   queryKey: ["plan-screening-detail", slug]
      // });
    },
    onError: (error: Error) => {
      // setState((prev) => ({
      //   ...prev,
      //   success: false,
      //   error: error.message
      // }));
    }
  });

  const pending = bookingMutation.isPending;
  const prevPendingRef = useRef(pending);
  const lastQrCodeRef = useRef<string | null>(null);

  // Các effects khác giữ nguyên
  // useEffect(() => {
  //   const currentQrCode = state.data?.qrcode ?? null;
  //   const hasNewQrCode = currentQrCode && lastQrCodeRef.current !== currentQrCode;

  //   if (hasNewQrCode) {
  //     startTransition(() => {
  //       setOpenQrDialog(true);
  //     });
  //     lastQrCodeRef.current = currentQrCode;

  //     if (!isCustomerView && state.data && data) {
  //       window.electron?.sendQrDialogOpen({
  //         dataQr: state.data,
  //         filmName: data.filmInfo.filmName,
  //         roomName: data.roomInfo.name,
  //         projectDate: data.projectDate,
  //         projectTime: data.projectTime,
  //         selectedSeats: selectedSeats.map((item) => item.code).join(", "),
  //         orderTotal: state.orderTotal,
  //         orderDiscount: state.orderDiscount,
  //         orderCreatedAt: state.orderCreatedAt
  //       });
  //     }
  //     return;
  //   }

  //   if (!currentQrCode) {
  //     lastQrCodeRef.current = null;
  //   }
  // }, [
  //   state.data,
  //   state.orderTotal,
  //   state.orderDiscount,
  //   state.orderCreatedAt,
  //   isCustomerView,
  //   data,
  //   selectedSeats
  // ]);

  // useEffect(() => {
  //   const justCompleted = prevPendingRef.current && !pending;
  //   if (justCompleted && state.success && !state.data) {
  //     startTransition(() => {
  //       toast.success("Đặt vé thành công");
  //       setSelectedSeats([]);

  //       // In vé khi đặt vé thành công (chỉ với POS payment)
  //       if (state.orderId && paymentType === PaymentType.POS && !isCustomerView) {
  //         // Lấy order items và in từng vé
  //         const printTickets = async () => {
  //           try {
  //             const response = await fetch(`/api/order-items/${state.orderId}`);
  //             if (!response.ok) {
  //               console.error("Failed to fetch order items for printing");
  //               return;
  //             }

  //             const orderData = await response.json();

  //             // Tạo danh sách vé cần in
  //             const ticketsToPrint: Array<{
  //               itemIndex: number;
  //               seatIndex: number;
  //             }> = [];

  //             for (let itemIndex = 0; itemIndex < orderData.items.length; itemIndex++) {
  //               const item = orderData.items[itemIndex];

  //               // Tách từng ghế từ listChairValueF1, F2, F3
  //               const seatsF1 = item.listChairValueF1
  //                 ? item.listChairValueF1
  //                     .split(",")
  //                     .map((s: string) => s.trim())
  //                     .filter(Boolean)
  //                 : [];
  //               const seatsF2 = item.listChairValueF2
  //                 ? item.listChairValueF2
  //                     .split(",")
  //                     .map((s: string) => s.trim())
  //                     .filter(Boolean)
  //                 : [];
  //               const seatsF3 = item.listChairValueF3
  //                 ? item.listChairValueF3
  //                     .split(",")
  //                     .map((s: string) => s.trim())
  //                     .filter(Boolean)
  //                 : [];
  //               const seatsList = [...seatsF1, ...seatsF2, ...seatsF3];

  //               // Thêm từng ghế vào danh sách
  //               for (let seatIndex = 0; seatIndex < seatsList.length; seatIndex++) {
  //                 ticketsToPrint.push({ itemIndex, seatIndex });
  //               }
  //             }

  //             // Gọi electron để in từng vé
  //             if (ticketsToPrint.length > 0 && window.electron) {
  //               window.electron.printTickets(state.orderId!, ticketsToPrint);
  //             }
  //           } catch (error) {
  //             console.error("Error preparing tickets for printing:", error);
  //           }
  //         };

  //         // Sử dụng setTimeout để đảm bảo state đã cập nhật xong
  //         setTimeout(printTickets, 500);
  //       }
  //     });
  //   }
  //   prevPendingRef.current = pending;
  // }, [state, pending, paymentType, isCustomerView]);

  // Sử dụng useCallback để tránh re-render không cần thiết
  const handleSelectSeat = useCallback((seat: ListSeat) => {
    setSelectedSeats((prev) => {
      const seatUniqueKey = getSeatUniqueKey(seat);
      const isAlreadySelected = prev.find((s) => getSeatUniqueKey(s) === seatUniqueKey);
      if (isAlreadySelected) {
        return prev.filter((s) => getSeatUniqueKey(s) !== seatUniqueKey);
      } else {
        return [...prev, seat];
      }
    });
  }, []);

  // Xử lý selecto với debounce để tránh nhiều render
  const handleSelectoSelect = useCallback(
    (e: { added: (HTMLElement | SVGElement)[]; removed: (HTMLElement | SVGElement)[] }) => {
      isSelectingRef.current = true;

      setSelectedSeats((prev) => {
        const newSelected = new Set(prev.map((s) => getSeatUniqueKey(s)));

        // Thêm ghế mới
        e.added.forEach((el) => {
          const uniqueKey = el.getAttribute("data-seat-unique-key");
          if (uniqueKey && seatMap[uniqueKey] && !newSelected.has(uniqueKey)) {
            newSelected.add(uniqueKey);
          }
        });

        // Xóa ghế bị bỏ chọn
        e.removed.forEach((el) => {
          const uniqueKey = el.getAttribute("data-seat-unique-key");
          if (uniqueKey) {
            newSelected.delete(uniqueKey);
          }
        });

        // Convert back to array
        return Array.from(newSelected)
          .map((uniqueKey) => seatMap[uniqueKey])
          .filter(Boolean);
      });

      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    },
    [seatMap]
  );

  // Các effects cho electron
  useEffect(() => {
    if (isCustomerView) {
      window.api?.onSeatUpdate((data) => setSelectedSeats(data));
      window.api?.onQrDialogOpen((qrData) => {
        setQrDialogData(qrData);
        setOpenQrDialog(true);
      });
      window.api?.onQrDialogClose(() => {
        setOpenQrDialog(false);
        setQrDialogData(null);
        setSelectedSeats([]);
      });
    }
  }, [isCustomerView]);

  useEffect(() => {
    if (!isCustomerView && selectedSeats.length >= 0) {
      window.api?.sendSeatUpdate(selectedSeats);
    }
  }, [selectedSeats, isCustomerView]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  const onBooking = useCallback(() => {
    if (selectedSeats.length === 0) return;
    if (!data) return;

    const floorNo = selectedSeats[0]?.floor || 1;

    const body: BookingTicketBodyProps = {
      planScreenId: data.id,
      floorNo,
      paymentMethodSystemName: paymentType,
      posName: "POS Machine 1",
      posShortName: "M11",
      discountId: selectedDiscount?.id,
      isInvitation: false
    };

    if (floorNo === 1) {
      body.listChairIndexF1 = selectedSeats.map((item) => item.seat).join(",");
      body.listChairValueF1 = selectedSeats.map((item) => item.code).join(",");
    } else if (floorNo === 2) {
      body.listChairIndexF2 = selectedSeats.map((item) => item.seat).join(",");
      body.listChairValueF2 = selectedSeats.map((item) => item.code).join(",");
    } else if (floorNo === 3) {
      body.listChairIndexF3 = selectedSeats.map((item) => item.seat).join(",");
      body.listChairValueF3 = selectedSeats.map((item) => item.code).join(",");
    }

    startTransition(() => bookingMutation.mutate(body));
  }, [selectedSeats, data, paymentType, bookingMutation, selectedDiscount]);

  // Tính toán kích thước ghế tự động để fit vào màn hình
  // Tính dựa trên tầng có nhiều ghế nhất để đảm bảo tất cả tầng đều fit và nhất quán
  useEffect(() => {
    if (!seats || seats.length === 0 || !seatContainerRef.current) return;

    const calculateSeatSize = () => {
      const container = seatContainerRef.current;
      if (!container) return;

      // Lấy kích thước container ghế
      const containerRect = container.getBoundingClientRect();
      const availableHeight = containerRect.height;
      const availableWidth = containerRect.width;

      // Tính toán số hàng và số ghế trong hàng dài nhất của tầng có nhiều ghế nhất
      // Điều này đảm bảo kích thước nhất quán giữa các tầng và không bị tính lại khi đổi tầng
      let maxRows = 0;
      let maxSeatsPerRow = 0;

      // Tìm tầng có nhiều ghế nhất
      availableFloors.forEach((floor) => {
        const floorSeats = seats
          .map((row) => row.filter((seat) => seat.floor === floor))
          .filter((row) => row.length > 0);

        if (floorSeats.length > maxRows) {
          maxRows = floorSeats.length;
        }

        const maxSeatsInFloor = Math.max(...floorSeats.map((row) => row.length));
        if (maxSeatsInFloor > maxSeatsPerRow) {
          maxSeatsPerRow = maxSeatsInFloor;
        }
      });

      // Fallback nếu không tìm thấy tầng nào
      if (maxRows === 0 || maxSeatsPerRow === 0) {
        maxRows = seats.length;
        maxSeatsPerRow = Math.max(...seats.map((row) => row.length));
      }

      const numRows = maxRows;

      // Tính gap giữa các ghế (6px) và label bên trái/phải (ước tính ban đầu)
      const gapBetweenSeats = 6;
      const estimatedLabelWidth = Math.min(availableWidth / 20, 50); // Ước tính dựa trên width
      const totalGapWidth = (maxSeatsPerRow - 1) * gapBetweenSeats;
      const totalGapHeight = (numRows - 1) * 6; // space-y-[6px]

      // Tính kích thước ghế dựa trên width và height, lấy giá trị nhỏ hơn để đảm bảo fit
      const widthBasedSize = Math.floor(
        (availableWidth - estimatedLabelWidth * 2 - totalGapWidth) / maxSeatsPerRow
      );
      const heightBasedSize = Math.floor((availableHeight - totalGapHeight) / numRows);

      // Chọn giá trị nhỏ hơn và đảm bảo tỉ lệ vuông
      const calculatedSize = Math.min(widthBasedSize, heightBasedSize);

      // Giới hạn kích thước tối thiểu và tối đa
      const minSize = 30;
      const maxSize = 80;
      const finalSize = Math.max(minSize, Math.min(maxSize, calculatedSize));

      setSeatSize(finalSize);
    };

    // Delay nhỏ để đảm bảo layout đã render xong
    const timeoutId = setTimeout(() => {
      calculateSeatSize();
    }, 100);

    // Recalculate khi resize window
    const handleResize = () => {
      calculateSeatSize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [seats, availableFloors]); // Chỉ tính lại khi seats hoặc availableFloors thay đổi, không phải khi đổi tầng

  // Render seats với useMemo để tránh re-render không cần thiết
  const renderedSeats = useMemo(() => {
    return filteredSeats?.map((item, index) => (
      <div
        key={index}
        className="flex gap-1.5 items-center justify-center seat-row"
        style={{ height: `${seatSize}px` }}
      >
        <div
          className="text-trunks font-medium flex items-center justify-center"
          style={{
            width: `${seatSize}px`,
            height: `${seatSize}px`,
            fontSize: `${Math.max(12, seatSize * 0.3)}px`
          }}
        >
          {item[4]?.code?.charAt(0) || ""}
        </div>
        {item.map((seat) => (
          <Seat
            key={seat.seat}
            seat={seat}
            isSelected={selectedSeats.some((s) => getSeatUniqueKey(s) === getSeatUniqueKey(seat))}
            onSelect={handleSelectSeat}
            size={seatSize}
          />
        ))}
        <div
          className="text-trunks font-medium flex items-center justify-center"
          style={{
            width: `${seatSize}px`,
            height: `${seatSize}px`,
            fontSize: `${Math.max(12, seatSize * 0.3)}px`
          }}
        >
          {item[4]?.code?.charAt(0) || ""}
        </div>
      </div>
    ));
  }, [filteredSeats, selectedSeats, handleSelectSeat, seatSize]);

  const priceDiscount = useMemo(() => {
    if (!selectedDiscount || selectedSeats.length === 0) return 0;
    if (selectedDiscount.discountRate) {
      // Tính giảm giá theo phần trăm cho từng ghế
      return selectedSeats.reduce((total, seat) => {
        return total + (seat.price * selectedDiscount.discountRate) / 100;
      }, 0);
    }

    // Tính giảm giá theo số tiền cố định cho từng ghế
    return selectedSeats.reduce((total) => {
      return total + (selectedDiscount.discountAmount || 0);
    }, 0);
  }, [selectedDiscount, selectedSeats]);

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: "Số vé",
      children: <p className="text-right flex-1 font-bold">{selectedSeats.length}</p>
    },
    {
      key: "2",
      label: "Tiền vé",
      children: <p className="text-right flex-1 font-bold">{formatMoney(totalPrice)}</p>
    },
    {
      key: "3",
      label: "Giảm giá",
      children: (
        <div className="flex items-center justify-end flex-1 gap-2">
          <p className="text-right flex-1 font-bold">{formatMoney(priceDiscount)}</p>
          <Button icon={<EditOutlined />} size="small" onClick={() => setOpenDiscount(true)} />
        </div>
      )
    },
    {
      key: "4",
      label: "Thành tiền",
      children: (
        <p className="text-right flex-1 font-bold text-blue-600">
          {formatMoney(totalPrice - priceDiscount)}
        </p>
      )
    }
  ];

  const onChange: GetProp<typeof Checkbox.Group, "onChange"> = (checkedValues) => {
    const last = checkedValues.slice(-1) as string[];
    setPaymentMethod(last);
  };

  if (!data) return null;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex-1 flex items-center gap-3">
          <BackButton />
          <div className="flex items-center gap-4">
            <p className="text-chichi text-sm xl:text-lg font-medium">
              Buổi {dayjs(data.projectTime).utc().format("HH:mm")} - Ngày{" "}
              {dayjs(data.projectDate).format("DD/MM/YYYY")}
            </p>
            <p className="font-bold text-base xl:text-xl">{data.filmInfo.filmName}</p>
          </div>
        </div>
        <div className="rounded-lg flex items-center gap-4">
          {availableFloors.length > 1 && (
            <div className="flex justify-center gap-2">
              {availableFloors.map((floor) => (
                <p
                  key={floor}
                  onClick={() => {
                    setUserSelectedFloor(floor);
                    // Không xóa ghế đã chọn - cho phép chọn ghế từ nhiều tầng cùng lúc
                  }}
                  className={cn(
                    "pr-1 border-b-2 border-transparent text-sm font-bold",
                    selectedFloor === floor && "border-primary text-primary"
                  )}
                >
                  Tầng {floor}
                </p>
              ))}
            </div>
          )}
          <Tag color="#f50" variant="outlined">
            Phòng {data.roomInfo.name}
          </Tag>
        </div>
      </div>
      <div className="relative flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>
        {pending && (
          <div className="absolute inset-0 size-full z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang tải...</span>
            </div>
          </div>
        )}
        <div
          ref={mainContainerRef}
          className="bg-goku p-2 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Button group chọn tầng - chỉ hiển thị khi có nhiều hơn 1 tầng */}

          <fieldset className="border-t-3 border-jiren w-2/3 mx-auto">
            <legend className="mx-auto px-3 text-sm text-trunks font-bold">Màn hình</legend>
          </fieldset>

          <div
            className="mt-2 flex-1 flex items-center justify-center min-h-0"
            ref={seatContainerRef}
          >
            <div className="space-y-1.5 w-full flex flex-col items-center">{renderedSeats}</div>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs shrink-0">
            <Legend color="bg-jiren" label="Ghế mới" />
            <Legend color="bg-whis" label="Đang chọn" />
            <Legend color="bg-roshi" label="Đang giữ chỗ" />
            <Legend color="bg-trunks" label="Ghế đã bán" />
            <Legend color="bg-krillin" label="Ghế VIP" />
            <Legend color="bg-raditz" label="Ghế hợp đồng" />
            <Legend color="bg-chichi" label="Ghế đôi" />
          </div>

          {/* React-Selecto với cấu hình tối ưu */}
          <Selecto
            key={`selecto-${selectedFloor}`}
            ref={selectoRef}
            dragContainer=".seat-row"
            selectableTargets={[".selectable-seat"]}
            hitRate={0}
            selectByClick={false}
            selectFromInside={true}
            toggleContinueSelect={["shift"]}
            ratio={0}
            onSelectStart={() => {
              isSelectingRef.current = true;
            }}
            onSelect={handleSelectoSelect}
            onSelectEnd={() => {
              setTimeout(() => {
                isSelectingRef.current = false;
              }, 100);
            }}
          />
        </div>

        {/* Footer giữ nguyên */}
        <div
          ref={footerRef}
          className={cn(
            "bg-beerus border-t border-gray-300 shrink-0 px-4",
            isCustomerView && "hidden"
          )}
        >
          <div className="p-2 flex gap-6 items-center justify-center">
            <div className="w-125 bg-white py-2 px-4 rounded-md">
              <Descriptions size="small" items={items} column={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outlined" color="cyan">
                Đổi vé
              </Button>
              <Button variant="outlined" color="pink">
                Đổi quà
              </Button>
              <Button variant="outlined" color="green">
                Giữ chỗ
              </Button>
              <Button variant="outlined" danger>
                Hủy chỗ
              </Button>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col">
                <Checkbox value={vipCard} onChange={(e) => setVipCard(e.target.checked)}>
                  Quẹt thẻ VIP
                </Checkbox>
                <Checkbox.Group value={paymentMethod} onChange={onChange}>
                  <div className="flex flex-col">
                    {paymentTypes.map((paymentType) => (
                      <Checkbox key={paymentType.value} value={paymentType.value}>
                        {paymentType.label}
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              </div>
              <Button type="primary" className="flex flex-col h-18.5" onClick={onBooking}>
                <img src="/images/ticket.svg" width={24} height={24} alt="icon" />
                <span className="text-base font-bold">In vé</span>
              </Button>
            </div>
          </div>
        </div>

        {/* {openQrDialog && (state.data || qrDialogData?.dataQr) && (
          <QrCodeDialog
            open={openQrDialog}
            onOpenChange={(newOpen: boolean) => setOpenQrDialog(newOpen)}
            filmName={qrDialogData?.filmName || data.filmInfo.filmName}
            roomName={qrDialogData?.roomName || data.roomInfo.name}
            projectDate={qrDialogData?.projectDate || data.projectDate}
            projectTime={qrDialogData?.projectTime || data.projectTime}
            dataQr={qrDialogData?.dataQr || state.data!}
            selectedSeats={
              qrDialogData?.selectedSeats || selectedSeats.map((item) => item.code).join(", ")
            }
            orderTotal={qrDialogData?.orderTotal || state.orderTotal}
            orderDiscount={qrDialogData?.orderDiscount || state.orderDiscount}
            orderCreatedAt={qrDialogData?.orderCreatedAt || state.orderCreatedAt}
          />
        )} */}
      </div>
      <DiscountPopup
        data={discounts?.data}
        openDiscount={openDiscount}
        setOpenDiscount={setOpenDiscount}
        setSelectedDiscount={setSelectedDiscount}
      />
    </>
  );
};

export default Seats;
