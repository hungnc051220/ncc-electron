import { auditLogApi, AuditLogQuery } from "@renderer/api/auditLog.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const auditLogKeys = {
  all: ["audit-log"] as const,
  getAll: (params: AuditLogQuery) => [...auditLogKeys.all, params] as const
};

export const useAuditLog = (params: AuditLogQuery) =>
  useQuery({
    queryKey: auditLogKeys.getAll(params),
    queryFn: () => auditLogApi.getAll(params),
    placeholderData: keepPreviousData
  });
