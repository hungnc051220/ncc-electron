"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Filter = () => {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <p className="text-sm mb-1">Nhóm người dùng</p>
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn nhóm người dùng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="administrator">Administrator</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <p className="text-sm mb-1">Tên/ Email</p>
        <Input type="text" placeholder="Nhập tên hoặc Email" />
      </div>
      <Button className="mt-6" variant="outline">Tìm kiếm</Button>
    </div>
  );
};

export default Filter;
