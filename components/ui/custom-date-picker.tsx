"use client";

import { forwardRef } from "react";
import DatePicker, {
  ReactDatePickerCustomHeaderProps,
  registerLocale,
} from "react-datepicker";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
registerLocale("vi", vi);

type DatePickerInputProps = {
  className?: string;
  value?: string;
  onClick?: () => void;
};

const DatePickerInput = forwardRef<HTMLButtonElement, DatePickerInputProps>(
  ({ value, onClick, className }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "flex items-center justify-between text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
    >
      <span>{value || "Chọn thời gian"}</span>
      <CalendarDays className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
);
DatePickerInput.displayName = "DatePickerInput";

const CustomHeader = ({
  date,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: ReactDatePickerCustomHeaderProps) => {
  const months = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 31 }, (_, i) => currentYear - 20 + i);

  return (
    <div className="flex items-center justify-between p-2 border-b border-border">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        className="size-6 p-0 hover:bg-accent"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        <select
          className="min-w-[110px] h-9 rounded-sm border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={date.getMonth()}
          onChange={(e) => changeMonth(parseInt(e.target.value))}
        >
          {months.map((month, index) => (
            <option key={index} value={index}>
              {month}
            </option>
          ))}
        </select>

        <select
          className="w-[90px] h-9 rounded-sm border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={date.getFullYear()}
          onChange={(e) => changeYear(parseInt(e.target.value))}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        className="size-6 p-0 hover:bg-accent"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface CustomDatePickerProps {
  selectedDate: Date | null;
  onChangeDate: (date: Date | null) => void;
  className?: string;
}

const CustomDatePicker = ({
  selectedDate,
  onChangeDate,
  className,
}: CustomDatePickerProps) => {
  return (
    <>
      <div className={className}>
        <DatePicker
          placeholderText="Chọn thời gian"
          isClearable
          todayButton="Hôm nay"
          locale="vi"
          selected={selectedDate}
          onChange={onChangeDate}
          dateFormat="dd/MM/yyyy"
          customInput={<DatePickerInput className="w-full" />}
          renderCustomHeader={CustomHeader}
          popperClassName="z-50"
          calendarClassName="!border-border !bg-popover !text-popover-foreground !shadow-lg !rounded-lg !p-0 !font-sans custom-datepicker"
          wrapperClassName="block w-full"
          dayClassName={(date) =>
            cn(
              "!text-sm !w-8 !h-8 !leading-8 hover:!bg-accent hover:!text-accent-foreground !rounded-md !mx-0.5 !my-0.5 !flex !items-center !justify-center !cursor-pointer !transition-colors",
              selectedDate &&
                date.toDateString() === selectedDate.toDateString() &&
                "!bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground !font-medium",
              date.toDateString() === new Date().toDateString() &&
                selectedDate?.toDateString() !== date.toDateString() &&
                "!bg-accent !text-accent-foreground !font-medium"
            )
          }
          weekDayClassName={() =>
            "!text-muted-foreground !text-xs !font-medium !size-8 !flex !items-center !justify-center !uppercase"
          }
          monthClassName={() =>
            "!text-sm hover:!bg-accent hover:!text-accent-foreground !rounded-md !p-2 !m-1 !cursor-pointer !transition-colors"
          }
          yearClassName={() =>
            "!text-sm hover:!bg-accent hover:!text-accent-foreground !rounded-md !p-2 !m-1 !cursor-pointer !transition-colors"
          }
          timeClassName={() => "!text-sm"}
          weekAriaLabelPrefix="Tuần"
          monthAriaLabelPrefix="Tháng"
          nextMonthAriaLabel="Tháng sau"
          previousMonthAriaLabel="Tháng trước"
          nextYearAriaLabel="Năm sau"
          previousYearAriaLabel="Năm trước"
        />
      </div>

      <style jsx global>{`
        .custom-datepicker.react-datepicker {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          font-family: inherit;
          box-shadow:
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .custom-datepicker .react-datepicker__header {
          background: hsl(var(--popover));
          border-bottom: none;
          padding: 0;
          border-radius: 12px 12px 0 0;
        }

        .custom-datepicker .react-datepicker__current-month {
          display: none;
        }

        .custom-datepicker .react-datepicker__day-names {
          border-bottom: 1px solid hsl(var(--border));
          margin: 0;
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          column-gap: 4px;
        }

        .custom-datepicker .react-datepicker__week {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          column-gap: 4px;
          padding: 4px 8px;
          margin: 0;
        }

        .custom-datepicker .react-datepicker__day-name {
          margin: 0;
          width: 100%;
          height: 24px;
          line-height: 24px;
          text-align: center;
          color: hsl(var(--muted-foreground));
          font-weight: 500;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .custom-datepicker .react-datepicker__day {
          margin: 0;
          width: 100%;
          height: 32px;
          line-height: 32px;
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .custom-datepicker .react-datepicker__day:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        .custom-datepicker .react-datepicker__day--selected {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          font-weight: 500;
        }

        .custom-datepicker .react-datepicker__day--selected:hover {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        .custom-datepicker .react-datepicker__day--today {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          font-weight: 500;
          border: 1px solid blue;
        }

        .custom-datepicker .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
          opacity: 0.4;
        }

        .custom-datepicker .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.3;
          cursor: not-allowed;
        }

        .custom-datepicker .react-datepicker__today-button {
          background: hsl(var(--muted));
          border-top: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          text-align: center;
          font-weight: 500;
          padding: 12px;
          font-size: 12px;
          border-radius: 0 0 12px 12px;
          transition: all 0.2s ease;
        }

        .custom-datepicker .react-datepicker__today-button:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        .custom-datepicker .react-datepicker__month {
          margin: 0;
        }

        .custom-datepicker .react-datepicker__triangle {
          display: none;
        }

        .custom-datepicker .react-datepicker__navigation {
          display: none;
        }

        .custom-datepicker
          .react-datepicker__header:not(
            .react-datepicker__header--has-time-select
          ) {
          border-radius: 12px 12px 0 0;
        }

        .react-datepicker__close-icon {
          right: 30px !important;
        }
      `}</style>
    </>
  );
};

export default CustomDatePicker;
