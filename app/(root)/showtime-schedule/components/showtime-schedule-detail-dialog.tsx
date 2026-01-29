"use client";

import { getPlanScreenings } from "@/data/loaders";
import { formatNumber } from "@/lib/utils";
import { PlanCinemaProps, PlanScreeningDetailProps } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps } from "antd";
import { Modal, Table } from "antd";
import dayjs from "dayjs";
import queryString from "query-string";
import { useState } from "react";

interface ShowtimeScheduleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem?: PlanCinemaProps | null;
}

const ShowtimeScheduleDetailDialog = ({
  open,
  onOpenChange,
  selectedItem,
}: ShowtimeScheduleDetailDialogProps) => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isFetching } = useQuery({
    queryKey: ["plan-screenings", selectedItem, current, pageSize],
    queryFn: () => {
      const query = queryString.stringify(
        {
          current,
          pageSize,
          filter: JSON.stringify({ planCinemaId: selectedItem?.id }),
        },
        { skipEmptyString: true, skipNull: true },
      );
      return getPlanScreenings(query);
    },
    placeholderData: keepPreviousData,
    enabled: open && !!selectedItem?.id,
  });

  const columns: TableProps<PlanScreeningDetailProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
      width: 50,
      fixed: "left",
    },
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (value) => dayjs(value, "YYYY-MM-DD").format("DD/MM/YYYY"),
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (value) => dayjs.utc(value).format("HH:mm"),
    },
    {
      title: "Phòng",
      key: "roomName",
      render: (_, record) => record.roomInfo?.name,
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.filmInfo?.filmName,
      width: 500,
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (_, record) => `${record.filmInfo?.duration} phút`,
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

  return (
    <Modal
      title="Chi tiết lịch chiếu phim"
      open={open}
      onCancel={() => onOpenChange(false)}
      width={1000}
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
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`,
        }}
      />
    </Modal>
    // <Dialog open={open} onOpenChange={onOpenChange}>
    //   <DialogContent className="sm:max-w-[900px]">
    //     <DialogHeader className="border-b">
    //       <DialogTitle>Chi tiết lịch chiếu phim</DialogTitle>
    //     </DialogHeader>
    //     <div className="p-4">
    //       <DataTable
    //         columns={columns}
    //         data={data?.data || []}
    //         total={data?.total || 0}
    //         loading={isFetching}
    //         className="max-h-[calc(100vh-230px)]"
    //       />
    //     </div>
    //     <DialogFooter>
    //       <DialogClose asChild>
    //         <Button variant="outline" type="button">
    //           Đóng
    //         </Button>
    //       </DialogClose>
    //     </DialogFooter>
    //   </DialogContent>
    // </Dialog>
  );
};

export default ShowtimeScheduleDetailDialog;
