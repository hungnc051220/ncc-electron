import {
  ACTION_DEFINITIONS,
  getCanonicalFieldPath,
  getFieldDefinition,
  getModelDefinition,
  isSensitiveAuditField,
  isTechnicalAuditField,
  normalizeAuditAction
} from "./accessHistory.registry";
import {
  computeAuditDiff,
  flattenAuditPayload,
  normalizeAuditLogRecord,
  parseChangedFields,
  safeParseAuditPayload
} from "./accessHistory.parser";
import {
  formatAuditMoney,
  formatAuditTimestamp,
  formatAuditValueDetailed,
  isEmptyAuditValue,
  parseAuditBoolean,
  parseTicketPrice,
  redactAuditData
} from "./accessHistory.formatters";
import type {
  ActivityDiagnostic,
  ActivitySnapshotItem,
  ActivitySummaryItem,
  ActivityViewModel,
  AuditChange,
  AuditDetailContext,
  AuditFieldDefinition,
  AuditJsonValue,
  AuditReferenceLabel,
  AuditReferenceLabels,
  AuditValueDiff,
  BuildActivityViewModelOptions,
  FormattedAuditValue,
  NormalizedAuditLogRecord,
  ParsedAuditPayload
} from "./accessHistory.types";
import { getAuditEntityReferenceKey } from "./accessHistory.entity";

const capitalizeFirst = (value: string) =>
  value ? `${value.charAt(0).toLocaleUpperCase("vi-VN")}${value.slice(1)}` : value;

const lowerFirst = (value: string) =>
  value ? `${value.charAt(0).toLocaleLowerCase("vi-VN")}${value.slice(1)}` : value;

const withPeriod = (value: string) => (/[.!?]$/.test(value) ? value : `${value}.`);

const isUserAccountModel = (model: string | null | undefined) =>
  model?.trim().toLocaleLowerCase() === "customer" || model?.trim().toLocaleLowerCase() === "user";

const getUserAccountFullName = (
  fields: Record<string, AuditJsonValue | undefined>,
  requireCompleteName = false
): string | undefined => {
  const firstName =
    typeof fields.customerFirstName === "string" ? fields.customerFirstName.trim() : "";
  const lastName =
    typeof fields.customerLastName === "string" ? fields.customerLastName.trim() : "";
  if (firstName && lastName) return `${firstName} ${lastName}`;

  const fullName = fields.fullName;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (requireCompleteName) return undefined;
  return firstName || lastName || undefined;
};

const actorNameFromUser = (record: NormalizedAuditLogRecord) => {
  const user = record.user;
  if (user) {
    const combinedName = [user.customerFirstName, user.customerLastName]
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim())
      .join(" ");
    if (combinedName) return combinedName;

    const fullName = [user.fullname, user.fullName].find(
      (value) => typeof value === "string" && value.trim()
    );
    if (typeof fullName === "string") return fullName.trim();
    if (typeof user.username === "string" && user.username.trim()) return user.username.trim();
  }
  if (record.username) return record.username;
  if (record.userId !== null) return `Người dùng #${record.userId}`;
  return "Không xác định";
};

const canonicalizeFlatFields = (value: AuditJsonValue | undefined, model?: string | null) =>
  Object.entries(flattenAuditPayload(value)).reduce<Record<string, AuditJsonValue | undefined>>(
    (result, [path, fieldValue]) => {
      const canonicalPath = getCanonicalFieldPath(path, model);
      if (!(canonicalPath in result) || canonicalPath === path) result[canonicalPath] = fieldValue;
      return result;
    },
    {}
  );

const getParsedValue = (payload: ParsedAuditPayload) =>
  payload.status === "parsed" ? payload.value : undefined;

const pickSnapshotPayload = (
  action: ActivityViewModel["action"],
  oldPayload: ParsedAuditPayload,
  newPayload: ParsedAuditPayload
) => {
  const oldValue = getParsedValue(oldPayload);
  const newValue = getParsedValue(newPayload);
  if (action === "DELETE") return oldValue ?? newValue;
  return newValue ?? oldValue;
};

const normalizeReferenceLabel = (value: AuditReferenceLabel) =>
  typeof value === "string" ? value : value.label;

const mergeReferenceMap = (
  current: Record<string, AuditReferenceLabel> | undefined,
  snapshot: Record<string, AuditReferenceLabel> | undefined
) => ({ ...current, ...snapshot });

const addSnapshotReference = (
  references: AuditReferenceLabels,
  relation: keyof AuditReferenceLabels,
  fields: Record<string, AuditJsonValue | undefined>,
  idPaths: string[],
  namePaths: string[]
) => {
  const id = idPaths.map((path) => fields[path]).find((value) => !isEmptyAuditValue(value));
  const name = namePaths.map((path) => fields[path]).find((value) => !isEmptyAuditValue(value));
  if (id == null || (typeof id !== "string" && typeof id !== "number")) return;
  if (typeof name !== "string" && typeof name !== "number") return;
  const label = String(name).trim();
  if (!label) return;

  const relationMap = references[relation] || {};
  relationMap[String(id)] = { label, source: "snapshot" };
  references[relation] = relationMap;
};

const buildSnapshotReferences = (
  oldValue: AuditJsonValue | undefined,
  newValue: AuditJsonValue | undefined,
  model?: string | null
): AuditReferenceLabels => {
  const references: AuditReferenceLabels = {};

  [oldValue, newValue].forEach((value) => {
    const fields = canonicalizeFlatFields(value, model);
    addSnapshotReference(references, "film", fields, ["filmId"], ["filmName", "filmInfo.filmName"]);
    addSnapshotReference(references, "room", fields, ["roomId"], ["roomName", "roomInfo.name"]);
    addSnapshotReference(
      references,
      "planCinema",
      fields,
      ["planCinemaId"],
      ["planCinemaName", "planCinemaInfo.name"]
    );
    addSnapshotReference(
      references,
      "dayPart",
      fields,
      ["daypartId"],
      ["daypartName", "dayPartName", "daypartInfo.name", "dayPartInfo.name"]
    );
    addSnapshotReference(
      references,
      "customer",
      fields,
      ["customerId"],
      ["customerName", "customerFullName", "customerInfo.fullName"]
    );
    addSnapshotReference(
      references,
      "manufacturer",
      fields,
      ["manufacturerId"],
      ["manufacturerName", "manufacturerInfo.name"]
    );
    addSnapshotReference(
      references,
      "category",
      fields,
      ["categoryId"],
      ["categoryName", "categoryInfo.name"]
    );
    addSnapshotReference(
      references,
      "planScreening",
      fields,
      ["planScreeningId"],
      ["planScreeningName"]
    );
    addSnapshotReference(
      references,
      "seatType",
      fields,
      ["positionCode", "position.positionCode", "seatType.positionCode"],
      ["positionName", "position.name", "seatType.name"]
    );
  });
  return references;
};

const mergeReferences = (
  current: AuditReferenceLabels | undefined,
  snapshot: AuditReferenceLabels
): AuditReferenceLabels => ({
  entity: mergeReferenceMap(current?.entity, snapshot.entity),
  film: mergeReferenceMap(current?.film, snapshot.film),
  room: mergeReferenceMap(current?.room, snapshot.room),
  planCinema: mergeReferenceMap(current?.planCinema, snapshot.planCinema),
  dayPart: mergeReferenceMap(current?.dayPart, snapshot.dayPart),
  customer: mergeReferenceMap(current?.customer, snapshot.customer),
  category: mergeReferenceMap(current?.category, snapshot.category),
  manufacturer: mergeReferenceMap(current?.manufacturer, snapshot.manufacturer),
  planScreening: mergeReferenceMap(current?.planScreening, snapshot.planScreening),
  seatType: mergeReferenceMap(current?.seatType, snapshot.seatType)
});

const getEntityLabel = (
  record: NormalizedAuditLogRecord,
  snapshots: Array<AuditJsonValue | undefined>,
  modelLabel: string,
  references: AuditReferenceLabels
) => {
  const definition = getModelDefinition(record.model);
  const entityName = snapshots
    .flatMap((snapshot) => {
      const fields = canonicalizeFlatFields(snapshot, record.model);
      const accountFullName = isUserAccountModel(record.model)
        ? getUserAccountFullName(fields, true)
        : undefined;
      return [
        accountFullName,
        ...(definition?.entityNamePaths.map(
          (path) => fields[getCanonicalFieldPath(path, record.model)]
        ) ?? [])
      ];
    })
    .find((value) => typeof value === "string" && value.trim());
  if (typeof entityName === "string") {
    return { label: entityName.trim(), source: "snapshot" as const };
  }

  const referenceKey = getAuditEntityReferenceKey(record.model, record.entityId);
  const currentReference = referenceKey ? references.entity?.[referenceKey] : undefined;
  if (currentReference) {
    return {
      label: normalizeReferenceLabel(currentReference),
      source: typeof currentReference === "string" ? undefined : currentReference.source
    };
  }

  const entityCode = record.entityId === null ? null : String(record.entityId);
  return {
    label: entityCode ? `${modelLabel} #${entityCode}` : modelLabel,
    source: undefined
  };
};

const buildTicketPriceChange = (
  diff: AuditValueDiff,
  formatValue: (value: unknown, definition?: AuditFieldDefinition) => FormattedAuditValue
) => {
  const beforeTicket = parseTicketPrice(diff.before);
  const afterTicket = parseTicketPrice(diff.after);
  const before = formatValue(diff.before, diff.definition);
  const after = formatValue(diff.after, diff.definition);

  if (
    beforeTicket?.seatCode &&
    afterTicket?.seatCode &&
    beforeTicket.seatCode.toLowerCase() === afterTicket.seatCode.toLowerCase()
  ) {
    const seatLabel = before.text.split(" — ")[0];
    const label = `Giá vé ${lowerFirst(seatLabel)}`;
    return {
      label,
      beforeText: formatAuditMoney(beforeTicket.amount),
      afterText: formatAuditMoney(afterTicket.amount)
    };
  }

  return {
    label: diff.definition?.label || "Giá vé",
    beforeText: before.text,
    afterText: after.text
  };
};

const buildChangeSummary = (
  path: string,
  label: string,
  beforeText: string,
  afterText: string,
  before: AuditJsonValue | undefined,
  after: AuditJsonValue | undefined,
  definition: AuditFieldDefinition | undefined
) => {
  if (isEmptyAuditValue(before) && !isEmptyAuditValue(after)) {
    return withPeriod(`Đã thiết lập ${lowerFirst(label)}: ${afterText}`);
  }
  if (!isEmptyAuditValue(before) && isEmptyAuditValue(after)) {
    return withPeriod(`Đã bỏ thiết lập ${lowerFirst(label)}`);
  }
  if (path === "projectDate") {
    return withPeriod(`Chuyển ngày chiếu từ ${beforeText} sang ${afterText}`);
  }
  if (path === "isOnlineSelling") {
    const nextValue = parseAuditBoolean(after);
    if (nextValue !== undefined) return nextValue ? "Bật bán vé online." : "Tắt bán vé online.";
  }
  if (definition?.kind === "relation") {
    return withPeriod(`Thay đổi ${lowerFirst(label)} từ ${beforeText} sang ${afterText}`);
  }
  return withPeriod(`Thay đổi ${lowerFirst(label)} từ ${beforeText} thành ${afterText}`);
};

const buildChanges = (
  diffs: AuditValueDiff[],
  references: AuditReferenceLabels,
  markReferenceSource: (value: FormattedAuditValue) => FormattedAuditValue
): AuditChange[] =>
  diffs
    .filter((diff) => diff.mapped && diff.definition)
    .map((diff) => {
      const definition = diff.definition;
      const formatValue = (value: unknown, fieldDefinition = definition) =>
        markReferenceSource(
          formatAuditValueDetailed(value, fieldDefinition, {
            references
          })
        );
      const ticketPriceValues =
        definition?.kind === "ticketPrice"
          ? buildTicketPriceChange(diff, formatValue)
          : {
              label: definition?.label || diff.path,
              beforeText: formatValue(diff.before).text,
              afterText: formatValue(diff.after).text
            };

      return {
        ...diff,
        label: ticketPriceValues.label,
        beforeText: ticketPriceValues.beforeText,
        afterText: ticketPriceValues.afterText,
        summary: buildChangeSummary(
          diff.path,
          ticketPriceValues.label,
          ticketPriceValues.beforeText,
          ticketPriceValues.afterText,
          diff.before,
          diff.after,
          definition
        )
      };
    });

const buildSnapshotItems = (
  model: string | null,
  snapshot: AuditJsonValue | undefined,
  context: Exclude<AuditDetailContext, "summary" | "update"> | "summary",
  references: AuditReferenceLabels,
  markReferenceSource: (value: FormattedAuditValue) => FormattedAuditValue
) => {
  const fields = canonicalizeFlatFields(snapshot, model);
  const unknownPaths: string[] = [];
  let items = Object.entries(fields).reduce<ActivitySnapshotItem[]>((result, [path, value]) => {
    if (isSensitiveAuditField(path) || isTechnicalAuditField(path)) return result;
    const definition = getFieldDefinition(model, path);
    if (!definition) {
      unknownPaths.push(path);
      return result;
    }
    if (!definition.visibleIn.includes(context) && !definition.visibleIn.includes("summary")) {
      return result;
    }
    if (definition.omitWhenEmpty && isEmptyAuditValue(value)) return result;

    const formatted = markReferenceSource(
      formatAuditValueDetailed(value, definition, { references })
    );
    result.push({ path, label: definition.label, value, valueText: formatted.text });
    return result;
  }, []);

  const accountFullName = isUserAccountModel(model) ? getUserAccountFullName(fields) : undefined;
  if (accountFullName) {
    items = items.filter(
      (item) =>
        item.path !== "fullName" &&
        item.path !== "customerFirstName" &&
        item.path !== "customerLastName"
    );
    items.push({
      path: "fullName",
      label: "Họ và tên",
      value: accountFullName,
      valueText: accountFullName
    });
  }

  items.sort((left, right) => {
    const leftPriority = getFieldDefinition(model, left.path)?.summaryPriority ?? 100;
    const rightPriority = getFieldDefinition(model, right.path)?.summaryPriority ?? 100;
    return leftPriority - rightPriority || left.path.localeCompare(right.path);
  });
  return { items, unknownPaths };
};

const buildTechnicalData = (
  record: NormalizedAuditLogRecord,
  oldPayload: ParsedAuditPayload,
  newPayload: ParsedAuditPayload
) => {
  const changedFields = parseChangedFields(record.changedFields, record.model)
    .slice(0, 100)
    .map((path) => (isSensitiveAuditField(path) ? "[Đã ẩn]" : path));

  return redactAuditData({
    id: record.id,
    userId: record.userId,
    username: record.username,
    model: record.model,
    entityId: record.entityId,
    action: record.action,
    oldValues:
      oldPayload.status === "parsed"
        ? oldPayload.value
        : oldPayload.status === "invalid"
          ? "[Không thể đọc dữ liệu]"
          : null,
    newValues:
      newPayload.status === "parsed"
        ? newPayload.value
        : newPayload.status === "invalid"
          ? "[Không thể đọc dữ liệu]"
          : null,
    changedFields,
    timestamp: record.timestamp
  });
};

const addUniqueDiagnostic = (diagnostics: ActivityDiagnostic[], diagnostic: ActivityDiagnostic) => {
  if (!diagnostics.some((item) => item.code === diagnostic.code)) diagnostics.push(diagnostic);
};

export const buildActivityViewModel = (
  input: unknown,
  options: BuildActivityViewModelOptions = {}
): ActivityViewModel => {
  const record = normalizeAuditLogRecord(input);
  const action = normalizeAuditAction(record.action);
  const actionDefinition = ACTION_DEFINITIONS[action];
  const modelDefinition = getModelDefinition(record.model);
  const modelLabel = modelDefinition?.label || "Dữ liệu hệ thống";
  const sentenceLabel = modelDefinition?.sentenceLabel || "dữ liệu hệ thống";
  const actorLabel = capitalizeFirst(actorNameFromUser(record));
  const timestamp = formatAuditTimestamp(record.timestamp);
  const oldPayload = safeParseAuditPayload(record.oldValues);
  const newPayload = safeParseAuditPayload(record.newValues);
  const oldValue = getParsedValue(oldPayload);
  const newValue = getParsedValue(newPayload);
  const snapshot = pickSnapshotPayload(action, oldPayload, newPayload);
  const snapshotReferences = buildSnapshotReferences(oldValue, newValue, record.model);
  const references = mergeReferences(options.references, snapshotReferences);
  const diagnostics: ActivityDiagnostic[] = [];
  const entity = getEntityLabel(record, [snapshot, newValue, oldValue], modelLabel, references);
  let hasResolvedCurrentReferences = entity.source === "current";
  const markReferenceSource = (formatted: FormattedAuditValue) => {
    if (formatted.referenceSource === "current") hasResolvedCurrentReferences = true;
    return formatted;
  };

  if (oldPayload.status === "invalid") {
    diagnostics.push({
      code: "INVALID_OLD_VALUES",
      message: "Không đọc được dữ liệu trước thay đổi."
    });
  }
  if (newPayload.status === "invalid") {
    diagnostics.push({
      code: "INVALID_NEW_VALUES",
      message: "Không đọc được dữ liệu sau thay đổi."
    });
  }
  if (oldPayload.status === "empty" && newPayload.status === "empty") {
    diagnostics.push({ code: "MISSING_VALUES", message: "Không có dữ liệu chi tiết." });
  }
  if (!modelDefinition) {
    diagnostics.push({ code: "UNKNOWN_MODEL", message: "Loại dữ liệu chưa được hỗ trợ." });
  }
  if (action === "OTHER") {
    diagnostics.push({ code: "UNKNOWN_ACTION", message: "Loại thao tác chưa được hỗ trợ." });
  }
  if (!timestamp.valid) {
    diagnostics.push({ code: "INVALID_TIMESTAMP", message: "Thời gian thao tác không hợp lệ." });
  }

  const canComputeDiff =
    oldPayload.status !== "invalid" &&
    newPayload.status !== "invalid" &&
    (oldPayload.status === "parsed" || newPayload.status === "parsed");
  const rawDiffs =
    (action === "UPDATE" || action === "OTHER") && canComputeDiff
      ? computeAuditDiff(oldValue, newValue, record.changedFields, record.model)
      : [];
  const changes = buildChanges(rawDiffs, references, markReferenceSource);
  const unknownDiffPaths = rawDiffs.filter((diff) => !diff.mapped).map((diff) => diff.path);

  const snapshotContext =
    action === "DELETE" ? "delete" : action === "CREATE" ? "create" : "summary";
  const shouldBuildSnapshot = action === "CREATE" || action === "DELETE" || changes.length === 0;
  const snapshotResult = shouldBuildSnapshot
    ? buildSnapshotItems(record.model, snapshot, snapshotContext, references, markReferenceSource)
    : { items: [], unknownPaths: [] };
  const unknownPaths = Array.from(new Set([...unknownDiffPaths, ...snapshotResult.unknownPaths]));
  if (unknownPaths.length) {
    addUniqueDiagnostic(diagnostics, {
      code: "UNKNOWN_FIELDS",
      message: `Có ${unknownPaths.length} thông tin chưa được hỗ trợ.`,
      paths: unknownPaths
    });
  }

  let summaryItems: ActivitySummaryItem[] = changes.map((change) => ({
    type: "update",
    path: change.path,
    label: change.label,
    before: change.beforeText,
    after: change.afterText
  }));
  if (!summaryItems.length) {
    summaryItems = snapshotResult.items.map((item) => ({
      type: "snapshot",
      path: item.path,
      label: item.label,
      value: item.valueText
    }));
  }
  const hasParsedPayload = oldPayload.status === "parsed" || newPayload.status === "parsed";
  if (!hasParsedPayload && (oldPayload.status === "invalid" || newPayload.status === "invalid")) {
    summaryItems = [{ type: "fallback", message: "Không đọc được chi tiết thay đổi." }];
  } else if (!summaryItems.length && unknownPaths.length) {
    summaryItems = [
      { type: "fallback", message: `Có ${unknownPaths.length} thông tin chưa được hỗ trợ.` }
    ];
  } else if (!summaryItems.length) {
    summaryItems = [{ type: "fallback", message: "Không có dữ liệu chi tiết." }];
  }

  const title = `${actionDefinition.compactVerb} ${sentenceLabel}`;
  const fullSentenceWithoutPeriod = `${actorLabel} ${actionDefinition.verb} ${sentenceLabel}`;
  const fullSentence = timestamp.valid
    ? withPeriod(`${fullSentenceWithoutPeriod} lúc ${timestamp.time} ngày ${timestamp.date}`)
    : withPeriod(fullSentenceWithoutPeriod);
  const detailTitle =
    action === "CREATE"
      ? "Thông tin đã tạo"
      : action === "DELETE"
        ? "Thông tin đã xóa"
        : action === "UPDATE" && changes.length
          ? "Nội dung thay đổi"
          : "Thông tin ghi nhận";

  return {
    id: record.id,
    record,
    action,
    rawAction: record.action,
    actionLabel: actionDefinition.label,
    modelLabel,
    rawModel: record.model,
    entityLabel: entity.label,
    entityLabelSource: entity.source,
    entityCode: record.entityId === null ? null : String(record.entityId),
    actorLabel,
    timestampText: timestamp.text,
    timestampTime: timestamp.time,
    timestampDate: timestamp.date,
    timestampValid: timestamp.valid,
    title,
    fullSentence,
    detailTitle,
    summaryItems: summaryItems.slice(0, 3),
    summaryTotal: summaryItems.length,
    changes,
    snapshotItems: snapshotResult.items,
    diagnostics,
    technicalData: buildTechnicalData(record, oldPayload, newPayload),
    hasResolvedCurrentReferences
  };
};

export const getReferenceLabelText = (value: AuditReferenceLabel) => normalizeReferenceLabel(value);
