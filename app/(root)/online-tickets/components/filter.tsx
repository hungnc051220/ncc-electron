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
import { getFilm, getFilms, getUser, getUsers } from "@/data/loaders";
import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FilterIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { default as qs, default as queryString } from "query-string";
import { useEffect, useMemo, useState, useTransition } from "react";
import Select from "react-select";

interface FilterProps {
  onSearchingChange?: (pending: boolean) => void;
}

const Filter = ({ onSearchingChange }: FilterProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [searchTextUser, setSearchTextUser] = useState<string | undefined>(
    undefined
  );
  const [orderInfo, setOrderInfo] = useState<string | undefined>(
    searchParams.get("orderInfo") || undefined
  );
  const [barcode, setBarcode] = useState<string | undefined>(
    searchParams.get("barcode") || undefined
  );
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(
    searchParams.get("phoneNumber") || undefined
  );
  const [email, setEmail] = useState<string | undefined>(
    searchParams.get("email") || undefined
  );
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const handleSearch = (clear?: boolean) => {
    const current = qs.parse(searchParams.toString());
    const query = {
      ...current,
      orderInfo: !clear ? orderInfo : undefined,
      barcode: !clear ? barcode : undefined,
      phoneNumber: !clear ? phoneNumber : undefined,
      email: !clear ? email : undefined,
      fromDate: !clear
        ? fromDate
          ? format(fromDate, "yyyy-MM-dd")
          : undefined
        : undefined,
      toDate: !clear
        ? toDate
          ? format(toDate, "yyyy-MM-dd")
          : undefined
        : undefined,
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
        setOrderInfo(undefined);
        setBarcode(undefined);
        setPhoneNumber(undefined);
        setEmail(undefined);
        setFromDate(null);
        setToDate(null);
      }
      setOpen(false);
      onSearchingChange?.(true);
      router.push(url);
    });
  };

  useEffect(() => {
    if (onSearchingChange) {
      onSearchingChange(isPending);
    }
  }, [isPending, onSearchingChange]);

  useEffect(() => {
    const urlOrderInfo = searchParams.get("orderInfo") || undefined;
    const urlBarcode = searchParams.get("barcode") || undefined;
    const urlPhoneNumber = searchParams.get("phoneNumber") || undefined;
    const urlEmail = searchParams.get("email") || undefined;
    const urlFromDate = searchParams.get("fromDate");
    const urlToDate = searchParams.get("toDate");

    if (urlOrderInfo !== orderInfo) {
      setOrderInfo(urlOrderInfo);
    }
    if (urlBarcode !== barcode) {
      setBarcode(urlBarcode);
    }
    if (urlPhoneNumber !== phoneNumber) {
      setPhoneNumber(urlPhoneNumber);
    }
    if (urlEmail !== email) {
      setEmail(urlEmail);
    }

    const parsedFromDate = urlFromDate ? new Date(urlFromDate) : null;
    const parsedToDate = urlToDate ? new Date(urlToDate) : null;

    if (
      parsedFromDate &&
      (!fromDate || parsedFromDate.getTime() !== fromDate.getTime())
    ) {
      setFromDate(parsedFromDate);
    } else if (!urlFromDate && fromDate) {
      setFromDate(null);
    }

    if (
      parsedToDate &&
      (!toDate || parsedToDate.getTime() !== toDate.getTime())
    ) {
      setToDate(parsedToDate);
    } else if (!urlToDate && toDate) {
      setToDate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FilterIcon className="size-4" />
          Bộ lọc
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="border-b">
          <DialogTitle>Bộ lọc</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-5">
          <div className="w-full">
            <p className="text-sm mb-1">Mã thanh toán</p>
            <Input
              placeholder="Nhập mã thanh toán"
              value={orderInfo}
              onChange={(e) => setOrderInfo(e.target.value)}
            />
          </div>

          <div className="w-full">
            <p className="text-sm mb-1">Mã barcode</p>
            <Input
              placeholder="Nhập mã barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          <div className="w-full">
            <p className="text-sm mb-1">Só điện thoại</p>
            <Input
              placeholder="Nhập số điện thoại"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="w-full">
            <p className="text-sm mb-1">Email</p>
            <Input
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-2">
              <p className="text-sm whitespace-nowrap">Từ ngày</p>
              <CustomDatePicker
                selectedDate={fromDate}
                onChangeDate={(date) => {
                  setFromDate(date);
                  setToDate(null);
                }}
                className="w-[150px]"
                selectsStart
                startDate={fromDate}
                endDate={toDate}
              />
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm whitespace-nowrap">Đến ngày</p>
              <CustomDatePicker
                selectedDate={toDate}
                onChangeDate={(date) => setToDate(date)}
                className="w-[150px]"
                selectsEnd
                startDate={fromDate}
                endDate={toDate}
                minDate={fromDate || undefined}
              />
            </div>
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
