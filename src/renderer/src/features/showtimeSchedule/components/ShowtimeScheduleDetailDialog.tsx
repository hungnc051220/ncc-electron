import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { formatNumber } from "@renderer/lib/utils";
import { PlanCinemaProps, PlanScreeningDetailProps } from "@shared/types";
import type { PaginationProps, TableProps } from "antd";
import { Modal, Table } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

interface ShowtimeScheduleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: PlanCinemaProps | null;
}

const ShowtimeScheduleDetailDialog = ({
  open,
  onOpenChange,
  selectedItem
}: ShowtimeScheduleDetailDialogProps) => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(
    () => ({
      current,
      pageSize,
      planCinemaId: selectedItem?.id
    }),
    [current, pageSize, selectedItem]
  );

  const { data, isFetching } = usePlanScreenings(params);

  const columns: TableProps<PlanScreeningDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left"
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (value) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
      width: 80
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (value) => dayjs.utc(value).format("HH:mm"),
      width: 80
    },
    {
      title: "Phòng",
      key: "roomName",
      render: (_, record) => record.roomInfo?.name,
      width: 70
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.filmInfo?.filmName,
      width: 500
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (_, record) => `${record.filmInfo?.duration} phút`,
      width: 100
    }
  ];

  const onChange = (page: number) => {
    setCurrent(page);
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <Modal
      title="Chi tiết lịch chiếu phim"
      open={open}
      onCancel={() => onOpenChange(false)}
      width="80%"
      footer={null}
    >
      <Table
        rowKey={(record) => record.id}
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
        scroll={{ y: 500 }}
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
      />
    </Modal>
  );
};

export default ShowtimeScheduleDetailDialog;
