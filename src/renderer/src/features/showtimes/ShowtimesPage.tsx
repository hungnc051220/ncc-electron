import { usePlanScreeningsByDate } from "@renderer/hooks/planScreenings/usePlanScreeningsByDate";
import { useRealtimeClock } from "@renderer/hooks/useRealtimeClock";
import { DetailPlanScreeningProps, PlanScreeningProps } from "@shared/types";
import { Button, Checkbox, DatePicker, Table } from "antd";
import dayjs from "dayjs";
import { useQueryState } from "nuqs";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { DatePickerProps, TableProps } from "antd";
import type { Dayjs } from "dayjs";

import customParseFormat from "dayjs/plugin/customParseFormat";
import { usePlanScreeningsAvailableDates } from "@renderer/hooks/planScreenings/usePlanScreeningsAvailableDates";
import { cn, isPlanScreeningLocked } from "@renderer/lib/utils";

dayjs.extend(customParseFormat);

const capitalizeFirstLetter = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const ShowtimesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tick = useRealtimeClock();
  const callbackUrl = searchParams.get("callbackUrl");
  const id = searchParams.get("id");
  const returnTo = searchParams.get("returnTo");
  const reopenOrderId = searchParams.get("reopenOrderId");
  const shouldResetDate = searchParams.get("resetDate") === "1";
  const isSwapSeatsFlow = callbackUrl === "/order-history/swap-seats";

  const [date, setDate] = useQueryState("date", {
    defaultValue: dayjs().format("YYYY-MM-DD")
  });
  const [showPast, setShowPast] = useState(false);
  const today = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    if (!shouldResetDate) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("resetDate");

    if (date !== today) {
      void setDate(today);
    }

    setSearchParams(nextSearchParams, { replace: true });
  }, [date, searchParams, setDate, setSearchParams, shouldResetDate, today]);

  useEffect(() => {
    if (!isSwapSeatsFlow) {
      return;
    }

    if (dayjs(date, "YYYY-MM-DD").isBefore(dayjs(), "day")) {
      void setDate(today);
    }

    setShowPast(false);
  }, [date, isSwapSeatsFlow, setDate, today]);

  const fromDate = dayjs(date, "YYYY-MM-DD").startOf("month").format("DD-MM-YYYY");
  const toDate = dayjs(date, "YYYY-MM-DD").endOf("month").format("DD-MM-YYYY");

  const { data, isFetching } = usePlanScreeningsByDate(date);
  const { data: showDates } = usePlanScreeningsAvailableDates(fromDate, toDate);

  const showDateSet = new Set(showDates?.map((d) => dayjs(d, "DD-MM-YYYY").format("YYYY-MM-DD")));

  const filteredList = useMemo(() => {
    if (!data) return [];
    const selected = dayjs(date, "YYYY-MM-DD");
    const today = dayjs();
    const isPastDay = selected.isBefore(today, "day");
    const isToday = selected.isSame(today, "day");

    if (isPastDay) {
      return showPast ? data.map((f) => ({ ...f, details: [...f.details] })) : [];
    }

    if (!isToday) {
      return data.map((f) => ({ ...f, details: [...f.details] }));
    }

    void tick;

    return data
      .map((film) => ({
        ...film,
        details: showPast
          ? [...film.details]
          : film.details.filter(
              (detail) => !isPlanScreeningLocked(selected.format("YYYY-MM-DD"), detail.projectTime)
            )
      }))
      .filter((film) => film.details.length > 0);
  }, [data, showPast, date, tick]);

  const columns: TableProps<PlanScreeningProps>["columns"] = [
    {
      title: "STT",
      width: 50,
      render: (_, __, index) => index + 1,
      fixed: "left",
      align: "center"
    },
    {
      title: "Phim",
      dataIndex: "filmName",
      fixed: "left",
      width: 350,
      render: (value: string) => <span className="font-medium text-sm">{value}</span>
    },
    {
      title: "Suất chiếu",
      dataIndex: "details",
      render: (showtimes: DetailPlanScreeningProps[]) => (
        <div className="flex flex-wrap gap-1.5">
          {showtimes.map((s) => {
            const now = dayjs();
            const selectedDate = dayjs(date, "YYYY-MM-DD");
            const isPastDay = selectedDate.isBefore(now, "day");
            const isToday = selectedDate.isSame(now, "day");
            const isPastShowtime = isPlanScreeningLocked(
              selectedDate.format("YYYY-MM-DD"),
              s.projectTime
            );
            const isFutureShowtime = !isPastShowtime;
            const isDisabledShowtime = isSwapSeatsFlow && (isPastDay || isPastShowtime);

            return (
              <Button
                key={s.projectTime}
                type="default"
                danger={isPastDay || (!isFutureShowtime && isToday)}
                disabled={isDisabledShowtime}
                className="w-14!"
                onClick={() => {
                  startTransition(() => {
                    if (callbackUrl && id) {
                      const nextSearchParams = new URLSearchParams({
                        "plan-screening": String(s.planScreeningsId)
                      });

                      if (returnTo) {
                        nextSearchParams.set("returnTo", returnTo);
                      }

                      if (reopenOrderId) {
                        nextSearchParams.set("reopenOrderId", reopenOrderId);
                      }

                      navigate(`${callbackUrl}/${id}?${nextSearchParams.toString()}`);
                    } else {
                      navigate(`/plan-screening/${s.planScreeningsId}`);
                    }
                  });
                }}
              >
                {dayjs(s.projectTime).format("HH:mm")}
              </Button>
            );
          })}
        </div>
      )
    }
  ];

  const cellRender: DatePickerProps<Dayjs>["cellRender"] = (current, info) => {
    if (info.type !== "date") return info.originNode;

    const dateKey = (current as Dayjs).format("YYYY-MM-DD");
    const hasShow = showDateSet.has(dateKey);

    return (
      <div
        className={cn(
          "ant-picker-cell-inner flex items-center justify-center",
          hasShow && "text-orange-500 font-bold"
        )}
      >
        {(current as Dayjs).date()}
      </div>
    );
  };

  const disabledDate: DatePickerProps<Dayjs>["disabledDate"] = (current) =>
    isSwapSeatsFlow ? current.isBefore(dayjs().startOf("day"), "day") : false;

  return (
    <div className="space-y-3 p-4 flex-1 min-h-screen bg-app-bg text-black dark:text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">Danh sách phim đang chiếu</h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-semibold">Ngày chiếu</p>
          <DatePicker
            value={dayjs(date)}
            format={(value) => capitalizeFirstLetter(value.format("dddd DD/MM/YYYY"))}
            onChange={(date) => setDate(dayjs(date).format("YYYY-MM-DD"))}
            allowClear={false}
            cellRender={cellRender}
            disabledDate={disabledDate}
            style={{ width: 200 }}
          />

          <Checkbox
            checked={showPast}
            disabled={isSwapSeatsFlow}
            onChange={(e) => setShowPast(e.target.checked)}
          >
            Hiển thị lịch đã chiếu
          </Checkbox>
        </div>
        <Button onClick={() => navigate(-1)}>Đóng</Button>
      </div>

      <Table
        rowKey="filmName"
        bordered
        size="small"
        dataSource={filteredList || []}
        columns={columns}
        scroll={{ y: "calc(100vh - 80px)" }}
        loading={isFetching}
        pagination={false}
        tableLayout="auto"
        showHeader={false}
      />
    </div>
  );
};

export default ShowtimesPage;
