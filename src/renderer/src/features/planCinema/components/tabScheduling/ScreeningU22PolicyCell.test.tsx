// Ô "Ưu đãi U22" của danh sách Giờ chiếu (QA V3.2): thao tác bật/tắt chỉ có khi DB đủ cấu trúc V3.2 (`rules.ready`),
// không bao giờ có "Bật lại" khi điều kiện bắt buộc chặn U22, và lỗi từ máy chủ làm tải lại danh sách suất.
import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { server } from "@renderer/test/msw/server";
import type { PlanScreeningDetailProps } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import dayjs from "dayjs";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScreeningU22PolicyCell from "./ScreeningU22PolicyCell";

const API = "http://screening-u22.test";
const FUTURE = dayjs().add(3, "day");
const ORDINARY_DAY = { isHoliday: false, isPromotionExcluded: false };

const screening = (u22Policy: PlanScreeningDetailProps["u22Policy"]): PlanScreeningDetailProps =>
  ({
    id: 410099,
    planCinemaId: 1,
    projectDate: FUTURE.format("YYYY-MM-DD"),
    projectTime: FUTURE.hour(19).minute(0).second(0).format(),
    filmId: 1,
    roomId: 2104,
    filmInfo: { filmName: "GATTO" },
    u22Policy
  }) as unknown as PlanScreeningDetailProps;

const LIST_ON = {
  source: "SCREENING_POLICY" as const,
  u22Enabled: true,
  priceMode: "LIST" as const
};
const LIST_OFF = { ...LIST_ON, u22Enabled: false };

const renderCell = (props: Partial<Parameters<typeof ScreeningU22PolicyCell>[0]>) =>
  render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <ScreeningU22PolicyCell
            screening={screening(LIST_ON)}
            canUpdate
            canToggle
            day={ORDINARY_DAY}
            versionCode="2D"
            {...props}
          />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );

describe("ScreeningU22PolicyCell (cột Ưu đãi U22, Giờ chiếu)", { timeout: 30000 }, () => {
  beforeEach(async () => {
    queryClient.clear();
    await initApi(API);
  });

  it("valid 2D screening on a V3.2-ready database: Có thể áp dụng with the Tắt action", () => {
    renderCell({});

    expect(screen.getByText("Có thể áp dụng")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tắt" })).toBeInTheDocument();
  });

  it("database not ready (rules.ready = false): the status is shown but no toggle is offered", () => {
    renderCell({ canToggle: false, screening: screening(LIST_OFF) });

    expect(screen.getByText("Không áp dụng")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bật lại|Tắt/ })).not.toBeInTheDocument();
  });

  it.each([
    ["holiday", { isHoliday: true, isPromotionExcluded: false }, LIST_OFF, "2D", "Ngày lễ"],
    [
      "promotion-excluded day",
      { isHoliday: false, isPromotionExcluded: true },
      LIST_OFF,
      "2D",
      "Ngày không áp U22"
    ],
    ["Đồng giá", ORDINARY_DAY, { ...LIST_OFF, priceMode: "UNIFORM" as const }, "2D", "Đồng giá"],
    ["3D", ORDINARY_DAY, LIST_OFF, "3D", "Không hỗ trợ 3D"]
  ])(
    "mandatory block (%s): Không áp dụng with its reason and never a Bật lại action",
    (_label, day, policy, versionCode, reason) => {
      renderCell({ screening: screening(policy), day, versionCode });

      expect(screen.getByText("Không áp dụng")).toBeInTheDocument();
      expect(screen.getByText(reason)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Bật lại|Tắt/ })).not.toBeInTheDocument();
    }
  );

  it("a refused toggle (U22_SCREENING_POLICY_INVALID) shows the reason and reloads the screenings", async () => {
    let patches = 0;
    server.use(
      http.patch(`${API}/api/pos/plan-screenings/:id`, () => {
        patches += 1;
        return HttpResponse.json(
          {
            statusCode: 400,
            code: "U22_SCREENING_POLICY_INVALID",
            message: "Suất chiếu vào ngày lễ không áp dụng ưu đãi U22.",
            details: { reason: "HOLIDAY", reasons: ["HOLIDAY"] }
          },
          { status: 400 }
        );
      })
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderCell({ screening: screening(LIST_OFF) });

    fireEvent.click(screen.getByRole("button", { name: "Bật lại" }));
    const confirm = await screen.findByRole("dialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Cho phép U22" }));

    expect(
      await screen.findByText(
        "Ngày chiếu là ngày lễ: không áp dụng ưu đãi U22. Đã tải lại thông tin, vui lòng kiểm tra lựa chọn ưu đãi U22."
      )
    ).toBeInTheDocument();
    expect(patches).toBe(1);
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });
});
