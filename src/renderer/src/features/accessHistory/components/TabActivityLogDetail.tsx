import { usersApi } from "@renderer/api/users.api";
import { useAuditLog } from "@renderer/hooks/useAuditLog";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { formatNumber } from "@renderer/lib/utils";
import { AuditLogProps } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PaginationProps, TableProps, TimeRangePickerProps } from "antd";
import { DatePicker, Select, Table, Tag } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

const { RangePicker } = DatePicker;

const rangePresets: TimeRangePickerProps["presets"] = [
  { label: "7 ngày trước", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "14 ngày trước", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "30 ngày trước", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "90 ngày trước", value: [dayjs().add(-90, "d"), dayjs()] }
];

const dataTypes = [
  {
    value: "Order",
    label: "Đơn hàng"
  },
  {
    value: "Film",
    label: "Danh mục phim"
  },
  {
    value: "Category",
    label: "Danh mục phân loại phim"
  },
  {
    value: "Manufacturer",
    label: "Danh mục hãng phim"
  },
  {
    value: "PlanCinema",
    label: "Kế hoạch chiếu phim"
  },
  {
    value: "PlanScreenings",
    label: "Lịch chiếu phim"
  },
  {
    value: "DayPart",
    label: "Khung giờ chiếu"
  },
  {
    value: "Room",
    label: "Phòng chiếu"
  },
  {
    value: "Position",
    label: "Sơ đồ ghế ngồi"
  },
  {
    value: "CancelReason",
    label: "Lý do hủy vé"
  },
  {
    value: "Customer",
    label: "Tài khoản người dùng"
  }
];

const fieldLabels: Record<string, string> = {
  id: "ID",
  code: "Mã",
  name: "Tên",
  title: "Tiêu đề",
  description: "Mô tả",
  note: "Ghi chú",
  status: "Trạng thái",
  isActive: "Đang hoạt động",
  isDeleted: "Đã xóa",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
  deletedAt: "Ngày xóa",
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  fromDate: "Từ ngày",
  toDate: "Đến ngày",
  projectDate: "Ngày chiếu",
  projectTime: "Giờ chiếu",
  orderNo: "Thứ tự",
  username: "Tên đăng nhập",
  fullName: "Họ và tên",
  firstName: "Tên",
  lastName: "Họ",
  email: "Email",
  phone: "Số điện thoại",
  address: "Địa chỉ",
  roomId: "Phòng chiếu",
  roomName: "Tên phòng",
  filmId: "Phim",
  filmName: "Tên phim",
  categoryId: "Phân loại",
  categoryName: "Tên phân loại",
  manufacturerId: "Hãng phim",
  manufacturerName: "Tên hãng phim",
  planCinemaId: "Kế hoạch chiếu",
  planScreeningId: "Lịch chiếu",
  customerId: "Khách hàng",
  customerName: "Tên khách hàng",
  price: "Giá",
  quantity: "Số lượng",
  total: "Tổng",
  amount: "Số tiền",
  percent: "Phần trăm",
  versionCode: "Phiên bản",
  posterUrl: "Ảnh poster",
  trailerUrl: "Link trailer",
  seatMap: "Sơ đồ ghế"
};

const phraseFieldLabels: Record<string, string> = {
  "is online selling": "Bán online",
  "online selling": "Bán online",
  "update user": "Người cập nhật",
  "updated user": "Người cập nhật",
  "user update": "Người cập nhật",
  "is active": "Đang hoạt động",
  "is deleted": "Đã xóa",
  "created at": "Ngày tạo",
  "updated at": "Ngày cập nhật",
  "deleted at": "Ngày xóa",
  "start date": "Ngày bắt đầu",
  "end date": "Ngày kết thúc",
  "project date": "Ngày chiếu",
  "project time": "Giờ chiếu",
  "film name": "Tên phim",
  "room name": "Tên phòng",
  "category name": "Tên phân loại",
  "manufacturer name": "Tên hãng phim",
  "customer name": "Tên khách hàng",
  "full name": "Họ và tên",
  "first name": "Tên",
  "last name": "Họ"
};

const fieldWordLabels: Record<string, string> = {
  id: "ID",
  code: "Mã",
  name: "Tên",
  title: "Tiêu đề",
  description: "Mô tả",
  note: "Ghi chú",
  status: "Trạng thái",
  active: "hoạt động",
  deleted: "đã xóa",
  created: "tạo",
  updated: "cập nhật",
  start: "bắt đầu",
  end: "kết thúc",
  from: "từ",
  to: "đến",
  date: "ngày",
  time: "giờ",
  project: "chiếu",
  order: "thứ tự",
  no: "số",
  username: "tên đăng nhập",
  full: "họ và tên",
  first: "tên",
  last: "họ",
  email: "email",
  phone: "số điện thoại",
  address: "địa chỉ",
  room: "phòng",
  film: "phim",
  category: "phân loại",
  manufacturer: "hãng phim",
  plan: "kế hoạch",
  screening: "lịch chiếu",
  customer: "khách hàng",
  price: "giá",
  quantity: "số lượng",
  total: "tổng",
  amount: "số tiền",
  percent: "phần trăm",
  version: "phiên bản",
  poster: "poster",
  trailer: "trailer",
  url: "link",
  seat: "ghế",
  map: "sơ đồ",
  online: "online",
  selling: "bán",
  position: "vị trí",
  reason: "lý do",
  cancel: "hủy",
  cinema: "chiếu phim"
};

interface AuditObject {
  [key: string]: AuditValue;
}

type AuditValue = null | boolean | number | string | AuditValue[] | AuditObject;

type AuditFieldRow = {
  key: string;
  label: string;
  oldValue: AuditValue | undefined;
  newValue: AuditValue | undefined;
  changed: boolean;
};

const parseAuditValue = (value: unknown): AuditValue | undefined => {
  if (value == null || value === "") return undefined;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as AuditValue;
    } catch {
      return value;
    }
  }

  if (typeof value === "boolean" || typeof value === "number" || typeof value === "object") {
    return value as AuditValue;
  }

  return String(value);
};

const flattenAuditObject = (
  value: AuditValue | undefined,
  parentKey = ""
): Record<string, AuditValue | undefined> => {
  if (value == null) return {};

  if (Array.isArray(value) || typeof value !== "object") {
    return parentKey ? { [parentKey]: value } : { value };
  }

  const entries = Object.entries(value);
  if (!entries.length) {
    return parentKey ? { [parentKey]: value } : {};
  }

  return entries.reduce<Record<string, AuditValue | undefined>>((acc, [key, nestedValue]) => {
    const nextKey = parentKey ? `${parentKey}.${key}` : key;

    if (
      nestedValue != null &&
      typeof nestedValue === "object" &&
      !Array.isArray(nestedValue) &&
      Object.keys(nestedValue).length > 0
    ) {
      Object.assign(acc, flattenAuditObject(nestedValue as Record<string, AuditValue>, nextKey));
      return acc;
    }

    acc[nextKey] = nestedValue;
    return acc;
  }, {});
};

const isSameAuditValue = (left: AuditValue | undefined, right: AuditValue | undefined) =>
  JSON.stringify(left) === JSON.stringify(right);

const splitFieldKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d+)/g, "$1 $2")
    .replace(/(\d+)([A-Za-z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const capitalizeVietnamese = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatFieldLabel = (key: string) => {
  const lastKey = key.split(".").pop() || key;
  if (fieldLabels[lastKey]) return fieldLabels[lastKey];

  const words = splitFieldKey(lastKey);
  const normalizedKey = words.join(" ").toLowerCase();

  if (phraseFieldLabels[normalizedKey]) {
    return phraseFieldLabels[normalizedKey];
  }

  const priceOfPositionMatch = normalizedKey.match(/^price of position (\d+)$/);
  if (priceOfPositionMatch) {
    return `Giá ở vị trí ${priceOfPositionMatch[1]}`;
  }

  const onlineChairFloorMatch = normalizedKey.match(
    /^(?:number|quantity|total)?\s*online\s+chair\s+[a-z]\s+(\d+)$/
  );
  if (onlineChairFloorMatch) {
    return `Ghế bán online tầng ${onlineChairFloorMatch[1]}`;
  }

  const chairFloorMatch = normalizedKey.match(
    /^(?:number|quantity|total)?\s*chair\s+[a-z]\s+(\d+)$/
  );
  if (chairFloorMatch) {
    return `Ghế tầng ${chairFloorMatch[1]}`;
  }

  const translatedWords = words.map((word) => {
    const lowerWord = word.toLowerCase();
    if (lowerWord === "id") return "ID";
    return fieldWordLabels[lowerWord] || word;
  });

  const label = translatedWords.join(" ").trim();
  return label ? capitalizeVietnamese(label) : lastKey;
};

const formatAuditDisplayValue = (value: AuditValue | undefined) => {
  if (value == null || value === "") return <span className="text-slate-400 italic">Không có</span>;
  if (typeof value === "boolean") return value ? "Có" : "Không";

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) return <span className="text-slate-400 italic">Không có</span>;

    if (/\d{4}-\d{2}-\d{2}([T\s].*)?/.test(trimmedValue) && dayjs(trimmedValue).isValid()) {
      return dayjs(trimmedValue).format("DD/MM/YYYY HH:mm");
    }

    return trimmedValue;
  }

  if (typeof value === "number") return formatNumber(value);

  return (
    <pre className="m-0 whitespace-pre-wrap break-words text-xs text-slate-600">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

const getAuditFieldRows = (record: AuditLogProps): AuditFieldRow[] => {
  const oldValue = parseAuditValue(record.oldValues);
  const newValue = parseAuditValue(record.newValues);

  const oldFields = flattenAuditObject(oldValue);
  const newFields = flattenAuditObject(newValue);
  const allKeys = Array.from(new Set([...Object.keys(oldFields), ...Object.keys(newFields)]));

  if (!allKeys.length) {
    if (oldValue == null && newValue == null) return [];

    return [
      {
        key: "value",
        label: "Giá trị",
        oldValue,
        newValue,
        changed: !isSameAuditValue(oldValue, newValue)
      }
    ];
  }

  const rows = allKeys.map((key) => {
    const previousValue = oldFields[key];
    const nextValue = newFields[key];

    return {
      key,
      label: formatFieldLabel(key),
      oldValue: previousValue,
      newValue: nextValue,
      changed: !isSameAuditValue(previousValue, nextValue)
    };
  });

  if (record.action === "UPDATE") {
    return rows.filter((row) => row.changed);
  }

  return rows;
};

const AuditChangeList = ({ record }: { record: AuditLogProps }) => {
  const rows = getAuditFieldRows(record);

  if (!rows.length) {
    return <span className="text-slate-400 italic">Không có dữ liệu</span>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const isCreateAction = record.action === "CREATE";
        const isDeleteAction = record.action === "DELETE";
        const isUpdateAction = record.action === "UPDATE";

        return (
          <div
            key={row.key}
            className={`rounded-md border px-3 py-2 ${
              row.changed ? "border-sky-200 bg-sky-50/70" : "border-slate-200 bg-slate-50/60"
            }`}
          >
            <div className="mb-1 text-sm font-semibold text-slate-700">{row.label}</div>
            {isCreateAction ? (
              <div className="text-sm break-words font-medium text-slate-900">
                {formatAuditDisplayValue(row.newValue)}
              </div>
            ) : null}
            {isDeleteAction ? (
              <div className="text-sm break-words text-slate-700">
                {formatAuditDisplayValue(row.oldValue)}
              </div>
            ) : null}
            {isUpdateAction ? (
              <div className="flex items-center gap-2 text-sm break-words text-slate-600">
                <span className="min-w-0">{formatAuditDisplayValue(row.oldValue)}</span>
                <span className="shrink-0 text-slate-400">-&gt;</span>
                <span className="min-w-0 font-medium text-slate-900">
                  {formatAuditDisplayValue(row.newValue)}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const TabActivityLogDetail = () => {
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState("");
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().add(-30, "d"));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());

  const debouncedSearch = useDebounce(searchText, 500);

  const {
    data: users,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["users", debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      usersApi.getAll({ current: pageParam, pageSize: 20, keyword: debouncedSearch }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length;
      return currentPage < lastPage.pageCount ? currentPage + 1 : undefined;
    }
  });

  const options = useMemo(() => {
    return (
      users?.pages.flatMap((page) =>
        page.data.map((user) => ({
          value: user.id,
          label:
            user.customerFirstName && user.customerLastName
              ? `${user.customerFirstName} ${user.customerLastName}`
              : user.username
        }))
      ) ?? []
    );
  }, [users]);

  const params = useMemo(() => {
    return {
      current,
      pageSize,
      userId,
      model,
      fromDate: fromDate ? fromDate?.startOf("day").format() : undefined,
      toDate: toDate ? toDate?.endOf("day").format() : undefined
    };
  }, [current, pageSize, userId, model, fromDate, toDate]);

  const { data, isFetching: isFetchingData } = useAuditLog(params);

  const columns: TableProps<AuditLogProps>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      render: (_, __, index) => (current - 1) * 100 + index + 1,
      width: 50
    },
    {
      title: "Loại dữ liệu",
      dataIndex: "model",
      key: "model",
      render: (model) => dataTypes.find((item) => item.value === model)?.label || model,
      width: 150
    },
    {
      title: "Thao tác",
      dataIndex: "action",
      key: "action",
      width: 120,
      render: (action) => {
        if (!action) return "-";
        const map: Record<string, { color: string; text: string }> = {
          CREATE: { color: "green", text: "Tạo mới" },
          UPDATE: { color: "blue", text: "Sửa" },
          DELETE: { color: "red", text: "Xóa" }
        };
        const cfg = map[action] || { color: "default", text: String(action) };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      }
    },
    {
      title: "Thay đổi",
      key: "changes",
      render: (_, record) => <AuditChangeList record={record} />,
      width: 520
    },
    {
      title: "Người cập nhật",
      dataIndex: "username",
      key: "username",
      width: 150
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (_, { timestamp }) => dayjs(timestamp).format("DD/MM/YYYY HH:mm"),
      width: 160
    }
  ];

  const onChange: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  const onRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates) {
      setFromDate(dates[0]);
      setToDate(dates[1]);
    } else {
      setFromDate(null);
      setToDate(null);
    }
  };

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setCurrent(current);
    setPageSize(pageSize);
  };

  return (
    <div>
      <div className="flex items-center gap-x-4 gap-y-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm">Loại dữ liệu</p>
          <Select
            style={{ width: 220 }}
            value={model}
            onChange={setModel}
            options={dataTypes}
            placeholder="Chọn loại dữ liệu"
            allowClear
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm">Người thao tác</p>
          <Select
            showSearch={{
              filterOption: false,
              onSearch: (value) => setSearchText(value)
            }}
            loading={isFetching || isFetchingNextPage}
            style={{ width: 220 }}
            value={userId}
            onChange={setUserId}
            options={options}
            placeholder="Chọn người thao tác"
            onPopupScroll={(e) => {
              const target = e.target as HTMLElement;
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
        </div>

        <div className="flex items-center gap-2 z-20">
          <p className="text-sm whitespace-nowrap">Từ ngày</p>
          <RangePicker
            defaultValue={[fromDate, toDate]}
            format="DD/MM/YYYY"
            onChange={onRangeChange}
            presets={rangePresets}
          />
        </div>
      </div>
      <Table
        dataSource={data?.data || []}
        columns={columns}
        bordered
        size="small"
        rowKey="id"
        scroll={{ x: 1250, y: "calc(100vh - 370px)" }}
        loading={isFetchingData}
        pagination={{
          current,
          onChange,
          total: data?.total || 0,
          size: "middle",
          pageSize,
          pageSizeOptions: [20, 50, 100],
          showSizeChanger: true,
          onShowSizeChange,
          showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
        }}
      />
    </div>
  );
};

export default TabActivityLogDetail;
