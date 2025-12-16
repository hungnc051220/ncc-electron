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
import { getPlanScreeningsByDate } from "@/data/loaders";
import { ContractTicketSaleProps } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDownIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ContractTicketSaleUpdateSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContractTicketSale?: ContractTicketSaleProps | null;
}

const ContractTicketSaleUpdateSeatDialog = ({
  open,
  onOpenChange,
  editingContractTicketSale,
}: ContractTicketSaleUpdateSeatDialogProps) => {
  const router = useRouter();
  const [openCalendar, setOpenCalendar] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["plan-screenings", date],
    queryFn: () => getPlanScreeningsByDate(format(date, "yyyy-MM-dd")),
    enabled: !!date,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[876px]">
        <DialogHeader className="border-b">
          <DialogTitle>Danh sách phim đang chiếu</DialogTitle>
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
                              router.push(
                                `/plan-screening/${plan.planScreeningsId}`
                              );
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
  );
};

export default ContractTicketSaleUpdateSeatDialog;
