import { useEffect, useState } from "react";

export type SeatIconImageStatus = "idle" | "loading" | "loaded" | "error";

/**
 * URL đã tải thành công trong phiên. Ảnh Cloudinary có phiên bản trong URL (`/v123/`), đổi ảnh ⇒ URL mới,
 * nên giữ lại là an toàn; trình duyệt tự cache nội dung ảnh. Không lưu lỗi: lỗi mạng tạm thời được thử lại
 * ở lần mở sơ đồ sau.
 */
const loadedImageUrls = new Set<string>();

/** Chỉ dùng trong test để mỗi test bắt đầu với cache rỗng. */
export const resetSeatIconImageCache = () => loadedImageUrls.clear();

/**
 * Nạp trước ảnh icon một lần cho cả sơ đồ. Sơ đồ chỉ bật icon khi ảnh đã tải xong (không nhấp nháy
 * ô ghế trống), ảnh lỗi ⇒ giữ giao diện mặc định (màu + mã ghế) cho toàn bộ sơ đồ.
 */
export const useSeatIconImage = (url?: string | null): SeatIconImageStatus => {
  const [result, setResult] = useState<{ url: string; status: "loaded" | "error" } | null>(null);

  useEffect(() => {
    if (!url || loadedImageUrls.has(url)) return undefined;

    let isActive = true;
    const image = new Image();
    image.onload = () => {
      loadedImageUrls.add(url);
      if (isActive) setResult({ url, status: "loaded" });
    };
    image.onerror = () => {
      if (isActive) setResult({ url, status: "error" });
    };
    image.src = url;

    return () => {
      isActive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  if (!url) return "idle";
  if (loadedImageUrls.has(url)) return "loaded";
  return result?.url === url ? result.status : "loading";
};
