"use client";

import { Button, DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import { ValuesProps } from "./machine-serials-client";

interface FilterProps {
  isFetching: boolean;
  onSearch: (values: ValuesProps) => void;
  setCurrent: (page: number) => void;
}

const Filter = ({ onSearch, setCurrent, isFetching }: FilterProps) => {
  const [year, setYear] = useState<Dayjs | null>(null);

  return (
    <div className="flex gap-4">
      <div className="w-[150px]">
        <DatePicker
          picker="year"
          className="w-full"
          onChange={(value) => setYear(value)}
        />
      </div>
      <Button
        disabled={isFetching}
        onClick={() => {
          onSearch({ year: year?.year() });
          setCurrent(1);
        }}
      >
        Tìm kiếm
      </Button>
    </div>
  );
};

export default Filter;
