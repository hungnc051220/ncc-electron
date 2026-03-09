import { useCustomer } from "@renderer/hooks/useCustomer";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import type { DescriptionsProps } from "antd";
import { Button, Checkbox, Descriptions, Input, message, Modal, Space } from "antd";
import { InputStatus } from "antd/es/_util/statusUtils";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

interface VipCardDialogProps {
  open: boolean;
  onCancel: () => void;
  totalPrice?: number;
  onBooking: (memberCardCode: string) => void;
}

const VipCardDialog = ({ open, onCancel, totalPrice, onBooking }: VipCardDialogProps) => {
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [lastSearched, setLastSearched] = useState<string | null>(null);
  const [status, setStatus] = useState<InputStatus>("");

  const { data, isFetching, refetch } = useCustomer({
    current: 1,
    pageSize: 1,
    cardCode: searchText
  });

  const customer = useMemo(() => {
    if (!data || data.data.length === 0) return null;

    return data.data[0];
  }, [data]);

  const items: DescriptionsProps["items"] = [
    {
      label: "Họ và tên",
      children: customer?.fullName
    },
    {
      label: "Hạng thẻ",
      children: customer?.cardLevelName
    },
    {
      label: "Ngày sinh",
      children: customer?.birthDay ? dayjs(customer.birthDay).format("DD/MM/YYYY") : ""
    },
    {
      label: "Ngày hết hạn",
      children: customer?.dateExpireCard ? dayjs(customer.dateExpireCard).format("DD/MM/YYYY") : ""
    },
    {
      label: "Điểm tích lũy",
      children: formatNumber(customer?.pointCard || 0)
    },
    {
      label: "Điểm thưởng",
      children: formatNumber(customer?.pointReward || 0)
    },
    {
      label: "Địa chỉ",
      span: 1,
      children: customer?.address
    }
  ];

  const onConfirm = () => {
    if (!searchText) {
      message.error("Bạn chưa nhập số thẻ");
      setStatus("error");
      return;
    }

    onBooking(searchText);
    onCancel();
  };

  const onSearch = async () => {
    if (!searchText) {
      message.error("Bạn chưa nhập số thẻ");
      setStatus("error");
      return;
    }

    if (searchText === lastSearched) {
      return;
    }

    setLastSearched(searchText);

    try {
      const res = await refetch();

      const customers = res.data?.data;

      if (!customers || customers.length === 0) {
        message.error("Không tìm thấy khách hàng");
        setStatus("error");
        return;
      }
    } catch {
      message.error("Có lỗi xảy ra khi tìm kiếm");
    }
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
              onPressEnter={onSearch}
            />
            <Button variant="outlined" color="primary" onClick={onSearch} loading={isFetching}>
              Tìm kiếm
            </Button>
          </Space.Compact>
        </div>

        <Descriptions bordered items={items} column={2} />

        <div className="flex items-center justify-center">
          <Checkbox className="flex-1">Áp dụng chương trình khuyến mãi</Checkbox>
          <Checkbox className="flex-1">Áp dụng ưu đãi cho thành viên U22</Checkbox>
        </div>

        <div className="bg-gray-100 dark:bg-app-bg-container p-4 rounded-md">
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
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VipCardDialog;
