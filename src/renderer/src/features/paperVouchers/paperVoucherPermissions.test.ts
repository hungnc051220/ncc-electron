import { describe, expect, it, vi } from "vitest";
import { resolvePaperVoucherPermissions } from "./paperVoucherPermissions";

describe("resolvePaperVoucherPermissions", () => {
  it("fails closed when the paper_vouchers key is missing", () => {
    const can = vi.fn((permissionKey: string) => permissionKey === "vouchers");

    expect(resolvePaperVoucherPermissions(can)).toEqual({
      access: false,
      list: false,
      view: false,
      create: false,
      update: false,
      delete: false
    });
    expect(can).toHaveBeenCalledWith("paper_vouchers", "access");
  });

  it("maps each action independently from the vouchers permission", () => {
    const can = vi.fn(
      (permissionKey: string, action: string) =>
        permissionKey === "paper_vouchers" && ["access", "list", "view"].includes(action)
    );

    expect(resolvePaperVoucherPermissions(can)).toEqual({
      access: true,
      list: true,
      view: true,
      create: false,
      update: false,
      delete: false
    });
  });
});
