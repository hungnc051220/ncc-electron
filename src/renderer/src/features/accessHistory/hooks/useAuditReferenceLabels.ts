import { filmsApi } from "@renderer/api/films.api";
import { ordersApi } from "@renderer/api/orders.api";
import { planCinemasApi } from "@renderer/api/planCinemas.api";
import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import { seatTypesApi } from "@renderer/api/seatTypes.api";
import { showTimeSlotsApi } from "@renderer/api/showTimeSlots.api";
import { usersApi } from "@renderer/api/users.api";
import { filmsKey } from "@renderer/hooks/films/keys";
import { ordersKeys } from "@renderer/hooks/orders/keys";
import { planCinemasKeys } from "@renderer/hooks/planCinemas/keys";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { screeningRoomsKeys } from "@renderer/hooks/screeningRooms/keys";
import { seatTypesKeys } from "@renderer/hooks/seatTypes/keys";
import { showTimeSlotsKeys } from "@renderer/hooks/showTimeSlots/keys";
import { usersKeys } from "@renderer/hooks/users/keys";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { getAuditEntityReferenceKey } from "../accessHistory.entity";
import { formatAuditDate, formatAuditTime } from "../accessHistory.formatters";
import { flattenAuditPayload, safeParseAuditPayload } from "../accessHistory.parser";
import { getCanonicalFieldPath, getModelDefinition } from "../accessHistory.registry";
import type {
  AuditJsonObject,
  AuditJsonValue,
  AuditReferenceLabel,
  AuditReferenceLabels,
  NormalizedAuditLogRecord
} from "../accessHistory.types";

export type AuditReferenceKind = Exclude<keyof AuditReferenceLabels, "entity">;

export interface AuditReferenceRecordScope {
  record: NormalizedAuditLogRecord;
  kinds: readonly AuditReferenceKind[];
  /** Chỉ bật cho record cần hiện danh tính đối tượng; các entity được deduplicate theo model + id. */
  includeEntity?: boolean;
}

export type AuditReferenceRecordInput =
  | NormalizedAuditLogRecord
  | readonly NormalizedAuditLogRecord[]
  | readonly AuditReferenceRecordScope[]
  | null;

export interface AuditReferenceEntry {
  kind: AuditReferenceKind | "entity";
  id: string;
  label: string;
  source: "current";
}

export interface AuditReferenceRequest {
  requestId: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  extract: (data: unknown) => AuditReferenceEntry[];
}

export interface AuditReferenceCandidates {
  /** Tất cả ID hợp lệ về mặt shape đã xuất hiện trong page/record. */
  ids: Record<AuditReferenceKind, Set<string>>;
  /** ID cần gọi API vì ít nhất một record chứa ID đó nhưng không có tên trong snapshot riêng. */
  lookupIds: Record<AuditReferenceKind, Set<string>>;
  /** Chính đối tượng bị audit; chỉ thu thập khi caller yêu cầu hoặc khi Drawer truyền record trực tiếp. */
  entities: Map<string, AuditEntityReferenceCandidate>;
  lookupEntities: Map<string, AuditEntityReferenceCandidate>;
  seatCodes: Set<string>;
}

export interface AuditEntityReferenceCandidate {
  key: string;
  model: string;
  id: string;
}

export interface UseAuditReferenceLabelsResult {
  /** Map page-global chỉ chứa tên resolve từ API hiện tại; snapshot được presenter xử lý theo record. */
  references: AuditReferenceLabels;
  isLoading: boolean;
}

interface RecordReferenceCandidates {
  ids: Record<AuditReferenceKind, Set<string>>;
  snapshotKeys: Set<string>;
  seatCodes: Set<string>;
}

const relationFields: Record<string, AuditReferenceKind> = {
  filmid: "film",
  roomid: "room",
  plancinemaid: "planCinema",
  daypartid: "dayPart",
  customerid: "customer",
  categoryid: "category",
  manufacturerid: "manufacturer",
  planscreenid: "planScreening",
  planscreeningid: "planScreening"
};

const relationLabelKeys: Partial<Record<AuditReferenceKind, string[]>> = {
  film: ["filmName"],
  room: ["roomName"],
  planCinema: ["planCinemaName"],
  dayPart: ["daypartName", "dayPartName"],
  customer: ["customerName", "customerFullName"],
  category: ["categoryName"],
  manufacturer: ["manufacturerName"],
  planScreening: ["planScreeningName"]
};

const embeddedRelations: Array<{
  kind: AuditReferenceKind;
  parentNames: string[];
  idKeys: string[];
  labelKeys: string[];
}> = [
  {
    kind: "film",
    parentNames: ["film", "filminfo"],
    idKeys: ["id", "filmId"],
    labelKeys: ["filmName", "name", "title"]
  },
  {
    kind: "room",
    parentNames: ["room", "roominfo"],
    idKeys: ["id", "roomId"],
    labelKeys: ["roomName", "name"]
  },
  {
    kind: "planCinema",
    parentNames: ["plancinema", "plancinemainfo"],
    idKeys: ["id", "planCinemaId"],
    labelKeys: ["planCinemaName", "name"]
  },
  {
    kind: "dayPart",
    parentNames: ["daypart", "daypartinfo"],
    idKeys: ["id", "daypartId", "dayPartId"],
    labelKeys: ["daypartName", "dayPartName", "name"]
  },
  {
    kind: "customer",
    parentNames: ["customer", "customerinfo"],
    idKeys: ["id", "customerId"],
    labelKeys: ["customerName", "fullName", "fullname", "name"]
  },
  {
    kind: "manufacturer",
    parentNames: ["manufacturer", "manufacturerinfo"],
    idKeys: ["id", "manufacturerId"],
    labelKeys: ["manufacturerName", "name", "fullName"]
  },
  {
    kind: "category",
    parentNames: ["category", "categoryinfo"],
    idKeys: ["id", "categoryId"],
    labelKeys: ["categoryName", "name"]
  },
  {
    kind: "seatType",
    parentNames: ["position", "seattype"],
    idKeys: ["positionCode"],
    labelKeys: ["positionName", "name"]
  }
];

const createIdSets = (): Record<AuditReferenceKind, Set<string>> => ({
  film: new Set<string>(),
  room: new Set<string>(),
  planCinema: new Set<string>(),
  dayPart: new Set<string>(),
  customer: new Set<string>(),
  category: new Set<string>(),
  manufacturer: new Set<string>(),
  planScreening: new Set<string>(),
  seatType: new Set<string>()
});

const createRecordCandidates = (): RecordReferenceCandidates => ({
  ids: createIdSets(),
  snapshotKeys: new Set<string>(),
  seatCodes: new Set<string>()
});

const createPageCandidates = (): AuditReferenceCandidates => ({
  ids: createIdSets(),
  lookupIds: createIdSets(),
  entities: new Map<string, AuditEntityReferenceCandidate>(),
  lookupEntities: new Map<string, AuditEntityReferenceCandidate>(),
  seatCodes: new Set<string>()
});

const normalizeReferenceId = (kind: AuditReferenceKind, id: string) => {
  const trimmedId = id.trim();
  if (kind === "seatType") return trimmedId.toLocaleUpperCase();
  if (/^\d+$/.test(trimmedId)) {
    const numericId = Number(trimmedId);
    if (Number.isSafeInteger(numericId)) return String(numericId);
  }
  return trimmedId;
};

const getReferenceKey = (kind: AuditReferenceKind, id: string) =>
  `${kind}:${normalizeReferenceId(kind, id)}`;

const addReferenceId = (
  ids: Record<AuditReferenceKind, Set<string>>,
  kind: AuditReferenceKind,
  id: string
) => {
  const normalizedId = normalizeReferenceId(kind, id);
  if (normalizedId) ids[kind].add(normalizedId);
};

const isObject = (value: AuditJsonValue | undefined): value is AuditJsonObject =>
  !!value && typeof value === "object" && !Array.isArray(value);

const toReferenceId = (value: AuditJsonValue | undefined): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
};

const toReferenceLabel = (value: AuditJsonValue | undefined): string | null => {
  if (typeof value !== "string") return null;
  return value.trim() || null;
};

const getParsedPayloadValue = (payload: unknown) => {
  const parsed = safeParseAuditPayload(payload);
  return parsed.status === "parsed" ? parsed.value : undefined;
};

const hasSnapshotEntityName = (record: NormalizedAuditLogRecord) => {
  const definition = getModelDefinition(record.model);
  if (!definition) return false;
  const entityNamePaths = new Set(
    definition.entityNamePaths.map((path) => getCanonicalFieldPath(path, record.model))
  );
  const oldValue = getParsedPayloadValue(record.oldValues);
  const newValue = getParsedPayloadValue(record.newValues);
  const snapshots =
    record.action?.trim().toLocaleUpperCase() === "DELETE"
      ? [oldValue, newValue]
      : [newValue, oldValue];

  return snapshots.some(
    (snapshot) =>
      snapshot !== undefined &&
      Object.entries(flattenAuditPayload(snapshot)).some(
        ([path, value]) =>
          entityNamePaths.has(getCanonicalFieldPath(path, record.model)) &&
          toReferenceLabel(value) !== null
      )
  );
};

const getFirstValue = (object: AuditJsonObject, keys: string[]) => {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) return object[key];
  }
  return undefined;
};

const markSnapshotCoverage = (
  candidates: RecordReferenceCandidates,
  kind: AuditReferenceKind,
  id: string
) => candidates.snapshotKeys.add(getReferenceKey(kind, id));

const collectPayloadReferences = (
  value: AuditJsonValue,
  candidates: RecordReferenceCandidates,
  parentName = ""
) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectPayloadReferences(item, candidates, parentName));
    return;
  }
  if (!isObject(value)) return;

  const normalizedParentName = parentName.toLowerCase();
  const embedded = embeddedRelations.find((item) =>
    item.parentNames.includes(normalizedParentName)
  );
  if (embedded) {
    const id = toReferenceId(getFirstValue(value, embedded.idKeys));
    const label = toReferenceLabel(getFirstValue(value, embedded.labelKeys));
    if (id) addReferenceId(candidates.ids, embedded.kind, id);
    if (id && label) markSnapshotCoverage(candidates, embedded.kind, id);
  }

  Object.entries(value).forEach(([key, child]) => {
    const relationKind = relationFields[key.toLowerCase()];
    if (relationKind) {
      const id = toReferenceId(child);
      if (id) addReferenceId(candidates.ids, relationKind, id);
      const label = toReferenceLabel(getFirstValue(value, relationLabelKeys[relationKind] ?? []));
      if (id && label) markSnapshotCoverage(candidates, relationKind, id);
    }

    if (/^priceofposition\d+$/i.test(key) && typeof child === "string") {
      const separatorIndex = child.indexOf(":");
      if (separatorIndex > 0) {
        const seatCode = normalizeReferenceId("seatType", child.slice(0, separatorIndex));
        if (seatCode) {
          candidates.seatCodes.add(seatCode);
          addReferenceId(candidates.ids, "seatType", seatCode);
        }
      }
    }

    collectPayloadReferences(child, candidates, key);
  });
};

const isReferenceRecordScope = (
  value: NormalizedAuditLogRecord | AuditReferenceRecordScope
): value is AuditReferenceRecordScope => "record" in value;

export const collectAuditReferenceCandidates = (
  input: AuditReferenceRecordInput
): AuditReferenceCandidates => {
  const pageCandidates = createPageCandidates();
  const scopes: readonly (NormalizedAuditLogRecord | AuditReferenceRecordScope)[] = Array.isArray(
    input
  )
    ? input
    : input
      ? [input]
      : [];

  scopes.forEach((scope) => {
    const scopedRecord = isReferenceRecordScope(scope);
    const record = scopedRecord ? scope.record : scope;
    const includedKinds = scopedRecord ? new Set(scope.kinds) : null;
    const includeEntity = !scopedRecord || scope.includeEntity === true;
    const recordCandidates = createRecordCandidates();
    [record.oldValues, record.newValues].forEach((payload) => {
      const parsed = safeParseAuditPayload(payload);
      if (parsed.status === "parsed" && parsed.value !== undefined) {
        collectPayloadReferences(parsed.value, recordCandidates);
      }
    });

    Object.entries(recordCandidates.ids).forEach(([rawKind, ids]) => {
      const kind = rawKind as AuditReferenceKind;
      if (includedKinds && !includedKinds.has(kind)) return;
      ids.forEach((id) => {
        addReferenceId(pageCandidates.ids, kind, id);
        if (!recordCandidates.snapshotKeys.has(getReferenceKey(kind, id))) {
          addReferenceId(pageCandidates.lookupIds, kind, id);
        }
      });
    });
    if (!includedKinds || includedKinds.has("seatType")) {
      recordCandidates.seatCodes.forEach((code) => pageCandidates.seatCodes.add(code));
    }

    // Drawer luôn resolve record đang mở; page list chỉ bật cho các row cần hiện danh tính.
    // Map phía trên deduplicate cùng model + entityId và React Query tiếp tục tái sử dụng cache.
    if (includeEntity && record.model && record.entityId !== null) {
      const key = getAuditEntityReferenceKey(record.model, record.entityId);
      if (key) {
        const entity = {
          key,
          model: record.model.trim(),
          id: String(record.entityId).trim()
        };
        pageCandidates.entities.set(key, entity);
        if (!hasSnapshotEntityName(record)) {
          pageCandidates.lookupEntities.set(key, entity);
        }
      }
    }
  });

  return pageCandidates;
};

const getObjectString = (data: unknown, key: string): string | null => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getObject = (data: unknown, key: string): Record<string, unknown> | null => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const getFirstObjectString = (data: unknown, keys: string[]) => {
  for (const key of keys) {
    const value = getObjectString(data, key);
    if (value) return value;
  }
  return null;
};

const getResponseItems = (data: unknown): unknown[] => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const items = (data as { data?: unknown }).data;
  return Array.isArray(items) ? items : [];
};

const addEntries = (references: AuditReferenceLabels, entries: AuditReferenceEntry[]) => {
  entries.forEach(({ kind, id, label, source }) => {
    const current = references[kind] ?? {};
    references[kind] = {
      ...current,
      [id]: { label, source }
    } as Record<string, AuditReferenceLabel>;
  });
};

const toPositiveSafeInteger = (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const sortReferenceIds = (ids: Set<string>) =>
  [...ids].sort((left, right) => {
    const leftNumber = toPositiveSafeInteger(left);
    const rightNumber = toPositiveSafeInteger(right);
    if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return left.localeCompare(right);
  });

const createEntityEntry = (candidate: AuditEntityReferenceCandidate, label: string | null) =>
  label
    ? [
        {
          kind: "entity" as const,
          id: candidate.key,
          label,
          source: "current" as const
        }
      ]
    : [];

const buildEntityReferenceRequest = (
  candidate: AuditEntityReferenceCandidate
): AuditReferenceRequest | null => {
  const numericId = toPositiveSafeInteger(candidate.id);
  if (numericId === null) return null;

  const requestId = `entity:${candidate.key}`;
  switch (candidate.model.toLocaleLowerCase()) {
    case "film":
      return {
        requestId,
        queryKey: filmsKey.getDetail(numericId),
        queryFn: () => filmsApi.getDetail(numericId),
        extract: (data) => createEntityEntry(candidate, getObjectString(data, "filmName"))
      };
    case "order":
      return {
        requestId,
        queryKey: ordersKeys.getDetail(numericId),
        queryFn: () => ordersApi.getDetail(numericId),
        extract: (data) => {
          const order = getObject(data, "order");
          const code = getFirstObjectString(order, ["barCode", "invNo", "orderGuid"]);
          return createEntityEntry(candidate, code ? `Đơn hàng ${code}` : null);
        }
      };
    case "plancinema":
    case "plancinemaflying":
      return {
        requestId,
        queryKey: planCinemasKeys.getDetail(numericId),
        queryFn: () => planCinemasApi.getDetail(numericId),
        extract: (data) => createEntityEntry(candidate, getObjectString(data, "name"))
      };
    case "planscreenings":
      return {
        requestId,
        queryKey: planScreeningsKeys.getDetail(numericId),
        queryFn: () => planScreeningsApi.getDetail(numericId),
        extract: (data) => {
          const filmName = getObjectString(getObject(data, "filmInfo"), "filmName");
          const roomName = getObjectString(getObject(data, "roomInfo"), "name");
          const projectDate = getObjectString(data, "projectDate");
          const projectTime = getObjectString(data, "projectTime");
          const parts = [
            filmName,
            projectDate ? formatAuditDate(projectDate) : null,
            projectTime ? formatAuditTime(projectTime) : null,
            roomName
          ].filter((value): value is string => Boolean(value && value !== "Không xác định"));
          return createEntityEntry(candidate, parts.length ? parts.join(" · ") : null);
        }
      };
    case "daypart":
      return {
        requestId,
        queryKey: showTimeSlotsKeys.getDetail(numericId),
        queryFn: () => showTimeSlotsApi.getDetail(numericId),
        extract: (data) => createEntityEntry(candidate, getObjectString(data, "name"))
      };
    case "room": {
      const params = { id: numericId, current: 1, pageSize: 1 };
      return {
        requestId,
        queryKey: screeningRoomsKeys.getAll(params),
        queryFn: () => screeningRoomsApi.getAll(params),
        extract: (data) =>
          createEntityEntry(candidate, getObjectString(getResponseItems(data)[0], "name"))
      };
    }
    case "position":
      return {
        requestId,
        queryKey: seatTypesKeys.getDetail(numericId),
        queryFn: () => seatTypesApi.getDetail(numericId),
        extract: (data) => createEntityEntry(candidate, getObjectString(data, "name"))
      };
    case "customer":
    case "user":
      return {
        requestId,
        queryKey: usersKeys.getDetail(numericId),
        queryFn: () => usersApi.getDetail(numericId),
        extract: (data) => {
          const fullName = getFirstObjectString(data, ["fullname", "fullName"]);
          const firstName = getObjectString(data, "customerFirstName");
          const lastName = getObjectString(data, "customerLastName");
          const combinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
          const username = getObjectString(data, "username");
          return createEntityEntry(candidate, combinedName || fullName || username);
        }
      };
    default:
      return null;
  }
};

const buildAllReferenceRequests = (
  candidates: AuditReferenceCandidates
): AuditReferenceRequest[] => {
  const requests: AuditReferenceRequest[] = [...candidates.lookupEntities.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
    .flatMap((candidate) => {
      const request = buildEntityReferenceRequest(candidate);
      return request ? [request] : [];
    });

  sortReferenceIds(candidates.lookupIds.film).forEach((id) => {
    const numericId = toPositiveSafeInteger(id);
    if (numericId === null) return;
    requests.push({
      requestId: `film:${id}`,
      queryKey: filmsKey.getDetail(numericId),
      queryFn: () => filmsApi.getDetail(numericId),
      extract: (data) => {
        const label = getObjectString(data, "filmName");
        return label ? [{ kind: "film", id, label, source: "current" }] : [];
      }
    });
  });

  sortReferenceIds(candidates.lookupIds.room).forEach((id) => {
    const numericId = toPositiveSafeInteger(id);
    if (numericId === null) return;
    const params = { id: numericId, current: 1, pageSize: 1 };
    requests.push({
      requestId: `room:${id}`,
      queryKey: screeningRoomsKeys.getAll(params),
      queryFn: () => screeningRoomsApi.getAll(params),
      extract: (data) => {
        const label = getObjectString(getResponseItems(data)[0], "name");
        return label ? [{ kind: "room", id, label, source: "current" }] : [];
      }
    });
  });

  sortReferenceIds(candidates.lookupIds.planCinema).forEach((id) => {
    const numericId = toPositiveSafeInteger(id);
    if (numericId === null) return;
    requests.push({
      requestId: `planCinema:${id}`,
      queryKey: planCinemasKeys.getDetail(numericId),
      queryFn: () => planCinemasApi.getDetail(numericId),
      extract: (data) => {
        const label = getObjectString(data, "name");
        return label ? [{ kind: "planCinema", id, label, source: "current" }] : [];
      }
    });
  });

  sortReferenceIds(candidates.lookupIds.dayPart).forEach((id) => {
    const numericId = toPositiveSafeInteger(id);
    if (numericId === null) return;
    requests.push({
      requestId: `dayPart:${id}`,
      queryKey: showTimeSlotsKeys.getDetail(numericId),
      queryFn: () => showTimeSlotsApi.getDetail(numericId),
      extract: (data) => {
        const label = getObjectString(data, "name");
        return label ? [{ kind: "dayPart", id, label, source: "current" }] : [];
      }
    });
  });

  const unresolvedSeatCodes = sortReferenceIds(candidates.lookupIds.seatType);
  if (unresolvedSeatCodes.length) {
    const requestedSeatCodes = new Map(
      unresolvedSeatCodes.map((code) => [code.toLocaleLowerCase(), code])
    );
    const params = { current: 1, pageSize: 200 };
    requests.push({
      requestId: "seatType:*",
      queryKey: seatTypesKeys.getAll(params),
      queryFn: () => seatTypesApi.getAll(params),
      extract: (data) =>
        getResponseItems(data).flatMap((item) => {
          const code = getObjectString(item, "positionCode");
          const label = getObjectString(item, "name");
          const requestedCode = code ? requestedSeatCodes.get(code.toLocaleLowerCase()) : undefined;
          if (!requestedCode || !label) return [];
          return [
            {
              kind: "seatType" as const,
              id: requestedCode,
              label,
              source: "current" as const
            }
          ];
        })
    });
  }

  return requests;
};

export const buildAuditReferenceRequests = (
  candidates: AuditReferenceCandidates
): AuditReferenceRequest[] => buildAllReferenceRequests(candidates);

export const useAuditReferenceLabels = (
  records: AuditReferenceRecordInput,
  enabled = true
): UseAuditReferenceLabelsResult => {
  const candidates = useMemo(() => collectAuditReferenceCandidates(records), [records]);
  const requests = useMemo(() => buildAuditReferenceRequests(candidates), [candidates]);
  const queryResults = useQueries({
    queries: requests.map((request) => ({
      queryKey: request.queryKey,
      queryFn: request.queryFn,
      enabled,
      staleTime: 5 * 60 * 1000,
      retry: false
    }))
  });

  const references = useMemo(() => {
    const nextReferences: AuditReferenceLabels = {};
    queryResults.forEach((result, index) => {
      if (result.data !== undefined) {
        addEntries(nextReferences, requests[index].extract(result.data));
      }
    });
    return nextReferences;
  }, [queryResults, requests]);

  return {
    references,
    isLoading: enabled && queryResults.some((result) => result.isPending || result.isFetching)
  };
};
