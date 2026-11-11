// AddSchedulingDialog (V3.2): lý do giá theo cấu hình từng ngày, lỗi tra giá rõ ràng, chặn lưu khi giá đang tải,
// nguồn giá (LIST/MANUAL/UNIFORM), checkbox "Áp dụng ưu đãi U22" theo từng suất và xử lý 409 PRICING_STALE. Select/TimePicker của antd được thay bằng
// input gốc để điều khiển form ổn định trong jsdom; phần còn lại là component thật với API giả lập (MSW).
import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { usePermissionStore } from "@renderer/store/permission.store";
import { server } from "@renderer/test/msw/server";
import type { PlanPricingProps } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import dayjs from "dayjs";
import { delay, http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddSchedulingDialog from "./AddSchedulingDialog";

vi.mock("antd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd")>();
  const { default: dayjsLib } = await import("dayjs");
  type Option = { value: number | string; label: ReactNode };
  const Select = ({
    options,
    value,
    onChange,
    placeholder
  }: {
    options?: Option[];
    value?: number | string;
    onChange?: (value: number) => void;
    placeholder?: string;
  }) => (
    <select
      aria-label={placeholder}
      value={value ?? ""}
      onChange={(event) => onChange?.(Number(event.target.value))}
    >
      <option value="">—</option>
      {options?.map((option) => (
        <option key={option.value} value={option.value}>
          {String(option.label)}
        </option>
      ))}
    </select>
  );
  const TimePicker = ({
    value,
    onChange,
    disabled
  }: {
    value?: ReturnType<typeof dayjsLib>;
    onChange?: (value: ReturnType<typeof dayjsLib>) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label={disabled ? "Giờ kết thúc" : "Giờ chiếu"}
      disabled={disabled}
      value={value ? value.format("HH:mm") : ""}
      onChange={(event) => onChange?.(dayjsLib(`2000-01-01T${event.target.value}:00`))}
    />
  );
  return { ...actual, Select, TimePicker };
});

const API = "http://add-scheduling.test";
const DATE = "2026-11-24";

const RULES = {
  ruleVersion: "holiday-v3.2",
  schema: { holidayPriceMode: true, promotionExclusion: true, screeningPolicy: true },
  ready: true,
  enforcedPolicies: ["U22"]
};
const RULES_NO_POLICY_TABLE = {
  ...RULES,
  schema: { ...RULES.schema, screeningPolicy: false },
  ready: false
};

const NORMAL_PRICING: PlanPricingProps = {
  dayPartId: 7,
  pricings: { T: 80000, V: 85000 },
  dateValue: DATE,
  time: "19:00",
  baseDateTypeId: 1,
  isHoliday: false,
  holidayName: null,
  isPromotionExcluded: false,
  applyHolidayPrice: null,
  effectiveDateTypeId: 1,
  pricingReason: "BASE",
  dayPartName: "Ngày thường - Từ 17h đến 23:00",
  pricingVersion: "aaaaaaaaaaaaaaaa"
};

const HOLIDAY_PRICING: PlanPricingProps = {
  ...NORMAL_PRICING,
  dayPartId: 17,
  pricings: { T: 90000, V: 95000 },
  isHoliday: true,
  holidayName: "Ngày văn hóa",
  applyHolidayPrice: true,
  effectiveDateTypeId: 2,
  pricingReason: "HOLIDAY",
  dayPartName: "Ngày lễ - Từ 17h đến trước 23:00",
  pricingVersion: "bbbbbbbbbbbbbbbb"
};

/** 20/10/2026 (Thứ 3): ngày lễ chọn "Theo ngày trong tuần" → giá ngày thường, vẫn không áp U22. */
const WEEKDAY_PRICED_HOLIDAY: PlanPricingProps = {
  ...NORMAL_PRICING,
  dateValue: "2026-10-20",
  isHoliday: true,
  holidayName: "Phụ nữ Việt Nam",
  applyHolidayPrice: false,
  pricingVersion: "dddddddddddddddd"
};

type CreateBody = Record<string, unknown>;

const setup = async ({
  pricing = NORMAL_PRICING,
  versionCode = "2D",
  pricingDelayMs = 0,
  rules = RULES,
  pricingResponse,
  createResponse
}: {
  pricing?: PlanPricingProps;
  versionCode?: string;
  pricingDelayMs?: number;
  rules?: Record<string, unknown>;
  pricingResponse?: () => Response;
  createResponse?: () => Response;
} = {}) => {
  await initApi(API);
  const state = { creates: [] as CreateBody[], pricing };
  server.use(
    http.get(`${API}/api/pos/pricing/rules`, () => HttpResponse.json(rules)),
    http.get(`${API}/api/pos/plan-film`, () =>
      HttpResponse.json({
        data: [
          {
            filmId: 1,
            planCinemaId: 1,
            order: 1,
            createdOnUtc: "",
            createdUser: "",
            film: { filmName: "GATTO", versionCode, duration: 100 }
          }
        ],
        total: 1,
        current: 1,
        pageSize: 100,
        pageCount: 1
      })
    ),
    http.get(`${API}/api/pos/plan-screenings`, () =>
      HttpResponse.json({ data: [], total: 0, current: 1, pageSize: 500, pageCount: 1 })
    ),
    http.post(`${API}/api/pos/pricing/plan-pricing`, async () => {
      if (pricingDelayMs) await delay(pricingDelayMs);
      return pricingResponse ? pricingResponse() : HttpResponse.json(state.pricing);
    }),
    http.post(`${API}/api/pos/plan-screenings`, async ({ request }) => {
      state.creates.push((await request.json()) as CreateBody);
      return createResponse ? createResponse() : HttpResponse.json({ id: 999 });
    })
  );
  return state;
};

const renderDialog = () => {
  usePermissionStore.setState({
    assignments: [
      {
        permissionKey: "plan_cinema",
        actions: { access: true, list: true, view: true, update: true }
      }
    ]
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <AddSchedulingDialog
            planCinemaId={1}
            selectedRoomId={10}
            selectedDate={dayjs(DATE)}
            roomOptions={[{ value: 10, label: "Phòng 1" }]}
          />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

const openAndFill = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Thêm ca chiếu mới" }));
  const dialog = await screen.findByRole("dialog");
  const film = await within(dialog).findByRole("combobox", { name: "Chọn phim" });
  await within(film).findByRole("option", { name: "GATTO" });
  fireEvent.change(film, { target: { value: "1" } });
  fireEvent.change(within(dialog).getByLabelText("Giờ chiếu"), { target: { value: "19:00" } });
  return dialog;
};

const okButton = (dialog: HTMLElement) => within(dialog).getByRole("button", { name: /^OK$/ });
const u22Checkbox = (dialog: HTMLElement) =>
  within(dialog).getByRole("checkbox", { name: "Áp dụng ưu đãi U22" });
const uniformCheckbox = (dialog: HTMLElement) =>
  within(dialog).getByRole("checkbox", { name: "Đồng giá" });

const waitForListPrices = async (dialog: HTMLElement, reason: RegExp) => {
  await within(dialog).findByText(reason, undefined, { timeout: 5000 });
  await waitFor(() => expect(okButton(dialog)).toBeEnabled());
};

describe("AddSchedulingDialog (V3.2)", { timeout: 30000 }, () => {
  beforeEach(() => queryClient.clear());

  it("normal 2D day: reason line, U22 ON by default, payload LIST + pricingVersion + u22Enabled", async () => {
    const state = await setup();
    renderDialog();
    const dialog = await openAndFill();

    await waitForListPrices(dialog, /Ngày thường — giá theo phân loại ngày/);
    expect(u22Checkbox(dialog)).toBeChecked();
    expect(u22Checkbox(dialog)).toBeEnabled();
    fireEvent.click(okButton(dialog));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).toMatchObject({
      priceOfPosition2: "T:80000",
      priceOfPosition3: "V:85000",
      priceMode: "LIST",
      pricingVersion: "aaaaaaaaaaaaaaaa",
      u22Enabled: true,
      daypartId: 7
    });
  });

  it("the user turns U22 off then on again manually", async () => {
    const state = await setup();
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);

    fireEvent.click(u22Checkbox(dialog));
    expect(u22Checkbox(dialog)).not.toBeChecked();
    fireEvent.click(u22Checkbox(dialog));
    expect(u22Checkbox(dialog)).toBeChecked();
    fireEvent.click(okButton(dialog));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).toMatchObject({ u22Enabled: true, priceMode: "LIST" });
  });

  it("Đồng giá: U22 OFF and locked with its reason; leaving Đồng giá restores the default ON", async () => {
    await setup();
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);

    fireEvent.click(uniformCheckbox(dialog));
    expect(u22Checkbox(dialog)).not.toBeChecked();
    expect(u22Checkbox(dialog)).toBeDisabled();
    expect(within(dialog).getByTestId("u22-screening-reason")).toHaveTextContent(
      "Suất chiếu Đồng giá không áp dụng ưu đãi U22."
    );

    fireEvent.click(uniformCheckbox(dialog));
    expect(u22Checkbox(dialog)).toBeChecked();
    expect(u22Checkbox(dialog)).toBeEnabled();
  });

  it("leaving Đồng giá does not re-enable U22 the user had turned off; uniform payload is UNIFORM", async () => {
    const state = await setup();
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);

    fireEvent.click(u22Checkbox(dialog)); // người dùng tự tắt
    fireEvent.click(uniformCheckbox(dialog));
    fireEvent.click(uniformCheckbox(dialog));
    expect(u22Checkbox(dialog)).not.toBeChecked();

    fireEvent.click(uniformCheckbox(dialog));
    const uniformInput = within(dialog).getByPlaceholderText("Nhập giá vé");
    fireEvent.change(uniformInput, { target: { value: "50000" } });
    fireEvent.blur(uniformInput);
    fireEvent.click(okButton(dialog));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).toMatchObject({
      priceMode: "UNIFORM",
      u22Enabled: false,
      priceOfPosition2: "T:50000",
      priceOfPosition3: "V:50000"
    });
  });

  it("an edited position price is sent as MANUAL", async () => {
    const state = await setup();
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);

    const price2 = within(dialog).getByPlaceholderText("Nhập giá vé 2");
    fireEvent.change(price2, { target: { value: "75000" } });
    fireEvent.blur(price2);
    expect(
      await within(dialog).findByRole("button", { name: "Dùng lại giá bảng" })
    ).toBeInTheDocument();
    fireEvent.click(okButton(dialog));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).toMatchObject({
      priceMode: "MANUAL",
      priceOfPosition2: "T:75000",
      u22Enabled: true
    });
  });

  it("24/11 holiday: holiday price reason, U22 OFF and locked, payload u22Enabled false", async () => {
    const state = await setup({ pricing: HOLIDAY_PRICING });
    renderDialog();
    const dialog = await openAndFill();

    await waitForListPrices(dialog, /Ngày lễ: Ngày văn hóa — áp dụng giá ngày lễ/);
    expect(within(dialog).getByText(/Khung: Ngày lễ - Từ 17h đến trước 23:00/)).toBeInTheDocument();
    expect(u22Checkbox(dialog)).not.toBeChecked();
    expect(u22Checkbox(dialog)).toBeDisabled();
    expect(within(dialog).getByTestId("u22-screening-reason")).toHaveTextContent(
      "Ngày lễ (Ngày văn hóa): không áp dụng ưu đãi U22."
    );
    fireEvent.click(okButton(dialog));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).toMatchObject({
      priceOfPosition2: "T:90000",
      priceOfPosition3: "V:95000",
      priceMode: "LIST",
      pricingVersion: "bbbbbbbbbbbbbbbb",
      u22Enabled: false
    });
  });

  it("20/10 holiday priced by weekday: weekday price reason, U22 still OFF and locked", async () => {
    const state = await setup({ pricing: WEEKDAY_PRICED_HOLIDAY });
    renderDialog();
    const dialog = await openAndFill();

    await waitForListPrices(dialog, /Ngày lễ: Phụ nữ Việt Nam — theo giá ngày thường/);
    expect(within(dialog).queryByText(/áp dụng giá ngày lễ/)).not.toBeInTheDocument();
    expect(u22Checkbox(dialog)).not.toBeChecked();
    expect(u22Checkbox(dialog)).toBeDisabled();
    fireEvent.click(okButton(dialog));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).toMatchObject({
      priceOfPosition2: "T:80000",
      priceMode: "LIST",
      pricingVersion: "dddddddddddddddd",
      u22Enabled: false
    });
  });

  it("overlapping day parts (400 PRICING_DAY_PART_AMBIGUOUS): clear reason, no 0đ price, nothing saved", async () => {
    const state = await setup({
      pricingResponse: () =>
        HttpResponse.json(
          { statusCode: 400, code: "PRICING_DAY_PART_AMBIGUOUS", message: "ambiguous" },
          { status: 400 }
        )
    });
    renderDialog();
    const dialog = await openAndFill();

    // react-query thử lại 1 lần trước khi báo lỗi; trong lúc đó lý do là "Đang tải giá vé…".
    await waitFor(
      () =>
        expect(within(dialog).getByTestId("save-block-reason")).toHaveTextContent(
          /Có nhiều khung giờ cùng chứa giờ chiếu này/
        ),
      { timeout: 6000 }
    );
    expect(okButton(dialog)).toBeDisabled();
    expect(within(dialog).queryByText(/^0$/)).not.toBeInTheDocument();
    fireEvent.click(okButton(dialog));
    expect(state.creates).toHaveLength(0);
  });

  it("policy table missing (rules.ready = false): U22 locked with the compatibility error and never sent", async () => {
    const state = await setup({ rules: RULES_NO_POLICY_TABLE });
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);

    expect(u22Checkbox(dialog)).not.toBeChecked();
    expect(u22Checkbox(dialog)).toBeDisabled();
    expect(within(dialog).getByTestId("u22-screening-reason")).toHaveTextContent(
      "Cơ sở dữ liệu chưa được cập nhật cấu trúc V3.2"
    );
    fireEvent.click(okButton(dialog));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).not.toHaveProperty("u22Enabled");
  });

  it("503 U22_SCREENING_POLICY_SCHEMA_MISSING on save: error, no success, dialog stays open", async () => {
    const state = await setup({
      createResponse: () =>
        HttpResponse.json(
          { statusCode: 503, code: "U22_SCREENING_POLICY_SCHEMA_MISSING", message: "missing" },
          { status: 503 }
        )
    });
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);
    fireEvent.click(okButton(dialog));

    expect(
      await screen.findByText(
        /chưa lưu được thiết lập U22 theo suất\. Chưa lưu thay đổi\./,
        undefined,
        {
          timeout: 5000
        }
      )
    ).toBeInTheDocument();
    expect(state.creates).toHaveLength(1);
    expect(screen.queryByText("Thêm ca chiếu vào kế hoạch thành công")).not.toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it("says the U22 setting is saved only when the backend returns the screening policy", async () => {
    await setup({
      createResponse: () =>
        HttpResponse.json({
          id: 999,
          u22Policy: { source: "SCREENING_POLICY", u22Enabled: true, priceMode: "LIST" }
        })
    });
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);
    fireEvent.click(okButton(dialog));

    expect(
      await screen.findByText("Đã lưu thiết lập U22 của suất: Áp dụng ưu đãi U22.", undefined, {
        timeout: 5000
      })
    ).toBeInTheDocument();
  });

  it("no u22Policy in the response: warns instead of claiming the U22 setting was saved", async () => {
    await setup();
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);
    fireEvent.click(okButton(dialog));

    expect(
      await screen.findByText(/máy chủ chưa xác nhận thiết lập U22 của suất/, undefined, {
        timeout: 5000
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Đã lưu thiết lập U22/)).not.toBeInTheDocument();
  });

  it("promotion-excluded day and 3D film: U22 OFF and locked", async () => {
    await setup({ pricing: { ...NORMAL_PRICING, isPromotionExcluded: true } });
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Không áp U22/);

    expect(u22Checkbox(dialog)).toBeDisabled();
    expect(within(dialog).getByTestId("u22-screening-reason")).toHaveTextContent(
      "Ngày không áp ưu đãi theo chính sách NCC"
    );
  });

  it("3D film: U22 OFF and locked", async () => {
    await setup({ versionCode: "3D" });
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);

    expect(u22Checkbox(dialog)).not.toBeChecked();
    expect(u22Checkbox(dialog)).toBeDisabled();
    expect(within(dialog).getByTestId("u22-screening-reason")).toHaveTextContent(
      "Ưu đãi U22 chỉ áp dụng cho suất chiếu 2D."
    );
  });

  it("blocks saving while the price is loading", async () => {
    const state = await setup({ pricingDelayMs: 1500 });
    renderDialog();
    const dialog = await openAndFill();

    await waitFor(() => expect(okButton(dialog)).toBeDisabled());
    expect(within(dialog).getByTestId("save-block-reason")).toHaveTextContent("Đang tải giá vé…");
    fireEvent.click(okButton(dialog));
    expect(state.creates).toHaveLength(0);

    await waitFor(() => expect(okButton(dialog)).toBeEnabled(), { timeout: 5000 });
  });

  it("409 PRICING_STALE: shows old vs current prices, never re-saves by itself, reloads on confirm", async () => {
    const state = await setup({
      createResponse: () =>
        HttpResponse.json(
          {
            statusCode: 409,
            code: "PRICING_STALE",
            message: "Giá vé của ca chiếu đã thay đổi",
            details: {
              requested: {
                daypartId: 7,
                priceOfPosition1: "",
                priceOfPosition2: "T:80000",
                priceOfPosition3: "V:85000",
                priceOfPosition4: ""
              },
              current: HOLIDAY_PRICING
            }
          },
          { status: 409 }
        )
    });
    renderDialog();
    const dialog = await openAndFill();
    await waitForListPrices(dialog, /Ngày thường/);
    fireEvent.click(okButton(dialog));

    const staleTitle = await screen.findByText("Giá vé của ca chiếu đã thay đổi", undefined, {
      timeout: 5000
    });
    const stale = staleTitle.closest("[role='dialog']") as HTMLElement;
    expect(within(stale).getByText("Ca chiếu chưa được lưu.")).toBeInTheDocument();
    const table = within(stale).getByRole("table", { name: "So sánh giá vé" });
    expect(within(table).getByText("80,000")).toBeInTheDocument();
    expect(within(table).getByText("90,000")).toBeInTheDocument();
    expect(state.creates).toHaveLength(1);

    state.pricing = HOLIDAY_PRICING;
    fireEvent.click(within(stale).getByRole("button", { name: "Tải giá mới vào form" }));
    // Form nhận giá mới (lý do giá ngày lễ) nhưng không tự gửi lại: người dùng phải bấm OK để xác nhận.
    await within(dialog).findByText(/Ngày lễ: Ngày văn hóa — áp dụng giá ngày lễ/, undefined, {
      timeout: 5000
    });
    expect(state.creates).toHaveLength(1);
  });
});
