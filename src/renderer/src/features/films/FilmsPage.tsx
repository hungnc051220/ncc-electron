import Icon, { MoreOutlined } from "@ant-design/icons";
import type { TableProps, TabsProps, PaginationProps } from "antd";
import { Breadcrumb, Button, Dropdown, Table, Tabs } from "antd";
import dayjs from "dayjs";
import { Check, PlusIcon, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DeleteFilmDialog from "./components/DeleteFilmDialog";
import FilmDialog from "./components/FilmDialog";
import Filter from "./components/Filter";
import type { Dayjs } from "dayjs";
import { FilmProps } from "@shared/types";
import { filterEmptyValues, formatMoney, formatNumber } from "@renderer/lib/utils";
import { useFilms } from "@renderer/hooks/films/useFilms";
import { useGeneralData } from "@renderer/hooks/useGeneralData";
import { Link } from "react-router";

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

const actionItems = [
  { key: "1", label: "Cập nhật" },
  { key: "2", label: <p className="text-red-500">Xóa</p> }
];

export interface ValuesProps {
  filmName?: string;
  manufacturerId?: number;
  premieredDay?: Dayjs | null;
}

const FilmsPage = () => {
  const [activeKey, setActiveKey] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<FilmProps | null>(null);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterValues, setFilterValues] = useState<ValuesProps>({});

  const params = useMemo(() => {
    const filtered = filterEmptyValues(filterValues as Record<string, unknown>);

    if (filtered.premieredDay) {
      filtered.premieredDay = dayjs(filtered.premieredDay as Dayjs).format("YYYY-MM-DD");
    }

    return {
      current,
      pageSize,
      tabCode: activeKey,
      ...filtered
    };
  }, [current, pageSize, activeKey, filterValues]);

  const { data: films, isFetching } = useFilms(params);
  const { data: generalData } = useGeneralData();

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
      fixed: "left",
      width: "40%"
    },
    {
      title: "Phiên bản",
      key: "versionCode",
      dataIndex: "versionCode",
      width: 90,
      align: "center"
    },
    {
      title: "Hãng phát hành",
      key: "manufacturerId",
      dataIndex: "manufacturerId",
      render: (value: number) => generalData?.manufacturers.find((m) => m.id === value)?.name || ""
    },
    {
      title: "Ngày khởi chiếu",
      key: "premieredDay",
      dataIndex: "premieredDay",
      render: (value: string) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
      width: 130
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (value: number) => `${value} phút`,
      align: "right",
      width: 100
    },
    {
      title: "Nước sản xuất",
      key: "countryName",
      dataIndex: "countryName",
      render: (_, record) => record.country?.name
    },
    {
      title: "Giá cộng thêm",
      key: "proposedPrice",
      dataIndex: "proposedPrice",
      render: (value: number) => formatMoney(value || 0),
      align: "right"
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
      width: 100
    },
    {
      title: "",
      key: "operation",
      width: 50,
      render: (_, record) => (
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
      align: "center",
      fixed: "right"
    }
  ];

  const onSearch = (values: ValuesProps) => {
    setFilterValues(values);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div className="mt-4 px-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Quản lý danh sách"
            },
            {
              title: "Danh sách phim"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <Filter
            onSearch={onSearch}
            filterValues={filterValues}
            setCurrent={setCurrent}
            manufacturers={generalData?.manufacturers || []}
          />
          <Button type="primary" onClick={handleAdd} icon={<Icon component={PlusIcon} />}>
            Thêm phim
          </Button>
        </div>
      </div>

      <Tabs
        defaultActiveKey="ALL"
        activeKey={activeKey}
        onChange={(newActiveKey) => {
          setActiveKey(newActiveKey);
          setCurrent(1);
        }}
        items={items}
      />

      <Table
        rowKey={(record) => record.id}
        dataSource={films?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ x: "max-content", y: "calc(100vh - 315px)" }}
        loading={isFetching}
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
          manufactureres={generalData?.manufacturers || []}
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
