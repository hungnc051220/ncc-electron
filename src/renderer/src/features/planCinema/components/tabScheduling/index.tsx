import { planScreeningsApi } from "@renderer/api/planScreenings.api";
import { screeningRoomsApi } from "@renderer/api/screeningRooms.api";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { useDeletePlanScreening } from "@renderer/hooks/planScreenings/useDeletePlanScreening";
import { planScreeningsKeys } from "@renderer/hooks/planScreenings/keys";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { compareNullableText } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { PlanScreeningDetailProps } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TableColumnsType, TableProps } from "antd";
import { Button, DatePicker, Modal, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import AddSchedulingDialog from "./AddSchedulingDialog";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

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

const formatTicketPriceDisplay = (value?: string) => {
  const { seatType, amount } = parseTicketPriceValue(value);

  if (!seatType && !amount) {
    return "";
  }

  const formattedAmount = amount.toLocaleString("en-US");
  return seatType ? `${seatType}: ${formattedAmount}` : formattedAmount;
};

const formatScreeningDate = (value?: string) => dayjs(value).format("DD/MM/YYYY");

const formatScreeningTime = (value?: string) => dayjs(value).format("HH:mm");

const TabScheduling = ({ planCinemaId }: TabSchedulingProps) => {
  const { message } = useAntdApp();

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [roomId, setRoomId] = useState<number | undefined>(undefined);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const params = useMemo(
    () => ({
      planCinemaId,
      roomId,
      fromDate: date ? dayjs(date).startOf("day").format("YYYY-MM-DD") : undefined,
      toDate: date ? dayjs(date).endOf("day").format("YYYY-MM-DD") : undefined,
      sort: "projectDate.asc,projectTime.asc"
    }),
    [planCinemaId, roomId, date]
  );

  const {
    data: screeningsPages,
    isFetching: isFetchingScreenings,
    fetchNextPage: fetchNextScreeningsPage,
    hasNextPage: hasNextScreeningsPage,
    isFetchingNextPage: isFetchingNextScreeningsPage
  } = useInfiniteQuery({
    queryKey: [...planScreeningsKeys.all, "all-pages", params],
    queryFn: ({ pageParam = 1 }) =>
      planScreeningsApi.getAll({
        ...params,
        current: pageParam,
        pageSize: 100
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current < lastPage.pageCount ? lastPage.current + 1 : undefined,
    enabled: !!planCinemaId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always"
  });

  useEffect(() => {
    if (hasNextScreeningsPage && !isFetchingNextScreeningsPage) {
      fetchNextScreeningsPage();
    }
  }, [fetchNextScreeningsPage, hasNextScreeningsPage, isFetchingNextScreeningsPage]);

  useEffect(() => {
    setSelectedRowKeys([]);
    setRoomId(undefined);
    setDate(null);
    setConfirmDeleteOpen(false);
  }, [planCinemaId]);

  const screenings = useMemo(
    () => screeningsPages?.pages.flatMap((page) => page.data) ?? [],
    [screeningsPages]
  );

  const selectedScreenings = useMemo(
    () =>
      screenings
        .filter((screening) => selectedRowKeys.includes(screening.id))
        .sort((a, b) => {
          const left = `${a.projectDate} ${a.projectTime}`;
          const right = `${b.projectDate} ${b.projectTime}`;
          return dayjs(left).valueOf() - dayjs(right).valueOf();
        }),
    [screenings, selectedRowKeys]
  );

  const renderScreeningSummary = (screening: PlanScreeningDetailProps) => (
    <div className="mt-3 rounded-md border border-(--ant-color-border) bg-(--ant-color-fill-tertiary) px-3 py-2">
      <div className="font-medium text-(--ant-color-text)">{screening.filmInfo?.filmName}</div>
      <div className="mt-1 grid gap-1 text-sm text-(--ant-color-text-secondary)">
        <div>
          <strong className="text-(--ant-color-text)">Ngày chiếu:</strong>{" "}
          {formatScreeningDate(screening.projectDate)}
        </div>
        <div>
          <strong className="text-(--ant-color-text)">Giờ chiếu:</strong>{" "}
          {formatScreeningTime(screening.projectTime)}
        </div>
        <div>
          <strong className="text-(--ant-color-text)">Phòng:</strong> {screening.roomInfo?.name}
        </div>
      </div>
    </div>
  );

  const { can } = usePermission();
  const canUpdate = can("plan_cinema", "update");
  const canDelete = can("plan_cinema", "delete");

  const roomSelect = useInfiniteSelectOptions({
    queryKey: ["screening-rooms"],
    queryFn: ({ pageParam }) =>
      screeningRoomsApi.getAll({
        current: pageParam,
        pageSize: 20,
        hidden: false
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name
    }),
    prefetchAll: true
  });

  const roomOptions = useMemo(
    () => [...roomSelect.options].sort((a, b) => compareNullableText(a.label, b.label)),
    [roomSelect.options]
  );

  const deletePlanScreening = useDeletePlanScreening();

  const handleDeleteFilms = () => {
    deletePlanScreening.mutate(selectedRowKeys as number[], {
      onSuccess: () => {
        setSelectedRowKeys([]);
        setConfirmDeleteOpen(false);
        message.success("Xóa ca chiếu trong kế hoạch thành công");
      },
      onError: (error: unknown) => {
        message.error(getApiErrorMessage(error, "Xóa ca chiếu trong kế hoạch thất bại"));
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
      render: (_, record) =>
        dayjs(record.projectTime)
          .add(record.filmInfo?.duration ?? 0, "minute")
          .format("HH:mm"),
      sorter: {
        compare: (a, b) => dayjs(a.projectTime).unix() - dayjs(b.projectTime).unix(),
        multiple: 1
      }
    },
    {
      title: "Giá vé 1",
      key: "priceOfPosition1",
      dataIndex: "priceOfPosition1",
      render: (value) => formatTicketPriceDisplay(value),
      sorter: (a, b) => compareTicketPriceValue(a.priceOfPosition1, b.priceOfPosition1)
    },
    {
      title: "Giá vé 2",
      key: "priceOfPosition2",
      dataIndex: "priceOfPosition2",
      render: (value) => formatTicketPriceDisplay(value),
      sorter: (a, b) => compareTicketPriceValue(a.priceOfPosition2, b.priceOfPosition2)
    },
    {
      title: "Giá vé 3",
      key: "priceOfPosition3",
      dataIndex: "priceOfPosition3",
      render: (value) => formatTicketPriceDisplay(value),
      sorter: (a, b) => compareTicketPriceValue(a.priceOfPosition3, b.priceOfPosition3)
    }
  ];

  const rowSelection: TableProps<PlanScreeningDetailProps>["rowSelection"] = {
    hideSelectAll: true,
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys);
    },
    getCheckboxProps: (record) => ({
      disabled: dayjs().isAfter(dayjs(record.projectDate, "YYYY-MM-DD"), "day")
    })
  };

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
            onClick={() => setConfirmDeleteOpen(true)}
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
            onChange={(nextDate) => setDate(nextDate)}
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
            virtual={false}
            loading={roomSelect.loading}
          />
          {canUpdate && (
            <AddSchedulingDialog
              planCinemaId={planCinemaId!}
              selectedRoomId={roomId}
              selectedDate={date}
              roomOptions={roomOptions}
              roomOptionsLoading={roomSelect.loading}
            />
          )}
        </div>
      </div>

      <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col">
        <AutoHeightTable
          containerClassName="min-w-0"
          rowKey="id"
          columns={columns}
          dataSource={screenings}
          size="small"
          bordered
          loading={isFetchingScreenings || isFetchingNextScreeningsPage}
          pagination={false}
          rowSelection={canDelete ? { type: "checkbox", ...rowSelection } : undefined}
        />
      </div>

      <Modal
        open={confirmDeleteOpen}
        title="Xác nhận xóa ca chiếu"
        onOk={handleDeleteFilms}
        onCancel={() => setConfirmDeleteOpen(false)}
        okButtonProps={{ danger: true }}
        confirmLoading={deletePlanScreening.isPending}
        destroyOnHidden
      >
        {selectedScreenings.length <= 1 ? (
          <div className="space-y-3">
            Bạn có chắc chắn muốn xóa suất chiếu này không?
            {selectedScreenings[0] && renderScreeningSummary(selectedScreenings[0])}
            <div>Thao tác không thể thu hồi.</div>
          </div>
        ) : (
          <div className="space-y-3">
            Bạn có chắc chắn muốn xóa <strong>{selectedScreenings.length}</strong> suất chiếu sau
            không?
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border border-(--ant-color-border-secondary) p-2">
              {selectedScreenings.map((screening) => (
                <div key={screening.id}>{renderScreeningSummary(screening)}</div>
              ))}
            </div>
            <div>Thao tác không thể thu hồi.</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TabScheduling;
