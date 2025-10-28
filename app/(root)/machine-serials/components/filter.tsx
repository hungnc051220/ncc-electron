"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Filter = () => {
  return (
    <div className="flex gap-4">
      <div>
        <p className="text-sm mb-1">Năm</p>
        <Select>
          <SelectTrigger className="w-[285px]">
            <SelectValue placeholder="Chọn năm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="administrator">Administrator</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button className="mt-6" variant="outline">Tìm kiếm</Button>
    </div>
  );
};

export default Filter;
