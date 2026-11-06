import { cn } from "@renderer/lib/utils";
import type { PaperVoucherImage } from "@shared/types";
import { Image } from "antd";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useState } from "react";

interface PaperVoucherImageGalleryProps {
  images: PaperVoucherImage[];
  batchCode: string;
}

const NAV_BUTTON_CLASS =
  "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-app-border bg-white/90 text-slate-700 shadow-sm transition hover:bg-white dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900";

/**
 * Ảnh chính lớn + dải thumbnail bên dưới. Bấm ảnh chính mở lightbox của cả lô tại đúng ảnh đang xem;
 * lô chỉ có 1 ảnh thì ảnh chiếm trọn khung, không có dải thumbnail.
 */
const PaperVoucherImageGallery = ({ images, batchCode }: PaperVoucherImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Danh sách ảnh có thể ngắn lại sau khi tải lại lô: không để chỉ số trỏ ra ngoài.
  const activeIndex = Math.min(selectedIndex, images.length - 1);
  const active = images[activeIndex];
  const hasMany = images.length > 1;

  const select = (index: number) => setSelectedIndex((index + images.length) % images.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Image.PreviewGroup
        items={images.map((image, index) => ({
          src: image.url,
          alt: `Ảnh ${index + 1} voucher ${batchCode}`
        }))}
        preview={{ onChange: (current) => setSelectedIndex(current) }}
      >
        <div className="group relative min-h-64 flex-1 overflow-hidden rounded-lg border border-app-border bg-slate-50 dark:bg-white/5">
          <div className="absolute inset-0 flex items-center justify-center p-2 [&_.ant-image]:flex [&_.ant-image]:items-center [&_.ant-image]:justify-center">
            <Image
              src={active.url}
              alt={`Ảnh ${activeIndex + 1} voucher ${batchCode}`}
              width="100%"
              height="100%"
              className="object-contain"
            />
          </div>
          <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-md bg-slate-900/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100">
            <Maximize2 className="size-3" aria-hidden />
            Phóng to
          </span>
          {hasMany && (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                className={cn(NAV_BUTTON_CLASS, "left-2")}
                onClick={() => select(activeIndex - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Ảnh sau"
                className={cn(NAV_BUTTON_CLASS, "right-2")}
                onClick={() => select(activeIndex + 1)}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/60 px-2 py-0.5 text-xs text-white tabular-nums">
                {activeIndex + 1}/{images.length}
              </span>
            </>
          )}
        </div>
      </Image.PreviewGroup>

      <div
        className="truncate text-xs text-slate-500 dark:text-slate-400"
        title={active.fileName ?? undefined}
      >
        {`Ảnh ${activeIndex + 1}`}
        {active.fileName ? ` · ${active.fileName}` : ""}
      </div>

      {hasMany && (
        <ul
          aria-label="Danh sách ảnh voucher"
          className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1"
        >
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`} className="shrink-0">
              <button
                type="button"
                aria-label={`Xem ảnh ${index + 1}`}
                aria-pressed={index === activeIndex}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-slate-50 p-0.5 transition dark:bg-white/5",
                  index === activeIndex
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-app-border opacity-70 hover:opacity-100"
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PaperVoucherImageGallery;
