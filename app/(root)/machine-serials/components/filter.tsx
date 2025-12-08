"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useEffect, useState, useTransition } from "react";

interface FilterProps {
  onSearchingChange?: (pending: boolean) => void;
}

const Filter = ({ onSearchingChange }: FilterProps) => {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 31 }, (_, i) => currentYear - 20 + i);

  const [year, setYear] = useState<string | undefined>(
    searchParams.get("year") || undefined
  );

  const handleSearch = () => {
    const current = qs.parse(searchParams.toString());
    const query = { ...current, year, page: 1 };
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
      <div className="w-[285px]">
        <p className="text-sm mb-1">Năm</p>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn năm" />
          </SelectTrigger>
          <SelectContent>
            {years?.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
