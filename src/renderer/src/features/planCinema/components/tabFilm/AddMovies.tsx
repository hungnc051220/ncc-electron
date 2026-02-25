import { useFilms } from "@renderer/hooks/films/useFilms";
import { useCreatePlanFilm } from "@renderer/hooks/planFilms/useCreatePlanFilm";
import { formatMoney, formatNumber } from "@renderer/lib/utils";
import { ApiError, FilmProps, PlanFilmProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Button, Input, message, Modal, Table } from "antd";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";

type TableRowSelection<T extends object = object> = TableProps<T>["rowSelection"];

interface AddMoviesProps {
  planCinemaId: number;
  selectedFilmIds: number[];
  planFilms?: PlanFilmProps[];
}

const AddMovies = ({ planCinemaId, selectedFilmIds }: AddMoviesProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pickedFilmIds, setPickedFilmIds] = useState<number[]>([]);

  const params = useMemo(
    () => ({
      current,
      pageSize,
      filmName: debouncedSearch
    }),
    [current, pageSize, debouncedSearch]
  );

  const { data, isFetching } = useFilms(params);
  const createPlanFilm = useCreatePlanFilm();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setCurrent(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const preselectedFilmIds = useMemo(() => new Set(selectedFilmIds ?? []), [selectedFilmIds]);

  const columns: TableProps<FilmProps>["columns"] = [
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName"
    },
    {
      title: "Phiên bản",
      key: "versionCode",
      dataIndex: "versionCode"
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (value: number) => `${value} phút`
    },
    {
      title: "Giá cộng thêm",
      key: "proposedPrice",
      dataIndex: "proposedPrice",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 200
    }
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setPickedFilmIds((prev) => {
      const pageFilmIds = data?.data.map((f) => f.id) ?? [];

      const newKeys = newSelectedRowKeys as number[];

      const prevWithoutCurrentPage = prev.filter((id) => !pageFilmIds.includes(id));

      return [...prevWithoutCurrentPage, ...newKeys];
    });
  };

  const rowSelection: TableRowSelection<FilmProps> = {
    selectedRowKeys: pickedFilmIds,
    onChange: onSelectChange,
    getCheckboxProps: (record) => ({
      disabled: preselectedFilmIds.has(record.id)
    })
  };

  const onCancel = () => {
    setPickedFilmIds([]);
    setSearchValue("");
    setOpen(false);
  };

  const onOk = (data: number[]) => {
    const dto = data.map((filmId, index) => ({
      planCinemaId,
      filmId,
      order: index
    }));

    createPlanFilm.mutate(dto, {
      onSuccess: () => {
        setPickedFilmIds([]);
        message.success("Thêm phim cho kế hoạch thành công");
        setOpen(false);
      },
      onError: (error: unknown) => {
        let msg = "Thêm phim cho kế hoạch thất bại";

        if (axios.isAxiosError<ApiError>(error)) {
          msg = error.response?.data?.message ?? msg;
        }

        message.error(msg);
      }
    });
  };

  return (
    <>
      <Button variant="outlined" color="primary" onClick={() => setOpen(true)}>
        Thêm phim cho kế hoạch
      </Button>
      <Modal
        title="Thêm phim cho kế hoạch"
        open={open}
        onCancel={onCancel}
        width={1000}
        centered
        onOk={() => {
          if (pickedFilmIds.length > 0) {
            onOk([...selectedFilmIds, ...pickedFilmIds]);
          }
        }}
        okButtonProps={{
          loading: createPlanFilm.isPending
        }}
        cancelButtonProps={{
          disabled: createPlanFilm.isPending
        }}
      >
        <div className="space-y-4">
          <Input
            placeholder="Tìm kiếm phim..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <Table
            rowKey={(record) => record.id}
            dataSource={data?.data || []}
            columns={columns}
            bordered
            size="small"
            scroll={{ x: "max-content", y: 500 }}
            loading={isFetching}
            pagination={{
              current,
              onChange,
              total: data?.total || 0,
              size: "middle",
              pageSize,
              pageSizeOptions: [20, 50, 100],
              showSizeChanger: true,
              onShowSizeChange,
              showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
            }}
            rowSelection={rowSelection}
          />
        </div>
      </Modal>
    </>
  );
};

export default AddMovies;
