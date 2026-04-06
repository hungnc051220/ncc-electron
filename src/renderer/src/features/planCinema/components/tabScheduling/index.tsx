import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { useDeletePlanScreening } from "@renderer/hooks/planScreenings/useDeletePlanScreening";
import { usePlanScreenings } from "@renderer/hooks/planScreenings/usePlanScreenings";
import { usePermission } from "@renderer/permissions/usePermission";
import { PlanScreeningDetailProps } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TableColumnsType, TableProps } from "antd";
import { Button, DatePicker, message, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import AddSchedulingDialog from "./AddSchedulingDialog";

interface TabSchedulingProps {
  planCinemaId?: number;
}

const parseTicketPriceValue = (value?: string) => {
  if (!value) {
    return { seatType: "", amount: 0 };
  }

  const normalizedValue = `${value}`.trim();

  if (!normalizedValue.includes(":")) {
    const amount = Number(normalizedValue.replace(/[^\d.-]/g, ""));
    return {
      seatType: "",
      amount: Number.isFinite(amount) ? amount : 0
    };
  }

  const [seatType, rawAmount] = normalizedValue.split(":");
  const amount = Number(rawAmount?.replace(/[^\d.-]/g, ""));

  return {
    seatType: seatType?.trim() ?? "",
    amount: Number.isFinite(amount) ? amount : 0
  };
};

const compareTicketPriceValue = (left?: string, right?: string) => {
  const leftPrice = parseTicketPriceValue(left);
  const rightPrice = parseTicketPriceValue(right);

  if (leftPrice.amount !== rightPrice.amount) {
    return leftPrice.amount - rightPrice.amount;
  }

  return leftPrice.seatType.localeCompare(rightPrice.seatType);
};

const compareNullableText = (left?: string | null, right?: string | null) => {
  return (left ?? "").localeCompare(right ?? "", undefined, {
    numeric: true,
    sensitivity: "base"
  });
};

const TabScheduling = ({ planCinemaId }: TabSchedulingProps) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [roomId, setRoomId] = useState<number | undefined>(undefined);
  const [date, setDate] = useState<Dayjs | null>(null);

  const params = useMemo(() => {
    return {
      planCinemaId,
      roomId,
      fromDate: date ? dayjs(date).startOf("day").format("YYYY-MM-DD") : undefined,
      toDate: date ? dayjs(date).endOf("day").format("YYYY-MM-DD") : undefined,
      sort: "projectDate.asc,projectTime.asc"
    };
  }, [planCinemaId, roomId, date]);

  const { data, isFetching } = usePlanScreenings(params);
  const { can } = usePermission();
  const canUpdate = can("plan_cinema", "update");
  const canDelete = can("plan_cinema", "delete");

  const {
    data: rooms,
    fetchNextPage,
    hasNextPage,
    isFetching: isFetchingScreeningRooms,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["screening-rooms"],
    queryFn: ({ pageParam = 1 }) =>
      screeningRoomsApi.getAll({
        current: pageParam,
        pageSize: 20,
        hidden: false,
        sort: "name.asc"
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const roomOptions = useMemo(() => {
    return (
      rooms?.pages
        .flatMap((page) =>
          page.data.map((item) => ({
            value: item.id,
            label: item.name
          }))
        )
        .sort((a, b) => compareNullableText(a.label, b.label)) ?? []
    );
  }, [rooms]);

  const deletePlanScreening = useDeletePlanScreening();

  const handleDeleteFilms = () => {
    deletePlanScreening.mutate(selectedRowKeys as number[], {
      onSuccess: () => {
        setSelectedRowKeys([]);
        message.success("Xóa ca chiếu trong kế hoạch thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa ca chiếu vào kế hoạch thất bại"));
      }
    });
  };

  const columns: TableColumnsType<PlanScreeningDetailProps> = [
    {
      title: "Ngày chiếu",
      key: "projectDate",
      dataIndex: "projectDate",
      render: (_, record) => dayjs(record.projectDate).format("DD/MM/YYYY"),
      sorter: {
        compare: (a, b) => dayjs(a.projectDate).unix() - dayjs(b.projectDate).unix(),
        multiple: 3
      }
    },
    {
      title: "Giờ chiếu",
      key: "projectTime",
      dataIndex: "projectTime",
      render: (_, record) => dayjs(record.projectTime).format("HH:mm"),
      sorter: {
        compare: (a, b) => dayjs(a.projectTime).unix() - dayjs(b.projectTime).unix(),
        multiple: 2
      }
    },
    {
      title: "Phòng",
      key: "roomName",
      dataIndex: "roomName",
      render: (_, record) => record.roomInfo?.name,
      sorter: (a, b) => compareNullableText(a.roomInfo?.name, b.roomInfo?.name)
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.filmInfo?.filmName,
      sorter: (a, b) => compareNullableText(a.filmInfo?.filmName, b.filmInfo?.filmName)
    },
    {
      title: "Kết thúc",
      key: "endTime",
      dataIndex: "endTime",
      render: (_, record) => {
        const time = dayjs(record.projectTime)
          .add(record.filmInfo?.duration ?? 0, "minute")
          .format("HH:mm");
        return time;
      },
      sorter: {
        compare: (a, b) => dayjs(a.projectTime).unix() - dayjs(b.projectTime).unix(),
        multiple: 1
      }
    },
    {
      title: "Giá vé 1",
      key: "priceOfPosition1",
      dataIndex: "priceOfPosition1",
      sorter: (a, b) => compareTicketPriceValue(a.priceOfPosition1, b.priceOfPosition1)
    },
    {
      title: "Giá vé 2",
      key: "priceOfPosition2",
      dataIndex: "priceOfPosition2",
      sorter: (a, b) => compareTicketPriceValue(a.priceOfPosition2, b.priceOfPosition2)
    },
    {
      title: "Giá vé 3",
      key: "priceOfPosition3",
      dataIndex: "priceOfPosition3",
      sorter: (a, b) => compareTicketPriceValue(a.priceOfPosition3, b.priceOfPosition3)
    },
    {
      title: "Giá vé 4",
      key: "priceOfPosition4",
      dataIndex: "priceOfPosition4",
      sorter: (a, b) => compareTicketPriceValue(a.priceOfPosition4, b.priceOfPosition4)
    }
  ];

  const rowSelection: TableProps<PlanScreeningDetailProps>["rowSelection"] = {
    hideSelectAll: true,
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(selectedRowKeys);
    },
    getCheckboxProps: (record) => ({
      disabled: dayjs().isAfter(dayjs(record.projectDate, "YYYY-MM-DD"), "day")
    })
  };

  if (!data) return null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <p className="text-sm">
            Đã chọn <b>{selectedRowKeys.length}</b> ca chiếu
          </p>
          <Button
            size="small"
            disabled={selectedRowKeys.length === 0 || !canDelete}
            onClick={handleDeleteFilms}
            variant="outlined"
            color="red"
            loading={deletePlanScreening.isPending}
          >
            Xóa
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <DatePicker
            value={date}
            onChange={(date) => setDate(date)}
            className="w-40"
            placeholder="Chọn ngày chiếu"
            format="DD/MM/YYYY"
          />
          <Select
            value={roomId}
            onChange={(value) => setRoomId(value)}
            allowClear
            className="w-50"
            options={roomOptions}
            placeholder="Chọn phòng chiếu"
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
              if (
                target.scrollTop + target.offsetHeight === target.scrollHeight &&
                hasNextPage &&
                !isFetchingNextPage
              ) {
                fetchNextPage();
              }
            }}
            loading={isFetchingNextPage || isFetchingScreeningRooms}
          />
          {canUpdate && (
            <AddSchedulingDialog
              planCinemaId={planCinemaId!}
              selectedRoomId={roomId}
              selectedDate={date}
            />
          )}
        </div>
      </div>

      <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col">
        <AutoHeightTable
          containerClassName="min-w-0"
          rowKey="id"
          columns={columns}
          dataSource={data?.data || []}
          size="small"
          bordered
          loading={isFetching}
          pagination={false}
          rowSelection={canDelete ? { type: "checkbox", ...rowSelection } : undefined}
        />
      </div>
    </div>
  );
};

export default TabScheduling;
