"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  getPlanScreeningDetail,
  getPlanScreeningsByDate,
} from "@/data/loaders";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDownIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import Seats from "./seats";

interface AddInvitationTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddInvitationTicketDialog = ({
  open,
  onOpenChange,
}: AddInvitationTicketDialogProps) => {
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openSelectSeat, setOpenSelectSeat] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(
    undefined
  );

  const { data, isLoading } = useQuery({
    queryKey: ["plan-screenings", date],
    queryFn: () => getPlanScreeningsByDate(format(date, "yyyy-MM-dd")),
    enabled: !!date,
  });

  const { data: dataPlan } = useQuery({
    queryKey: ["plan-screening", selectedPlanId],
    queryFn: () => {
      if (!selectedPlanId) return null;
      return getPlanScreeningDetail(selectedPlanId);
    },
    enabled: !!selectedPlanId,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[876px]">
          <DialogHeader className="border-b">
            <DialogTitle>Thiết lập ghế ngồi</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            <div className="px-6 py-5 max-w-[876px]">
              <div className="flex gap-8 items-end">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="date" className="px-1">
                    Ngày chiếu
                  </Label>
                  <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
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
                            setOpenCalendar(false);
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
              </div>

              {isLoading && (
                <div className="mt-10 w-full flex flex-col gap-2 items-center justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Đang tải...
                </div>
              )}

              {!isLoading && data && data?.length > 0 && (
                <div className="mt-5 border rounded-sm overflow-x-auto">
                  <Table>
                    <TableBody>
                      {data.map((item, index) => (
                        <TableRow key={index} className="divide-x">
                          <TableCell className="min-w-[50px] bg-goku sticky left-0 z-10 pl-4">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-bold bg-goku sticky left-[50px] z-10 min-w-[200px]">
                            {item.filmName}
                          </TableCell>
                          {item.details.map((plan) => (
                            <TableCell
                              key={plan.planScreeningsId}
                              className="text-center cursor-pointer hover:bg-primary hover:text-white min-w-[70px]"
                              onClick={() => {
                                setSelectedPlanId(
                                  plan.planScreeningsId.toString()
                                );
                                setOpenSelectSeat(true);
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
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Hủy
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openSelectSeat && dataPlan && (
        <Dialog open={openSelectSeat} onOpenChange={setOpenSelectSeat}>
          <DialogContent className="sm:max-w-screen">
            <div className="p-6 flex flex-col h-screen overflow-hidden">
              <Seats data={dataPlan} onClose={() => setOpenSelectSeat(false)} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddInvitationTicketDialog;
