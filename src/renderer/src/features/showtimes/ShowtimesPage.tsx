import { usePlanScreeningsByDate } from "@renderer/hooks/planScreenings/usePlanScreeningsByDate";
import { useRealtimeClock } from "@renderer/hooks/useRealtimeClock";
import { DetailPlanScreeningProps, PlanScreeningProps } from "@shared/types";
import { Button, Checkbox, DatePicker, Table } from "antd";
import dayjs from "dayjs";
import { useQueryState } from "nuqs";
import { startTransition, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { DatePickerProps, TableProps } from "antd";
import type { Dayjs } from "dayjs";

import customParseFormat from "dayjs/plugin/customParseFormat";
import { usePlanScreeningsAvailableDates } from "@renderer/hooks/planScreenings/usePlanScreeningsAvailableDates";
import { cn } from "@renderer/lib/utils";

dayjs.extend(customParseFormat);

const ShowtimesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tick = useRealtimeClock();
  const callbackUrl = searchParams.get("callbackUrl");
  const id = searchParams.get("id");
  const [date, setDate] = useQueryState("date", {
    defaultValue: dayjs().format("YYYY-MM-DD")
  });
  const [showPast, setShowPast] = useState(false);
  const { data, isFetching } = usePlanScreeningsByDate(date);
  const fromDate = dayjs(date, "YYYY-MM-DD").startOf("month").format("DD-MM-YYYY");
  const toDate = dayjs(date, "YYYY-MM-DD").endOf("month").format("DD-MM-YYYY");
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

    const now = today;
    void tick;

    return data
      .map((film) => ({
        ...film,
        details: showPast
          ? [...film.details]
          : film.details.filter((detail) => dayjs(detail.projectTime).add(7, "hour").isAfter(now))
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
      render: (value: string) => <span className="font-bold">{value}</span>
    },
    {
      title: "Suất chiếu",
      dataIndex: "details",
      render: (showtimes: DetailPlanScreeningProps[]) => (
        <div className="flex flex-nowrap gap-3">
          {showtimes.map((s) => {
            const selected = dayjs(date, "YYYY-MM-DD");
            const isPastDay = selected.isBefore(dayjs(), "day");
            const isPast = dayjs(s.projectTime).add(7, "hour").isAfter(dayjs());
            const isToday = dayjs(selected).isSame(dayjs(), "day");

            return (
              <Button
                key={s.projectTime}
                type="default"
                danger={isPastDay || (!isPast && isToday)}
                className="min-w-15"
                size="small"
                onClick={() => {
                  startTransition(() => {
                    if (callbackUrl && id) {
                      navigate(`${callbackUrl}/${id}?plan-screening=${s.planScreeningsId}`);
                    } else {
                      navigate(`/plan-screening/${s.planScreeningsId}`);
                    }
                  });
                }}
              >
                {dayjs(s.projectTime).add(7, "hour").format("HH:mm")}
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
            format="dddd DD/MM/YYYY"
            onChange={(date) => setDate(dayjs(date).format("YYYY-MM-DD"))}
            allowClear={false}
            cellRender={cellRender}
          />

          <Checkbox checked={showPast} onChange={(e) => setShowPast(e.target.checked)}>
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
        scroll={{ x: "max-content", y: "calc(100vh - 80px)" }}
        loading={isFetching}
        pagination={false}
        tableLayout="auto"
        showHeader={false}
      />
    </div>
  );
};

export default ShowtimesPage;
