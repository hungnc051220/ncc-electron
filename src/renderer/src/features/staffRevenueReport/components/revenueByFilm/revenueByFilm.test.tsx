import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "@renderer/lib/utils";
import type {
  RevenuesByFilmProps,
  TotalRevenueOnlineProps,
  TotalRevenueProps
} from "@shared/types";
import RevenueByFilm, { buildRevenueByFilmRows, getActualRemittance, type Row } from ".";
import ExportRevenueExcelButton from "./ExportExcel";
import TabSummary from "./TabSummary";

const mocks = vi.hoisted(() => ({
  reportData: undefined as unknown,
  saveExcelFile: vi.fn(),
  messageOpen: vi.fn()
}));

vi.mock("@renderer/hooks/reports/useReportRevenueByFilm", () => ({
  useReportRevenueByFilm: () => ({ data: mocks.reportData, isFetching: false, refetch: vi.fn() })
}));

vi.mock("@renderer/lib/saveFile", () => ({ saveExcelFile: mocks.saveExcelFile }));

vi.mock("@renderer/hooks/useAntdApp", () => ({
  useAntdApp: () => ({ message: { open: mocks.messageOpen } })
}));

vi.mock("@renderer/permissions/usePermission", () => ({
  usePermission: () => ({ can: () => true })
}));

// Bộ lọc thật gọi API danh sách nhân viên/phim: thay bằng nút chọn nhân viên (cột "Thực nộp").
vi.mock("./Filter", () => ({
  default: ({ onSearch }: { onSearch: (values: Record<string, unknown>) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSearch({
          userId: 9,
          userName: "Thu ngân A",
          dateRange: ["2026-11-03T00:00:00+07:00", "2026-11-03T23:59:59+07:00"]
        })
      }
    >
      Lọc theo nhân viên
    </button>
  )
}));

const PRICE = 100000;

/** Suất chiếu có 2 đơn voucher giấy 80.000đ cho vé 100.000đ: một đơn trả thêm tiền mặt, một đơn VietQR. */
const cashAndQrVoucherScreen = {
  planScreenId: 11,
  projectDate: "2026-11-03",
  projectTime: "19:00",
  roomName: "P1",
  isOnline: false,
  totalInvitationQuantity: 0,
  totalContractQuantity: 0,
  totalQuantity: 2,
  totalSale: 200000,
  // Doanh thu giữ nguyên 100.000đ/vé; QR chỉ là 20.000đ khách thực trả (backend đã loại voucher).
  actualSale: 200000,
  saleVnPayQr: 0,
  saleVietQr: 20000,
  prices: [{ price: PRICE, totalQuantity: 2 }],
  crmDiscount: { discountOffline: 0, discountOnline: 0, discountPartner: 0, discountTotal: 0 },
  internalDiscount: { discountOffline: 0, discountOnline: 0, discountPartner: 0, discountTotal: 0 },
  paperVoucherQuantity: 2,
  paperVoucherExcess: 0,
  paperVoucherApplied: 160000
};

/** Backend cũ chưa trả các trường voucher giấy. */
const legacyScreen = {
  ...cashAndQrVoucherScreen,
  planScreenId: 12,
  projectTime: "21:00",
  totalQuantity: 1,
  totalSale: 100000,
  actualSale: 100000,
  saleVietQr: 30000,
  prices: [{ price: PRICE, totalQuantity: 1 }],
  paperVoucherQuantity: undefined,
  paperVoucherExcess: undefined,
  paperVoucherApplied: undefined
};

const film: RevenuesByFilmProps = {
  filmId: 1,
  filmName: "Phim A",
  filmOrderNo: 1,
  planScreens: [cashAndQrVoucherScreen, legacyScreen],
  actualSale: 300000,
  totalSale: 300000,
  totalContractQuantity: 0,
  totalInvitationQuantity: 0,
  totalQuantity: 3,
  saleVietQr: 50000,
  saleVnPayQr: 0,
  paperVoucherQuantity: 2,
  paperVoucherExcess: 0,
  paperVoucherApplied: 160000
};

const total = {
  isOnline: false,
  totalPlanCount: 2,
  totalInvitationQuantity: 0,
  totalContractQuantity: 0,
  totalQuantity: 3,
  totalSale: 300000,
  saleVnPayQr: 0,
  saleVietQr: 50000,
  actualSale: 300000,
  crmDiscount: { discountOffline: 0, discountOnline: 0, discountPartner: 0, discountTotal: 0 },
  internalDiscount: { discountOffline: 0, discountOnline: 0, discountPartner: 0, discountTotal: 0 },
  paperVoucherQuantity: 2,
  paperVoucherExcess: 5000,
  paperVoucherApplied: 160000
} as TotalRevenueProps & TotalRevenueOnlineProps;

const money = (amount: number) => formatMoney(amount).replace(/\s/g, "");
/** Nội dung các ô có chữ của một hàng (bỏ ô trống và ô đệm thanh cuộn của antd). */
const cellTexts = (row: HTMLElement) =>
  Array.from(row.querySelectorAll("th, td"))
    .map((cell) => cell.textContent?.replace(/\s/g, "") ?? "")
    .filter(Boolean);

describe("getActualRemittance", () => {
  it("removes the paper voucher part so Thực nộp is the physical cash", () => {
    // Đơn tiền mặt: vé 100.000đ, voucher 80.000đ, khách trả 20.000đ tiền mặt.
    expect(
      getActualRemittance({
        actualSale: 100000,
        saleVietQr: 0,
        saleVnPayQr: 0,
        paperVoucherApplied: 80000
      })
    ).toBe(20000);
    // Đơn VietQR: QR thu 20.000đ, không có tiền mặt.
    expect(
      getActualRemittance({
        actualSale: 100000,
        saleVietQr: 20000,
        saleVnPayQr: 0,
        paperVoucherApplied: 80000
      })
    ).toBe(0);
  });

  it("keeps the old formula when the backend does not send the voucher amount", () => {
    expect(getActualRemittance({ actualSale: 100000, saleVietQr: 30000, saleVnPayQr: 10000 })).toBe(
      60000
    );
  });
});

describe("buildRevenueByFilmRows", () => {
  it("maps the voucher fields of screens and films and treats missing values as 0", () => {
    const [filmRow] = buildRevenueByFilmRows([film]);

    expect(filmRow).toMatchObject({
      isSummary: true,
      actualSale: 300000,
      paperVoucherQuantity: 2,
      paperVoucherExcess: 0,
      paperVoucherApplied: 160000
    });
    expect(filmRow.children).toHaveLength(2);
    expect(filmRow.children?.[0]).toMatchObject({
      paperVoucherQuantity: 2,
      paperVoucherApplied: 160000
    });
    expect(filmRow.children?.[1]).toMatchObject({
      paperVoucherQuantity: 0,
      paperVoucherExcess: 0,
      paperVoucherApplied: 0
    });
  });
});

describe("RevenueByFilm", () => {
  beforeEach(() => {
    mocks.reportData = {
      revenuesByFilm: [film],
      totalRevenue: total,
      totalRevenueOnline: { ...total, isOnline: true, totalQuantity: 0, actualSale: 0 },
      totalRevenueOffline: total
    };
  });

  it.each([
    [1, "ngày chiếu"],
    [2, "ngày bán"]
  ])("adds exactly two voucher columns and keeps revenue (dateType %i, %s)", (dateType) => {
    render(<RevenueByFilm dateType={dateType} />);
    fireEvent.click(screen.getByText("Lọc theo nhân viên"));

    // Tab "Chi tiết" hiển thị trước tab "Tổng hợp" (cả hai đều render sẵn).
    const headers = cellTexts(screen.getAllByText("Thực nộp")[0].closest("tr") as HTMLElement);
    expect(headers.filter((header) => /voucher/i.test(header))).toEqual([
      "SốlượngVoucher",
      "TiềnthừaVoucher"
    ]);
    // Hai cột voucher cạnh nhau trong nhóm thanh toán, trước cột tổng kết "Thực nộp".
    expect(headers.slice(-5)).toEqual([
      "VNPayQR",
      "VietQR",
      "SốlượngVoucher",
      "TiềnthừaVoucher",
      "Thựcnộp"
    ]);

    const filmRow = cellTexts(screen.getByText("Phim A").closest("tr") as HTMLElement);
    // Tổng doanh thu giữ 300.000đ; Thực nộp = 300.000 − 50.000 QR − 160.000 voucher = 90.000đ.
    expect(filmRow).toContain(money(300000));
    expect(filmRow.slice(-6)).toEqual([
      money(0),
      money(0),
      money(50000),
      "2",
      money(0),
      money(90000)
    ]);

    // Tab "Tổng hợp": cùng thứ tự cột, dòng tổng từ backend dùng cùng công thức.
    const summaryHeaders = cellTexts(
      screen.getAllByText("Thực nộp")[1].closest("tr") as HTMLElement
    );
    expect(summaryHeaders.slice(-5)).toEqual([
      "VNPayQR",
      "VietQR",
      "SốlượngVoucher",
      "TiềnthừaVoucher",
      "Thựcnộp"
    ]);
    const totalRow = cellTexts(screen.getByText("Tổng cộng").closest("tr") as HTMLElement);
    expect(totalRow).toContain(money(300000));
    expect(totalRow.slice(-4)).toEqual([money(50000), "2", money(5000), money(90000)]);
  });

  it("keeps the two voucher columns after Tổng doanh thu sau KM when not filtered by staff", () => {
    render(<RevenueByFilm dateType={1} />);

    const headers = cellTexts(
      screen.getAllByText("Tổng doanh thu sau KM")[0].closest("tr") as HTMLElement
    );
    expect(headers.slice(-5)).toEqual([
      "Khuyếnmại",
      "Giảmgiá",
      "TổngdoanhthusauKM",
      "SốlượngVoucher",
      "TiềnthừaVoucher"
    ]);
    expect(headers.filter((header) => /voucher/i.test(header))).toHaveLength(2);
  });
});

// Báo cáo chi tiết vé theo phim dùng chung TabSummary nhưng không hiển thị hai cột voucher giấy.
describe("TabSummary without the voucher columns (regression)", () => {
  it("keeps VNPayQR, VietQR, Thực nộp last and the total row aligned with them", () => {
    const rows = buildRevenueByFilmRows([film]).flatMap((row) => row.children ?? []);
    render(
      <TabSummary
        summaryByDate={{ "2026-11-03": { off: rows, on: [] } }}
        isFetching={false}
        totalRevenue={total}
        totalRevenueOnline={{ ...total, isOnline: true, totalQuantity: 0, actualSale: 0 }}
        totalRevenueOffline={total}
        columnMode="user"
      />
    );

    const headers = cellTexts(screen.getAllByText("Thực nộp")[0].closest("tr") as HTMLElement);
    expect(headers.filter((header) => /voucher/i.test(header))).toEqual([]);
    expect(headers.slice(-3)).toEqual(["VNPayQR", "VietQR", "Thựcnộp"]);
    const totalRow = cellTexts(screen.getByText("Tổng cộng").closest("tr") as HTMLElement);
    expect(totalRow.slice(-3)).toEqual([money(0), money(50000), money(90000)]);
  });
});

const detailRow = (overrides: Partial<Row> = {}): Row => ({
  key: "row",
  filmName: "Phim A",
  projectDate: "2026-11-03",
  projectTime: "19:00",
  roomName: "P1",
  isOnline: false,
  pricesMap: { [PRICE]: 1 },
  totalInvitationQuantity: 0,
  totalContractQuantity: 0,
  totalQuantity: 1,
  totalSale: 100000,
  saleVnPayQr: 0,
  saleVietQr: 0,
  actualSale: 100000,
  discountOffline: 0,
  discountOnline: 0,
  discountPartner: 0,
  discountTotal: 0,
  internalDiscountTotal: 0,
  paperVoucherQuantity: 0,
  paperVoucherExcess: 0,
  paperVoucherApplied: 0,
  ...overrides
});

const exportWorkbook = async (props: { tableData: Row[]; columnMode: "default" | "user" }) => {
  mocks.saveExcelFile.mockResolvedValue({ canceled: false });
  const summaryByDate = {
    "2026-11-03": { off: props.tableData, on: [] }
  };

  render(
    <ExportRevenueExcelButton
      tableData={props.tableData}
      allPrices={[PRICE]}
      summaryByDate={summaryByDate}
      totalPlanCount={props.tableData.length}
      fromDate="2026-11-03"
      toDate="2026-11-03"
      dateType={2}
      columnMode={props.columnMode}
    />
  );
  fireEvent.click(screen.getByText("Xuất excel"));
  await waitFor(() => expect(mocks.saveExcelFile).toHaveBeenCalledTimes(1));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(mocks.saveExcelFile.mock.calls[0][0]);
  return workbook;
};

const rowValues = (sheet: ExcelJS.Worksheet, rowNumber: number) =>
  (sheet.getRow(rowNumber).values as unknown[]).slice(1);

const findRow = (sheet: ExcelJS.Worksheet, firstCell: string) => {
  let found = 0;
  sheet.eachRow((row, rowNumber) => {
    if (!found && row.getCell(1).value === firstCell) found = rowNumber;
  });
  return rowValues(sheet, found);
};

describe("ExportRevenueExcelButton", () => {
  beforeEach(() => {
    mocks.saveExcelFile.mockReset();
  });

  it("exports the two voucher columns and Thực nộp without the voucher part", async () => {
    const workbook = await exportWorkbook({
      columnMode: "user",
      tableData: [
        // Đơn tiền mặt: doanh thu 100.000đ, voucher 80.000đ, thực nộp 20.000đ.
        detailRow({ key: "cash", paperVoucherQuantity: 1, paperVoucherApplied: 80000 }),
        // Đơn VietQR: QR 20.000đ, voucher 80.000đ dư 5.000đ, thực nộp 0đ.
        detailRow({
          key: "qr",
          projectTime: "21:00",
          saleVietQr: 20000,
          paperVoucherQuantity: 1,
          paperVoucherExcess: 5000,
          paperVoucherApplied: 80000
        })
      ]
    });
    const detail = workbook.getWorksheet("Chi tiết")!;
    const summary = workbook.getWorksheet("Tổng hợp")!;

    const paymentHeaders = [
      "KM",
      "Giảm giá",
      "VNPayQR",
      "VietQR",
      "Số lượng Voucher",
      "Tiền thừa Voucher",
      "Thực nộp"
    ];
    const detailHeaders = rowValues(detail, findHeaderRow(detail));
    expect(detailHeaders.slice(-7)).toEqual(paymentHeaders);
    expect(detailHeaders.filter((header) => /voucher/i.test(String(header)))).toHaveLength(2);
    // Offline: doanh thu 200.000đ, QR 20.000đ, 2 voucher, dư 5.000đ, thực nộp 20.000đ.
    expect(findRow(detail, "Offline").slice(-8)).toEqual([200000, 0, 0, 0, 20000, 2, 5000, 20000]);
    expect(findRow(detail, "Phim A").slice(-3)).toEqual([2, 5000, 20000]);

    expect(rowValues(summary, 1).slice(-7)).toEqual(paymentHeaders);
    expect(findRow(summary, "Tổng cộng").slice(-4)).toEqual([20000, 2, 5000, 20000]);
  });

  it("appends the voucher columns after Tổng doanh thu sau KM when not filtered by staff", async () => {
    const workbook = await exportWorkbook({
      columnMode: "default",
      tableData: [detailRow({ paperVoucherQuantity: 1, paperVoucherApplied: 80000 })]
    });
    const detail = workbook.getWorksheet("Chi tiết")!;

    expect(rowValues(detail, findHeaderRow(detail)).slice(-5)).toEqual([
      "KM",
      "Giảm giá",
      "Tổng doanh thu sau KM",
      "Số lượng Voucher",
      "Tiền thừa Voucher"
    ]);
    // Doanh thu sau KM giữ 100.000đ.
    expect(findRow(detail, "Tổng cộng").slice(-3)).toEqual([100000, 1, 0]);
  });
});

/** Hàng tiêu đề nhóm của sheet chi tiết: dòng có ô "Phim" ở cột 1. */
function findHeaderRow(sheet: ExcelJS.Worksheet) {
  let found = 0;
  sheet.eachRow((row, rowNumber) => {
    if (!found && row.getCell(1).value === "Phim") found = rowNumber;
  });
  return found;
}
