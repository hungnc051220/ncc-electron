"use client";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import { OrderDetailProps } from "@/types";
import { format } from "date-fns";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: OrderDetailProps | null;
}

const OrderDialog = ({
  open,
  onOpenChange,
  selectedItem,
}: OrderDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[876px]">
        <DialogHeader className="border-b">
          <DialogTitle>Thông tin vé bán</DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto py-5 px-6">
          <div className="grid grid-cols-3 gap-8">
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Order Info-Merchant ID</p>
              <p>{selectedItem?.order.id}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Mã Barcode</p>
              <p>{selectedItem?.order.barCode}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Người mua vé</p>
              <p className="uppercase">
                {[
                  selectedItem?.order.customerFirstName,
                  selectedItem?.order.customerLastName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Email</p>
              <p>{selectedItem?.order.customerEmail}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Số điện thoại</p>
              <p>{selectedItem?.order.customerPhone}</p>
            </div>
            <div className="space-y-2 py-3 px-4">
              <div className="flex items-center gap-2">
                <Checkbox id="email" />
                <Label htmlFor="email">Đã gửi Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sms" />
                <Label htmlFor="sms">Đã gửi tin nhắn</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 bg-beerus mt-4 rounded-md">
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Ngày mua</p>
              <p>
                {selectedItem?.order.createdOnUtc &&
                  format(selectedItem?.order.createdOnUtc, "dd/MM/yyyy")}
              </p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Tên phim</p>
              <p>{selectedItem?.film?.filmName}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Ngày chiếu</p>
              <p>
                {selectedItem?.planScreening?.projectDate &&
                  format(
                    selectedItem?.planScreening?.projectDate,
                    "dd/MM/yyyy"
                  )}
              </p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Giờ chiếu</p>
              {selectedItem?.planScreening?.projectTime &&
                format(selectedItem?.planScreening?.projectTime, "HH:mm")}
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Số lượng vé</p>
              <p>{selectedItem?.order.customerPhone}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Vị trí ghế</p>
              <p>{selectedItem?.order.customerPhone}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks">Tiền thanh toán</p>
              <p>{formatMoney(selectedItem?.order.orderTotal || 0)}</p>
            </div>
            <div className="py-3 px-4">
              <p className="text-sm text-trunks mb-1">Trạng thái thanh toán</p>
              {selectedItem?.order.paymentStatusId && (
                <OrderStatusBadge
                  status={selectedItem?.order.paymentStatusId}
                  type="payment"
                />
              )}
            </div>
            <div className="py-3 px-4">
              <Button variant="outline">Chuyển sang thành công</Button>
            </div>
          </div>

          <div className="border mt-5 px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Ngày xử lý</TableHead>
                  <TableHead>Hash Valid</TableHead>
                  <TableHead>Loại thẻ</TableHead>
                  <TableHead>Kết quả GD</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button type="button">Xuất vé điện tử</Button>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Đóng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDialog;
