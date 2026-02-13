import { DatePicker } from "antd";
import { ValuesProps } from "../MachineSerialsPage";

interface FilterProps {
  isFetching: boolean;
  onSearch: (values: ValuesProps) => void;
  setCurrent: (page: number) => void;
}

const Filter = ({ onSearch, setCurrent }: FilterProps) => {
  return (
    <div className="flex gap-4">
      <div className="w-37.5">
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
