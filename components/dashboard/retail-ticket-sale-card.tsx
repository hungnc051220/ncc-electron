"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon, TicketIcon } from "lucide-react";
import { useEffect, useState } from "react";
import MainCard from "../main-card";
import { Checkbox } from "../ui/checkbox";
import { getShowtimes } from "@/data/loaders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShowtimesProps } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import { useRouter } from "next/navigation";

const RetailTicketSaleCard = () => {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [data, setData] = useState<ShowtimesProps[]>([]);

  useEffect(() => {
    const fetchShowtimes = async () => {
      const response = await getShowtimes();
      setData(response as ShowtimesProps[]);
    };

    fetchShowtimes();
  }, [openModal]);

  return (
    <Dialog open={openModal} onOpenChange={setOpenModal}>
      <DialogTrigger>
        <MainCard
          title="Bán vé khách lẻ"
          description="Lorem ipsum dolor sit amet consectetur elit"
          color="red"
          icon={TicketIcon}
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[876px]">
        <DialogHeader className="border-b">
          <DialogTitle>Màn hình bán vé khách lẻ</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 max-w-[876px]">
          <div className="flex gap-8 items-end">
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
                    {date ? date.toLocaleDateString() : "Chọn ngày chiếu"}
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
                      setDate(date);
                      setOpen(false);
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

          <div className="mt-5 border rounded-sm overflow-x-auto">
            <Table>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id} className="divide-x">
                    <TableCell className="min-w-[50px] bg-goku sticky left-0 z-10">
                      {item.id}
                    </TableCell>
                    <TableCell className="font-bold bg-goku sticky left-[50px] z-10 min-w-[200px]">
                      {item.title}
                    </TableCell>
                    {item.times.map((t, i) => (
                      <TableCell
                        key={i}
                        className="text-center cursor-pointer hover:bg-primary hover:text-white min-w-[70px]"
                        onClick={() => router.push(`/showtimes/${item.id}`)}
                      >
                        {t}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Đóng</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RetailTicketSaleCard;
