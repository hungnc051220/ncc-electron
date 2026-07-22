import { CloseOutlined, FilterOutlined } from "@ant-design/icons";
import { usersApi } from "@renderer/api/users.api";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Badge, Button, DatePicker, Form, Modal, Select, Tag } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { startTransition, useEffect, useMemo, useState } from "react";
import { MODEL_OPTIONS } from "../accessHistory.registry";

dayjs.extend(utc);
dayjs.extend(timezone);

const { RangePicker } = DatePicker;

export const ACCESS_HISTORY_BUSINESS_TIMEZONE = "Asia/Ho_Chi_Minh";

export interface AccessHistoryFilterValues {
  userId?: number;
  model?: string;
  dateRange?: [string, string];
}

export interface AccessHistoryActorOption {
  value: number;
  label: string;
}

type FormValues = Omit<AccessHistoryFilterValues, "dateRange"> & {
  dateRange?: [Dayjs, Dayjs];
};

interface FilterProps {
  onSearch: (values: AccessHistoryFilterValues) => void;
  filterValues: AccessHistoryFilterValues;
  observedActorOptions?: readonly AccessHistoryActorOption[];
}

export interface AppliedAccessHistoryFiltersProps {
  filterValues: AccessHistoryFilterValues;
  onChange: (values: AccessHistoryFilterValues) => void;
  userOptions?: readonly AccessHistoryActorOption[];
  className?: string;
}

const isValidStoredDate = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && dayjs(value).isValid();

export const normalizeAccessHistoryFilterValues = (
  values: AccessHistoryFilterValues
): AccessHistoryFilterValues => {
  const normalized: AccessHistoryFilterValues = {};

  if (typeof values.userId === "number" && Number.isFinite(values.userId)) {
    normalized.userId = values.userId;
  }

  if (typeof values.model === "string" && values.model.trim()) {
    normalized.model = values.model.trim();
  }

  if (
    Array.isArray(values.dateRange) &&
    values.dateRange.length === 2 &&
    isValidStoredDate(values.dateRange[0]) &&
    isValidStoredDate(values.dateRange[1])
  ) {
    normalized.dateRange = [values.dateRange[0].trim(), values.dateRange[1].trim()];
  }

  return normalized;
};

export const getAccessHistoryActiveFilterCount = (values: AccessHistoryFilterValues) =>
  Object.keys(normalizeAccessHistoryFilterValues(values)).length;

export const serializeAccessHistoryDateRange = (
  dateRange?: [Dayjs, Dayjs]
): [string, string] | undefined => {
  if (!dateRange || dateRange.length !== 2 || dateRange.some((value) => !value?.isValid())) {
    return undefined;
  }

  const startDate = dayjs.tz(dateRange[0].format("YYYY-MM-DD"), ACCESS_HISTORY_BUSINESS_TIMEZONE);
  const endDate = dayjs.tz(dateRange[1].format("YYYY-MM-DD"), ACCESS_HISTORY_BUSINESS_TIMEZONE);

  return [startDate.startOf("day").toISOString(), endDate.endOf("day").toISOString()];
};

const toFormDateRange = (dateRange?: [string, string]): [Dayjs, Dayjs] | undefined => {
  if (!dateRange) {
    return undefined;
  }

  const startDate = dayjs(dateRange[0]).tz(ACCESS_HISTORY_BUSINESS_TIMEZONE);
  const endDate = dayjs(dateRange[1]).tz(ACCESS_HISTORY_BUSINESS_TIMEZONE);

  return startDate.isValid() && endDate.isValid() ? [startDate, endDate] : undefined;
};

const formatAppliedDateRange = (dateRange: [string, string]) => {
  const startDate = dayjs(dateRange[0]).tz(ACCESS_HISTORY_BUSINESS_TIMEZONE);
  const endDate = dayjs(dateRange[1]).tz(ACCESS_HISTORY_BUSINESS_TIMEZONE);

  return `${startDate.format("DD/MM/YYYY")} – ${endDate.format("DD/MM/YYYY")}`;
};

const getModelLabel = (model: string) =>
  MODEL_OPTIONS.find((option) => option.value === model)?.label ?? "Dữ liệu hệ thống";

export const AppliedAccessHistoryFilters = ({
  filterValues,
  onChange,
  userOptions = [],
  className
}: AppliedAccessHistoryFiltersProps) => {
  const normalizedFilters = normalizeAccessHistoryFilterValues(filterValues);
  const activeFilterCount = Object.keys(normalizedFilters).length;

  if (activeFilterCount === 0) {
    return null;
  }

  const removeFilter = (key: keyof AccessHistoryFilterValues) => {
    const nextFilters = { ...normalizedFilters };
    delete nextFilters[key];
    onChange(nextFilters);
  };

  const actorLabel =
    normalizedFilters.userId !== undefined
      ? (userOptions.find((option) => option.value === normalizedFilters.userId)?.label ??
        `Người dùng #${normalizedFilters.userId}`)
      : undefined;

  return (
    <div
      className={["flex flex-wrap items-center justify-end gap-1", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label="Bộ lọc đang áp dụng"
    >
      {normalizedFilters.model && (
        <Tag
          className="m-0"
          closable
          closeIcon={<CloseOutlined aria-label="Xóa bộ lọc loại dữ liệu" />}
          onClose={() => removeFilter("model")}
        >
          Loại dữ liệu: {getModelLabel(normalizedFilters.model)}
        </Tag>
      )}
      {normalizedFilters.userId !== undefined && (
        <Tag
          className="m-0"
          closable
          closeIcon={<CloseOutlined aria-label="Xóa bộ lọc người thực hiện" />}
          onClose={() => removeFilter("userId")}
        >
          Người thực hiện: {actorLabel}
        </Tag>
      )}
      {normalizedFilters.dateRange && (
        <Tag
          className="m-0"
          closable
          closeIcon={<CloseOutlined aria-label="Xóa bộ lọc khoảng thời gian" />}
          onClose={() => removeFilter("dateRange")}
        >
          Thời gian: {formatAppliedDateRange(normalizedFilters.dateRange)}
        </Tag>
      )}
      <Button type="link" size="small" onClick={() => onChange({})}>
        Xóa tất cả
      </Button>
    </div>
  );
};

const Filter = ({ onSearch, filterValues, observedActorOptions = [] }: FilterProps) => {
  const [form] = Form.useForm<FormValues>();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 500);
  const normalizedFilters = useMemo(
    () => normalizeAccessHistoryFilterValues(filterValues),
    [filterValues]
  );
  const activeFilterCount = Object.keys(normalizedFilters).length;

  const {
    data: users,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["access-history-users", debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      usersApi.getAll({ current: pageParam, pageSize: 20, keyword: debouncedSearch }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const userOptions = useMemo(() => {
    const optionsById = new Map<number, AccessHistoryActorOption>();

    observedActorOptions.forEach((option) => {
      if (Number.isFinite(option.value) && option.label.trim()) {
        optionsById.set(option.value, option);
      }
    });

    users?.pages.forEach((page) => {
      page.data.forEach((user) => {
        const fullName = [user.customerFirstName, user.customerLastName]
          .filter((value): value is string => !!value?.trim())
          .join(" ");

        optionsById.set(user.id, {
          value: user.id,
          label: fullName || user.fullname?.trim() || user.username || `Người dùng #${user.id}`
        });
      });
    });

    if (normalizedFilters.userId !== undefined && !optionsById.has(normalizedFilters.userId)) {
      optionsById.set(normalizedFilters.userId, {
        value: normalizedFilters.userId,
        label: `Người dùng #${normalizedFilters.userId}`
      });
    }

    return [...optionsById.values()];
  }, [normalizedFilters.userId, observedActorOptions, users]);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setFieldsValue({
      userId: normalizedFilters.userId,
      model: normalizedFilters.model,
      dateRange: toFormDateRange(normalizedFilters.dateRange)
    });
  }, [form, normalizedFilters, open]);

  const closeModal = () => {
    setOpen(false);
    setSearchText("");
  };

  const applyFilters = (values: AccessHistoryFilterValues) => {
    startTransition(() => {
      onSearch(normalizeAccessHistoryFilterValues(values));
    });
  };

  const clearFilters = () => {
    closeModal();
    form.resetFields();
    applyFilters({});
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AppliedAccessHistoryFilters
          filterValues={normalizedFilters}
          onChange={applyFilters}
          userOptions={userOptions}
        />
        <Badge
          count={activeFilterCount}
          size="small"
          offset={[-2, 2]}
          title={activeFilterCount > 0 ? `${activeFilterCount} bộ lọc đang áp dụng` : null}
        >
          <Button
            variant="outlined"
            icon={<FilterOutlined />}
            aria-label={
              activeFilterCount > 0 ? `Bộ lọc, ${activeFilterCount} bộ lọc đang áp dụng` : "Bộ lọc"
            }
            onClick={() => setOpen(true)}
          >
            Bộ lọc
          </Button>
        </Badge>
      </div>
      <Modal
        title="Bộ lọc"
        open={open}
        okText="Tìm kiếm"
        cancelText="Hủy"
        okButtonProps={{ htmlType: "submit", autoFocus: true }}
        onCancel={closeModal}
        width={420}
        forceRender
        modalRender={(dom) => (
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) => {
              closeModal();
              applyFilters({
                userId: values.userId,
                model: values.model,
                dateRange: serializeAccessHistoryDateRange(values.dateRange)
              });
            }}
          >
            {dom}
          </Form>
        )}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            <Button onClick={clearFilters}>Xóa bộ lọc</Button>
            <OkBtn />
          </>
        )}
      >
        <Form.Item name="model" label="Loại dữ liệu">
          <Select options={MODEL_OPTIONS} placeholder="Chọn loại dữ liệu" allowClear />
        </Form.Item>
        <Form.Item name="userId" label="Người thao tác">
          <Select
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchText(value)
            }}
            loading={isFetching || isFetchingNextPage}
            options={userOptions}
            placeholder="Chọn người thao tác"
            onClear={() => setSearchText("")}
            onPopupScroll={(event) => {
              const target = event.target as HTMLElement;
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                target.scrollHeight - target.scrollTop <= target.clientHeight + 50
              ) {
                fetchNextPage();
              }
            }}
            allowClear
          />
        </Form.Item>
        <Form.Item name="dateRange" label="Khoảng thời gian">
          <RangePicker className="w-full" presets={rangePresets} format="DD/MM/YYYY" />
        </Form.Item>
      </Modal>
    </>
  );
};

export default Filter;
