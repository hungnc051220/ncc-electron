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

interface FilterProps {
  customerRoles: CustomerRoleProps[];
  onSearchingChange?: (pending: boolean) => void;
}

const Filter = ({ customerRoles, onSearchingChange }: FilterProps) => {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [roleId, setRoleId] = useState<string | undefined>(
    searchParams.get("roleId") || "all"
  );
  const [searchText, setSearchText] = useState<string | null>(
    searchParams.get("searchText")
  );

  const handleSearch = () => {
    const current = qs.parse(searchParams.toString());
    const query = { ...current, roleId, searchText, page: 1 };
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

  console.log(customerRoles);

  return (
    <div className="flex gap-4">
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
