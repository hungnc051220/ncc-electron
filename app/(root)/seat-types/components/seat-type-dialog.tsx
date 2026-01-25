"use client";

import { SeatTypeProps } from "@/types";
import { cyan, generate, green, presetPalettes, red } from "@ant-design/colors";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColorPickerProps, FormProps, GetProp, UploadProps } from "antd";
import {
  Checkbox,
  Col,
  ColorPicker,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  theme,
  Upload,
} from "antd";
import axios from "axios";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];
type Presets = Required<ColorPickerProps>["presets"][number];

function genPresets(presets = presetPalettes) {
  return Object.entries(presets).map<Presets>(([label, colors]) => ({
    label,
    colors,
    key: label,
  }));
}

type FieldType = {
  positionCode: string;
  name: string;
  isSeat: boolean;
  isDefault: boolean;
  color?: string;
  pictureUrl?: string;
};

interface SeatTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSeatType?: SeatTypeProps | null;
}

const SeatTypeDialog = ({
  open,
  onOpenChange,
  editingSeatType,
}: SeatTypeDialogProps) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!editingSeatType;
  const [loading, setLoading] = useState(false);
  const [pictureUrl, setPictureUrl] = useState<string>();

  const { token } = theme.useToken();

  const presets = genPresets({
    primary: generate(token.colorPrimary),
    red,
    green,
    cyan,
  });

  const customPanelRender: ColorPickerProps["panelRender"] = (
    _,
    { components: { Picker, Presets } },
  ) => (
    <Row justify="space-between" wrap={false}>
      <Col span={12}>
        <Presets />
      </Col>
      <Divider vertical style={{ height: "auto" }} />
      <Col flex="auto">
        <Picker />
      </Col>
    </Row>
  );

  const seatTypeMutation = useMutation({
    mutationFn: (data: FieldType) => {
      if (!isEdit) {
        return axios.post("/api/seat-types/create", {
          ...data,
        });
      } else {
        return axios.post("/api/seat-types/update", {
          ...data,
          id: editingSeatType.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seat-types"] });
      toast.success(
        `${isEdit ? "Cập nhật" : "Thêm"} loại ghế, vị trí thành công`,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const onOk = () => form.submit();

  const getInitialValues = (): FieldType | undefined => {
    if (!editingSeatType) {
      return {
        positionCode: "",
        name: "",
        isSeat: true,
        isDefault: false,
        color: undefined,
      };
    }
    return {
      positionCode: editingSeatType.positionCode,
      name: editingSeatType.name,
      isSeat: editingSeatType.isSeat,
      isDefault: editingSeatType.isDefault,
      color: editingSeatType.color,
    };
  };

  if (editingSeatType && !pictureUrl && editingSeatType.pictureUrl) {
    setPictureUrl(editingSeatType.pictureUrl);
    form.setFieldValue("pictureUrl", editingSeatType.pictureUrl);
  }

  const onFinish: FormProps<FieldType>["onFinish"] = (values: FieldType) => {
    seatTypeMutation.mutate(values);
  };

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      toast.error("Chỉ có thể tải ảnh dạng JPG/PNG!");
    }
    const isLt2M = file.size / 1024 / 1024 < 5;
    if (!isLt2M) {
      toast.error("Ảnh phải nhỏ hơn 5MB!");
    }
    return isJpgOrPng && isLt2M;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  const uploadButton = (
    <button className="border-none bg-none" type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div className="mt-2 text-gray-500">
        {loading ? "Đang tải" : "Chọn ảnh"}
      </div>
    </button>
  );

  const handleChange: UploadProps["onChange"] = (info) => {
    if (info.file.status === "uploading") {
      setLoading(true);
      return;
    }
    if (info.file.status === "done") {
      form.setFieldValue("pictureUrl", info.file.response.imageUrl);
      setPictureUrl(info.file.response.imageUrl);
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Cập nhật loại ghế, vị trí" : "Thêm mới loại ghế, vị trí"}
      onOk={onOk}
      onCancel={() => onOpenChange(false)}
      okButtonProps={{
        loading: seatTypeMutation.isPending,
        disabled: loading,
      }}
      cancelButtonProps={{
        loading: seatTypeMutation.isPending,
        disabled: loading,
      }}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={getInitialValues()}
      >
        <Form.Item<FieldType>
          name="positionCode"
          label="Mã vị trí"
          rules={[{ required: true, message: "Nhập tên mã vị trí" }]}
        >
          <Input placeholder="Nhập mã vị trí" />
        </Form.Item>
        <Form.Item<FieldType>
          name="name"
          label="Loại ghế, vị trí"
          rules={[{ required: true, message: "Nhập tên loại ghế, vị trí" }]}
        >
          <Input placeholder="Nhập loại ghế, vị trí" />
        </Form.Item>
        <Form.Item<FieldType> name="isSeat" noStyle valuePropName="checked">
          <Checkbox>Là ghế ngồi</Checkbox>
        </Form.Item>
        <Form.Item<FieldType> name="isDefault" valuePropName="checked">
          <Checkbox>Mặc định</Checkbox>
        </Form.Item>
        <Form.Item<FieldType>
          name="color"
          label="Màu ghế"
          getValueFromEvent={(value) => value.toHexString()}
        >
          <ColorPicker
            allowClear
            styles={{ popupOverlayInner: { width: 480 } }}
            presets={presets}
            panelRender={customPanelRender}
          />
        </Form.Item>
        <Form.Item<FieldType> name="pictureUrl" hidden />

        <Form.Item
          label="Ảnh"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          className="col-span-2"
        >
          <Upload
            listType="picture-card"
            showUploadList={false}
            maxCount={1}
            action="/api/upload-image"
            beforeUpload={beforeUpload}
            onChange={handleChange}
          >
            {pictureUrl && !loading ? (
              <Image
                src={pictureUrl}
                alt="avatar"
                width={200}
                height={200}
                className="w-full rounded-md p-1 object-cover object-center"
              />
            ) : (
              uploadButton
            )}
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SeatTypeDialog;
