import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import { MoreOutlined } from "@ant-design/icons";
import { useHolidays } from "@renderer/hooks/holidays/useHolidays";
import { formatNumber, compareText } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { HolidayProps } from "@shared/types";
import type { PaginationProps, TableProps, TabsProps } from "antd";
import { Button, DatePicker, Dropdown, Tabs } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteHolidayDialog from "./components/DeleteHolidayDialog";
import HolidayDialog from "./components/HolidayDialog";

const items: TabsProps["items"] = [
  {
    key: "1",
    label: "Ngày thường"
  },
  {
    key: "2",
    label: "Ngày lễ"
  }
];

const formatWeekday = (date: string) => {
  const text = dayjs(date).format("dddd");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const HolidaysPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HolidayProps | null>(null);
  const [activeKey, setActiveKey] = useState("1");
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [year, setYear] = useState<Dayjs>(dayjs());

  const params = useMemo(
    () => ({
      current,
      pageSize,
      dateTypeId: Number(activeKey),
      year: year.year()
    }),
    [current, pageSize, activeKey, year]
  );

  const { data: holidays, isFetching, refetch } = useHolidays(params);
  const { can } = usePermission();
  const canUpdate = can("holidays", "update");
  const canDelete = can("holidays", "delete");

  const handleDelete = useCallback((item: HolidayProps) => {
    setEditingItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  }, []);

  const actionItems = canDelete
    ? [{ key: "1", icon: <Trash2 size={16} />, label: "Xóa", danger: true }]
    : [];

  const columns: TableProps<HolidayProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Ngày",
      key: "dateValue",
      dataIndex: "dateValue",
      sorter: (a, b) => dayjs(a.dateValue).valueOf() - dayjs(b.dateValue).valueOf(),
      render: (value: string) => dayjs(value).format("DD/MM/YYYY")
    },
    {
      title: "Thứ",
      key: "dateValue",
      dataIndex: "dateValue",
      sorter: (a, b) => compareText(formatWeekday(a.dateValue), formatWeekday(b.dateValue)),
      render: (value: string) => formatWeekday(value)
    },
    {
      title: "Loại ngày",
      key: "dateTypeId",
      dataIndex: "dateTypeId",
      sorter: (a, b) => a.dateTypeId - b.dateTypeId,
      render: (value: number) => (value === 1 ? "Ngày thường" : "Ngày lễ")
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: HolidayProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "1") {
                      handleDelete(record);
                    }
                  }
                }}
                arrow
                trigger={["click"]}
              >
                <MoreOutlined />
              </Dropdown>
            ),
            align: "center" as const,
            fixed: "right" as const
          }
        ]
      : [])
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <DatePicker
              picker="year"
              defaultValue={year}
              onChange={(date) => setYear(date!)}
              allowClear={false}
            />
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
            {canUpdate && (
              <Button type="primary" onClick={() => setDialogOpen(true)}>
                Cập nhật lại ngày
              </Button>
            )}
          </>
        }
      />

      <Tabs
        defaultActiveKey="ALL"
        activeKey={activeKey}
        type="card"
        onChange={(newActiveKey) => {
          setActiveKey(newActiveKey);
          setCurrent(1);
        }}
        items={items}
      />

      <AutoHeightTable
        rowKey={(record) => record.dateValue}
        dataSource={holidays?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: holidays?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <HolidayDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          year={year.year()}
          dateTypeId={Number(activeKey)}
        />
      )}

      {deleteDialogOpen && editingItem && (
        <DeleteHolidayDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={editingItem.dateValue}
          date={editingItem.dateValue}
        />
      )}
    </div>
  );
};

export default HolidaysPage;
