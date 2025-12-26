"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerRoleProps } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FilterIcon } from "lucide-react";

interface FilterProps {
  customerRoles: CustomerRoleProps[];
  onSearchingChange?: (pending: boolean) => void;
  isTabletOrMobile: boolean;
}

const Filter = ({
  customerRoles,
  onSearchingChange,
  isTabletOrMobile,
}: FilterProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [roleId, setRoleId] = useState<string | undefined>(
    searchParams.get("roleId") || "all"
  );
  const [searchText, setSearchText] = useState<string | null>(
    searchParams.get("searchText")
  );

  const handleSearch = (clear?: boolean) => {
    const current = qs.parse(searchParams.toString());
    const query = {
      ...current,
      roleId: !clear ? roleId : undefined,
      searchText: !clear ? searchText : undefined,
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
        setRoleId("all");
        setSearchText("");
      }
      onSearchingChange?.(true);
      router.push(url);
      setOpen(false);
    });
  };

  useEffect(() => {
    if (onSearchingChange) {
      onSearchingChange(isPending);
    }
  }, [isPending, onSearchingChange]);

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
        <div className="flex flex-col gap-4 p-5">
          <div className="flex-1">
            <p className="text-sm mb-1">Nhóm người dùng</p>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn nhóm người dùng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {customerRoles?.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <p className="text-sm mb-1">Tên/ Email</p>
            <Input
              type="text"
              placeholder="Nhập tên hoặc Email"
              value={searchText ?? ""}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
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
