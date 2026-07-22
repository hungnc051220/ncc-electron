import { describe, expect, it } from "vitest";
import {
  areAuditValuesSemanticallyEqual,
  computeAuditDiff,
  flattenAuditPayload,
  normalizeAuditLogRecord,
  normalizeComparableValue,
  parseChangedFields,
  safeParseAuditPayload
} from "./accessHistory.parser";
import {
  BUSINESS_TIMEZONE,
  formatAuditDate,
  formatAuditMoney,
  formatAuditTime,
  formatAuditTimestamp,
  formatAuditValueDetailed,
  formatTicketPrice,
  parseTicketPrice,
  redactAuditData
} from "./accessHistory.formatters";
import {
  MODEL_OPTIONS,
  getFieldDefinition,
  getModelDefinition,
  isSensitiveAuditField,
  isTechnicalAuditField
} from "./accessHistory.registry";
import { buildActivityViewModel } from "./accessHistory.presenter";

describe("access history parser", () => {
  it("parses JSON strings and accepts JSON-compatible runtime values", () => {
    expect(safeParseAuditPayload('{"name":"Lịch chiếu","active":true}')).toMatchObject({
      status: "parsed",
      value: { name: "Lịch chiếu", active: true }
    });
    expect(safeParseAuditPayload({ id: 1, values: ["A", 2] })).toMatchObject({
      status: "parsed",
      value: { id: 1, values: ["A", 2] }
    });
    expect(safeParseAuditPayload(null)).toEqual({ status: "empty" });
    expect(safeParseAuditPayload("   ")).toEqual({ status: "empty" });
  });

  it("marks malformed JSON as invalid without throwing", () => {
    expect(safeParseAuditPayload("{invalid-json")).toMatchObject({
      status: "invalid",
      raw: "{invalid-json"
    });
  });

  it("normalizes nullable wire fields and supports legacy singular values", () => {
    const record = normalizeAuditLogRecord({
      id: "8087",
      userId: 0,
      username: " admin ",
      oldValue: '{"name":"Cũ"}',
      newValue: '{"name":"Mới"}'
    });

    expect(record).toMatchObject({
      id: 8087,
      userId: 0,
      username: "admin",
      oldValues: '{"name":"Cũ"}',
      newValues: '{"name":"Mới"}'
    });
  });

  it("prefers plural wire fields when both plural and legacy names are present", () => {
    const record = normalizeAuditLogRecord({
      oldValues: null,
      oldValue: '{"name":"legacy"}',
      newValues: "",
      newValue: '{"name":"legacy"}'
    });
    expect(record.oldValues).toBeNull();
    expect(record.newValues).toBe("");
  });

  it.each([
    [
      ["projectDate", "roomId"],
      ["projectDate", "roomId"]
    ],
    ['["projectDate","roomId"]', ["projectDate", "roomId"]],
    ["projectDate, roomId", ["projectDate", "roomId"]],
    [{ projectDate: true, roomId: false }, ["projectDate", "roomId"]],
    ['"projectDate"', ["projectDate"]]
  ])("reads changedFields shape %#", (input, expected) => {
    expect(parseChangedFields(input)).toEqual(expected);
  });

  it("flattens objects but keeps arrays as one business value", () => {
    expect(flattenAuditPayload({ room: { id: 1, name: "Phòng 1" }, seats: ["A1", "A2"] })).toEqual({
      "room.id": 1,
      "room.name": "Phòng 1",
      seats: ["A1", "A2"]
    });
  });

  it("normalizes semantic values without coercing ordinary text codes", () => {
    const booleanDefinition = getFieldDefinition("PlanScreenings", "isOnlineSelling");
    const relationDefinition = getFieldDefinition("PlanScreenings", "roomId");

    expect(areAuditValuesSemanticallyEqual(booleanDefinition, "1", 1)).toBe(true);
    expect(areAuditValuesSemanticallyEqual(relationDefinition, "86", 86)).toBe(true);
    expect(areAuditValuesSemanticallyEqual(undefined, null, "")).toBe(true);
    expect(areAuditValuesSemanticallyEqual(undefined, "001", 1)).toBe(false);
    expect(
      normalizeComparableValue(undefined, {
        z: 1,
        nested: { b: 2, a: 1 }
      })
    ).toEqual({ nested: { a: 1, b: 2 }, z: 1 });
  });

  it("uses changedFields order, adds computed differences, and skips false changes", () => {
    const oldPayload = {
      projectDate: "2026-07-16",
      roomId: "86",
      isOnlineSelling: "1",
      note: null
    };
    const newPayload = {
      projectDate: "2026-07-17",
      roomId: 87,
      isOnlineSelling: 1,
      note: ""
    };

    const result = computeAuditDiff(oldPayload, newPayload, '["roomId"]', "PlanScreenings");
    expect(result.map((item) => item.path)).toEqual(["roomId", "projectDate"]);
    expect(result.every((item) => item.mapped)).toBe(true);
  });

  it("sorts computed differences by business priority after explicit changedFields", () => {
    const result = computeAuditDiff(
      { priceOfPosition2: "T:80000", isOnlineSelling: 0, projectDate: "2026-07-16" },
      { priceOfPosition2: "T:90000", isOnlineSelling: 1, projectDate: "2026-07-17" },
      null,
      "PlanScreenings"
    );

    expect(result.map((item) => item.path)).toEqual([
      "projectDate",
      "isOnlineSelling",
      "priceOfPosition2"
    ]);
  });

  it("canonicalizes aliases declared by a model field definition", () => {
    const result = computeAuditDiff(
      { isActive: 0, isHidden: false },
      { active: 1, hidden: true },
      '["isActive","isHidden"]',
      "Customer"
    );

    expect(result.map((item) => item.path)).toEqual(["active", "hidden"]);
    expect(result.every((item) => item.mapped)).toBe(true);
  });

  it("never exposes sensitive or technical fields in the diff", () => {
    const result = computeAuditDiff(
      { username: "old", password: "secret", createdUser: "admin", id: 1 },
      { username: "new", password: "other", createdUser: "system", id: 2 },
      null,
      "Customer"
    );
    expect(result.map((item) => item.path)).toEqual(["username"]);
  });
});

describe("access history registry", () => {
  it("contains all supported models with business labels", () => {
    expect(MODEL_OPTIONS.map((item) => item.value)).toEqual([
      "Order",
      "Film",
      "Category",
      "Manufacturer",
      "PlanCinema",
      "PlanCinemaFlying",
      "PlanScreenings",
      "DayPart",
      "Room",
      "Position",
      "CancelReason",
      "Customer",
      "User"
    ]);
    expect(getModelDefinition("PlanScreenings")?.label).toBe("Lịch chiếu phim");
    expect(getModelDefinition("PlanCinemaFlying")?.label).toBe("Kế hoạch chiếu phim");
    expect(getModelDefinition("Position")?.label).toBe("Hạng ghế");
    expect(getModelDefinition("User")?.label).toBe("Tài khoản người dùng");
  });

  it("supports production aliases and keeps unknown fields unmapped", () => {
    expect(getFieldDefinition("PlanCinema", "desciption")?.label).toBe("Mô tả");
    expect(getFieldDefinition("PlanCinemaFlying", "desciption")?.label).toBe("Mô tả");
    expect(getFieldDefinition("Manufacturer", "acountBank")?.label).toBe("Số tài khoản");
    expect(getFieldDefinition("Customer", "fullname")?.label).toBe("Họ và tên");
    expect(getFieldDefinition("Customer", "isActive")?.label).toBe("Trạng thái tài khoản");
    expect(getFieldDefinition("Customer", "isHidden")?.label).toBe("Trạng thái hiển thị");
    expect(getFieldDefinition("User", "customerFirstName")?.label).toBe("Họ");
    expect(getFieldDefinition("User", "customerLastName")?.label).toBe("Tên");
    expect(getFieldDefinition("Order", "customerFirstName")?.label).toBe("Họ khách hàng");
    expect(getFieldDefinition("Order", "customerLastName")?.label).toBe("Tên khách hàng");
    expect(getFieldDefinition("PlanScreenings", "brandNewBackendField")).toBeUndefined();
  });

  it("classifies technical and sensitive fields", () => {
    expect(isTechnicalAuditField("createdOnUtc")).toBe(true);
    expect(isTechnicalAuditField("filmInfo.pictureId")).toBe(true);
    expect(isSensitiveAuditField("passwordSalt")).toBe(true);
    expect(isSensitiveAuditField("payment.cardCvv2")).toBe(true);
    expect(isSensitiveAuditField("mobile")).toBe(false);
  });
});

describe("access history formatters", () => {
  it("uses the configured Vietnamese business timezone", () => {
    expect(BUSINESS_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
    expect(formatAuditDate("2026-07-16")).toBe("16/07/2026");
    expect(formatAuditTime("2026-07-16T20:00:00.000Z")).toBe("20:00");
    expect(formatAuditTime("2026-07-22T20:20:18.000Z")).toBe("20:20");
    expect(formatAuditTimestamp("2026-07-16T14:14:31+07:00")).toEqual({
      text: "14:14 16/07/2026",
      time: "14:14",
      date: "16/07/2026",
      valid: true
    });
    expect(formatAuditTimestamp("not-a-date").valid).toBe(false);
  });

  it("formats Vietnamese money, booleans, and relation fallbacks", () => {
    expect(formatAuditMoney("80000")).toBe("80.000đ");
    expect(
      formatAuditValueDetailed("1", getFieldDefinition("PlanScreenings", "isOnlineSelling")).text
    ).toBe("Đang bật");
    expect(
      formatAuditValueDetailed(11246, getFieldDefinition("PlanScreenings", "filmId")).text
    ).toBe("Phim #11246");
  });

  it("formats known business statuses without exposing technical codes", () => {
    expect(formatAuditValueDetailed(30, getFieldDefinition("Order", "orderStatusId")).text).toBe(
      "Hoàn thành"
    );
    expect(formatAuditValueDetailed(30, getFieldDefinition("Order", "paymentStatusId")).text).toBe(
      "Đã thanh toán"
    );
    expect(formatAuditValueDetailed(2, getFieldDefinition("DayPart", "dateTypeId")).text).toBe(
      "Ngày lễ"
    );
    expect(formatAuditValueDetailed(3, getFieldDefinition("PlanCinema", "status")).text).toBe(
      "Đã duyệt"
    );
    expect(formatAuditValueDetailed("SHOWING", getFieldDefinition("Film", "statusCode")).text).toBe(
      "Đang chiếu"
    );
    expect(formatAuditValueDetailed(999, getFieldDefinition("Order", "orderStatusId")).text).toBe(
      "Không xác định"
    );
  });

  it("formats resolved relations and reports whether the name is current", () => {
    expect(
      formatAuditValueDetailed(86, getFieldDefinition("PlanScreenings", "roomId"), {
        references: {
          room: { "86": { label: "Phòng 1", source: "current" } }
        }
      })
    ).toEqual({ text: "Phòng 1", referenceSource: "current" });
  });

  it("resolves numeric relation ids with leading zeroes from the canonical cache key", () => {
    expect(
      formatAuditValueDetailed("011246", getFieldDefinition("PlanScreenings", "filmId"), {
        references: {
          film: { "11246": { label: "SHREK 5", source: "current" } }
        }
      })
    ).toEqual({ text: "SHREK 5", referenceSource: "current" });
  });

  it("parses and formats dynamic seat-price codes", () => {
    expect(parseTicketPrice("T:80000")).toEqual({ seatCode: "T", amount: 80000 });
    expect(parseTicketPrice("90000")).toEqual({ seatCode: null, amount: 90000 });
    expect(formatTicketPrice("T:80000").text).toBe("Hạng ghế T — 80.000đ");
    expect(
      formatTicketPrice("V:85000", {
        seatType: { V: { label: "Ghế VIP", source: "current" } }
      })
    ).toEqual({ text: "Ghế VIP — 85.000đ", referenceSource: "current" });
  });

  it("redacts secrets recursively and truncates oversized strings", () => {
    expect(
      redactAuditData(
        {
          username: "admin",
          password: "secret",
          nested: { otp: "123456", note: "abcdefgh" }
        },
        { maxStringLength: 5 }
      )
    ).toEqual({
      username: "admin",
      password: "[Đã ẩn]",
      nested: { otp: "[Đã ẩn]", note: "abcde…" }
    });
  });
});

describe("activity view-model presenter", () => {
  const createRecord = {
    id: 8087,
    userId: 0,
    username: "admin",
    model: "PlanScreenings",
    entityId: "408929",
    action: "CREATE",
    oldValues: null,
    newValues: JSON.stringify({
      id: 408929,
      planCinemaId: 12107,
      projectDate: "2026-07-16",
      projectTime: "2026-07-16T20:00:00.000Z",
      filmId: 11246,
      roomId: 86,
      daypartId: 7,
      priceOfPosition1: "",
      priceOfPosition2: "T:80000",
      isOnlineSelling: 1,
      createdUser: "admin",
      deleted: false
    }),
    changedFields: null,
    timestamp: "2026-07-16T14:14:31+07:00"
  };

  it("uses customerFirstName as surname and customerLastName as given name for the actor", () => {
    const result = buildActivityViewModel({
      ...createRecord,
      username: "admin",
      user: {
        username: "admin",
        customerFirstName: "Nguyễn Văn",
        customerLastName: "An"
      }
    });

    expect(result.actorLabel).toBe("Nguyễn Văn An");
    expect(result.fullSentence).toContain("Nguyễn Văn An đã tạo mới lịch chiếu phim");
  });

  it("combines the complete Customer surname and given name for list and drawer data", () => {
    const result = buildActivityViewModel({
      id: 3101,
      userId: 0,
      model: "Customer",
      entityId: 39193156,
      action: "CREATE",
      newValues: JSON.stringify({
        username: "quyen1",
        customerFirstName: "Nguyễn Hải",
        customerLastName: "Quyên",
        active: true
      }),
      timestamp: "2026-05-17T13:11:00+07:00"
    });

    expect(result.entityLabel).toBe("Nguyễn Hải Quyên");
    expect(result.snapshotItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "fullName",
          label: "Họ và tên",
          valueText: "Nguyễn Hải Quyên"
        })
      ])
    );
    expect(result.snapshotItems.some((item) => item.path === "customerFirstName")).toBe(false);
    expect(result.snapshotItems.some((item) => item.path === "customerLastName")).toBe(false);
    expect(result.summaryItems.slice(0, 2)).toEqual([
      { type: "snapshot", path: "username", label: "Tên đăng nhập", value: "quyen1" },
      { type: "snapshot", path: "fullName", label: "Họ và tên", value: "Nguyễn Hải Quyên" }
    ]);
  });

  it("uses the resolved complete Customer name when an UPDATE snapshot contains one name part", () => {
    const result = buildActivityViewModel(
      {
        id: 3102,
        model: "Customer",
        entityId: 39193156,
        action: "UPDATE",
        oldValues: JSON.stringify({ customerFirstName: "Nguyễn Hải" }),
        newValues: JSON.stringify({ customerFirstName: "Nguyễn Hoài" }),
        timestamp: "2026-05-17T13:11:00+07:00"
      },
      {
        references: {
          entity: {
            "customer:39193156": { label: "Nguyễn Hoài Quyên", source: "current" }
          }
        }
      }
    );

    expect(result.entityLabel).toBe("Nguyễn Hoài Quyên");
    expect(result.entityLabelSource).toBe("current");
  });

  it("builds a compact, natural CREATE view model", () => {
    const result = buildActivityViewModel(createRecord);

    expect(result.title).toBe("Tạo lịch chiếu phim");
    expect(result.fullSentence).toBe("Admin đã tạo mới lịch chiếu phim lúc 14:14 ngày 16/07/2026.");
    expect(result.detailTitle).toBe("Thông tin đã tạo");
    expect(result.snapshotItems.map((item) => item.path)).toEqual([
      "filmId",
      "projectDate",
      "projectTime",
      "roomId",
      "daypartId",
      "isOnlineSelling",
      "priceOfPosition2",
      "planCinemaId"
    ]);
    expect(result.snapshotItems.find((item) => item.path === "projectTime")?.valueText).toBe(
      "20:00"
    );
    expect(result.snapshotItems.some((item) => item.path === "id")).toBe(false);
    expect(result.snapshotItems.some((item) => item.path === "createdUser")).toBe(false);
    expect(result.snapshotItems.some((item) => item.path === "priceOfPosition1")).toBe(false);
    expect(result.summaryItems).toEqual([
      { type: "snapshot", path: "filmId", label: "Phim", value: "Phim #11246" },
      { type: "snapshot", path: "projectDate", label: "Ngày chiếu", value: "16/07/2026" },
      { type: "snapshot", path: "projectTime", label: "Giờ chiếu", value: "20:00" }
    ]);
    expect(result.summaryItems).toHaveLength(3);
  });

  it("uses lazy current labels and marks that source for the drawer", () => {
    const result = buildActivityViewModel(createRecord, {
      references: {
        film: { "11246": { label: "Mưa đỏ", source: "current" } },
        room: { "86": { label: "Phòng 1", source: "current" } },
        dayPart: { "7": { label: "Buổi tối", source: "current" } },
        seatType: { T: { label: "Ghế thường", source: "current" } }
      }
    });

    expect(result.snapshotItems.find((item) => item.path === "filmId")?.valueText).toBe("Mưa đỏ");
    expect(result.hasResolvedCurrentReferences).toBe(true);
  });

  it("keeps a usable CREATE snapshot when the unrelated old payload is malformed", () => {
    const result = buildActivityViewModel({
      ...createRecord,
      oldValues: "{bad-old-payload"
    });

    expect(result.summaryItems[0]).toEqual({
      type: "snapshot",
      path: "filmId",
      label: "Phim",
      value: "Phim #11246"
    });
    expect(result.diagnostics.map((item) => item.code)).toContain("INVALID_OLD_VALUES");
  });

  it("builds only meaningful UPDATE changes with natural summaries", () => {
    const result = buildActivityViewModel(
      {
        id: 10,
        username: "admin",
        model: "PlanScreenings",
        entityId: 99,
        action: "UPDATE",
        oldValues: JSON.stringify({
          projectDate: "2026-07-16",
          roomId: "86",
          isOnlineSelling: 0,
          priceOfPosition2: "T:80000",
          note: null
        }),
        newValues: JSON.stringify({
          projectDate: "2026-07-17",
          roomId: 87,
          isOnlineSelling: true,
          priceOfPosition2: "T:90000",
          note: ""
        }),
        changedFields: null,
        timestamp: "2026-07-16T15:00:00+07:00"
      },
      {
        references: {
          room: {
            "86": { label: "Phòng 1", source: "current" },
            "87": { label: "Phòng 2", source: "current" }
          },
          seatType: { T: { label: "Ghế thường", source: "current" } }
        }
      }
    );

    expect(result.changes.map((change) => change.path)).toEqual([
      "projectDate",
      "roomId",
      "isOnlineSelling",
      "priceOfPosition2"
    ]);
    expect(result.changes.map((change) => change.summary)).toEqual([
      "Chuyển ngày chiếu từ 16/07/2026 sang 17/07/2026.",
      "Thay đổi phòng chiếu từ Phòng 1 sang Phòng 2.",
      "Bật bán vé online.",
      "Thay đổi giá vé ghế thường từ 80.000đ thành 90.000đ."
    ]);
    expect(result.snapshotItems).toEqual([]);
    expect(result.summaryItems).toEqual([
      {
        type: "update",
        path: "projectDate",
        label: "Ngày chiếu",
        before: "16/07/2026",
        after: "17/07/2026"
      },
      {
        type: "update",
        path: "roomId",
        label: "Phòng chiếu",
        before: "Phòng 1",
        after: "Phòng 2"
      },
      {
        type: "update",
        path: "isOnlineSelling",
        label: "Bán vé online",
        before: "Đang tắt",
        after: "Đang bật"
      }
    ]);
    expect(result.summaryItems).toHaveLength(3);
    expect(result.summaryTotal).toBe(4);
  });

  it("structures boolean and money updates without requiring the table to parse text", () => {
    const result = buildActivityViewModel(
      {
        id: 17,
        action: "UPDATE",
        model: "PlanScreenings",
        oldValues: '{"isOnlineSelling":0,"priceOfPosition2":"T:80000"}',
        newValues: '{"isOnlineSelling":1,"priceOfPosition2":"T:90000"}',
        timestamp: "2026-07-16T16:00:00+07:00"
      },
      {
        references: {
          seatType: { T: { label: "Ghế thường", source: "current" } }
        }
      }
    );

    expect(result.summaryItems).toEqual([
      {
        type: "update",
        path: "isOnlineSelling",
        label: "Bán vé online",
        before: "Đang tắt",
        after: "Đang bật"
      },
      {
        type: "update",
        path: "priceOfPosition2",
        label: "Giá vé ghế thường",
        before: "80.000đ",
        after: "90.000đ"
      }
    ]);
  });

  it("keeps old and new relation names from their respective snapshots", () => {
    const result = buildActivityViewModel({
      id: 11,
      username: "admin",
      model: "PlanScreenings",
      action: "UPDATE",
      oldValues: '{"roomId":86,"roomName":"Phòng 1"}',
      newValues: '{"roomId":87,"roomName":"Phòng 2"}',
      timestamp: "2026-07-16T15:00:00+07:00"
    });

    expect(result.changes.find((change) => change.path === "roomId")?.summary).toBe(
      "Thay đổi phòng chiếu từ Phòng 1 sang Phòng 2."
    );
  });

  it("uses newValues as a legacy DELETE snapshot fallback", () => {
    const result = buildActivityViewModel({
      id: 12,
      username: "admin",
      model: "Room",
      entityId: 86,
      action: "DELETE",
      oldValues: null,
      newValues: '{"id":86,"name":"Phòng 1","deleted":true}',
      timestamp: "2026-07-16T16:00:00+07:00"
    });

    expect(result.detailTitle).toBe("Thông tin đã xóa");
    expect(result.entityLabel).toBe("Phòng 1");
    expect(result.entityLabelSource).toBe("snapshot");
    expect(result.snapshotItems.map((item) => item.valueText)).toContain("Phòng 1");
    expect(result.summaryItems[0]).toEqual({
      type: "snapshot",
      path: "name",
      label: "Tên phòng",
      value: "Phòng 1"
    });
  });

  it("identifies a partially updated Film by model and entityId reference", () => {
    const input = {
      id: 17,
      username: "admin",
      model: "Film",
      entityId: 11269,
      action: "UPDATE",
      oldValues: '{"premieredDay":"2026-07-16"}',
      newValues: '{"premieredDay":"2026-07-17"}',
      timestamp: "2026-07-16T16:00:00+07:00"
    };

    const fallback = buildActivityViewModel(input);
    const resolved = buildActivityViewModel(input, {
      references: {
        entity: {
          "film:11269": { label: "SHREK 5", source: "current" }
        }
      }
    });

    expect(fallback.entityLabel).toBe("Phim #11269");
    expect(resolved.entityLabel).toBe("SHREK 5");
    expect(resolved.entityLabelSource).toBe("current");
    expect(resolved.hasResolvedCurrentReferences).toBe(true);
  });

  it("contains malformed and unsupported records instead of throwing", () => {
    const result = buildActivityViewModel({
      id: 13,
      action: "RESTORE",
      model: "FutureModel",
      oldValues: "{bad",
      newValues: null,
      timestamp: "invalid"
    });

    expect(result.action).toBe("OTHER");
    expect(result.actionLabel).toBe("Hoạt động khác");
    expect(result.modelLabel).toBe("Dữ liệu hệ thống");
    expect(result.summaryItems).toEqual([
      { type: "fallback", message: "Không đọc được chi tiết thay đổi." }
    ]);
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "INVALID_OLD_VALUES",
        "UNKNOWN_MODEL",
        "UNKNOWN_ACTION",
        "INVALID_TIMESTAMP"
      ])
    );
  });

  it("hides new unmapped fields and exposes only a support diagnostic", () => {
    const result = buildActivityViewModel({
      id: 14,
      username: "admin",
      action: "CREATE",
      model: "PlanScreenings",
      newValues: '{"brandNewBackendField":"secret-looking-business-value"}',
      timestamp: "2026-07-16T16:00:00+07:00"
    });

    expect(result.snapshotItems).toEqual([]);
    expect(result.summaryItems).toEqual([
      { type: "fallback", message: "Có 1 thông tin chưa được hỗ trợ." }
    ]);
    expect(result.diagnostics.find((item) => item.code === "UNKNOWN_FIELDS")?.paths).toEqual([
      "brandNewBackendField"
    ]);
  });

  it("redacts sensitive values from technical data", () => {
    const result = buildActivityViewModel({
      id: 15,
      action: "UPDATE",
      model: "Customer",
      oldValues: '{"username":"admin","password":"old-secret","otp":"123456"}',
      newValues: '{"username":"operator","password":"new-secret","otp":"654321"}',
      timestamp: "2026-07-16T16:00:00+07:00"
    });
    expect(result.technicalData).toMatchObject({
      oldValues: { password: "[Đã ẩn]", otp: "[Đã ẩn]" },
      newValues: { password: "[Đã ẩn]", otp: "[Đã ẩn]" }
    });
  });

  it("never exposes values embedded in changedFields JSON strings", () => {
    const result = buildActivityViewModel({
      id: 16,
      action: "UPDATE",
      model: "Customer",
      changedFields: '{"password":"changed-field-secret","username":"admin"}',
      oldValues: '{"username":"old"}',
      newValues: '{"username":"new"}',
      timestamp: "2026-07-16T16:00:00+07:00"
    });

    expect(result.technicalData).toMatchObject({
      changedFields: ["[Đã ẩn]", "username"]
    });
    expect(JSON.stringify(result.technicalData)).not.toContain("changed-field-secret");
  });
});
