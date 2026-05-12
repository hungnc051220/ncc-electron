import { usePlanFilms } from "@renderer/hooks/planFilms/usePlanCinemas";
import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { useScreeningRooms } from "@renderer/hooks/screeningRooms/useScreeningRooms";
import { formatNumber } from "@renderer/lib/utils";
import { PlanCinemaProps, PlanScreeningDetailProps } from "@shared/types";
import type { TableProps } from "antd";
import { Modal, Table } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

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
  const [roomId, setRoomId] = useState<number>();
  const [filmId, setFilmId] = useState<number>();

  const params = useMemo(
    () => ({
      current,
      pageSize,
      planCinemaId: selectedItem?.id,
      roomId,
      filmId
    }),
    [current, pageSize, selectedItem, roomId, filmId]
  );

  const { data, isFetching } = usePlanScreenings(params);
  const { data: rooms } = useScreeningRooms({
    current: 1,
    pageSize: 500,
    hidden: false
  });
  const { data: films } = usePlanFilms({
    current: 1,
    pageSize: 500,
    planCinemaId: selectedItem?.id
  });

  const roomOptions = useMemo(
    () =>
      rooms?.data.map((room) => ({
        value: room.id,
        text: room.name
      })) ?? [],
    [rooms]
  );

  const filmOptions = useMemo(
    () =>
      films?.data.map((film) => ({
        value: film.filmId,
        text: film.film?.filmName
      })) ?? [],
    [films]
  );

  useEffect(() => {
    setCurrent(1);
    setRoomId(undefined);
    setFilmId(undefined);
  }, [selectedItem?.id]);

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
      width: 120
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (value) => dayjs(value).format("HH:mm"),
      width: 120
    },
    {
      title: "Phòng",
      key: "roomName",
      render: (_, record) => record.roomInfo?.name,
      width: 120,
      filters: roomOptions,
      filteredValue: roomId ? [roomId] : null,
      filterMultiple: false,
      filterSearch: true
    },
    {
      title: "Phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.filmInfo?.filmName,
      filters: filmOptions,
      filteredValue: filmId ? [filmId] : null,
      filterMultiple: false,
      filterSearch: true
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (_, record) => `${record.filmInfo?.duration} phút`,
      width: 100
    }
  ];

  const handleTableChange: TableProps<PlanScreeningDetailProps>["onChange"] = (
    pagination,
    filters,
    _sorter,
    extra
  ) => {
    setCurrent(extra.action === "filter" ? 1 : (pagination.current ?? 1));
    setPageSize(pagination.pageSize ?? pageSize);
    setRoomId(Number(filters.roomName?.[0]) || undefined);
    setFilmId(Number(filters.filmName?.[0]) || undefined);
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
        scroll={{ x: "max-content", y: 500 }}
        loading={isFetching}
        pagination={{
          current,
          total: data?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
        onChange={handleTableChange}
      />
    </Modal>
  );
};

export default ShowtimeScheduleDetailDialog;
