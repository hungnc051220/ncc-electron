import type { PaperVoucherBatch } from "@shared/types";
import { Image } from "antd";
import { ImageOff } from "lucide-react";

interface PaperVoucherThumbnailProps {
  batch: Pick<PaperVoucherBatch, "batchCode" | "images">;
}

/** Thumbnail là ảnh đầu tiên của lô; preview cho phép xem toàn bộ ảnh theo thứ tự đã lưu. */
const PaperVoucherThumbnail = ({ batch }: PaperVoucherThumbnailProps) => {
  const images = (batch.images ?? []).filter((image) => !!image.url);

  if (!images.length) {
    return (
      <span
        aria-label={`Lô ${batch.batchCode} chưa có ảnh`}
        className="inline-flex size-11 items-center justify-center rounded-md border border-dashed border-app-border text-slate-300 dark:text-slate-600"
      >
        <ImageOff size={16} />
      </span>
    );
  }

  return (
    <Image.PreviewGroup items={images.map((image) => image.url)}>
      <Image
        src={images[0].url}
        alt={`Ảnh voucher ${batch.batchCode}`}
        width={44}
        height={44}
        className="rounded-md border border-app-border object-cover"
      />
    </Image.PreviewGroup>
  );
};

export default PaperVoucherThumbnail;
