"use client";

import { BackgroundProps, OrderDetailProps } from "@renderer/types";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, message, Modal, Select, Space } from "antd";
import QRCode from "qrcode";
import { useEffect, useState, startTransition } from "react";
import "react-quill-new/dist/quill.snow.css";
import type { FormProps } from "antd";
import ReactQuill from "react-quill-new";
import dayjs from "dayjs";

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
  urlTicket: string;
  title: string;
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
  const [selected, setSelected] = useState<string>("");
  const [email, setEmail] = useState("");
  const [emailTitle, setEmailTitle] = useState("");
  const [saveLocation, setSaveLocation] = useState("");
  const [emailContent, setEmailContent] = useState(templateHtml);

  useEffect(() => {
    window.api?.getDefaultExportFolder().then(setSaveLocation);
  }, []);

  const handleSelectFolder = async () => {
    const path = await window.api?.selectFolder();
    if (path) setSaveLocation(path);
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

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Tải ảnh thất bại");
      }

      return response.json();
    },
    onError: (error) => {
      console.error("Lỗi khi upload ảnh:", error);
      message.error(`Lỗi khi upload ảnh: ${error.message}`);
    }
  });

  const invitationTicketHistory = useMutation({
    mutationFn: async (data: FieldType) => {
      const response = await fetch("/api/invitation-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...data, status: "sent" })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      message.success("Đã gửi mail thành công");
    },
    onError: (error) => {
      console.error("Invitation ticket history error:", error);
      message.error("Gửi mail thất bại");
    }
  });

  const handleExport: FormProps<FieldType>["onFinish"] = async (values: FieldType) => {
    console.log(values);
    if (!selectedItem) return;

    setEmail("");
    setEmailTitle("");

    const qrBase64 = await generateQrCode(selectedItem.order.barCode);

    startTransition(async () => {
      try {
        const outputPath = await window.api.exportTicket({
          filmName: selectedItem.film?.filmName,
          filmNameEn: selectedItem.film?.filmNameEn,
          duration: selectedItem.film?.duration,
          date: dayjs(selectedItem?.planScreening?.projectDate, "YYYY-MM-DD").format("DD/MM/YYYY"),
          datetime: dayjs(selectedItem?.planScreening?.projectTime).utc().format("HH:mm"),
          room: selectedItem.room?.name,
          seat: selectedItem.order.items[0].listChairValueF1,
          imageSource: selected,
          qrImage: qrBase64,
          barCode: selectedItem.order.barCode,
          folder: saveLocation,
          floor: selectedItem.room.floor,
          categories:
            selectedItem.film?.categories?.map((category) => category.name).join(", ") || "",
          countryName: selectedItem.film.country.name
        });
        if (outputPath && emailTitle && email) {
          const file = await filePathToFile(outputPath, selectedItem.order.barCode);
          if (file) {
            const imageUrl = await uploadImageMutation.mutateAsync(file);
            invitationTicketHistory.mutate({
              orderId: selectedItem.order.id,
              receivedEmail: email,
              status: "sent",
              urlTicket: imageUrl.imageUrl,
              title: emailTitle
            });
          }
        }
        message.success("Xuất vé thành công");
        onOpenChange(false);
      } catch (error) {
        console.error(error);
        message.error("Xuất vé thất bại");
      }
    });
  };

  useEffect(() => {
    if (open && backgrounds.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(backgrounds[0].urlImage);
    }
  }, [open, backgrounds]);

  const urlTicket = Form.useWatch("urlTicket", form);

  return (
    <Modal
      title="Xuất vé mời"
      open={open}
      okButtonProps={{ htmlType: "submit", autoFocus: true }}
      onCancel={() => onOpenChange(false)}
      modalRender={(dom) => (
        <Form layout="vertical" form={form} name="filter-form" onFinish={handleExport}>
          {dom}
        </Form>
      )}
      width={1000}
    >
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item
          name="urlTicket"
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
        <Form.Item
          name="saveLocation"
          label="Thư mục lưu ảnh"
          rules={[{ required: true, message: "Chọn thư mục lưu ảnh" }]}
        >
          <Space.Compact style={{ width: "100%" }}>
            <Input placeholder="Chọn thư mục lưu ảnh" readOnly />
            <Button onClick={handleSelectFolder}>Chọn</Button>
          </Space.Compact>
        </Form.Item>
        <Form.Item name="title" label="Tiêu đề email">
          <Input placeholder="Nhập tiêu đề email" />
        </Form.Item>
        {urlTicket ? (
          <div className="mt-5">
            <img
              src={urlTicket}
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
          <ReactQuill value={emailContent} onChange={setEmailContent} readOnly />
        </div>
      </div>
    </Modal>
  );
};

export default PrintInvitationTicketDialog;
