import {
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusCircleOutlined
} from "@ant-design/icons";
import type {
  ActivitySnapshotItem,
  ActivityViewModel,
  AuditAction,
  AuditChange
} from "../accessHistory.types";
import { Collapse, Drawer, Empty, Grid, Space, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import type { ReactNode } from "react";

const { Paragraph, Text, Title } = Typography;

interface ActivityDetailsDrawerProps {
  activity: ActivityViewModel | null;
  open: boolean;
  canViewTechnicalData?: boolean;
  onClose: () => void;
}

const getActionPresentation = (
  action: AuditAction
): { color?: "success" | "processing" | "error"; icon: ReactNode } => {
  switch (action) {
    case "CREATE":
      return { color: "success", icon: <PlusCircleOutlined /> };
    case "UPDATE":
      return { color: "processing", icon: <EditOutlined /> };
    case "DELETE":
      return { color: "error", icon: <DeleteOutlined /> };
    default:
      return { icon: <HistoryOutlined /> };
  }
};

const isFilmItem = (item: ActivitySnapshotItem) =>
  item.path === "filmId" || item.label === "Phim" || item.label === "Tên phim";

const isPlanCinemaItem = (item: ActivitySnapshotItem) =>
  item.path === "planCinemaId" || item.label === "Kế hoạch chiếu";

const isTicketPriceItem = (item: ActivitySnapshotItem) =>
  item.path.startsWith("priceOfPosition") || item.label.startsWith("Giá vé");

const SnapshotValue = ({ item }: { item: ActivitySnapshotItem }) => {
  if (isFilmItem(item)) {
    return (
      <Paragraph
        className="audit-snapshot-value audit-snapshot-value--film mb-0! font-semibold"
        ellipsis={{ rows: 2, tooltip: item.valueText }}
      >
        {item.valueText}
      </Paragraph>
    );
  }

  if (isTicketPriceItem(item)) {
    return (
      <Text
        className="audit-snapshot-value audit-snapshot-value--price block min-w-0 font-semibold"
        ellipsis={{ tooltip: item.valueText }}
      >
        {item.valueText}
      </Text>
    );
  }

  return (
    <Text className="audit-snapshot-value block min-w-0 wrap-break-word font-semibold">
      {item.valueText}
    </Text>
  );
};

const SnapshotDetails = ({ items }: { items: ActivitySnapshotItem[] }) => {
  if (items.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu chi tiết" />;
  }

  return (
    <div
      className="audit-info-grid grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-2 dark:border-app-border dark:bg-app-border"
      data-testid="audit-info-grid"
    >
      {items.map((item) => {
        const isFullWidth = isPlanCinemaItem(item);

        return (
          <div
            key={item.path}
            className={`audit-info-item grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-stretch bg-white sm:grid-cols-[140px_minmax(0,1fr)] dark:bg-app-bg-container ${
              isFullWidth ? "audit-info-item--full md:col-span-2" : ""
            }`}
          >
            <Text
              type="secondary"
              className="audit-info-label flex min-h-11 items-center bg-slate-50 px-3 py-2 text-sm wrap-break-word dark:bg-app-bg"
            >
              {item.label}
            </Text>
            <div className="audit-info-value flex min-w-0 items-center px-3 py-2">
              <SnapshotValue item={item} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChangesTable = ({ changes }: { changes: AuditChange[] }) => {
  if (changes.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thay đổi nghiệp vụ" />;
  }

  const columns: TableProps<AuditChange>["columns"] = [
    {
      title: "Thông tin",
      dataIndex: "label",
      key: "label",
      width: "32%",
      render: (label: string) => <Text className="wrap-break-word font-medium">{label}</Text>
    },
    {
      title: "Trước thay đổi",
      dataIndex: "beforeText",
      key: "beforeText",
      width: "34%",
      render: (value: string) => (
        <Text type="secondary" className="wrap-break-word">
          {value}
        </Text>
      )
    },
    {
      title: "Sau thay đổi",
      dataIndex: "afterText",
      key: "afterText",
      width: "34%",
      render: (value: string) => <Text className="wrap-break-word font-semibold">{value}</Text>
    }
  ];

  return (
    <Table<AuditChange>
      rowKey="path"
      columns={columns}
      dataSource={changes}
      pagination={false}
      bordered
      size="small"
      tableLayout="fixed"
    />
  );
};

const ActivityMetadata = ({ activity }: { activity: ActivityViewModel }) => {
  const items = [
    { label: "Loại dữ liệu", value: activity.modelLabel },
    { label: "Người thực hiện", value: activity.actorLabel },
    { label: "Thời gian", value: activity.timestampText }
  ];

  return (
    <div
      className="activity-meta overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-app-border dark:bg-app-bg-container"
      data-testid="activity-meta"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`activity-meta-row grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-stretch sm:grid-cols-[140px_minmax(0,1fr)] ${
            index < items.length - 1 ? "border-b border-slate-200 dark:border-app-border" : ""
          }`}
        >
          <Text
            type="secondary"
            className="activity-meta-label flex min-h-11 items-center bg-slate-50 px-3 py-2 text-sm dark:bg-app-bg"
          >
            {item.label}
          </Text>
          <Text className="activity-meta-value flex min-w-0 items-center px-3 py-2 font-semibold wrap-break-word">
            {item.value}
          </Text>
        </div>
      ))}
    </div>
  );
};

const ResolvedEntityIdentity = ({ activity }: { activity: ActivityViewModel }) => {
  if (!activity.entityLabelSource) return null;

  return (
    <div className="activity-entity-identity mb-3 grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-[140px_minmax(0,1fr)] dark:border-app-border dark:bg-app-bg-container">
      <Text
        type="secondary"
        className="flex min-h-11 items-center bg-slate-50 px-3 py-2 text-sm dark:bg-app-bg"
      >
        {activity.modelLabel}
      </Text>
      <Text className="flex min-w-0 items-center px-3 py-2 font-semibold wrap-break-word">
        {activity.entityLabel}
      </Text>
    </div>
  );
};

const ActivityDetailsDrawer = ({
  activity,
  open,
  canViewTechnicalData,
  onClose
}: ActivityDetailsDrawerProps) => {
  const screens = Grid.useBreakpoint();

  if (!activity) {
    return null;
  }

  const actionPresentation = getActionPresentation(activity.action);
  const showChanges = activity.changes.length > 0;
  const drawerWidth = screens.xl ? 860 : screens.lg ? "64vw" : "96vw";

  return (
    <Drawer
      title="Chi tiết hoạt động"
      open={open}
      onClose={onClose}
      size={drawerWidth}
      classNames={{ body: "overflow-x-hidden" }}
      styles={{ body: { overflowX: "hidden" } }}
      destroyOnHidden
    >
      <div>
        <Space size={8} wrap>
          <Tag color={actionPresentation.color} icon={actionPresentation.icon}>
            {activity.actionLabel}
          </Tag>
          <Text strong>{activity.fullSentence}</Text>
        </Space>

        <div className="mt-4">
          <ActivityMetadata activity={activity} />
        </div>

        <section className="mt-6" aria-labelledby="activity-details-heading">
          <Title level={5} id="activity-details-heading" className="mb-3!">
            {activity.detailTitle}
          </Title>
          {showChanges ? (
            <>
              <ResolvedEntityIdentity activity={activity} />
              <ChangesTable changes={activity.changes} />
            </>
          ) : (
            <SnapshotDetails items={activity.snapshotItems} />
          )}
        </section>

        {canViewTechnicalData && (
          <Collapse
            className="mt-5"
            size="small"
            destroyOnHidden
            items={[
              {
                key: "technical-data",
                label: "Dữ liệu kỹ thuật",
                children: (
                  <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(activity.technicalData, null, 2)}
                  </pre>
                )
              }
            ]}
          />
        )}
      </div>
    </Drawer>
  );
};

export default ActivityDetailsDrawer;
