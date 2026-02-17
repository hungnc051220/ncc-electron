"use client";

import { useCreateInvitationTicket } from "@renderer/hooks/invitationTickets/useCreateInvitationTicket";
import { useUploadImage } from "@renderer/hooks/useUploadImage";
import { ApiError, BackgroundProps, OrderDetailProps } from "@renderer/types";
import type { FormProps } from "antd";
import { Button, Form, Input, message, Modal, Select, Space } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const templateHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title></title>
</head>
<body>
    Xin chào! <br /><br />

    Vé mời tham dự buổi chiếu phim của bạn đã được gửi đến email này. <br />
    Vui lòng kiểm tra thông tin chi tiết của vé mời dưới đây: <br /><br />

    Trân trọng.<br />
    Trung tâm chiếu phim quốc gia<br/>

</body>
</html>`;

interface FieldType {
  orderId: number;
  receivedEmail: string;
  status: string;
  background: string;
  title: string;
  saveLocation?: string;
}

interface PrintInvitationTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backgrounds: BackgroundProps[];
  selectedItem?: OrderDetailProps | null;
  isFetchingBackgrounds: boolean;
}

const PrintInvitationTicketDialog = ({
  open,
  onOpenChange,
  backgrounds,
  selectedItem,
  isFetchingBackgrounds
}: PrintInvitationTicketDialogProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const uploadImage = useUploadImage();
  const createInvitationTicket = useCreateInvitationTicket();

  useEffect(() => {
    window.api
      ?.getDefaultExportFolder()
      .then((path: string) => form.setFieldValue("saveLocation", path));
  }, [form]);

  const handleSelectFolder = async () => {
    const path = await window.api?.selectFolder();
    if (path) form.setFieldValue("saveLocation", path);
  };

  const generateQrCode = async (barCode: string) => {
    const qrBase64 = await QRCode.toDataURL(barCode, {
      errorCorrectionLevel: "H",
      margin: 0,
      width: 160
    });

    return qrBase64;
  };

  const filePathToFile = async (filePath: string, fileName: string): Promise<File> => {
    const data = await window.api?.readFile(filePath);

    if (!data) {
      throw new Error("Failed to read file");
    }

    // Đảm bảo chuyển đổi thành ArrayBuffer thông thường
    let arrayBuffer: ArrayBuffer;

    if (data.buffer instanceof ArrayBuffer) {
      // Nếu buffer là ArrayBuffer thông thường
      arrayBuffer = data.buffer;
    } else {
      // Tạo ArrayBuffer mới từ dữ liệu
      arrayBuffer = data.slice().buffer;
    }

    // Sử dụng ArrayBuffer để tạo File
    return new File([arrayBuffer], `${fileName}.png`, {
      type: "image/png"
    });
  };

  const getOutputPath = async (values: FieldType) => {
    if (!selectedItem) return;

    let outputPath: string | null = null;
    const qrBase64 = await generateQrCode(selectedItem.order.barCode);

    try {
      setLoading(true);
      outputPath = await window.api.exportTicket({
        filmName: selectedItem.film?.filmName,
        filmNameEn: selectedItem.film?.filmNameEn,
        duration: selectedItem.film?.duration,
        date: dayjs(selectedItem?.planScreening?.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY"),
        datetime: dayjs(selectedItem?.planScreening?.projectTime).utc().format("HH:mm"),
        room: selectedItem.room?.name,
        seat: selectedItem.order.items[0].listChairValueF1,
        imageSource: values.background,
        qrImage: qrBase64,
        barCode: selectedItem.order.barCode,
        folder: values.saveLocation,
        floor: selectedItem.room.floor,
        categories:
          selectedItem.film?.categories?.map((category) => category.name).join(", ") || "",
        countryName: selectedItem.film.country.name
      });
      setLoading(false);
      return outputPath;
    } catch (error) {
      setLoading(false);
      console.error(error);
      message.error("Xuất vé thất bại");
      return outputPath;
    }
  };

  const handleExport: FormProps<FieldType>["onFinish"] = async (values: FieldType) => {
    if (!selectedItem) return;

    const outputPath = await getOutputPath(values);

    if (outputPath && values.title && values.receivedEmail) {
      const file = await filePathToFile(outputPath, selectedItem.order.barCode);
      if (file) {
        await uploadImage.mutateAsync(file, {
          onSuccess: (data) => {
            createInvitationTicket.mutateAsync(
              {
                orderId: selectedItem.order.id,
                receivedEmail: values.receivedEmail,
                status: "sent",
                urlTicket: data.imageUrl,
                title: values.title
              },
              {
                onSuccess: () => {
                  message.success("Gửi mail thành công");
                },
                onError: (error: unknown) => {
                  let msg = "Gửi mail thất bại";

                  if (axios.isAxiosError<ApiError>(error)) {
                    msg = error.response?.data?.message ?? msg;
                  }

                  message.error(msg);
                }
              }
            );
          },
          onError: (error: unknown) => {
            let msg = "Tải ảnh thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
            return;
          }
        });
      }
    }
    message.success("Xuất vé thành công");
    onOpenChange(false);
  };

  const image = Form.useWatch("background", form);

  return (
    <Modal
      title="Xuất vé mời"
      open={open}
      okButtonProps={{
        htmlType: "submit",
        autoFocus: true,
        disabled: createInvitationTicket.isPending || uploadImage.isPending || loading
      }}
      cancelButtonProps={{
        disabled: createInvitationTicket.isPending || uploadImage.isPending || loading
      }}
      onCancel={() => onOpenChange(false)}
      modalRender={(dom) => (
        <Form layout="vertical" form={form} onFinish={handleExport}>
          {dom}
        </Form>
      )}
      width={1000}
    >
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item
          name="background"
          label="Mẫu ảnh nền"
          rules={[{ required: true, message: "Chọn mẫu ảnh nền" }]}
        >
          <Select
            options={backgrounds.map((background) => ({
              value: background.urlImage,
              label: background.name
            }))}
            placeholder="Chọn ảnh nền"
            loading={isFetchingBackgrounds}
          />
        </Form.Item>
        <Form.Item name="receivedEmail" label="Email người nhận">
          <Input placeholder="Nhập email người nhận" />
        </Form.Item>

        <Form.Item label="Thư mục lưu ảnh" required>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item
              name="saveLocation"
              noStyle
              rules={[{ required: true, message: "Chọn thư mục lưu ảnh" }]}
            >
              <Input placeholder="Chọn thư mục lưu ảnh" readOnly />
            </Form.Item>

            <Button onClick={handleSelectFolder}>Chọn</Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item name="title" label="Tiêu đề email">
          <Input placeholder="Nhập tiêu đề email" />
        </Form.Item>
        {image ? (
          <div className="mt-5">
            <img
              src={image}
              alt="preview"
              width={500}
              height={254}
              className="w-125 h-63.5 object-contain rounded-md"
            />
          </div>
        ) : (
          <div className="w-full h-63.5 bg-beerus mt-5 rounded-md" />
        )}
        <div className="mt-5">
          <ReactQuill value={templateHtml} readOnly />
        </div>
      </div>
    </Modal>
  );
};

export default PrintInvitationTicketDialog;
