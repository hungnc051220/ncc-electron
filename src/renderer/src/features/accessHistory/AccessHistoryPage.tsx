import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { auditLogKeys, useAuditLog } from "@renderer/hooks/useAuditLog";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Alert, Button } from "antd";
import { useMemo, useState } from "react";
import { normalizeAuditLogRecord } from "./accessHistory.parser";
import { buildActivityViewModel } from "./accessHistory.presenter";
import { getFieldDefinition } from "./accessHistory.registry";
import type { ActivityViewModel } from "./accessHistory.types";
import ActivityDetailsDrawer from "./components/ActivityDetailsDrawer";
import ActivityHistoryTable from "./components/ActivityHistoryTable";
import Filter, {
  type AccessHistoryActorOption,
  type AccessHistoryFilterValues
} from "./components/Filter";
import {
  useAuditReferenceLabels,
  type AuditReferenceKind,
  type AuditReferenceRecordScope
} from "./hooks/useAuditReferenceLabels";

const VISIBLE_SUMMARY_COUNT = 2;

const getVisibleReferenceKinds = (activity: ActivityViewModel): AuditReferenceKind[] => {
  const paths = activity.changes.length
    ? activity.changes.slice(0, VISIBLE_SUMMARY_COUNT).map((change) => change.path)
    : activity.snapshotItems.slice(0, VISIBLE_SUMMARY_COUNT).map((item) => item.path);

  return [
    ...new Set(
      paths.flatMap((path) => {
        const definition = getFieldDefinition(activity.record.model, path);
        if (definition?.kind === "relation" && definition.relation) return [definition.relation];
        if (definition?.kind === "ticketPrice") return ["seatType" as const];
        return [];
      })
    )
  ];
};

const AccessHistoryPage = () => {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isFetchingAuditLog = useIsFetching({ queryKey: auditLogKeys.all }) > 0;
  const [filterValues, setFilterValues] = useState<AccessHistoryFilterValues>({});
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedActivity, setSelectedActivity] = useState<ActivityViewModel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const queryParams = useMemo(
    () => ({
      current,
      pageSize,
      userId: filterValues.userId,
      model: filterValues.model,
      fromDate: filterValues.dateRange?.[0],
      toDate: filterValues.dateRange?.[1]
    }),
    [current, filterValues, pageSize]
  );

  const { data, isFetching, isError, refetch } = useAuditLog(queryParams);
  const records = useMemo(
    () => (data?.data ?? []).map((record) => normalizeAuditLogRecord(record)),
    [data?.data]
  );
  const baseActivities = useMemo(
    () => records.map((record) => buildActivityViewModel(record.raw)),
    [records]
  );
  const listReferenceScopes = useMemo<AuditReferenceRecordScope[]>(
    () =>
      baseActivities.map((activity) => ({
        record: activity.record,
        kinds: getVisibleReferenceKinds(activity),
        includeEntity: activity.action === "UPDATE"
      })),
    [baseActivities]
  );
  const { references: listReferences } = useAuditReferenceLabels(
    listReferenceScopes,
    listReferenceScopes.length > 0
  );
  const activities = useMemo(
    () =>
      records.map((record) => buildActivityViewModel(record.raw, { references: listReferences })),
    [listReferences, records]
  );

  const observedActorOptions = useMemo<AccessHistoryActorOption[]>(() => {
    const actors = new Map<number, string>();

    activities.forEach((activity) => {
      if (activity.record.userId !== null) {
        actors.set(activity.record.userId, activity.actorLabel);
      }
    });

    return [...actors].map(([value, label]) => ({ value, label }));
  }, [activities]);

  const { references: selectedReferences } = useAuditReferenceLabels(
    selectedActivity?.record ?? null,
    drawerOpen
  );

  const resolvedSelectedActivity = useMemo(
    () =>
      selectedActivity
        ? buildActivityViewModel(selectedActivity.record.raw, { references: selectedReferences })
        : null,
    [selectedActivity, selectedReferences]
  );

  const updateFilters = (values: AccessHistoryFilterValues) => {
    setCurrent(1);
    setFilterValues(values);
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4 pb-3">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <Filter
              filterValues={filterValues}
              observedActorOptions={observedActorOptions}
              onSearch={updateFilters}
            />
            <RefreshButton
              loading={isFetchingAuditLog}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: auditLogKeys.all })}
            />
          </>
        }
      />

      {isError && (
        <Alert
          type="error"
          showIcon
          title="Không thể tải lịch sử hoạt động"
          description="Vui lòng kiểm tra kết nối và thử lại."
          action={
            <Button size="small" onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <ActivityHistoryTable
          dataSource={activities}
          loading={isFetching}
          onViewDetails={(activity) => {
            setSelectedActivity(activity);
            setDrawerOpen(true);
          }}
          pagination={{
            current,
            pageSize,
            total: data?.total ?? 0,
            size: "middle",
            pageSizeOptions: [20, 50, 100],
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
            onChange: (nextPage, nextPageSize) => {
              const pageSizeChanged = nextPageSize !== pageSize;
              setPageSize(nextPageSize);
              setCurrent(pageSizeChanged ? 1 : nextPage);
              setDrawerOpen(false);
            }
          }}
        />
      </div>

      <ActivityDetailsDrawer
        activity={resolvedSelectedActivity}
        open={drawerOpen}
        canViewTechnicalData={can("access_history", "view")}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};

export default AccessHistoryPage;
