"use client";

import { createRoomAction, updateRoomAction } from "@/actions/room-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { RoomFormInput } from "@/lib/schemas/room-schema";
import { RoomProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import ScreeningRoomsForm from "./screening-rooms-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface ScreeningRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingScreeningRoom?: RoomProps | null;
}

const ScreeningRoomsDialog = ({
  open,
  onOpenChange,
  editingScreeningRoom,
}: ScreeningRoomsDialogProps) => {
  const isEdit = !!editingScreeningRoom;
  const [state, action, pending] = useActionState(
    isEdit ? updateRoomAction : createRoomAction,
    INITIAL_STATE
  );

  const onSubmit = (values: RoomFormInput) => {
    const formData = new FormData();
    if (isEdit && editingScreeningRoom) {
      formData.append("id", editingScreeningRoom.id.toString());
    }
    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(
        isEdit
          ? "Cập nhật phòng chiếu thành công"
          : "Thêm phòng chiếu thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<RoomFormInput> | undefined => {
    if (!editingScreeningRoom) return undefined;
    return {
      ...editingScreeningRoom,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[612px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật phòng chiếu" : "Thêm mới phòng chiếu"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <ScreeningRoomsForm
            onSubmit={onSubmit}
            defaultValues={getDefaultValues()}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="screening-rooms-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScreeningRoomsDialog;
