"use client";

import {
  createContractTicketSaleAction,
  updateContractTicketSaleAction,
} from "@/actions/contract-ticket-sale-actions";
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
import { ContractTicketSaleFormInput } from "@/lib/schemas/contract-ticket-sale-schema";
import { ContractTicketSaleProps } from "@/types";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import ContractTicketSaleForm from "./contract-ticket-sale-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface ContractTicketSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContractTicketSale?: ContractTicketSaleProps | null;
}

const ContractTicketSaleDialog = ({
  open,
  onOpenChange,
  editingContractTicketSale,
}: ContractTicketSaleDialogProps) => {
  const isEdit = !!editingContractTicketSale;
  const [state, action, pending] = useActionState(
    isEdit ? updateContractTicketSaleAction : createContractTicketSaleAction,
    INITIAL_STATE
  );

  const onSubmit = (values: ContractTicketSaleFormInput) => {
    const formData = new FormData();
    if (isEdit && editingContractTicketSale) {
      formData.append("id", editingContractTicketSale.id.toString());
    }
    formData.append("customerFirstName", values.customerFirstName);
    formData.append("customerPhone", values.customerPhone);
    formData.append("orderTotal", values.orderTotal.toString());
    formData.append("createdBy", values.createdBy || "");
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(
        isEdit ? "Cập nhật hợp đồng thành công" : "Thêm hợp đồng thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = ():
    | Partial<ContractTicketSaleFormInput>
    | undefined => {
    if (!editingContractTicketSale) return undefined;
    return {
      customerFirstName: editingContractTicketSale.customerFirstName,
      customerPhone: editingContractTicketSale.customerPhone,
      orderTotal: editingContractTicketSale.orderTotal,
      createdBy: editingContractTicketSale.createdBy,
      cinemaName: "Trung tâm chiếu phim quốc gia",
      cinemaAddress: "Số 87, Láng Hạ, Quận Ba Đình, Thành phố Hà Nội",
      cinemaPhone: "024.3514.1791",
      cinemaFax: "024.3514.8647",
      cinemaWebsite: "https://chieuphimquocgia.com.vn",
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật hợp đồng" : "Thêm mới hợp đồng"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto">
          <ContractTicketSaleForm
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
          <Button
            type="submit"
            form="contract-ticket-sale-form"
            disabled={pending}
          >
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractTicketSaleDialog;
