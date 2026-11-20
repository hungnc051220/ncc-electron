import { LoadingOutlined } from "@ant-design/icons";
import { useUploadSeatIconImage } from "@renderer/hooks/seatIconConfigs/useSeatIconConfigMutations";
import { Alert, Button, Upload } from "antd";
import { ImageUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatBytes,
  getImageFileName,
  getSeatIconErrorMessage,
  getSeatIconFileError,
  SEAT_ICON_ACCEPT
} from "../seatIconConfig.utils";

/** Giá trị field ảnh: ảnh đã lưu chỉ có `url`; ảnh vừa upload có thêm metadata từ `POST /images`. */
export interface SeatIconImageValue {
  url: string;
  fileName?: string | null;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
}

interface SeatIconUploadFieldProps {
  value?: SeatIconImageValue | null;
  onChange?: (value: SeatIconImageValue | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  disabled?: boolean;
}

const SeatIconUploadField = ({
  value,
  onChange,
  onUploadingChange,
  disabled
}: SeatIconUploadFieldProps) => {
  const upload = useUploadSeatIconImage();
  const [error, setError] = useState<string | null>(null);
  const isUploading = upload.isPending;

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const handleFile = async (file: File) => {
    setError(null);
    const fileError = getSeatIconFileError(file);
    if (fileError) return setError(fileError);

    try {
      const uploaded = await upload.mutateAsync(file);
      onChange?.({
        url: uploaded.url,
        fileName: uploaded.fileName ?? file.name,
        mimeType: uploaded.mimeType,
        width: uploaded.width,
        height: uploaded.height,
        size: uploaded.size
      });
    } catch (uploadError) {
      setError(getSeatIconErrorMessage(uploadError, "Tải ảnh lên thất bại"));
    }
  };

  const beforeUpload = (file: File) => {
    void handleFile(file);
    return Upload.LIST_IGNORE;
  };

  const isSquare = value?.width && value.height ? value.width === value.height : true;
  const meta = [
    value?.mimeType?.replace("image/", "").toUpperCase(),
    value?.width && value.height ? `${value.width}×${value.height} px` : null,
    value?.size ? formatBytes(value.size) : null
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-3 dark:border-app-border">
          <img
            src={value.url}
            alt="Ảnh icon ghế"
            className="size-20 shrink-0 rounded-md border border-slate-200 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-size-[12px_12px] object-contain dark:border-app-border"
          />
          <div className="min-w-0 flex-1 text-xs text-slate-600 dark:text-slate-300">
            <p className="m-0 truncate font-medium text-slate-900 dark:text-slate-100">
              {value.fileName || getImageFileName(value.url)}
            </p>
            <p className="m-0">{meta.length ? meta.join(" · ") : "Ảnh đang dùng"}</p>
            <div className="mt-2 flex gap-2">
              <Upload
                accept={SEAT_ICON_ACCEPT}
                showUploadList={false}
                disabled={disabled || isUploading}
                beforeUpload={beforeUpload}
              >
                <Button
                  size="small"
                  icon={<RefreshCw size={14} />}
                  loading={isUploading}
                  disabled={disabled}
                >
                  {isUploading ? "Đang tải ảnh lên…" : "Đổi ảnh"}
                </Button>
              </Upload>
              <Button
                size="small"
                danger
                icon={<Trash2 size={14} />}
                disabled={disabled || isUploading}
                onClick={() => {
                  setError(null);
                  onChange?.(null);
                }}
              >
                Bỏ ảnh
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Upload.Dragger
          accept={SEAT_ICON_ACCEPT}
          showUploadList={false}
          disabled={disabled || isUploading}
          beforeUpload={beforeUpload}
          className="[&_.ant-upload-btn]:py-3!"
        >
          <div className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300">
            {isUploading ? (
              <LoadingOutlined className="text-2xl text-[#464FB4]" />
            ) : (
              <ImageUp className="size-7 text-[#464FB4]" />
            )}
            <p className="m-0 text-sm font-medium">
              {isUploading ? "Đang tải ảnh lên…" : "Kéo thả hoặc bấm để chọn ảnh"}
            </p>
            <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
              PNG, JPG, WebP · tối đa 1 MB · nên vuông 1:1, nền trong suốt
            </p>
          </div>
        </Upload.Dragger>
      )}
      {error && (
        <p className="m-0 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      {value && !isSquare && (
        <Alert
          type="warning"
          showIcon
          title={`Ảnh ${value.width}×${value.height} px không vuông`}
          description="Ảnh sẽ phủ kín ô ghế và bị cắt phần thừa ở hai bên (object-fit: cover). Nên dùng ảnh vuông 1:1."
        />
      )}
    </div>
  );
};

export default SeatIconUploadField;
