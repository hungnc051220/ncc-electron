export type KnownAuditAction = "CREATE" | "UPDATE" | "DELETE";

export type AuditAction = KnownAuditAction | "OTHER";

export type AuditJsonValue =
  | null
  | boolean
  | number
  | string
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue };

export type AuditJsonObject = Record<string, AuditJsonValue>;

export interface AuditUserSummary {
  id?: number | null;
  username?: string | null;
  fullname?: string | null;
  fullName?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  [key: string]: unknown;
}

export interface AuditLogRecordInput {
  id?: unknown;
  userId?: unknown;
  username?: unknown;
  user?: unknown;
  model?: unknown;
  entityId?: unknown;
  action?: unknown;
  oldValues?: unknown;
  newValues?: unknown;
  changedFields?: unknown;
  timestamp?: unknown;
  oldValue?: unknown;
  newValue?: unknown;
  [key: string]: unknown;
}

export interface NormalizedAuditLogRecord {
  id: number;
  userId: number | null;
  username: string | null;
  user: AuditUserSummary | null;
  model: string | null;
  entityId: string | number | null;
  action: string | null;
  oldValues: unknown;
  newValues: unknown;
  changedFields: unknown;
  timestamp: string | null;
  raw: AuditLogRecordInput;
}

export interface ParsedAuditPayload {
  status: "empty" | "parsed" | "invalid";
  value?: AuditJsonValue;
  raw?: string;
  error?: string;
}

export type AuditValueKind =
  | "text"
  | "number"
  | "money"
  | "boolean"
  | "date"
  | "time"
  | "datetime"
  | "relation"
  | "ticketPrice"
  | "status"
  | "json";

export type AuditDetailContext = "create" | "update" | "delete" | "summary";

export type AuditRelationKind =
  | "film"
  | "room"
  | "planCinema"
  | "dayPart"
  | "customer"
  | "category"
  | "manufacturer"
  | "planScreening";

export interface AuditBooleanLabels {
  true: string;
  false: string;
}

export interface AuditFieldDefinition {
  label: string;
  kind: AuditValueKind;
  summaryPriority: number;
  visibleIn: AuditDetailContext[];
  aliases?: string[];
  relation?: AuditRelationKind;
  booleanLabels?: AuditBooleanLabels;
  valueLabels?: Record<string, string>;
  omitWhenEmpty?: boolean;
}

export interface AuditModelDefinition {
  label: string;
  sentenceLabel: string;
  fields: Record<string, AuditFieldDefinition>;
  entityNamePaths: string[];
  allowCommonFields?: boolean;
}

export interface AuditActionDefinition {
  label: string;
  compactVerb: string;
  verb: string;
}

export interface TicketPriceValue {
  seatCode: string | null;
  amount: number;
}

export type AuditReferenceLabel =
  | string
  | {
      label: string;
      source?: "snapshot" | "current";
    };

export interface AuditReferenceLabels {
  /** Tên hiện tại của chính đối tượng audit, key được tạo từ model + entityId. */
  entity?: Record<string, AuditReferenceLabel>;
  film?: Record<string, AuditReferenceLabel>;
  room?: Record<string, AuditReferenceLabel>;
  planCinema?: Record<string, AuditReferenceLabel>;
  dayPart?: Record<string, AuditReferenceLabel>;
  customer?: Record<string, AuditReferenceLabel>;
  category?: Record<string, AuditReferenceLabel>;
  manufacturer?: Record<string, AuditReferenceLabel>;
  planScreening?: Record<string, AuditReferenceLabel>;
  seatType?: Record<string, AuditReferenceLabel>;
}

export interface FormatAuditValueContext {
  references?: AuditReferenceLabels;
}

export interface FormattedAuditValue {
  text: string;
  referenceSource?: "snapshot" | "current";
}

export interface AuditValueDiff {
  path: string;
  before: AuditJsonValue | undefined;
  after: AuditJsonValue | undefined;
  definition?: AuditFieldDefinition;
  mapped: boolean;
}

export interface AuditChange extends AuditValueDiff {
  label: string;
  beforeText: string;
  afterText: string;
  summary: string;
}

export interface ActivitySnapshotItem {
  path: string;
  label: string;
  value: AuditJsonValue | undefined;
  valueText: string;
}

export interface ActivitySnapshotSummaryItem {
  type: "snapshot";
  path: string;
  label: string;
  value: string;
}

export interface ActivityUpdateSummaryItem {
  type: "update";
  path: string;
  label: string;
  before: string;
  after: string;
}

export interface ActivityFallbackSummaryItem {
  type: "fallback";
  message: string;
}

export type ActivitySummaryItem =
  | ActivitySnapshotSummaryItem
  | ActivityUpdateSummaryItem
  | ActivityFallbackSummaryItem;

export type ActivityDiagnosticCode =
  | "INVALID_OLD_VALUES"
  | "INVALID_NEW_VALUES"
  | "MISSING_VALUES"
  | "UNKNOWN_MODEL"
  | "UNKNOWN_ACTION"
  | "UNKNOWN_FIELDS"
  | "INVALID_TIMESTAMP";

export interface ActivityDiagnostic {
  code: ActivityDiagnosticCode;
  message: string;
  paths?: string[];
}

export interface AuditTimestampDisplay {
  text: string;
  time: string;
  date: string;
  valid: boolean;
}

export interface ActivityViewModel {
  id: number;
  record: NormalizedAuditLogRecord;
  action: AuditAction;
  rawAction: string | null;
  actionLabel: string;
  modelLabel: string;
  rawModel: string | null;
  entityLabel: string;
  entityLabelSource?: "snapshot" | "current";
  entityCode: string | null;
  actorLabel: string;
  timestampText: string;
  timestampTime: string;
  timestampDate: string;
  timestampValid: boolean;
  title: string;
  fullSentence: string;
  detailTitle: string;
  summaryItems: ActivitySummaryItem[];
  summaryTotal: number;
  changes: AuditChange[];
  snapshotItems: ActivitySnapshotItem[];
  diagnostics: ActivityDiagnostic[];
  technicalData: AuditJsonValue;
  hasResolvedCurrentReferences: boolean;
}

export interface BuildActivityViewModelOptions {
  references?: AuditReferenceLabels;
}
