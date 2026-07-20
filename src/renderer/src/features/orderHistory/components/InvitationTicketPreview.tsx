import { Image } from "antd";
import { ImageOff, X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface InvitationTicketPreviewProps {
  active?: boolean;
  imageUrl?: string | null;
  ticketCode?: string | null;
}

const InvitationTicketPreview = ({
  active = true,
  imageUrl,
  ticketCode
}: InvitationTicketPreviewProps) => {
  const normalizedImageUrl = imageUrl?.trim() || "";
  const normalizedTicketCode = ticketCode?.trim() || "";
  const [hasImageError, setHasImageError] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasPreviewOpenRef = useRef(false);

  useEffect(() => {
    setHasImageError(false);
    setIsPreviewOpen(false);
  }, [normalizedImageUrl]);

  useEffect(() => {
    if (!active) {
      setIsPreviewOpen(false);
    }
  }, [active]);

  useEffect(() => {
    if (isPreviewOpen) {
      wasPreviewOpenRef.current = true;
      closeButtonRef.current?.focus();
      return;
    }

    if (wasPreviewOpenRef.current) {
      wasPreviewOpenRef.current = false;

      if (active) {
        previewTriggerRef.current?.focus();
      }
    }
  }, [active, isPreviewOpen]);

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setIsPreviewOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isPreviewOpen]);

  const handleImageError = () => {
    setIsPreviewOpen(false);
    setHasImageError(true);
  };

  const emptyMessage = hasImageError
    ? "Không thể tải ảnh giấy mời. Vui lòng làm mới và thử lại."
    : "Chưa có ảnh giấy mời để xem trước.";
  const imageAlt = normalizedTicketCode ? `Giấy mời mã ${normalizedTicketCode}` : "Ảnh giấy mời";

  return (
    <>
      <section
        aria-labelledby="invitation-ticket-preview-title"
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-bg-container dark:shadow-none"
      >
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3
              id="invitation-ticket-preview-title"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Xem trước giấy mời
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Ảnh vé đã xuất; nhấn vào ảnh để phóng to và kiểm tra nội dung.
            </p>
          </div>
          {normalizedImageUrl && !hasImageError && normalizedTicketCode && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {normalizedTicketCode}
            </span>
          )}
        </div>

        {normalizedImageUrl && !hasImageError ? (
          <div className="flex justify-center rounded-lg border border-slate-200 bg-slate-50/70 p-2 sm:p-3 dark:border-app-border dark:bg-slate-950/20">
            <button
              ref={previewTriggerRef}
              type="button"
              aria-label={`Mở xem trước ${imageAlt.toLowerCase()}`}
              className="group relative block w-full max-w-5xl cursor-zoom-in overflow-hidden rounded-md border-0 bg-transparent p-0"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Image
                src={normalizedImageUrl}
                alt={imageAlt}
                preview={false}
                classNames={{
                  root: "block! w-full!",
                  image: "block! h-auto! max-h-[60vh] w-full! object-contain"
                }}
                onError={handleImageError}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100 group-focus-visible:bg-black/25 group-focus-visible:opacity-100">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium">
                  <ZoomIn className="size-4" aria-hidden />
                  Phóng to
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div
            role="status"
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400"
          >
            <ImageOff className="size-4 shrink-0" aria-hidden />
            <span>{emptyMessage}</span>
          </div>
        )}
      </section>

      {active &&
        isPreviewOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invitation-ticket-lightbox-title"
            data-testid="invitation-ticket-preview-overlay"
            className="fixed inset-0 z-2200 flex items-center justify-center bg-black/90 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsPreviewOpen(false);
              }
            }}
          >
            <h2 id="invitation-ticket-lightbox-title" className="sr-only">
              Xem trước ảnh giấy mời
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Đóng ảnh xem trước"
              className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              onClick={() => setIsPreviewOpen(false)}
            >
              <X className="size-5" aria-hidden />
            </button>
            <figure className="flex max-h-full max-w-full flex-col items-center gap-2">
              <img
                src={normalizedImageUrl}
                alt={`Bản xem trước ${imageAlt.toLowerCase()}`}
                className="max-h-[calc(100vh-88px)] max-w-[calc(100vw-32px)] rounded-md object-contain shadow-2xl"
                onError={handleImageError}
              />
              {normalizedTicketCode && (
                <figcaption className="rounded-full bg-black/60 px-3 py-1 font-mono text-xs text-white/90">
                  {normalizedTicketCode}
                </figcaption>
              )}
            </figure>
          </div>,
          document.body
        )}
    </>
  );
};

export default InvitationTicketPreview;
