"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useGeneralData from "@/hooks/use-general-data";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useCallback, useEffect, useState, useTransition } from "react";
import CustomDatePicker from "@/components/ui/custom-date-picker";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

enum TabCode {
  ALL = "ALL",
  FILM_HOME_PAGE = "FILM_HOME_PAGE",
  FILM_ON_PLAN = "FILM_ON_PLAN",
}

interface FilterProps {
  onSearchingChange?: (pending: boolean) => void;
}

const Filter = ({ onSearchingChange }: FilterProps) => {
  const data = useGeneralData((state) => state.data);
  const searchParams = useSearchParams();
  const router = useRouter();
  // Khởi tạo tabCode từ URL hoặc mặc định là ALL
  const [tabCode, setTabCode] = useState<TabCode>(
    (searchParams.get("tabCode") as TabCode) || TabCode.ALL
  );
  const [isPending, startTransition] = useTransition();

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

  const onChangeTabCode = useCallback(
    (newTabCode: TabCode) => {
      setTabCode(newTabCode);
      const current = qs.parse(searchParams.toString());
      const query = { ...current, tabCode: newTabCode, page: 1 };
      const url = qs.stringifyUrl(
        { url: window.location.href, query },
        { skipEmptyString: true, skipNull: true }
      );
      startTransition(() => {
        onSearchingChange?.(true);
        router.push(url);
      });
    },
    [onSearchingChange, router, searchParams, startTransition]
  );

  return (
    <div>
      <div className="flex items-center mb-5 gap-2 border-b">
        <div
          className={cn(
            "py-4 px-2 text-sm font-bold border-b-2 cursor-pointer hover:text-primary transition-colors",
            tabCode === TabCode.ALL
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.ALL)}
        >
          Danh sách phim
        </div>
        <div
          className={cn(
            "py-4 px-2 text-sm font-bold border-b-2 cursor-pointer hover:text-primary",
            tabCode === TabCode.FILM_HOME_PAGE
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.FILM_HOME_PAGE)}
        >
          Phim trên trang chủ
        </div>
        <div
          className={cn(
            "py-4 px-2 text-sm font-bold border-b-2 cursor-pointer hover:text-primary",
            tabCode === TabCode.FILM_ON_PLAN
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.FILM_ON_PLAN)}
        >
          Phim trên kế hoạch
        </div>
      </div>
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
    </div>
  );
};

export default Filter;
