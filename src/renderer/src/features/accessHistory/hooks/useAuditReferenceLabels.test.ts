import { filmsApi } from "@renderer/api/films.api";
import { usersApi } from "@renderer/api/users.api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeAuditLogRecord } from "../accessHistory.parser";
import {
  buildAuditReferenceRequests,
  collectAuditReferenceCandidates,
  useAuditReferenceLabels
} from "./useAuditReferenceLabels";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("collectAuditReferenceCandidates", () => {
  it("deduplicates relation ids across old/new payloads and extracts dynamic seat codes", () => {
    const candidates = collectAuditReferenceCandidates(
      normalizeAuditLogRecord({
        id: 1,
        oldValues: JSON.stringify({
          filmId: 11246,
          roomId: 86,
          planCinemaId: 12107,
          daypartId: 7,
          priceOfPosition1: "T:80000",
          priceOfPosition2: "V:85000"
        }),
        newValues: JSON.stringify({
          filmId: "11246",
          roomId: 87,
          planCinemaId: 12107,
          daypartId: "7",
          priceOfPosition1: "T:90000",
          priceOfPosition2: "D:120000"
        })
      })
    );

    expect([...candidates.ids.film]).toEqual(["11246"]);
    expect([...candidates.ids.room]).toEqual(["86", "87"]);
    expect([...candidates.ids.planCinema]).toEqual(["12107"]);
    expect([...candidates.ids.dayPart]).toEqual(["7"]);
    expect([...candidates.seatCodes]).toEqual(["T", "V", "D"]);
    expect([...candidates.ids.seatType]).toEqual(["T", "V", "D"]);
  });

  it("uses record-local snapshot labels to suppress only that record lookup", () => {
    const candidates = collectAuditReferenceCandidates(
      normalizeAuditLogRecord({
        id: 2,
        oldValues: "{malformed-json",
        newValues: JSON.stringify({
          filmInfo: { id: 11246, filmName: "Mưa đỏ" },
          roomInfo: { id: 86, roomName: "Phòng 1" }
        })
      })
    );

    expect([...candidates.ids.film]).toEqual(["11246"]);
    expect([...candidates.ids.room]).toEqual(["86"]);
    expect([...candidates.lookupIds.film]).toEqual([]);
    expect([...candidates.lookupIds.room]).toEqual([]);
    expect(buildAuditReferenceRequests(candidates)).toEqual([]);
  });

  it("collects a whole page and deduplicates requests by relation id", () => {
    const records = [
      normalizeAuditLogRecord({
        id: 3,
        oldValues: null,
        newValues: JSON.stringify({
          filmId: 11246,
          roomId: 86,
          planCinemaId: 12107,
          daypartId: 7,
          priceOfPosition1: "t:80000",
          priceOfPosition2: "V:85000"
        })
      }),
      normalizeAuditLogRecord({
        id: 4,
        oldValues: JSON.stringify({
          filmId: "11246",
          roomId: "86",
          planCinemaId: "12107",
          daypartId: "7",
          priceOfPosition1: "T:90000"
        }),
        newValues: JSON.stringify({
          filmId: 11246,
          roomId: 86,
          planCinemaId: 12107,
          daypartId: 7,
          priceOfPosition2: "D:120000"
        })
      })
    ];

    const candidates = collectAuditReferenceCandidates(records);
    const requests = buildAuditReferenceRequests(candidates);

    expect([...candidates.ids.film]).toEqual(["11246"]);
    expect([...candidates.ids.room]).toEqual(["86"]);
    expect([...candidates.ids.planCinema]).toEqual(["12107"]);
    expect([...candidates.ids.dayPart]).toEqual(["7"]);
    expect([...candidates.seatCodes]).toEqual(["T", "V", "D"]);
    expect(requests.map((request) => request.requestId)).toEqual([
      "film:11246",
      "room:86",
      "planCinema:12107",
      "dayPart:7",
      "seatType:*"
    ]);
    expect(new Set(requests.map((request) => JSON.stringify(request.queryKey))).size).toBe(
      requests.length
    );
  });

  it("limits list lookups to relation kinds used by visible summaries", () => {
    const record = normalizeAuditLogRecord({
      id: 20,
      newValues: JSON.stringify({
        filmId: 11246,
        roomId: 86,
        planCinemaId: 12107,
        daypartId: 7
      })
    });

    const candidates = collectAuditReferenceCandidates([{ record, kinds: ["film"] }]);

    expect([...candidates.ids.film]).toEqual(["11246"]);
    expect([...candidates.ids.room]).toEqual([]);
    expect([...candidates.ids.planCinema]).toEqual([]);
    expect([...candidates.ids.dayPart]).toEqual([]);
    expect(buildAuditReferenceRequests(candidates).map((item) => item.requestId)).toEqual([
      "film:11246"
    ]);
  });

  it("does not aggregate conflicting snapshot labels into page-global references", () => {
    const candidates = collectAuditReferenceCandidates([
      normalizeAuditLogRecord({
        id: 5,
        newValues: JSON.stringify({ filmId: 11246, filmName: "Tên mới" })
      }),
      normalizeAuditLogRecord({
        id: 6,
        newValues: JSON.stringify({ filmId: 11246, filmName: "Tên cũ" })
      })
    ]);
    expect([...candidates.ids.film]).toEqual(["11246"]);
    expect([...candidates.lookupIds.film]).toEqual([]);
    expect(candidates).not.toHaveProperty("snapshotEntries");
    expect(buildAuditReferenceRequests(candidates)).toEqual([]);
  });

  it("queries current data when one occurrence of the same id lacks a local label", () => {
    const candidates = collectAuditReferenceCandidates([
      normalizeAuditLogRecord({
        id: 7,
        newValues: JSON.stringify({ filmId: 11246, filmName: "Mưa đỏ" })
      }),
      normalizeAuditLogRecord({
        id: 8,
        newValues: JSON.stringify({ filmId: 11246 })
      })
    ]);
    expect([...candidates.lookupIds.film]).toEqual(["11246"]);
    expect(buildAuditReferenceRequests(candidates).map((item) => item.requestId)).toEqual([
      "film:11246"
    ]);
  });

  it("skips zero, negative, unsafe, decimal, and non-numeric ids", () => {
    const candidates = collectAuditReferenceCandidates([
      normalizeAuditLogRecord({ id: 11, newValues: '{"roomId":0}' }),
      normalizeAuditLogRecord({ id: 12, newValues: '{"roomId":-1}' }),
      normalizeAuditLogRecord({ id: 13, newValues: '{"roomId":1.5}' }),
      normalizeAuditLogRecord({ id: 14, newValues: '{"roomId":"9007199254740992"}' }),
      normalizeAuditLogRecord({ id: 15, newValues: '{"roomId":"invalid"}' }),
      normalizeAuditLogRecord({ id: 16, newValues: '{"roomId":2}' })
    ]);

    expect(buildAuditReferenceRequests(candidates).map((item) => item.requestId)).toEqual([
      "room:2"
    ]);
  });

  it("resolves entity identities only for the drawer or explicitly opted-in list rows", () => {
    const record = normalizeAuditLogRecord({
      id: 17,
      model: "Film",
      entityId: "11269",
      oldValues: '{"premieredDay":"2026-07-16"}',
      newValues: '{"premieredDay":"2026-07-17"}'
    });

    const drawerCandidates = collectAuditReferenceCandidates(record);
    expect([...drawerCandidates.lookupEntities.values()]).toEqual([
      { key: "film:11269", model: "Film", id: "11269" }
    ]);
    expect(buildAuditReferenceRequests(drawerCandidates).map((item) => item.requestId)).toEqual([
      "entity:film:11269"
    ]);

    const listCandidates = collectAuditReferenceCandidates([{ record, kinds: [] }]);
    expect(listCandidates.lookupEntities.size).toBe(0);
    expect(buildAuditReferenceRequests(listCandidates)).toEqual([]);

    const identifiedListCandidates = collectAuditReferenceCandidates([
      { record, kinds: [], includeEntity: true },
      { record, kinds: [], includeEntity: true }
    ]);
    expect([...identifiedListCandidates.lookupEntities.values()]).toEqual([
      { key: "film:11269", model: "Film", id: "11269" }
    ]);
    expect(
      buildAuditReferenceRequests(identifiedListCandidates).map((item) => item.requestId)
    ).toEqual(["entity:film:11269"]);
  });

  it("prefers the historical entity name in the snapshot and skips the current-detail request", () => {
    const candidates = collectAuditReferenceCandidates(
      normalizeAuditLogRecord({
        id: 18,
        model: "Film",
        entityId: 11269,
        newValues: '{"filmName":"Tên phim tại thời điểm lịch sử"}'
      })
    );

    expect(candidates.entities.has("film:11269")).toBe(true);
    expect(candidates.lookupEntities.size).toBe(0);
    expect(buildAuditReferenceRequests(candidates)).toEqual([]);
  });

  it("loads the current Film name for a partial audit snapshot", async () => {
    const getFilmSpy = vi
      .spyOn(filmsApi, "getDetail")
      .mockResolvedValue({ filmName: "SHREK 5" } as Awaited<ReturnType<typeof filmsApi.getDetail>>);
    const record = normalizeAuditLogRecord({
      id: 19,
      model: "Film",
      entityId: 11269,
      oldValues: '{"premieredDay":"2026-07-16"}',
      newValues: '{"premieredDay":"2026-07-17"}'
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useAuditReferenceLabels(record), { wrapper });

    await waitFor(() => {
      expect(result.current.references.entity?.["film:11269"]).toEqual({
        label: "SHREK 5",
        source: "current"
      });
    });
    expect(getFilmSpy).toHaveBeenCalledTimes(1);
    expect(getFilmSpy).toHaveBeenCalledWith(11269);
  });

  it("resolves a Customer with customerFirstName as surname and customerLastName as given name", async () => {
    const getUserSpy = vi.spyOn(usersApi, "getDetail").mockResolvedValue({
      id: 15,
      username: "operator",
      customerFirstName: "Nguyễn Văn",
      customerLastName: "An"
    } as Awaited<ReturnType<typeof usersApi.getDetail>>);
    const record = normalizeAuditLogRecord({
      id: 21,
      model: "Customer",
      entityId: 15,
      oldValues: '{"active":false}',
      newValues: '{"active":true}'
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useAuditReferenceLabels(record), { wrapper });

    await waitFor(() => {
      expect(result.current.references.entity?.["customer:15"]).toEqual({
        label: "Nguyễn Văn An",
        source: "current"
      });
    });
    expect(getUserSpy).toHaveBeenCalledWith(15);
  });

  it("runs one query for a duplicated page id and reuses the React Query cache", async () => {
    const getFilmSpy = vi
      .spyOn(filmsApi, "getDetail")
      .mockResolvedValue({ filmName: "Mưa đỏ" } as Awaited<ReturnType<typeof filmsApi.getDetail>>);
    const records = [
      normalizeAuditLogRecord({ id: 9, newValues: '{"filmId":11246}' }),
      normalizeAuditLogRecord({ id: 10, newValues: '{"filmId":"11246"}' })
    ];
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const firstRender = renderHook(() => useAuditReferenceLabels(records), { wrapper });
    await waitFor(() => {
      expect(firstRender.result.current.references.film?.["11246"]).toEqual({
        label: "Mưa đỏ",
        source: "current"
      });
    });
    expect(getFilmSpy).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    const secondRender = renderHook(() => useAuditReferenceLabels(records), { wrapper });
    await waitFor(() => {
      expect(secondRender.result.current.references.film?.["11246"]).toEqual({
        label: "Mưa đỏ",
        source: "current"
      });
    });
    expect(getFilmSpy).toHaveBeenCalledTimes(1);
  });
});
