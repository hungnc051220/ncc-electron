import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import type { TableProps, TabsProps, PaginationProps } from "antd";
import { Button, Dropdown, Tabs } from "antd";
import dayjs from "dayjs";
import { Check, PlusIcon, SquarePen, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteFilmDialog from "./components/DeleteFilmDialog";
import FilmDialog from "./components/FilmDialog";
import Filter from "./components/Filter";
import type { Dayjs } from "dayjs";
import { FilmProps } from "@shared/types";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import { useFilms } from "@renderer/hooks/films/useFilms";
import { useGeneralData } from "@renderer/hooks/useGeneralData";
import { usePermission } from "@renderer/permissions/usePermission";

const items: TabsProps["items"] = [
  {
    key: "ALL",
    label: "Danh sách phim"
  },
  {
    key: "FILM_HOME_PAGE",
    label: "Phim trên trang chủ"
  },
  {
    key: "FILM_ON_PLAN",
    label: "Phim trên kế hoạch"
  }
];

export interface ValuesProps {
  filmName?: string;
  manufacturerId?: number;
  premieredDay?: Dayjs | null;
  premieredYear?: Dayjs | null;
  countryId?: number;
}

type ServerSortField = "filmName" | "proposedPrice";
type ServerSortState = {
  field: ServerSortField;
  order: "ascend" | "descend";
} | null;

const serverSortFields: ServerSortField[] = ["filmName", "proposedPrice"];

const isServerSortField = (columnKey: React.Key | undefined): columnKey is ServerSortField =>
  typeof columnKey === "string" && serverSortFields.includes(columnKey as ServerSortField);

const FilmsPage = () => {
  const [activeKey, setActiveKey] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<FilmProps | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});
  const [serverSort, setServerSort] = useState<ServerSortState>(null);

  const params = useMemo(() => {
    const filtered = filterEmptyValues(filterValues as Record<string, unknown>);

    if (filtered.premieredDay) {
      filtered.premieredDay = dayjs(filtered.premieredDay as Dayjs).format("YYYY-MM-DD");
    }

    if (filtered.premieredYear) {
      filtered.premieredYear = dayjs(filtered.premieredYear as Dayjs).format("YYYY");
    }

    return {
      current,
      pageSize,
      tabCode: activeKey,
      sortBy: serverSort
        ? `${serverSort.field}.${serverSort.order === "ascend" ? "asc" : "desc"}`
        : undefined,
      ...filtered
    };
  }, [current, pageSize, activeKey, filterValues, serverSort]);

  const { data: films, isFetching, refetch } = useFilms(params);
  const { data: generalData } = useGeneralData();

  const { can } = usePermission();
  const canCreate = can("films", "create");
  const canUpdate = can("films", "update");
  const canDelete = can("films", "delete");

  const manufacturerMap = useMemo(
    () =>
      new Map(
        (generalData?.manufacturers || []).map(
          (manufacturer) => [manufacturer.id, manufacturer.name] as const
        )
      ),
    [generalData?.manufacturers]
  );

  const handleAdd = useCallback(() => {
    setSelectedFilm(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((film: FilmProps) => {
    setSelectedFilm(film);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((film: FilmProps) => {
    setSelectedFilm(film);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedFilm(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setSelectedFilm(null);
    }
  }, []);

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const actionItems = [
    ...(canUpdate ? [{ key: "1", icon: <SquarePen size={16} />, label: "Cập nhật" }] : []),
    ...(canDelete ? [{ key: "2", icon: <Trash2 size={16} />, label: "Xóa", danger: true }] : [])
  ];

  const columns: TableProps<FilmProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      sorter: true,
      sortOrder: serverSort?.field === "filmName" ? serverSort.order : null,
      fixed: "left",
      width: 400
    },
    {
      title: "Phiên bản",
      key: "versionCode",
      dataIndex: "versionCode",
      width: 100,
      align: "center"
    },
    {
      title: "Hãng phát hành",
      key: "manufacturerId",
      dataIndex: "manufacturerId",
      render: (value: number) => manufacturerMap.get(value) || "",
      width: 200
    },
    {
      title: "Ngày khởi chiếu",
      key: "premieredDay",
      dataIndex: "premieredDay",
      render: (value: string) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
      width: 150,
      align: "center"
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (value: number) => `${value} phút`,
      align: "right",
      width: 150
    },
    {
      title: "Nước sản xuất",
      key: "countryName",
      dataIndex: "countryName",
      render: (_, record) => record.country?.name,
      width: 150
    },
    {
      title: "Giá cộng thêm",
      key: "proposedPrice",
      dataIndex: "proposedPrice",
      sorter: true,
      sortOrder: serverSort?.field === "proposedPrice" ? serverSort.order : null,
      render: (value: number) => formatMoney(value || 0),
      align: "right",
      width: 150
    },
    {
      title: "Bán online",
      key: "sellOnline",
      dataIndex: "sellOnline",
      render: (value: boolean) => (
        <div className="flex items-center justify-center">
          {value ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <X className="size-4 text-red-500" />
          )}
        </div>
      ),
      align: "center",
      width: 150
    },
    ...(actionItems.length
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            render: (_: unknown, record: FilmProps) => (
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

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  const handleTableChange: TableProps<FilmProps>["onChange"] = (_, __, sorter, extra) => {
    if (extra.action !== "sort") {
      return;
    }

    const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const nextServerSort =
      isServerSortField(currentSorter?.columnKey) && currentSorter.order
        ? {
            field: currentSorter.columnKey,
            order: currentSorter.order
          }
        : null;

    setServerSort(nextServerSort);
    setCurrent(1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <>
            <Filter
              onSearch={onSearch}
              filterValues={filterValues}
              setCurrent={setCurrent}
              countries={generalData?.countries || []}
            />
            <RefreshButton loading={isFetching} onRefresh={() => refetch()} />
            {canCreate && (
              <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
                Thêm phim
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
        rowKey={(record) => record.id}
        dataSource={films?.data || []}
        columns={columns}
        bordered
        size="small"
        loading={isFetching}
        onChange={handleTableChange}
        pagination={{
          current,
          onChange,
          total: films?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />

      {dialogOpen && (
        <FilmDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingFilm={selectedFilm}
          versions={generalData?.filmVersions || []}
          countries={generalData?.countries || []}
          languages={generalData?.languages || []}
          filmStatuses={generalData?.filmStatuses || []}
        />
      )}
      {selectedFilm && (
        <DeleteFilmDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={selectedFilm.id}
          filmName={selectedFilm.filmName}
        />
      )}
    </div>
  );
};

export default FilmsPage;
