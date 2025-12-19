"use client";

import { DataTable } from "@/components/data-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ApiResponse, HolidayProps } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useMediaQuery } from "react-responsive";
import { createColumns } from "./columns";
import DeleteShowtimeSlotDialog from "./delete-holiday-dialog";
import HolidayDialog from "./holiday-dialog";

import { getYear } from "date-fns";

const startYear = 2014;
const endYear = getYear(new Date()) + 1;

const years = Array.from(
  { length: endYear - startYear + 1 },
  (_, i) => startYear + i
);

enum TabCode {
  WEEKDAYS = 1,
  HOLIDAYS = 2,
}

interface HolidaysClientProps {
  data: ApiResponse<HolidayProps>;
  page: number;
}

const HolidaysClient = ({ data, page }: HolidaysClientProps) => {
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HolidayProps | null>(null);
  const [tabCode, setTabCode] = useState<TabCode>(
    Number(searchParams.get("tabCode") as unknown) || TabCode.WEEKDAYS
  );
  const [year, setYear] = useState<string>(
    searchParams.get("year") || new Date().getFullYear().toString()
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = useCallback((item: HolidayProps) => {
    setEditingItem(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onDelete: handleDelete,
        page,
      }),
    [handleDelete, page]
  );

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
        setIsSearching(true);
        router.push(url);
      });
    },
    [setIsSearching, router, searchParams]
  );

  const onChangeYear = useCallback(
    (year: string) => {
      setYear(year);
      const current = qs.parse(searchParams.toString());
      const query = { ...current, year: year, page: 1 };
      const url = qs.stringifyUrl(
        { url: window.location.href, query },
        { skipEmptyString: true, skipNull: true }
      );
      startTransition(() => {
        setIsSearching(true);
        router.push(url);
      });
    },
    [setIsSearching, router, searchParams]
  );

  useEffect(() => {
    if (setIsSearching) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSearching(isPending);
    }
  }, [isPending, setIsSearching]);

  return (
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lý danh sách</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Danh sách ngày lễ
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex gap-2 items-center">
          <Select value={year} onValueChange={onChangeYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn năm" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size={isTabletOrMobile ? "sm" : "default"}
            onClick={() => setDialogOpen(true)}
          >
            Cập nhật lại ngày
          </Button>
        </div>
      </div>

      <div className="flex items-center mb-5 gap-2 border-b">
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary transition-colors",
            tabCode === TabCode.WEEKDAYS
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.WEEKDAYS)}
        >
          Ngày thường
        </div>
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary",
            tabCode === TabCode.HOLIDAYS
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.HOLIDAYS)}
        >
          Ngày lễ
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        loading={isSearching}
        className="max-h-[calc(100vh-260px)]"
      />

      {dialogOpen && (
        <HolidayDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          year={year}
          dayTypeId={tabCode}
        />
      )}

      {deleteDialogOpen && editingItem && (
        <DeleteShowtimeSlotDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          id={editingItem.dateValue}
          name={editingItem.dateValue}
          dayType={tabCode == TabCode.WEEKDAYS ? "Ngày thường" : "Ngày lễ"}
        />
      )}
    </div>
  );
};

export default HolidaysClient;
