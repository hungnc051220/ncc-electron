import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import { useFilmCategories } from "@renderer/hooks/filmCategories/useFilmCategories";
import { formatNumber, compareText } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { FilmCategoryProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Dropdown } from "antd";
import { PlusIcon, SquarePen, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteFilmCategoryDialog from "./components/DeleteFilmCategoryDialog";
import FilmCategoryDialog from "./components/FilmCategoryDialog";
import dayjs from "dayjs";

const FilmCategoriesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedFilmCategory, setSelectedFilmCategory] = useState<FilmCategoryProps | null>(null);

  const params = useMemo(
    () => ({
      current,
      pageSize
    }),
    [current, pageSize]
  );

  const { data: filmCategories, isFetching } = useFilmCategories(params);
  const { can } = usePermission();
  const canCreate = can("films", "create");
  const canUpdate = can("films", "update");
  const canDelete = can("films", "delete");

  const handleAdd = useCallback(() => {
    setSelectedFilmCategory(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: FilmCategoryProps) => {
    setSelectedFilmCategory(item);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((item: FilmCategoryProps) => {
    setSelectedFilmCategory(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedFilmCategory(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedFilmCategory(null);
    }
  }, []);

  const actionItems = [
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
  ];

  const columns: TableProps<FilmCategoryProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Tên thể loại",
      key: "name",
      dataIndex: "name",
      sorter: (a, b) => compareText(a.name, b.name)
    },
    {
      title: "Mô tả",
      key: "description",
      dataIndex: "description",
      sorter: (a, b) => compareText(a.description, b.description),
      render: (value?: string) => value || "-"
    },
    {
      title: "Thời gian tạo",
      key: "createdOnUtc",
      dataIndex: "createdOnUtc",
      sorter: (a, b) => dayjs(a.createdOnUtc).valueOf() - dayjs(b.createdOnUtc).valueOf(),
      render: (value?: string) => (value ? dayjs(value).format("HH:mm DD/MM/YYYY") : "-"),
      width: 150
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: FilmCategoryProps) => (
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: (e) => {
                    if (e.key === "1") {
                      handleEdit(record);
                    }
                    if (e.key === "2") {
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

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (page, size) => {
    setCurrent(page);
    setPageSize(size);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          canCreate ? (
            <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
              Thêm thể loại phim
            </Button>
          ) : undefined
        }
      />

      <AutoHeightTable
        rowKey={(record) => record.id}
        dataSource={filmCategories?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        pagination={{
          current,
          onChange,
          total: filmCategories?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <FilmCategoryDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingFilmCategory={selectedFilmCategory}
        />
      )}
      {selectedFilmCategory && deleteDialogOpen && (
        <DeleteFilmCategoryDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedFilmCategory.id}
          name={selectedFilmCategory.name}
        />
      )}
    </div>
  );
};

export default FilmCategoriesPage;
