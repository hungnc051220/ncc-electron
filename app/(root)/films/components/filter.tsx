"use client";

import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useGeneralData from "@/hooks/use-general-data";
import { format } from "date-fns";
import { FilterIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useState, useTransition } from "react";

const Filter = ({ isTabletOrMobile }: { isTabletOrMobile: boolean }) => {
  const [open, setOpen] = useState(false);
  const data = useGeneralData((state) => state.data);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filmName, setFilmName] = useState<string | null>(
    searchParams.get("filmName")
  );
  const [manufacturerId, setManufacturerId] = useState<string | undefined>(
    searchParams.get("manufacturerId") || "all"
  );
  const [date, setDate] = useState<Date | null>(null);

  const handleSearch = (clear?: boolean) => {
    const current = qs.parse(searchParams.toString());
    const query = {
      ...current,
      filmName: !clear ? filmName : undefined,
      manufacturerId: !clear ? manufacturerId : undefined,
      premieredDay: !clear && date ? format(date, "yyyy-MM-dd") : undefined,
      page: 1,
    };

    const url = qs.stringifyUrl(
      {
        url: window.location.href,
        query,
      },
      { skipEmptyString: true, skipNull: true }
    );

    startTransition(() => {
      if (clear) {
        setFilmName("");
        setManufacturerId("all");
        setDate(null);
      }
      router.push(url);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={isTabletOrMobile ? "sm" : "default"} variant="outline">
          <FilterIcon className={isTabletOrMobile ? "size-3" : "size-4"} />
          Bộ lọc
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="border-b">
          <DialogTitle>Bộ lọc</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col p-5 gap-4">
          <div className="flex-1">
            <p className="text-sm mb-1">Tên phim</p>
            <Input
              type="text"
              placeholder="Nhập tên phim"
              value={filmName ?? ""}
              onChange={(e) => setFilmName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm mb-1">Hãng phát hành</p>
            <Select value={manufacturerId} onValueChange={setManufacturerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn hãng phát hành" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {data?.manufacturers?.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm mb-1">Ngày khởi chiếu</p>
            <CustomDatePicker
              selectedDate={date}
              onChangeDate={(date) => setDate(date)}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="flex">
          <Button
            disabled={isPending}
            onClick={() => handleSearch(true)}
            className="flex-1"
            variant="outline"
          >
            Xóa bộ lọc
          </Button>
          <Button
            disabled={isPending}
            onClick={() => handleSearch()}
            className="flex-1"
          >
            Tìm kiếm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Filter;
