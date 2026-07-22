import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { isSensitiveAuditField } from "./accessHistory.registry";
import type {
  AuditFieldDefinition,
  AuditJsonValue,
  AuditReferenceLabel,
  AuditReferenceLabels,
  AuditRelationKind,
  AuditTimestampDisplay,
  FormatAuditValueContext,
  FormattedAuditValue,
  TicketPriceValue
} from "./accessHistory.types";

dayjs.extend(utc);
dayjs.extend(timezone);

export const BUSINESS_TIMEZONE = "Asia/Ho_Chi_Minh";
export const EMPTY_AUDIT_VALUE_LABEL = "Chưa thiết lập";
export const INVALID_AUDIT_VALUE_LABEL = "Không xác định";

const VIETNAMESE_NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2
});

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WALL_CLOCK_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;
const DATETIME_WALL_CLOCK_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:[zZ]|[+-]\d{2}:?\d{2})?$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}[T\s]/;
const HAS_TIMEZONE_PATTERN = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export const isEmptyAuditValue = (value: unknown) =>
  value == null || (typeof value === "string" && value.trim() === "");

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseAuditBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return undefined;
};

export const formatAuditNumber = (value: unknown) => {
  const parsed = toFiniteNumber(value);
  return parsed === undefined
    ? INVALID_AUDIT_VALUE_LABEL
    : VIETNAMESE_NUMBER_FORMATTER.format(parsed);
};

export const formatAuditMoney = (value: unknown) => {
  const parsed = toFiniteNumber(value);
  return parsed === undefined
    ? INVALID_AUDIT_VALUE_LABEL
    : `${VIETNAMESE_NUMBER_FORMATTER.format(parsed)}đ`;
};

const parseDateOnly = (value: string) => {
  if (!DATE_ONLY_PATTERN.test(value)) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() && parsed.format("YYYY-MM-DD") === value ? parsed : undefined;
};

const parseBusinessDateTime = (value: unknown) => {
  if (value instanceof Date) {
    const parsed = dayjs(value).tz(BUSINESS_TIMEZONE);
    return parsed.isValid() ? parsed : undefined;
  }

  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = value.trim();

  if (DATE_ONLY_PATTERN.test(normalized)) {
    return parseDateOnly(normalized);
  }

  if (!DATETIME_PATTERN.test(normalized)) return undefined;
  const parsed = HAS_TIMEZONE_PATTERN.test(normalized)
    ? dayjs.utc(normalized).tz(BUSINESS_TIMEZONE)
    : dayjs.tz(normalized, BUSINESS_TIMEZONE);
  return parsed.isValid() ? parsed : undefined;
};

const parseBusinessTime = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    // Các field giờ nghiệp vụ đang được BE gắn hậu tố timezone dù giá trị đã là giờ GMT+7.
    // Vì vậy chỉ đọc phần wall-clock HH:mm, không chuyển đổi offset như audit timestamp.
    const timeMatch =
      normalized.match(WALL_CLOCK_TIME_PATTERN) ||
      normalized.match(DATETIME_WALL_CLOCK_TIME_PATTERN);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      const seconds = Number(timeMatch[3] || 0);
      if (hours <= 23 && minutes <= 59 && seconds <= 59) {
        return {
          hours,
          minutes,
          seconds,
          formatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
        };
      }
      return undefined;
    }
  }

  const parsed = parseBusinessDateTime(value);
  if (!parsed) return undefined;
  return {
    hours: parsed.hour(),
    minutes: parsed.minute(),
    seconds: parsed.second(),
    formatted: parsed.format("HH:mm")
  };
};

export const formatAuditDate = (value: unknown) => {
  if (typeof value === "string") {
    const dateOnly = parseDateOnly(value.trim());
    if (dateOnly) return dateOnly.format("DD/MM/YYYY");
  }

  const parsed = parseBusinessDateTime(value);
  return parsed ? parsed.format("DD/MM/YYYY") : INVALID_AUDIT_VALUE_LABEL;
};

export const formatAuditTime = (value: unknown) =>
  parseBusinessTime(value)?.formatted || INVALID_AUDIT_VALUE_LABEL;

export const formatAuditDateTime = (value: unknown) => {
  const parsed = parseBusinessDateTime(value);
  return parsed ? parsed.format("HH:mm DD/MM/YYYY") : INVALID_AUDIT_VALUE_LABEL;
};

export const formatAuditTimestamp = (value: unknown): AuditTimestampDisplay => {
  const parsed = parseBusinessDateTime(value);
  if (!parsed || (typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim()))) {
    return {
      text: INVALID_AUDIT_VALUE_LABEL,
      time: INVALID_AUDIT_VALUE_LABEL,
      date: INVALID_AUDIT_VALUE_LABEL,
      valid: false
    };
  }

  const time = parsed.format("HH:mm");
  const date = parsed.format("DD/MM/YYYY");
  return { text: `${time} ${date}`, time, date, valid: true };
};

export const normalizeTemporalComparable = (
  kind: "date" | "time" | "datetime",
  value: unknown
): string | number | undefined => {
  if (kind === "date") {
    if (typeof value === "string") {
      const dateOnly = parseDateOnly(value.trim());
      if (dateOnly) return dateOnly.format("YYYY-MM-DD");
    }
    return parseBusinessDateTime(value)?.format("YYYY-MM-DD");
  }

  if (kind === "time") return parseBusinessTime(value)?.formatted;
  return parseBusinessDateTime(value)?.valueOf();
};

export const parseTicketPrice = (value: unknown): TicketPriceValue | undefined => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    const amount = toFiniteNumber(candidate.amount);
    if (amount === undefined) return undefined;
    const seatCode =
      typeof candidate.seatCode === "string" && candidate.seatCode.trim()
        ? candidate.seatCode.trim()
        : null;
    return { seatCode, amount };
  }

  const directAmount = toFiniteNumber(value);
  if (directAmount !== undefined) return { seatCode: null, amount: directAmount };
  if (typeof value !== "string") return undefined;

  const match = value.trim().match(/^([^:]+):\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  const amount = toFiniteNumber(match[2]);
  if (amount === undefined) return undefined;
  return { seatCode: match[1].trim(), amount };
};

const readReferenceLabel = (
  reference: AuditReferenceLabel | undefined
): { label: string; source?: "snapshot" | "current" } | undefined => {
  if (typeof reference === "string") {
    return reference.trim() ? { label: reference.trim(), source: "current" } : undefined;
  }
  if (!reference?.label.trim()) return undefined;
  return { label: reference.label.trim(), source: reference.source || "current" };
};

const findReference = (
  references: AuditReferenceLabels | undefined,
  relation: AuditRelationKind | "seatType",
  key: string
) => {
  const relationMap = references?.[relation];
  if (!relationMap) return undefined;
  const numericKey = /^\d+$/.test(key) ? Number(key) : null;
  const canonicalNumericKey =
    numericKey !== null && Number.isSafeInteger(numericKey) ? String(numericKey) : undefined;
  return readReferenceLabel(
    relationMap[key] ||
      (canonicalNumericKey ? relationMap[canonicalNumericKey] : undefined) ||
      relationMap[key.toLowerCase()] ||
      relationMap[key.toUpperCase()]
  );
};

const RELATION_FALLBACK_LABELS: Record<AuditRelationKind, string> = {
  film: "Phim",
  room: "Phòng chiếu",
  planCinema: "Kế hoạch",
  dayPart: "Khung giờ",
  customer: "Khách hàng",
  category: "Phân loại",
  manufacturer: "Hãng phim",
  planScreening: "Lịch chiếu"
};

export const formatTicketPrice = (
  value: unknown,
  references?: AuditReferenceLabels
): FormattedAuditValue => {
  const parsed = parseTicketPrice(value);
  if (!parsed) return { text: INVALID_AUDIT_VALUE_LABEL };

  const money = formatAuditMoney(parsed.amount);
  if (!parsed.seatCode) return { text: money };

  const resolved = findReference(references, "seatType", parsed.seatCode);
  return resolved
    ? { text: `${resolved.label} — ${money}`, referenceSource: resolved.source }
    : { text: `Hạng ghế ${parsed.seatCode} — ${money}` };
};

const formatRelation = (
  value: unknown,
  relation: AuditRelationKind | undefined,
  references: AuditReferenceLabels | undefined
): FormattedAuditValue => {
  if (!relation) return { text: String(value) };
  const key = String(value).trim();
  const resolved = findReference(references, relation, key);
  return resolved
    ? { text: resolved.label, referenceSource: resolved.source }
    : { text: `${RELATION_FALLBACK_LABELS[relation]} #${key}` };
};

const stringifyDisplayValue = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return INVALID_AUDIT_VALUE_LABEL;
  }
};

export const formatAuditValueDetailed = (
  value: unknown,
  definition?: AuditFieldDefinition,
  context: FormatAuditValueContext = {}
): FormattedAuditValue => {
  if (isEmptyAuditValue(value)) return { text: EMPTY_AUDIT_VALUE_LABEL };
  if (!definition) return { text: stringifyDisplayValue(value) || EMPTY_AUDIT_VALUE_LABEL };

  switch (definition.kind) {
    case "date":
      return { text: formatAuditDate(value) };
    case "time":
      return { text: formatAuditTime(value) };
    case "datetime":
      return { text: formatAuditDateTime(value) };
    case "money":
      return { text: formatAuditMoney(value) };
    case "number":
      return { text: formatAuditNumber(value) };
    case "boolean": {
      const booleanValue = parseAuditBoolean(value);
      if (booleanValue === undefined) return { text: INVALID_AUDIT_VALUE_LABEL };
      return {
        text:
          definition.booleanLabels?.[booleanValue ? "true" : "false"] ||
          (booleanValue ? "Có" : "Không")
      };
    }
    case "relation":
      return formatRelation(value, definition.relation, context.references);
    case "ticketPrice":
      return formatTicketPrice(value, context.references);
    case "status": {
      const statusKey = String(value).trim();
      const mappedStatus =
        definition.valueLabels?.[statusKey] ??
        definition.valueLabels?.[statusKey.toUpperCase()] ??
        definition.valueLabels?.[statusKey.toLowerCase()];
      if (mappedStatus) return { text: mappedStatus };

      const booleanValue = parseAuditBoolean(value);
      if (typeof value === "boolean" || value === "true" || value === "false") {
        return { text: booleanValue ? "Đang bật" : "Đang tắt" };
      }
      return { text: INVALID_AUDIT_VALUE_LABEL };
    }
    default:
      return { text: stringifyDisplayValue(value) || EMPTY_AUDIT_VALUE_LABEL };
  }
};

export const formatAuditValue = (
  value: unknown,
  definition?: AuditFieldDefinition,
  context: FormatAuditValueContext = {}
) => formatAuditValueDetailed(value, definition, context).text;

interface RedactOptions {
  maxDepth?: number;
  maxEntries?: number;
  maxStringLength?: number;
}

export const redactAuditData = (value: unknown, options: RedactOptions = {}): AuditJsonValue => {
  const maxDepth = options.maxDepth ?? 8;
  const maxEntries = options.maxEntries ?? 100;
  const maxStringLength = options.maxStringLength ?? 500;
  const seen = new WeakSet<object>();

  const visit = (current: unknown, path: string, depth: number): AuditJsonValue => {
    if (isSensitiveAuditField(path)) return "[Đã ẩn]";
    if (current == null) return null;
    if (typeof current === "boolean" || typeof current === "number") {
      return Number.isFinite(current) ? current : String(current);
    }
    if (typeof current === "string") {
      return current.length > maxStringLength ? `${current.slice(0, maxStringLength)}…` : current;
    }
    if (current instanceof Date) return current.toISOString();
    if (typeof current !== "object") return String(current);
    if (depth >= maxDepth) return "[Dữ liệu quá sâu]";
    if (seen.has(current)) return "[Tham chiếu vòng]";
    seen.add(current);

    if (Array.isArray(current)) {
      const items = current
        .slice(0, maxEntries)
        .map((item, index) => visit(item, `${path}.${index}`, depth + 1));
      if (current.length > maxEntries) items.push(`[Còn ${current.length - maxEntries} phần tử]`);
      return items;
    }

    const result: Record<string, AuditJsonValue> = {};
    const entries = Object.entries(current as Record<string, unknown>);
    for (const [key, nestedValue] of entries.slice(0, maxEntries)) {
      const nextPath = path ? `${path}.${key}` : key;
      result[key] = visit(nestedValue, nextPath, depth + 1);
    }
    if (entries.length > maxEntries) {
      result.__truncated__ = `[Còn ${entries.length - maxEntries} trường]`;
    }
    return result;
  };

  return visit(value, "", 0);
};
