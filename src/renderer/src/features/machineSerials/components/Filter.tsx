import { DatePicker } from "antd";
import dayjs from "dayjs";
import { ValuesProps } from "../MachineSerialsPage";

interface FilterProps {
  isFetching: boolean;
  onSearch: (values: ValuesProps) => void;
  setCurrent: (page: number) => void;
  year?: number;
}

const Filter = ({ isFetching, onSearch, setCurrent, year }: FilterProps) => {
  return (
    <div className="flex gap-4">
      <div className="w-37.5">
        <DatePicker
          picker="year"
          className="w-full"
          value={year ? dayjs().year(year).startOf("year") : null}
          disabled={isFetching}
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
