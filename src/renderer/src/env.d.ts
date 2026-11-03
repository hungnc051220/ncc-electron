/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true` = cho phép bán vé có voucher giấy tại POS; bỏ trống/giá trị khác = chặn in vé. */
  readonly VITE_PAPER_VOUCHER_SALE_ENABLED?: string;
}
