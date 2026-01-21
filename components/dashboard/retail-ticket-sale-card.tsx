"use client";

import { getPlanScreeningsByDate } from "@/data/loaders";
import { DetailPlanScreeningProps, PlanScreeningProps } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Table, type TableProps } from "antd";
import { format } from "date-fns";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RetailTicketSaleCard = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["plan-screenings", date],
    queryFn: () => getPlanScreeningsByDate(format(date, "yyyy-MM-dd")),
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
    },
    {
      title: "Suất chiếu",
      dataIndex: "details",
      render: (showtimes: DetailPlanScreeningProps[]) => (
        <Space wrap={false} size={[8, 8]}>
          {showtimes.map((s) => (
            <Button
              key={s.planScreeningsId}
              type="default"
              className="w-15"
              size="small"
              onClick={() => {
                router.push(`/plan-screenings/${s.planScreeningsId}`); // hoặc open tab bán vé
              }}
            >
              {dayjs(s.projectTime).format("HH:mm")}
            </Button>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <div className="px-6 py-5 max-w-[876px]">
      {/* <div className="flex gap-8 items-end">
        <div className="flex flex-col gap-3">
          <Label htmlFor="date" className="px-1">
            Ngày chiếu
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date"
                className="w-[398px] justify-between font-normal"
              >
                {date ? format(date, "dd/MM/yyyy") : "Chọn ngày chiếu"}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                onSelect={(date) => {
                  if (date) {
                    setDate(date);
                    setOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="terms" />
          <Label htmlFor="terms">Hiện lịch đã chiếu</Label>
        </div>
      </div> */}

      <Table
        bordered
        size="small"
        dataSource={data}
        columns={columns}
        scroll={{ x: "max-content", y: 400 }}
        pagination={false}
      />

      {/* {!isLoading && data && data?.length > 0 && (
        <div className="mt-5 border rounded-sm overflow-x-auto">
          <Table>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index} className="divide-x">
                  <TableCell className="w-[50px] bg-goku sticky left-0 z-10">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-bold bg-goku sticky left-[50px] z-10 min-w-[200px] px-2">
                    {item.filmName}
                  </TableCell>
                  {item.details.map((plan) => (
                    <TableCell
                      key={plan.planScreeningsId}
                      className="text-center cursor-pointer hover:bg-primary hover:text-white min-w-[70px]"
                      onClick={() => {
                        router.push(`/plan-screening/${plan.planScreeningsId}`);
                      }}
                    >
                      {format(new Date(plan.projectTime), "HH:mm")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )} */}
    </div>
  );
};

export default RetailTicketSaleCard;
