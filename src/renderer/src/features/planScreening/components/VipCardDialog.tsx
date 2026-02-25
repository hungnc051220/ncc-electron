import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { Button, Checkbox, Descriptions, Input, message, Modal, Space } from "antd";
import type { DescriptionsProps } from "antd";
import { InputStatus } from "antd/es/_util/statusUtils";
import { useState } from "react";

interface VipCardDialogProps {
  open: boolean;
  onCancel: () => void;
  totalPrice?: number;
  onBooking: () => void;
}

const VipCardDialog = ({ open, onCancel, totalPrice, onBooking }: VipCardDialogProps) => {
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<InputStatus>("");

  const items: DescriptionsProps["items"] = [
    {
      label: "Họ và tên",
      children: "Anh Tuấn Trương"
    },
    {
      label: "Hạng thẻ",
      children: "Member"
    },
    {
      label: "Ngày sinh",
      children: "16-03-2000"
    },
    {
      label: "Ngày hết hạn",
      children: "01-06-2021"
    },
    {
      label: "Điểm tích lũy",
      children: "3726045"
    },
    {
      label: "Điểm thưởng",
      children: "183280"
    },
    {
      label: "Địa chỉ",
      span: 1,
      children: "Hà Nội"
    }
  ];

  const onConfirm = () => {
    if (!searchText) {
      message.error("Bạn chưa nhập số thẻ");
      setStatus("error");
      return;
    }

    onBooking();
    onCancel();
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={800}
      title="Sử dụng CTKM cho thành viên"
      centered
      onOk={onConfirm}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4 mt-4">
          <p>Số thẻ</p>
          <Space.Compact className="flex-1">
            <Input
              placeholder="Nhập số thẻ"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setStatus("");
              }}
              status={status}
            />
            <Button variant="outlined" color="primary">
              Tìm kiếm
            </Button>
          </Space.Compact>
        </div>

        <Descriptions bordered items={items} column={2} />

        <div className="flex items-center justify-center">
          <Checkbox className="flex-1">Áp dụng chương trình khuyến mãi</Checkbox>
          <Checkbox className="flex-1">Áp dụng ưu đãi cho thành viên U22</Checkbox>
        </div>

        <div className="bg-gray-100 p-4 rounded-md">
          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="flex justify-between">
                <p>Tiền mua vé:</p>
                <p className="text-primary font-semibold">{formatMoney(totalPrice || 0)}</p>
              </div>
              <div className="flex justify-between">
                <p>Tiền thanh toán sau khuyến mãi:</p>
                <p className="text-red-500 font-semibold">{formatMoney(totalPrice || 0)}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between">
                <p>Chi tiêu cộng thêm:</p>
                <p>{formatMoney(totalPrice || 0)}</p>
              </div>
              <div className="flex justify-between">
                <p>Điểm thưởng cộng thêm</p>
                <p>{formatNumber(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VipCardDialog;
