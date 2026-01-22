"use client";

import { getPlanScreeningsByDate } from "@/data/loaders";
import { DetailPlanScreeningProps, PlanScreeningProps } from "@/types";
import { LeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, DatePicker, Table, type TableProps } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { startTransition, Suspense } from "react";

const ShowtimesClient = () => {
  const router = useRouter();
  const [date, setDate] = useQueryState("date", {
    defaultValue: dayjs().format("YYYY-MM-DD"),
  });

  const { data, isFetching } = useQuery({
    queryKey: ["plan-screenings", date],
    queryFn: () => getPlanScreeningsByDate(date),
    enabled: !!date,
  });

  const columns: TableProps<PlanScreeningProps>["columns"] = [
    {
      title: "STT",
      width: 50,
      render: (_, __, index) => index + 1,
      fixed: "left",
      align: "center",
    },
    {
      title: "Phim",
      dataIndex: "filmName",
      fixed: "left",
      width: 350,
      render: (value: string) => <span className="font-bold">{value}</span>,
    },
    {
      title: "Suất chiếu",
      dataIndex: "details",
      render: (showtimes: DetailPlanScreeningProps[]) => (
        <div className="flex flex-nowrap gap-3">
          {showtimes.map((s, index) => (
            <Button
              key={s.planScreeningsId + index}
              type="default"
              className="min-w-15"
              size="small"
              onClick={() => {
                startTransition(() => {
                  router.push(`/plan-screening/${s.planScreeningsId}`);
                });
              }}
            >
              {dayjs(s.projectTime).format("HH:mm")}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Suspense>
      <div className="space-y-3 mt-4 px-4 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="small"
              icon={<LeftOutlined />}
              onClick={() => router.replace("/")}
            />
            <h2 className="font-bold text-lg">Danh sách phim đang chiếu</h2>
          </div>
          <DatePicker
            defaultValue={dayjs(date, "YYYY-MM-DD")}
            format="DD/MM/YYYY"
            onChange={(date) => setDate(dayjs(date).format("YYYY-MM-DD"))}
            allowClear={false}
          />
        </div>

        <Table
          bordered
          size="small"
          dataSource={data}
          columns={columns}
          scroll={{ x: "max-content", y: "calc(100vh - 80px)" }}
          loading={isFetching}
          pagination={false}
          tableLayout="auto"
          showHeader={false}
        />
      </div>
    </Suspense>
  );
};

export default ShowtimesClient;
