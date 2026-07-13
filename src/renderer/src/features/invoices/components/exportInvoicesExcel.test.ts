import { InvoiceProps, InvoiceStatus } from "@shared/types";
import { describe, expect, it, vi } from "vitest";
import { buildInvoicesWorkbook, fetchAllInvoicesForExport } from "./exportInvoicesExcel";

const createInvoice = (overrides: Partial<InvoiceProps> = {}) =>
  ({
    id: 1,
    partyA: "Công ty TNHH NCC",
    address: "87 Láng Hạ, Hà Nội",
    taxCode: "0101234567",
    phoneNumber: "0901234567",
    email: "invoice@example.com",
    citizenId: "",
    representative: "Nguyễn Văn A",
    position: "Giám đốc",
    imageUrl: "",
    note: "Xuất hóa đơn",
    status: InvoiceStatus.COMPLETED,
    createdBy: 1,
    createdAt: "2026-07-10T08:30:00.000Z",
    updatedBy: "admin",
    updatedAt: "2026-07-10T09:00:00.000Z",
    invoiceType: "business",
    contractCode: "HD-01",
    order: {
      id: 99,
      orderTotal: 250000,
      barCode: "VE-00099"
    },
    ...overrides
  }) as InvoiceProps;

describe("exportInvoicesExcel", () => {
  it("loads every invoice page in batches of 100", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => createInvoice({ id: index + 1 }));
    const secondPage = [createInvoice({ id: 101 })];
    const fetchPage = vi.fn(async ({ current }: { current: number; pageSize: number }) => ({
      data: current === 1 ? firstPage : secondPage,
      total: 101,
      current,
      pageCount: 2,
      pageSize: 100
    }));

    const result = await fetchAllInvoicesForExport(fetchPage);

    expect(result).toHaveLength(101);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { current: 1, pageSize: 100 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, { current: 2, pageSize: 100 });
  });

  it("creates a formatted workbook with typed values and a total formula", () => {
    const workbook = buildInvoicesWorkbook([
      createInvoice(),
      createInvoice({
        id: 2,
        invoiceType: "personal",
        status: InvoiceStatus.NEW,
        order: { id: 100, orderTotal: 150000, barCode: "VE-00100" } as InvoiceProps["order"]
      })
    ]);
    const worksheet = workbook.getWorksheet("Danh sách hóa đơn điện tử");

    expect(worksheet).toBeDefined();
    expect(worksheet!.getCell("A1").value).toBe("DANH SÁCH HÓA ĐƠN ĐIỆN TỬ");
    expect(worksheet!.getCell("D3").value).toBe("Tổng số tiền");
    expect(worksheet!.getCell("B4").value).toBeInstanceOf(Date);
    expect(worksheet!.getCell("D4").value).toBe(250000);
    expect(worksheet!.getCell("H5").value).toBe("Cá nhân");
    expect(worksheet!.getCell("R5").value).toBe("Mới");
    expect(worksheet!.getCell("D6").value).toEqual({
      formula: "SUM(D4:D5)",
      result: 400000
    });
    expect(worksheet!.getColumn(4).numFmt).toBe('#,##0 "₫"');
    expect(worksheet!.getRow(3).font.bold).toBe(true);
    expect(worksheet!.getCell("A3").fill).toBeUndefined();
    expect(worksheet!.views).toEqual([{ state: "frozen", ySplit: 3 }]);
  });
});
