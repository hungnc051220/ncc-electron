import { getPlanScreenings } from "@/data/loaders";
import { PlanScreeningDetailProps } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType, TableProps } from "antd";
import { Button, Table } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import queryString from "query-string";
import { useState } from "react";
import { toast } from "sonner";
import AddScreenings from "./add-scheduling-dialog";

interface TabSchedulingProps {
  planCinemaId?: number;
}

const TabScheduling = ({ planCinemaId }: TabSchedulingProps) => {
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data, isFetching } = useQuery({
    queryKey: ["plan-screenings", planCinemaId],
    queryFn: () => {
      const query = queryString.stringify(
        { filter: JSON.stringify({ planCinemaId }) },
        { skipEmptyString: true, skipNull: true },
      );
      return getPlanScreenings(query);
    },
    enabled: !!planCinemaId,
  });

  const deleteFilmOnPlanMutation = useMutation({
    mutationFn: (data: number[]) => {
      return axios.post("/api/plan-screenings/delete", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-screenings"] });
      setSelectedRowKeys([]);
      toast.success("Xóa ca chiếu trong kế hoạch thành công");
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const handleDeleteFilms = () => {
    deleteFilmOnPlanMutation.mutate(selectedRowKeys as number[]);
  };

  const columns: TableColumnsType<PlanScreeningDetailProps> = [
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (_, record) => dayjs(record.projectDate).format("DD/MM/YYYY"),
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (_, record) => dayjs(record.projectTime).format("HH:mm"),
    },
    {
      title: "Phòng",
      key: "roomName",
      dataIndex: "roomName",
      render: (_, record) => record.roomInfo?.name,
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.filmInfo?.filmName,
    },
    {
      title: "Kết thúc",
      key: "endTime",
      dataIndex: "endTime",
      render: (_, record) => {
        const time = dayjs(record.projectTime)
          .add(record.filmInfo.duration, "minute")
          .format("HH:mm");
        return time;
      },
    },
    {
      title: "Giá vé 1",
      key: "priceOfPosition1",
      dataIndex: "priceOfPosition1",
    },
    {
      title: "Giá vé 2",
      key: "priceOfPosition2",
      dataIndex: "priceOfPosition2",
    },
    {
      title: "Giá vé 3",
      key: "priceOfPosition3",
      dataIndex: "priceOfPosition3",
    },
    {
      title: "Giá vé 4",
      key: "priceOfPosition4",
      dataIndex: "priceOfPosition4",
    },
  ];

  const rowSelection: TableProps<PlanScreeningDetailProps>["rowSelection"] = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(selectedRowKeys);
    },
  };

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <p className="text-sm">
            Đã chọn <b>{selectedRowKeys.length}</b> ca chiếu
          </p>
          <Button
            size="small"
            disabled={selectedRowKeys.length === 0}
            onClick={handleDeleteFilms}
            variant="outlined"
            color="red"
            loading={deleteFilmOnPlanMutation.isPending}
          >
            Xóa
          </Button>
        </div>
        <AddScreenings planCinemaId={planCinemaId!} />
      </div>

      <div className="mt-2">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.data || []}
          size="small"
          bordered
          loading={isFetching}
          pagination={false}
          rowSelection={{ type: "checkbox", ...rowSelection }}
        />
      </div>
    </div>
  );
};

export default TabScheduling;
