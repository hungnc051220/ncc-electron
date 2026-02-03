"use client";

import { getFilms } from "@/data/loaders";
import { formatMoney, formatNumber } from "@/lib/utils";
import { FilmProps, PlanFilmProps } from "@/types";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationProps, TableProps } from "antd";
import { Button, Input, Modal, Table } from "antd";
import axios from "axios";
import queryString from "query-string";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type TableRowSelection<T extends object = object> =
  TableProps<T>["rowSelection"];

interface AddMoviesProps {
  planCinemaId: number;
  selectedFilmIds: number[];
  planFilms?: PlanFilmProps[];
}

const AddMovies = ({ planCinemaId, selectedFilmIds }: AddMoviesProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pickedFilmIds, setPickedFilmIds] = useState<number[]>([]);

  const { data, isFetching } = useQuery({
    queryKey: ["films", { current, pageSize, debouncedSearch }],
    queryFn: () => {
      const query = queryString.stringify(
        {
          current,
          pageSize,
          sort: "filmName",
          filter: debouncedSearch
            ? JSON.stringify({ filmName: { like: `%${debouncedSearch}%` } })
            : undefined,
        },
        { skipEmptyString: true, skipNull: true, encode: true },
      );

      return getFilms(query);
    },
    placeholderData: keepPreviousData,
  });

  const planFilmMutation = useMutation({
    mutationFn: (data: number[]) => {
      const payload = data.map((filmId, index) => ({
        planCinemaId,
        filmId,
        order: index,
      }));
      return axios.post("/api/plan-films/create", { data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-films"] });
      setPickedFilmIds([]);
      toast.success("Thêm phim cho kế hoạch thành công");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setCurrent(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const preselectedFilmIds = useMemo(
    () => new Set(selectedFilmIds ?? []),
    [selectedFilmIds],
  );

  const columns: TableProps<FilmProps>["columns"] = [
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
    },
    {
      title: "Phiên bản",
      key: "versionCode",
      dataIndex: "versionCode",
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (value: number) => `${value} phút`,
    },
    {
      title: "Giá cộng thêm",
      key: "proposedPrice",
      dataIndex: "proposedPrice",
      render: (value: number) => formatMoney(value),
      align: "right",
      width: 200,
    },
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (
    current,
    pageSize,
  ) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setPickedFilmIds((prev) => {
      const pageFilmIds = data?.data.map((f) => f.id) ?? [];

      const newKeys = newSelectedRowKeys as number[];

      const prevWithoutCurrentPage = prev.filter(
        (id) => !pageFilmIds.includes(id),
      );

      return [...prevWithoutCurrentPage, ...newKeys];
    });
  };

  const rowSelection: TableRowSelection<FilmProps> = {
    selectedRowKeys: pickedFilmIds,
    onChange: onSelectChange,
    getCheckboxProps: (record) => ({
      disabled: preselectedFilmIds.has(record.id),
    }),
  };

  const onCancel = () => {
    setPickedFilmIds([]);
    setSearchValue("");
    setOpen(false);
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
            planFilmMutation.mutate([...selectedFilmIds, ...pickedFilmIds]);
          }
        }}
        okButtonProps={{
          loading: planFilmMutation.isPending,
        }}
        cancelButtonProps={{
          disabled: planFilmMutation.isPending,
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
              showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
            }}
            rowSelection={rowSelection}
          />
        </div>
      </Modal>
    </>
  );
};

export default AddMovies;
