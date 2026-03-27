import { useUpdateManufacturer } from "@renderer/hooks/manufacturers/useUpdateManufacturer";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { ManufacturerProps } from "@shared/types";
import { message, Modal } from "antd";

interface ChangeHiddenManufacturerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manufacturer: ManufacturerProps;
  name: string;
}

const ChangeHiddenManufacturerDialog = ({
  open,
  onOpenChange,
  manufacturer,
  name
}: ChangeHiddenManufacturerDialogProps) => {
  const updateManufacturer = useUpdateManufacturer();

  const onOk = () => {
    updateManufacturer.mutate(
      {
        id: manufacturer.id,
        dto: {
          ...manufacturer,
          isHidden: !manufacturer.isHidden
        }
      },
      {
        onSuccess: () => {
          message.success("Thay đổi ẩn/hiện hãng phim thành công");
          onOpenChange(false);
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Thay đổi ẩn/hiện hãng phim thất bại"));
        }
      }
    );
  };

  return (
    <Modal
      open={open}
      title="Xác nhận thay đổi trạng thái ẩn/hiện hãng phim"
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      confirmLoading={updateManufacturer.isPending}
      destroyOnHidden
    >
      Bạn có chắc chắn muốn thay đổi trạng thái ẩn/hiện hãng phim <strong>{name}</strong>?
    </Modal>
  );
};

export default ChangeHiddenManufacturerDialog;
