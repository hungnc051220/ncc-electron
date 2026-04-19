import { CancelOrderDto, OrderDto, ordersApi } from "@renderer/api/orders.api";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { cancellationReasonsApi } from "@renderer/api/cancellationReasons.api";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { useCancelOrder } from "@renderer/hooks/orders/useCancelOrder";
import { useCreateOrder } from "@renderer/hooks/orders/useCreateOrder";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUserDetail } from "@renderer/hooks/users/useUserDetail";
import { formatMoney, isPlanScreeningLocked } from "@renderer/lib/utils";
import { applyVirtualKeyboardButton } from "@renderer/lib/vietnameseTelex";
import { usePermission } from "@renderer/permissions/usePermission";
import { useAuthStore } from "@renderer/store/auth.store";
import { useSettingPosStore } from "@renderer/store/settingPos.store";
import { ListSeat, OrderDetailProps, PlanScreeningDetailProps } from "@shared/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { DescriptionsProps } from "antd";
import { Button, Descriptions, Form, Input, Modal, Select } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { ChevronDown } from "lucide-react";
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState
} from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import PrintInvitationTicketDialog from "./PrintInvitationTicketDialog";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

const buildSeatFieldsByFloor = (selectedSeats: ListSeat[]) => {
  const floors = [1, 2, 3] as const;

  return floors.reduce<
    Pick<
      OrderDto,
      | "listChairIndexF1"
      | "listChairValueF1"
      | "listChairIndexF2"
      | "listChairValueF2"
      | "listChairIndexF3"
      | "listChairValueF3"
    >
  >((acc, floor) => {
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

interface ActionsProps {
  data: PlanScreeningDetailProps;
  planScreeningId: number;
  selectedSeats: ListSeat[];
  setSelectedSeats: Dispatch<SetStateAction<ListSeat[]>>;
}

type FieldType = {
  cancelReasonId: number;
};

const Actions = ({ data, planScreeningId, selectedSeats, setSelectedSeats }: ActionsProps) => {
  const { message } = useAntdApp();

  const [cancelForm] = Form.useForm<FieldType>();
  const queryClient = useQueryClient();
  const keyboardRef = useRef<{
    setInput: (input: string, inputName?: string) => void;
  } | null>(null);
  const inputRef = useRef<TextAreaRef | null>(null);
  const userId = useAuthStore((s) => s.userId);
  const { data: user } = useUserDetail(userId!);
  const { posName, posShortName } = useSettingPosStore();
  const { can } = usePermission();
  const canCreate = can("invitation_tickets", "create");
  const canDelete = can("invitation_tickets", "delete");
  const canPrint = can("invitation_tickets", "print");

  const [dialogPrintOpen, setDialogPrintOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(null);
  const [note, setNote] = useState("");
  const [layoutName, setLayoutName] = useState<"default" | "shift">("default");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [openCancelSeats, setOpenCancelSeats] = useState(false);

  const handleDialogPrintClose = useCallback((open: boolean) => {
    setDialogPrintOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleNoteModalClose = useCallback(() => {
    setNoteModalOpen(false);
    setIsKeyboardOpen(false);
    setLayoutName("default");
  }, []);

  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();
  const isPlanScreeningPast = isPlanScreeningLocked(data.projectDate, data.projectTime);

  const {
    data: cancellationReasons,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: ({ pageParam = 1 }) =>
      cancellationReasonsApi.getAll({ current: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const cancelReasonOptions = useMemo(() => {
    return (
      cancellationReasons?.pages.flatMap((page) =>
        page.data.map((item) => ({
          value: item.id,
          label: item.reason
        }))
      ) ?? []
    );
  }, [cancellationReasons]);

  const totalPrice = useMemo(
    () => selectedSeats.reduce((acc, cur) => acc + cur.price, 0),
    [selectedSeats]
  );

  const items: DescriptionsProps["items"] = [
    {
      key: "1",
      label: "Số vé",
      children: <p className="text-right flex-1 font-bold">{selectedSeats.length}</p>
    },
    {
      key: "2",
      label: "Tiền giá trị",
      children: <p className="text-right flex-1 font-bold">{formatMoney(totalPrice)}</p>
    },
    {
      key: "3",
      label: "Ghế đã chọn",
      children: (
        <p className="flex-1 text-right line-clamp-1 max-w-full">
          {selectedSeats.map((s) => s.code).join(", ")}
        </p>
      )
    },
    {
      key: "4",
      label: "Nhân viên xử lý",
      children: <p className="flex-1 text-right">{user?.fullname}</p>
    }
  ];

  const openNoteModal = () => {
    setNoteModalOpen(true);
  };

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNote(value);
    keyboardRef.current?.setInput(value, "note");
  };

  const handleKeyboardKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName((current) => (current === "default" ? "shift" : "default"));
      return;
    }

    if (button === "{enter}") {
      setNote((current) => {
        const nextValue = `${current}\n`;
        keyboardRef.current?.setInput(nextValue, "note");
        return nextValue;
      });
      return;
    }

    const nextValue = applyVirtualKeyboardButton(note, button);
    setNote(nextValue);
    keyboardRef.current?.setInput(nextValue, "note");
  };

  const onBooking = () => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    if (!posName || !posShortName) {
      message.error("Chưa cấu hình máy POS, không thể thao tác");
      return;
    }

    const floorNo = selectedSeats[0]?.floor || 1;
    const body: OrderDto = {
      planScreenId: planScreeningId,
      floorNo,
      isInvitation: true,
      paymentMethodSystemName: "POS",
      posName,
      posShortName,
      note,
      ...buildSeatFieldsByFloor(selectedSeats)
    };

    createOrder.mutate(body, {
      onSuccess: async (data) => {
        const { id } = data;
        message.success("Tạo vé mời thành công");
        if (canPrint) {
          try {
            const res = await ordersApi.getDetail(id);
            setSelectedItem(res);
            setDialogPrintOpen(true);
          } catch (error) {
            console.log(error);
          }
        }
        setSelectedSeats([]);
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(planScreeningId)
        });
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        });
        queryClient.refetchQueries({
          queryKey: ordersKeys.all
        });
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Tạo vé mời thất bại"));
      }
    });
  };

  const onCancelSeats = (values: FieldType) => {
    if (isPlanScreeningPast) {
      message.error("Ca chiếu đã qua, không thể thao tác");
      return;
    }

    const selectedSeatIndicesByFloor = {
      listChairIndexF1: selectedSeats.filter((seat) => seat.floor === 1).map((seat) => seat.seat),
      listChairIndexF2: selectedSeats.filter((seat) => seat.floor === 2).map((seat) => seat.seat),
      listChairIndexF3: selectedSeats.filter((seat) => seat.floor === 3).map((seat) => seat.seat)
    };

    const body: CancelOrderDto = {
      planScreenId: planScreeningId,
      cancelReasonId: values.cancelReasonId,
      ...selectedSeatIndicesByFloor
    };

    cancelOrder.mutate(body, {
      onSuccess: () => {
        setSelectedSeats([]);
        setOpenCancelSeats(false);
        queryClient.invalidateQueries({ queryKey: planScreeningsKeys.getDetail(planScreeningId) });
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(planScreeningId)
        });
        message.success("Hủy vé mời thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Hủy vé mời thất bại"));
      }
    });
  };

  return (
    <div className="shrink-0 border-t border-emerald-900/20 bg-emerald-100/50 px-2 backdrop-blur-md dark:border-emerald-300/20 dark:bg-emerald-950/80">
      <div className="p-2 flex gap-6 max-w-5xl mx-auto">
        <div className="flex-1 bg-app-bg-container py-2 px-4 rounded-md">
          <Descriptions size="small" items={items} column={2} />
        </div>
        <div className="min-w-56">
          <p className="text-sm">Ghi chú</p>
          <Button className="w-full text-left justify-start" onClick={openNoteModal}>
            {note.trim() ? note : "Nhập ghi chú"}
          </Button>
        </div>
        <div className="flex gap-3">
          {canCreate && (
            <Button
              variant="outlined"
              color="primary"
              className="h-full! font-bold"
              onClick={onBooking}
              disabled={selectedSeats.length === 0 || createOrder.isPending || isPlanScreeningPast}
            >
              Thêm vé mời
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outlined"
              color="danger"
              className="h-full! font-bold"
              disabled={selectedSeats.length === 0 || createOrder.isPending || isPlanScreeningPast}
              onClick={() => setOpenCancelSeats(true)}
            >
              Hủy vé mời
            </Button>
          )}
        </div>
      </div>

      {dialogPrintOpen && selectedItem && (
        <PrintInvitationTicketDialog
          open={dialogPrintOpen}
          onOpenChange={handleDialogPrintClose}
          selectedItem={selectedItem}
        />
      )}

      <Modal
        title="Xác nhận hủy vé"
        open={openCancelSeats}
        onOk={() => {
          cancelForm.submit();
        }}
        onCancel={() => setOpenCancelSeats(false)}
        okButtonProps={{
          loading: cancelOrder.isPending
        }}
        cancelButtonProps={{
          disabled: cancelOrder.isPending
        }}
        modalRender={(dom) => (
          <Form<FieldType>
            form={cancelForm}
            onFinish={onCancelSeats}
            autoComplete="off"
            layout="vertical"
          >
            {dom}
          </Form>
        )}
      >
        <Form.Item<FieldType>
          name="cancelReasonId"
          label="Lý do hủy vé"
          rules={[{ required: true, message: "Chọn lý do hủy vé" }]}
        >
          <Select
            loading={isFetching || isFetchingNextPage}
            options={cancelReasonOptions}
            placeholder="Chọn lý do hủy vé"
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                target.scrollHeight - target.scrollTop <= target.clientHeight + 50
              ) {
                fetchNextPage();
              }
            }}
            allowClear
          />
        </Form.Item>
      </Modal>

      <Modal
        open={noteModalOpen}
        title="Nhập ghi chú"
        onOk={handleNoteModalClose}
        onCancel={handleNoteModalClose}
        okText="Xong"
        cancelText="Đóng"
        width={680}
        style={{ top: 20 }}
        className="invoice-dialog-with-keyboard"
        afterOpenChange={(open) => {
          if (!open) return;

          window.setTimeout(() => {
            setIsKeyboardOpen(true);
            window.requestAnimationFrame(() => {
              inputRef.current?.focus();
            });
          }, 120);
        }}
      >
        <div className="space-y-3">
          <Input.TextArea
            ref={inputRef}
            value={note}
            rows={5}
            placeholder="Nhập ghi chú vé mời"
            onFocus={() => setIsKeyboardOpen(true)}
            onChange={handleNoteChange}
          />
          <div className={`invoice-keyboard-drawer ${isKeyboardOpen ? "is-open" : ""}`}>
            <div className="invoice-keyboard-drawer__header">
              <span className="invoice-keyboard-drawer__title">Bàn phím ảo</span>
              <button
                type="button"
                onClick={() => setIsKeyboardOpen(false)}
                className="invoice-keyboard-drawer__close"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            <Keyboard
              keyboardRef={(instance) => {
                keyboardRef.current = instance;
              }}
              theme="hg-theme-default invoice-keyboard-theme"
              layoutName={layoutName}
              inputName="note"
              onKeyPress={handleKeyboardKeyPress}
              layout={{
                default: [
                  "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                  "{tab} q w e r t y u i o p [ ] \\",
                  "{lock} a s d f g h j k l ; '",
                  "{shift} z x c v b n m , . / {shift}",
                  ".com @ {space} {enter}"
                ],
                shift: [
                  "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
                  "{tab} Q W E R T Y U I O P { } |",
                  '{lock} A S D F G H J K L : "',
                  "{shift} Z X C V B N M < > ? {shift}",
                  ".com @ {space} {enter}"
                ]
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Actions;
