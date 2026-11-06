import { useAntdApp } from "@renderer/hooks/useAntdApp";
import type { PaperVoucherImageDraft } from "@shared/types";
import type { UploadProps } from "antd";
import { Button, Image, Upload } from "antd";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  PAPER_VOUCHER_IMAGE_ACCEPT,
  PAPER_VOUCHER_MAX_IMAGES,
  PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE,
  validatePaperVoucherImageFile
} from "../paperVoucher.utils";

interface PaperVoucherImageInputProps {
  value?: PaperVoucherImageDraft[];
  onChange?: (value: PaperVoucherImageDraft[]) => void;
  disabled?: boolean;
}

// Key ổn định cho file mới chọn để đổi thứ tự không tạo lại object URL xem trước.
const fileKeys = new WeakMap<File, number>();
let nextFileKey = 1;

const getDraftKey = (draft: PaperVoucherImageDraft) => {
  if (!("file" in draft)) return `url:${draft.url}`;
  if (!fileKeys.has(draft.file)) fileKeys.set(draft.file, nextFileKey++);
  return `file:${fileKeys.get(draft.file)}`;
};

/** Object URL chỉ dùng để xem trước file chưa lưu; revoke khi gỡ file hoặc đóng modal. */
const useFilePreviewUrl = (file?: File) => {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!file) {
      setUrl(undefined);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
};

interface ImageTileProps {
  draft: PaperVoucherImageDraft;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
}

const ImageTile = ({ draft, index, total, disabled, onMove, onRemove }: ImageTileProps) => {
  const file = "file" in draft ? draft.file : undefined;
  const filePreviewUrl = useFilePreviewUrl(file);
  const src = "file" in draft ? filePreviewUrl : draft.url;
  const fileName = "file" in draft ? draft.file.name : draft.fileName;
  const position = index + 1;

  // Căn giữa ảnh bằng khung bọc, không qua `rootClassName` của Image: antd 6 gộp class đó vào
  // root của cửa sổ preview, khiến lớp phủ preview không ẩn sau khi đóng và chặn mọi thao tác.
  return (
    <li className="flex min-w-0 flex-col gap-1.5" data-testid="paper-voucher-image-item">
      <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg border border-app-border bg-slate-50 dark:bg-white/5">
        {src && (
          <Image
            src={src}
            alt={`Ảnh ${position} voucher`}
            height={110}
            className="object-contain"
          />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 text-[11px] font-semibold text-white">
          {position}
        </span>
      </div>
      <span
        className="truncate text-xs text-slate-500 dark:text-slate-400"
        title={fileName ?? undefined}
      >
        {fileName || `Ảnh ${position}`}
      </span>
      {!disabled && (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            icon={<ArrowLeft size={14} />}
            aria-label={`Đưa ảnh ${position} lên trước`}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          />
          <Button
            size="small"
            icon={<ArrowRight size={14} />}
            aria-label={`Đưa ảnh ${position} ra sau`}
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
          />
          <Button
            size="small"
            danger
            icon={<Trash2 size={14} />}
            aria-label={`Xóa ảnh ${position}`}
            onClick={() => onRemove(index)}
          />
        </div>
      )}
    </li>
  );
};

/** Danh sách ảnh của lô theo thứ tự hiển thị; ảnh đầu tiên là ảnh đại diện trong bảng. */
const PaperVoucherImageInput = ({
  value = [],
  onChange,
  disabled = false
}: PaperVoucherImageInputProps) => {
  const { message } = useAntdApp();
  const remaining = PAPER_VOUCHER_MAX_IMAGES - value.length;

  const beforeUpload: UploadProps["beforeUpload"] = (file, fileList) => {
    // Upload gọi hàm này cho từng file của một lần chọn: xử lý cả lượt ở file đầu tiên để các
    // file không ghi đè nhau bằng `value` cũ.
    if (file !== fileList[0]) return Upload.LIST_IGNORE;

    const accepted = fileList.filter((candidate) => {
      const error = validatePaperVoucherImageFile(candidate);
      if (error) message.error(`${candidate.name}: ${error}`);
      return !error;
    });
    if (accepted.length > remaining) message.error(PAPER_VOUCHER_TOO_MANY_IMAGES_MESSAGE);

    const added = accepted.slice(0, Math.max(0, remaining));
    if (added.length) onChange?.([...value, ...added.map((nextFile) => ({ file: nextFile }))]);

    // Không upload và không giữ danh sách file nội bộ của Upload.
    return Upload.LIST_IGNORE;
  };

  const move = (index: number, offset: -1 | 1) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange?.(next);
  };

  const remove = (index: number) => onChange?.(value.filter((_, position) => position !== index));

  if (disabled && !value.length) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Chưa có ảnh</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Image.PreviewGroup>
        <ul
          className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 p-0"
          aria-label="Danh sách ảnh voucher"
        >
          {value.map((draft, index) => (
            <ImageTile
              key={getDraftKey(draft)}
              draft={draft}
              index={index}
              total={value.length}
              disabled={disabled}
              onMove={move}
              onRemove={remove}
            />
          ))}
          {!disabled && remaining > 0 && (
            <li className="flex h-28 min-w-0">
              <Upload
                accept={PAPER_VOUCHER_IMAGE_ACCEPT}
                beforeUpload={beforeUpload}
                showUploadList={false}
                multiple
                className="flex h-full w-full [&_.ant-upload]:h-full [&_.ant-upload]:w-full"
              >
                <button
                  type="button"
                  aria-label="Thêm ảnh voucher"
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-app-border bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                >
                  <ImagePlus size={20} />
                  <span className="text-sm">Thêm ảnh</span>
                </button>
              </Upload>
            </li>
          )}
        </ul>
      </Image.PreviewGroup>
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {value.length}/{PAPER_VOUCHER_MAX_IMAGES} ảnh · JPG, PNG, WebP · tối đa 5 MB mỗi ảnh · ảnh
        đầu tiên là ảnh đại diện
      </span>
    </div>
  );
};

export default PaperVoucherImageInput;
