/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `http` = Voucher giấy gọi API thật; bỏ trống/giá trị khác = dữ liệu mẫu (mock). */
  readonly VITE_PAPER_VOUCHER_DATA_SOURCE?: string;
}
