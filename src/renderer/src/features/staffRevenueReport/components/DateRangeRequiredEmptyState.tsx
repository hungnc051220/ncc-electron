import { Empty } from "antd";

interface DateRangeRequiredEmptyStateProps {
  description?: string;
}

const DateRangeRequiredEmptyState = ({
  description = "Vui lòng chọn khoảng thời gian để xem báo cáo"
}: DateRangeRequiredEmptyStateProps) => {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-app-border bg-goku/40 dark:bg-app-bg-container">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
    </div>
  );
};

export default DateRangeRequiredEmptyState;
