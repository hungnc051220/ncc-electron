"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useGeneralData from "@/hooks/use-general-data";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useEffect, useState, useTransition } from "react";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select,
} from "@/components/ui/select";

interface FilterProps {
  onSearchingChange?: (pending: boolean) => void;
}

const Filter = ({ onSearchingChange }: FilterProps) => {
  const data = useGeneralData((state) => state.data);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filmName, setFilmName] = useState<string | null>(
    searchParams.get("filmName")
  );
  const [manufacturerId, setManufacturerId] = useState<string | undefined>(
    searchParams.get("manufacturerId") || "all"
  );
  const [date, setDate] = useState<Date | null>(null);

  const handleSearch = () => {
    const current = qs.parse(searchParams.toString());
    const query = {
      ...current,
      filmName,
      manufacturerId,
      premieredDay: date ? format(date, "yyyy-MM-dd") : undefined,
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
      onSearchingChange?.(true);
      router.push(url);
    });
  };

  useEffect(() => {
    if (onSearchingChange) {
      onSearchingChange(isPending);
    }
  }, [isPending, onSearchingChange]);

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <p className="text-sm mb-1">Tên phim</p>
        <Input
          type="text"
          placeholder="Nhập ngày khởi chiếu"
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
        />
      </div>
      <Button
        className="mt-6 h-9"
        disabled={isPending}
        variant="outline"
        onClick={handleSearch}
      >
        Tìm kiếm
      </Button>
    </div>
  );
};

export default Filter;
