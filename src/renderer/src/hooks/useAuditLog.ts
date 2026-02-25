import { auditLogApi, AuditLogQuery } from "@renderer/api/auditLog.api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useAuditLog = (params: AuditLogQuery) =>
  useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => auditLogApi.getAll(params),
    placeholderData: keepPreviousData
  });
