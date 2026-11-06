import type { PermissionAction } from "@shared/types";

export const PAPER_VOUCHER_PERMISSION_KEY = "paper_vouchers";

const PAPER_VOUCHER_ACTIONS = ["access", "list", "view", "create", "update", "delete"] as const;

export type PaperVoucherPermissions = Record<(typeof PAPER_VOUCHER_ACTIONS)[number], boolean>;

/** Quyền Voucher giấy lấy từ assignment thật; fail-closed khi thiếu key `paper_vouchers`. */
export const resolvePaperVoucherPermissions = (
  can: (permissionKey: string, action: PermissionAction) => boolean
): PaperVoucherPermissions =>
  PAPER_VOUCHER_ACTIONS.reduce((acc, action) => {
    acc[action] = can(PAPER_VOUCHER_PERMISSION_KEY, action);
    return acc;
  }, {} as PaperVoucherPermissions);
