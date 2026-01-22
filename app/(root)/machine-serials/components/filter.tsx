"use client";

import { DatePicker } from "antd";
import { ValuesProps } from "./machine-serials-client";

interface FilterProps {
  isFetching: boolean;
  onSearch: (values: ValuesProps) => void;
  setCurrent: (page: number) => void;
}

const Filter = ({ onSearch, setCurrent }: FilterProps) => {
  return (
    <div className="flex gap-4">
      <div className="w-[150px]">
        <DatePicker
          picker="year"
          className="w-full"
          onChange={(value) => {
            onSearch({ year: value?.year() });
            setCurrent(1);
          }}
        />
      </div>
    </div>
  );
};

export default Filter;
