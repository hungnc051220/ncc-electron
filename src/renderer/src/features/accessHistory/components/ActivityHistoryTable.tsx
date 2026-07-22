import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  PlusCircleOutlined
} from "@ant-design/icons";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import type { ActivitySummaryItem, ActivityViewModel, AuditAction } from "../accessHistory.types";
import { Button, Empty, Space, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import type { ReactNode } from "react";

const { Text } = Typography;

interface ActivityHistoryTableProps {
  dataSource: ActivityViewModel[];
  loading?: boolean;
  pagination: TableProps<ActivityViewModel>["pagination"];
  onViewDetails: (activity: ActivityViewModel) => void;
}

interface ActionVisual {
  color?: "success" | "processing" | "error";
  icon: ReactNode;
}

const getActionVisual = (action: AuditAction): ActionVisual => {
  switch (action) {
    case "CREATE":
      return {
        color: "success",
        icon: <PlusCircleOutlined />
      };
    case "UPDATE":
      return {
        color: "processing",
        icon: <EditOutlined />
      };
    case "DELETE":
      return {
        color: "error",
        icon: <DeleteOutlined />
      };
    default:
      return {
        icon: <HistoryOutlined />
      };
  }
};

const SummaryValue = ({
  value,
  emphasized,
  layoutClassName = "flex-1"
}: {
  value: string;
  emphasized?: boolean;
  layoutClassName?: string;
}) => (
  <Text
    ellipsis={{ tooltip: value }}
    className={`min-w-0 whitespace-nowrap ${layoutClassName} ${
      emphasized ? "font-semibold" : "font-normal"
    }`}
  >
    {value}
  </Text>
);

const ActivityIdentity = ({ activity }: { activity: ActivityViewModel }) => {
  const fallbackLabel = activity.entityCode
    ? `${activity.modelLabel} #${activity.entityCode}`
    : activity.modelLabel;
  const value =
    activity.entityLabel === fallbackLabel
      ? activity.entityCode
        ? `#${activity.entityCode}`
        : "Không xác định"
      : activity.entityLabel;

  return (
    <div className="change-line flex min-w-0 items-baseline gap-1 overflow-hidden">
      <Text type="secondary" className="change-label shrink-0 font-normal">
        {activity.modelLabel}:
      </Text>
      <SummaryValue value={value} emphasized layoutClassName="entity-value flex-1" />
    </div>
  );
};

const ActivitySummary = ({ item }: { item: ActivitySummaryItem }) => {
  if (item.type === "fallback") {
    return (
      <Text type="secondary" ellipsis={{ tooltip: item.message }} className="block font-normal">
        {item.message}
      </Text>
    );
  }

  if (item.type === "snapshot") {
    return (
      <div className="change-line flex min-w-0 items-baseline gap-1">
        <Text type="secondary" className="change-label shrink-0 font-normal">
          {item.label}:
        </Text>
        <SummaryValue value={item.value} emphasized layoutClassName="change-value flex-1" />
      </div>
    );
  }

  return (
    <div className="change-line flex min-w-0 items-baseline gap-1 overflow-hidden">
      <Text type="secondary" className="change-label shrink-0 font-normal">
        {item.label}:
      </Text>
      <span className="change-values flex min-w-0 flex-1 items-baseline gap-1 overflow-hidden">
        <SummaryValue
          value={item.before}
          layoutClassName="old-value max-w-[40%] shrink-0 opacity-80 line-through decoration-1"
        />
        <span className="sr-only">thành</span>
        <Text
          type="secondary"
          className="change-arrow shrink-0 px-0.5 font-normal"
          aria-hidden="true"
        >
          →
        </Text>
        <SummaryValue value={item.after} emphasized layoutClassName="new-value flex-1" />
      </span>
    </div>
  );
};

const ActivityHistoryTable = ({
  dataSource,
  loading,
  pagination,
  onViewDetails
}: ActivityHistoryTableProps) => {
  const columns: TableProps<ActivityViewModel>["columns"] = [
    {
      title: "Hoạt động",
      key: "activity",
      width: 330,
      render: (_, activity) => {
        const visual = getActionVisual(activity.action);

        return (
          <div className="min-w-0">
            <Space size={6} wrap>
              <Tag
                className={`activity-action-badge m-0 inline-flex items-center justify-center whitespace-nowrap ${
                  activity.action === "OTHER" ? "min-w-[84px]" : "w-[84px]"
                }`}
                color={visual.color}
                icon={visual.icon}
              >
                {activity.actionLabel}
              </Tag>
              <Text strong className="leading-5">
                {activity.title}
              </Text>
            </Space>
            <div className="mt-1 space-y-0.5 lg:hidden">
              <Text type="secondary" className="block text-xs">
                {activity.modelLabel}
              </Text>
              <Text type="secondary" className="block text-xs">
                {activity.actorLabel} · {activity.timestampText}
              </Text>
            </div>
          </div>
        );
      }
    },
    {
      title: "Loại dữ liệu",
      key: "modelType",
      width: 190,
      className: "align-middle",
      responsive: ["lg"],
      render: (_, activity) => (
        <Text ellipsis={{ tooltip: activity.modelLabel }} className="block font-medium">
          {activity.modelLabel}
        </Text>
      )
    },
    {
      title: "Nội dung thay đổi",
      key: "summaries",
      width: 420,
      render: (_, activity) => {
        const showIdentity = activity.action === "UPDATE";
        const visibleSummaries = activity.summaryItems.slice(0, 2);
        const hiddenCount = Math.max(activity.summaryTotal - visibleSummaries.length, 0);

        if (!showIdentity && visibleSummaries.length === 0) {
          return <Text type="secondary">Không có dữ liệu chi tiết</Text>;
        }

        return (
          <div className="min-w-0 space-y-1">
            {showIdentity && <ActivityIdentity activity={activity} />}
            {visibleSummaries.map((summary, index) => (
              <ActivitySummary
                key={`${activity.id}-${summary.type === "fallback" ? `fallback-${index}` : summary.path}`}
                item={summary}
              />
            ))}
            {hiddenCount > 0 && (
              <Text type="secondary" className="block text-xs font-normal">
                +{hiddenCount} thay đổi khác
              </Text>
            )}
          </div>
        );
      }
    },
    {
      title: "Người thực hiện",
      key: "actor",
      width: 170,
      responsive: ["lg"],
      render: (_, activity) => (
        <Text ellipsis={{ tooltip: activity.actorLabel }}>{activity.actorLabel}</Text>
      )
    },
    {
      title: "Thời gian",
      key: "timestamp",
      width: 125,
      responsive: ["lg"],
      render: (_, activity) => (
        <div>
          <Text strong className="block">
            {activity.timestampTime}
          </Text>
          {activity.timestampValid && (
            <Text type="secondary" className="block text-xs">
              {activity.timestampDate}
            </Text>
          )}
        </div>
      )
    },
    {
      title: "Chi tiết",
      key: "details",
      width: 125,
      fixed: "right",
      align: "center",
      render: (_, activity) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          aria-label={`Xem chi tiết hoạt động ${activity.id}`}
          onClick={() => onViewDetails(activity)}
        >
          Xem chi tiết
        </Button>
      )
    }
  ];

  return (
    <AutoHeightTable<ActivityViewModel>
      dataSource={dataSource}
      columns={columns}
      rowKey={(activity) => String(activity.id)}
      bordered
      size="small"
      loading={loading}
      pagination={pagination}
      locale={{
        emptyText: (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử hoạt động" />
        )
      }}
      scroll={{ x: 1120 }}
    />
  );
};

export default ActivityHistoryTable;
