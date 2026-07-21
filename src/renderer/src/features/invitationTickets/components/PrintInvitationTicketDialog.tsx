import { useAntdApp } from "@renderer/hooks/useAntdApp";

import { useCreateInvitationTicket } from "@renderer/hooks/invitationTickets/useCreateInvitationTicket";
import { useInvitationTicketBackgrounds } from "@renderer/hooks/invitationTickets/useInvitationTicketBackgrounds";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useUploadImage } from "@renderer/hooks/useUploadImage";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { formatSeatValues } from "@renderer/lib/utils";
import { OrderDetailProps } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { FormProps } from "antd";
import { Button, Checkbox, Form, Input, Modal, Select, Space } from "antd";
import dayjs from "dayjs";
import QRCode from "qrcode";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  completeInvitationTicketExport,
  shouldOpenInvitationTicketAfterExport
} from "./PrintInvitationTicketDialog.utils";

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
  phoneNumber?: string;
  sendZaloOA?: boolean;
  saveLocation: string;
}

interface PrintInvitationTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: OrderDetailProps | null;
}

const PrintInvitationTicketDialog = ({
  open,
  onOpenChange,
  selectedItem
}: PrintInvitationTicketDialogProps) => {
  const { message } = useAntdApp();

  const queryClient = useQueryClient();
  const [form] = Form.useForm<FieldType>();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const uploadImage = useUploadImage();
  const { data: backgrounds, isFetching: isFetchingBackgrounds } = useInvitationTicketBackgrounds();
  const createInvitationTicket = useCreateInvitationTicket();

  useEffect(() => {
    if (backgrounds && backgrounds.length > 0)
      form.setFieldValue("background", backgrounds[0].urlImage);
  }, [backgrounds, form]);

  useEffect(() => {
    window.api
      ?.getDefaultExportFolder()
      .then((path: string) => form.setFieldValue("saveLocation", path));
  }, [form]);

  useEffect(() => {
    if (!open) return;
  }, [open]);

  const handleSelectFolder = async () => {
    const path = await window.api?.selectFolder();
    if (path) form.setFieldValue("saveLocation", path);
  };

  const generateQrCode = async (barCode: string) => {
    const qrBase64 = await QRCode.toDataURL(barCode, {
      errorCorrectionLevel: "H",
      margin: 0,
      width: 160,
      color: {
        dark: "#000000",
        light: "#0000"
      }
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
      outputPath = await window.api.exportTicket({
        filmName: selectedItem.film?.filmName,
        filmNameEn: selectedItem.film?.filmNameEn,
        duration: selectedItem.film?.duration,
        date: dayjs(selectedItem?.planScreening?.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY"),
        datetime: dayjs(selectedItem?.planScreening?.projectTime).format("HH:mm"),
        room: selectedItem.room?.name,
        seat: formatSeatValues(selectedItem.order.items),
        imageSource: values.background,
        qrImage: qrBase64,
        barCode: selectedItem.order.barCode,
        folder: values.saveLocation,
        floor: selectedItem.room.floor,
        categories:
          selectedItem.film?.categories?.map((category) => category.name).join(", ") || "",
        countryName: selectedItem.film?.country?.name,
        openAfterExport: shouldOpenInvitationTicketAfterExport(values)
      });
      return outputPath;
    } catch (error) {
      console.error(error);
      message.error(getApiErrorMessage(error, "Xuất vé thất bại"));
      return outputPath;
    }
  };

  const handleExport: FormProps<FieldType>["onFinish"] = async (values: FieldType) => {
    if (!selectedItem || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setLoading(true);
    let exportSucceeded = false;

    try {
      const outputPath = await getOutputPath(values);

      if (!outputPath) {
        return;
      }

      if (!values.title || !values.receivedEmail) {
        exportSucceeded = true;
        completeInvitationTicketExport({
          successMessage: "Xuất vé thành công",
          closeModal: () => onOpenChange(false),
          showSuccess: (successMessage) => message.success(successMessage)
        });
        return;
      }

      const file = await filePathToFile(outputPath, selectedItem.order.barCode);
      let imageUrl = "";

      try {
        imageUrl = await uploadImage.mutateAsync(file);
      } catch (error: unknown) {
        message.error(getApiErrorMessage(error, "Tải ảnh thất bại"));
        return;
      }

      try {
        await createInvitationTicket.mutateAsync({
          orderId: selectedItem.order.id,
          receivedEmail: values.receivedEmail,
          status: "sent",
          urlTicket: imageUrl,
          title: values.title
        });
      } catch (error: unknown) {
        message.error(getApiErrorMessage(error, "Xuất vé mời qua email thất bại"));
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: planScreeningsKeys.getDetail(selectedItem.planScreening.id)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.getOrdersByScreening(selectedItem.planScreening.id)
        }),
        queryClient.invalidateQueries({
          queryKey: ordersKeys.all
        })
      ]);

      exportSucceeded = true;
      completeInvitationTicketExport({
        successMessage: "Xuất vé mời qua email thành công",
        closeModal: () => onOpenChange(false),
        showSuccess: (successMessage) => message.success(successMessage)
      });
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Xuất vé thành công nhưng xử lý tệp thất bại"));
    } finally {
      if (!exportSucceeded) {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    }
  };

  const image = Form.useWatch("background", form);
  const sendZaloOA = Form.useWatch("sendZaloOA", form);
  const handleInputChange =
    (field: "receivedEmail" | "title" | "phoneNumber") => (e: ChangeEvent<HTMLInputElement>) => {
      form.setFieldValue(field, e.target.value);
    };

  const inputProps = (field: "receivedEmail" | "title" | "phoneNumber", placeholder: string) => ({
    placeholder,
    onChange: handleInputChange(field)
  });

  return (
    <>
      <Modal
        title="Xuất vé mời"
        open={open}
        okButtonProps={{
          htmlType: "submit",
          autoFocus: true
        }}
        confirmLoading={loading}
        cancelButtonProps={{
          disabled: loading
        }}
        onCancel={() => {
          if (!loading) onOpenChange(false);
        }}
        afterOpenChange={(nextOpen) => {
          if (!nextOpen) {
            isSubmittingRef.current = false;
            setLoading(false);
          }
        }}
        forceRender
        modalRender={(dom) => (
          <Form layout="vertical" form={form} onFinish={handleExport}>
            {dom}
          </Form>
        )}
        width={1000}
        centered
      >
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item
            name="background"
            label="Mẫu ảnh nền"
            rules={[{ required: true, message: "Chọn mẫu ảnh nền" }]}
          >
            <Select
              options={backgrounds?.map((background) => ({
                value: background.urlImage,
                label: background.name
              }))}
              placeholder="Chọn ảnh nền"
              loading={isFetchingBackgrounds}
            />
          </Form.Item>
          <Form.Item
            name="receivedEmail"
            label="Email người nhận"
            dependencies={["title"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const title = getFieldValue("title");

                  if (value && !title) {
                    return Promise.reject(
                      new Error("Nhập tiêu đề email khi đã điền email người nhận")
                    );
                  }

                  if (value && !/\S+@\S+\.\S+/.test(value)) {
                    return Promise.reject(new Error("Email người nhận không hợp lệ"));
                  }

                  return Promise.resolve();
                }
              })
            ]}
          >
            <Input {...inputProps("receivedEmail", "Nhập email người nhận")} />
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

          <Form.Item
            name="title"
            label="Tiêu đề email"
            dependencies={["receivedEmail"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const receivedEmail = getFieldValue("receivedEmail");

                  if (receivedEmail && !value?.trim()) {
                    return Promise.reject(
                      new Error("Nhập tiêu đề email khi đã điền email người nhận")
                    );
                  }

                  return Promise.resolve();
                }
              })
            ]}
          >
            <Input {...inputProps("title", "Nhập tiêu đề email")} />
          </Form.Item>
          <Form.Item name="sendZaloOA" label={null} valuePropName="checked">
            <Checkbox>Gửi zalo OA</Checkbox>
          </Form.Item>
          <Form.Item
            name="phoneNumber"
            label="Số điện thoại"
            rules={[{ required: sendZaloOA, message: "Nhập số điện thoại gửi ZaloOA" }]}
          >
            <Input {...inputProps("phoneNumber", "Nhập số điện thoại")} />
          </Form.Item>
          {image ? (
            <img
              src={image}
              alt="preview"
              width={500}
              height={254}
              className="w-125 h-63.5 object-contain rounded-md"
            />
          ) : (
            <div className="w-full h-63.5 bg-app-bg-container mt-5 rounded-md" />
          )}
          <div className="mt-5">
            <ReactQuill value={templateHtml} readOnly />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PrintInvitationTicketDialog;
