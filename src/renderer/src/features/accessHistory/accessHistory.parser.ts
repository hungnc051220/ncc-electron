import {
  getCanonicalFieldPath,
  getFieldDefinition,
  isSensitiveAuditField,
  isTechnicalAuditField
} from "./accessHistory.registry";
import {
  isEmptyAuditValue,
  normalizeTemporalComparable,
  parseAuditBoolean,
  parseTicketPrice
} from "./accessHistory.formatters";
import type {
  AuditFieldDefinition,
  AuditJsonValue,
  AuditLogRecordInput,
  AuditValueDiff,
  NormalizedAuditLogRecord,
  ParsedAuditPayload
} from "./accessHistory.types";

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const asNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const asNullableNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asEntityId = (value: unknown): string | number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.trim() || null;
  return null;
};

export const normalizeAuditLogRecord = (input: unknown): NormalizedAuditLogRecord => {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? ({ ...(input as Record<string, unknown>) } as AuditLogRecordInput)
      : {};
  const rawUser = raw.user;
  const user =
    rawUser && typeof rawUser === "object" && !Array.isArray(rawUser)
      ? { ...(rawUser as Record<string, unknown>) }
      : null;

  return {
    id: asNullableNumber(raw.id) ?? 0,
    userId: asNullableNumber(raw.userId),
    username: asNullableString(raw.username),
    user,
    model: asNullableString(raw.model),
    entityId: asEntityId(raw.entityId),
    action: asNullableString(raw.action),
    oldValues:
      hasOwn(raw, "oldValues") && raw.oldValues !== undefined ? raw.oldValues : raw.oldValue,
    newValues:
      hasOwn(raw, "newValues") && raw.newValues !== undefined ? raw.newValues : raw.newValue,
    changedFields: raw.changedFields,
    timestamp: asNullableString(raw.timestamp),
    raw
  };
};

const toAuditJsonValue = (value: unknown, seen: WeakSet<object>): AuditJsonValue => {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[Tham chiếu vòng]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => toAuditJsonValue(item, seen));

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, AuditJsonValue>>(
    (result, [key, nestedValue]) => {
      result[key] = toAuditJsonValue(nestedValue, seen);
      return result;
    },
    {}
  );
};

export const safeParseAuditPayload = (value: unknown): ParsedAuditPayload => {
  if (isEmptyAuditValue(value)) return { status: "empty" };

  if (typeof value === "string") {
    const raw = value.trim();
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isEmptyAuditValue(parsed)) return { status: "empty" };
      return { status: "parsed", value: toAuditJsonValue(parsed, new WeakSet()) };
    } catch (error) {
      return {
        status: "invalid",
        raw,
        error: error instanceof Error ? error.message : "Không thể đọc JSON"
      };
    }
  }

  if (typeof value === "object" || typeof value === "number" || typeof value === "boolean") {
    return { status: "parsed", value: toAuditJsonValue(value, new WeakSet()) };
  }

  return { status: "invalid", raw: String(value), error: "Kiểu dữ liệu không được hỗ trợ" };
};

const collectChangedFieldNames = (value: unknown, fields: string[]) => {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectChangedFieldNames(item, fields));
    return;
  }
  if (typeof value === "object") {
    fields.push(...Object.keys(value as Record<string, unknown>));
    return;
  }
  if (typeof value !== "string") return;

  const normalized = value.trim();
  if (!normalized) return;
  if (
    (normalized.startsWith("[") && normalized.endsWith("]")) ||
    (normalized.startsWith("{") && normalized.endsWith("}")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      collectChangedFieldNames(parsed, fields);
      return;
    } catch {
      // Dữ liệu cũ có thể giống JSON nhưng không hợp lệ; tiếp tục đọc như chuỗi thường.
    }
  }

  fields.push(
    ...normalized
      .split(",")
      .map((fieldName) => fieldName.trim())
      .filter(Boolean)
  );
};

export const parseChangedFields = (value: unknown, model?: string | null) => {
  const fields: string[] = [];
  collectChangedFieldNames(value, fields);
  return Array.from(
    new Set(fields.map((path) => getCanonicalFieldPath(path, model)).filter(Boolean))
  );
};

export const flattenAuditPayload = (
  value: AuditJsonValue | undefined,
  parentPath = ""
): Record<string, AuditJsonValue | undefined> => {
  if (value === undefined) return {};
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return { [parentPath || "value"]: value };
  }

  const entries = Object.entries(value);
  if (!entries.length) return parentPath ? { [parentPath]: value } : {};

  return entries.reduce<Record<string, AuditJsonValue | undefined>>(
    (result, [key, nestedValue]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      if (
        nestedValue !== null &&
        typeof nestedValue === "object" &&
        !Array.isArray(nestedValue) &&
        Object.keys(nestedValue).length > 0
      ) {
        Object.assign(result, flattenAuditPayload(nestedValue, path));
      } else {
        result[path] = nestedValue;
      }
      return result;
    },
    {}
  );
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const stableValue = (value: AuditJsonValue): AuditJsonValue => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, AuditJsonValue>>((result, key) => {
        result[key] = stableValue(value[key]);
        return result;
      }, {});
  }
  return typeof value === "string" ? value.trim() : value;
};

export const normalizeComparableValue = (
  definition: AuditFieldDefinition | undefined,
  value: AuditJsonValue | undefined
): AuditJsonValue | undefined => {
  if (isEmptyAuditValue(value)) return null;
  if (value === undefined) return undefined;

  if (definition?.kind === "boolean") {
    return parseAuditBoolean(value) ?? stableValue(value);
  }

  if (
    definition?.kind === "number" ||
    definition?.kind === "money" ||
    definition?.kind === "relation" ||
    definition?.kind === "status"
  ) {
    return toFiniteNumber(value) ?? stableValue(value);
  }

  if (definition?.kind === "ticketPrice") {
    const ticketPrice = parseTicketPrice(value);
    return ticketPrice
      ? { seatCode: ticketPrice.seatCode, amount: ticketPrice.amount }
      : stableValue(value);
  }

  if (
    definition?.kind === "date" ||
    definition?.kind === "time" ||
    definition?.kind === "datetime"
  ) {
    return normalizeTemporalComparable(definition.kind, value) ?? stableValue(value);
  }

  return stableValue(value);
};

export const areAuditValuesSemanticallyEqual = (
  definition: AuditFieldDefinition | undefined,
  left: AuditJsonValue | undefined,
  right: AuditJsonValue | undefined
) =>
  JSON.stringify(normalizeComparableValue(definition, left)) ===
  JSON.stringify(normalizeComparableValue(definition, right));

const canonicalizeFields = (value: AuditJsonValue | undefined, model?: string | null) => {
  const fields = flattenAuditPayload(value);
  return Object.entries(fields).reduce<Record<string, AuditJsonValue | undefined>>(
    (result, [path, fieldValue]) => {
      const canonicalPath = getCanonicalFieldPath(path, model);
      const isCanonicalSource = canonicalPath === path;
      if (!(canonicalPath in result) || isCanonicalSource) result[canonicalPath] = fieldValue;
      return result;
    },
    {}
  );
};

export const computeAuditDiff = (
  oldPayload: AuditJsonValue | undefined,
  newPayload: AuditJsonValue | undefined,
  changedFields: unknown,
  model?: string | null
): AuditValueDiff[] => {
  const oldFields = canonicalizeFields(oldPayload, model);
  const newFields = canonicalizeFields(newPayload, model);
  const preferredPaths = parseChangedFields(changedFields, model);
  const preferredPathSet = new Set(preferredPaths);
  const computedPaths = Array.from(new Set([...Object.keys(oldFields), ...Object.keys(newFields)]))
    .filter((path) => !preferredPathSet.has(path))
    .sort((left, right) => {
      const leftPriority = getFieldDefinition(model, left)?.summaryPriority ?? 1000;
      const rightPriority = getFieldDefinition(model, right)?.summaryPriority ?? 1000;
      return leftPriority - rightPriority || left.localeCompare(right);
    });
  const allPaths = [...preferredPaths, ...computedPaths];

  return allPaths.reduce<AuditValueDiff[]>((diffs, path) => {
    if (isSensitiveAuditField(path) || isTechnicalAuditField(path)) return diffs;
    const definition = getFieldDefinition(model, path);
    const before = oldFields[path];
    const after = newFields[path];
    if (areAuditValuesSemanticallyEqual(definition, before, after)) return diffs;

    diffs.push({
      path,
      before,
      after,
      definition,
      mapped: Boolean(definition)
    });
    return diffs;
  }, []);
};
