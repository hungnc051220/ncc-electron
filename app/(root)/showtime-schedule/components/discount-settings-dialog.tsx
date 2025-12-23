"use client";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPlanScreenings } from "@/data/loaders";
import { PlanCinemaProps } from "@/types";
import { useQuery } from "@tanstack/react-query";
import queryString from "query-string";
import { useMemo } from "react";
import { createColumns } from "./detail-columns";

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
  const columns = useMemo(() => createColumns(), []);

  const { data, isFetching } = useQuery({
    queryKey: ["plan-screenings", selectedItem],
    queryFn: () => {
      const query = queryString.stringify(
        {
          current: 1,
          pageSize: 100,
          filter: JSON.stringify({ planCinemaId: selectedItem?.id }),
        },
        { skipEmptyString: true, skipNull: true }
      );
      return getPlanScreenings(query);
    },
    enabled: open && !!selectedItem?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader className="border-b">
          <DialogTitle>Chi tiết lịch chiếu phim</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={data?.data || []}
            total={data?.total || 0}
            loading={isFetching}
            className="max-h-[calc(100vh-230px)]"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Đóng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShowtimeScheduleDetailDialog;
