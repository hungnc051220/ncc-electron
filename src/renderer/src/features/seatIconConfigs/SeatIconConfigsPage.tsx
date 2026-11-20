import Icon, { MoreOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import PageHeader from "@renderer/components/PageHeader";
import RefreshButton from "@renderer/components/RefreshButton";
import {
  useDeleteSeatIconConfig,
  useUpdateSeatIconConfig
} from "@renderer/hooks/seatIconConfigs/useSeatIconConfigMutations";
import {
  useAllSeatIconConfigs,
  useSeatIconConfigPage
} from "@renderer/hooks/seatIconConfigs/useSeatIconConfigs";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { useDebounce } from "@renderer/hooks/useDebounce";
import { formatNumber } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import type { SeatIconConfig, SeatIconConfigQuery, SeatIconScope } from "@shared/types";
import {
  Alert,
  Button,
  Dropdown,
  Input,
  Segmented,
  Select,
  Tag,
  type MenuProps,
  type TableProps
} from "antd";
import dayjs from "dayjs";
import { CircleCheck, CircleOff, PlusIcon, SquarePen, Trash2, Waypoints } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import SeatIconConfigDialog, {
  toSeatIconDto,
  toFormValues
} from "./components/SeatIconConfigDialog";
import SeatIconEffectiveChecker from "./components/SeatIconEffectiveChecker";
import { SEGMENTED_CLASS, SoldSeatThumbnail } from "./components/SeatIconPreview";
import {
  describeFallback,
  getScopeTargetName,
  getSeatIconErrorMessage,
  resolveSeatIconPermissions,
  SCOPE_LABEL,
  SCOPE_TAG_COLOR
} from "./seatIconConfig.utils";

type ScopeFilter = SeatIconScope | "ALL";
type StatusFilter = "ALL" | "ON" | "OFF";

/**
 * Bộ lọc phạm vi: chữ các lựa chọn chưa chọn dùng màu chữ chính (không mờ), hover đậm hơn; tab đi thẳng vào
 * từng lựa chọn để thấy viền focus và dùng phím mũi tên.
 */
const SCOPE_FILTER_CLASS_NAMES = {
  root: SEGMENTED_CLASS,
  item: "text-slate-800! hover:text-slate-950! dark:text-slate-100! dark:hover:text-white!"
};

const SeatIconConfigsPage = () => {
  const { modal, message } = useAntdApp();
  const { can } = usePermission();
  const permissions = useMemo(() => resolveSeatIconPermissions(can), [can]);
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword.trim(), 400);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialog, setDialog] = useState<{ open: boolean; editing: SeatIconConfig | null }>({
    open: false,
    editing: null
  });
  const [isCheckerOpen, setIsCheckerOpen] = useState(false);

  const query = useMemo<SeatIconConfigQuery>(
    () => ({
      targetType: "SOLD",
      scope: scope === "ALL" ? undefined : scope,
      isEnabled: status === "ALL" ? undefined : status === "ON",
      keyword: debouncedKeyword || undefined,
      current,
      pageSize
    }),
    [current, debouncedKeyword, pageSize, scope, status]
  );

  const page = useSeatIconConfigPage(query, permissions.canRead);
  const all = useAllSeatIconConfigs(permissions.canRead);
  const allConfigs = useMemo(() => all.data ?? [], [all.data]);
  const updateConfig = useUpdateSeatIconConfig();
  const deleteConfig = useDeleteSeatIconConfig();
  const hasFilter = scope !== "ALL" || status !== "ALL" || !!debouncedKeyword;

  const resetPage = () => setCurrent(1);

  const openCreate = useCallback(() => setDialog({ open: true, editing: null }), []);
  const openEdit = useCallback(
    (config: SeatIconConfig) => setDialog({ open: true, editing: config }),
    []
  );
  const closeDialog = useCallback(() => setDialog((prev) => ({ ...prev, open: false })), []);

  const toggle = (config: SeatIconConfig) => {
    const turningOff = config.isEnabled;
    modal.confirm({
      title: turningOff ? `Tắt cấu hình #${config.id}?` : `Bật cấu hình #${config.id}?`,
      content: turningOff
        ? describeFallback(allConfigs, config)
        : "Ghế đã bán trong phạm vi này sẽ hiển thị ảnh icon.",
      okText: turningOff ? "Tắt" : "Bật",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await updateConfig.mutateAsync({
            id: config.id,
            dto: {
              ...toSeatIconDto(toFormValues(config)),
              isEnabled: !config.isEnabled,
              version: config.version
            }
          });
          message.success(turningOff ? "Đã tắt cấu hình" : "Đã bật cấu hình");
        } catch (error) {
          message.error(
            getSeatIconErrorMessage(
              error,
              turningOff ? "Không tắt được cấu hình" : "Không bật được cấu hình"
            )
          );
        }
      }
    });
  };

  const remove = (config: SeatIconConfig) => {
    modal.confirm({
      title: `Xóa cấu hình icon ghế #${config.id}?`,
      content: describeFallback(allConfigs, config),
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteConfig.mutateAsync(config.id);
          message.success("Đã xóa cấu hình");
        } catch (error) {
          message.error(getSeatIconErrorMessage(error, "Không xóa được cấu hình"));
        }
      }
    });
  };

  const actionItems = (record: SeatIconConfig): MenuProps["items"] => [
    ...(permissions.canUpdate
      ? [
          { key: "edit", icon: <SquarePen size={16} />, label: "Cập nhật" },
          {
            key: "toggle",
            icon: record.isEnabled ? <CircleOff size={16} /> : <CircleCheck size={16} />,
            label: record.isEnabled ? "Tắt" : "Bật"
          }
        ]
      : []),
    ...(permissions.canDelete
      ? [{ key: "delete", icon: <Trash2 size={16} />, label: "Xóa", danger: true }]
      : [])
  ];
  const hasActions = permissions.canUpdate || permissions.canDelete;

  const columns: TableProps<SeatIconConfig>["columns"] = [
    {
      title: "STT",
      key: "no",
      align: "center",
      width: 50,
      render: (_, __, index) => (current - 1) * pageSize + index + 1
    },
    {
      title: "Ảnh",
      key: "image",
      width: 64,
      align: "center",
      render: (_, record) => (
        <div className={`inline-flex ${record.isEnabled ? "" : "opacity-40 grayscale"}`}>
          <SoldSeatThumbnail url={record.imageUrl} />
        </div>
      )
    },
    {
      title: "Phạm vi",
      key: "scope",
      width: 120,
      render: (_, record) => (
        <Tag color={SCOPE_TAG_COLOR[record.scope]}>{SCOPE_LABEL[record.scope]}</Tag>
      )
    },
    {
      title: "Áp dụng cho",
      key: "scopeName",
      render: (_, record) =>
        record.scope === "GLOBAL" ? (
          <span className="text-slate-500 dark:text-slate-400">Mọi phòng, mọi phim</span>
        ) : (
          <span className="flex items-center gap-2">
            {getScopeTargetName(record)}
            {record.scopeTargetMissing && (
              <Tag color="red">{record.scope === "FILM" ? "Phim đã xóa" : "Phòng đã xóa"}</Tag>
            )}
          </span>
        )
    },
    { title: "Đối tượng", key: "target", width: 120, render: () => "Ghế đã bán" },
    {
      title: "Trạng thái",
      key: "isEnabled",
      width: 120,
      render: (_, record) =>
        record.isEnabled ? <Tag color="success">Đang áp dụng</Tag> : <Tag>Đang tắt</Tag>
    },
    {
      title: "Cập nhật",
      key: "updated",
      width: 170,
      render: (_, record) => (
        <div className="text-xs leading-5">
          <div>{dayjs(record.updatedAt ?? record.createdAt).format("DD/MM/YYYY HH:mm")}</div>
          <div className="text-slate-500 dark:text-slate-400">
            {record.updatedBy ?? record.createdBy}
          </div>
        </div>
      )
    },
    ...(hasActions
      ? [
          {
            title: "",
            key: "operation",
            width: 50,
            align: "center" as const,
            fixed: "right" as const,
            render: (_: unknown, record: SeatIconConfig) => (
              <Dropdown
                arrow
                trigger={["click"]}
                menu={{
                  items: actionItems(record),
                  onClick: ({ key }) =>
                    key === "edit"
                      ? openEdit(record)
                      : key === "toggle"
                        ? toggle(record)
                        : remove(record)
                }}
              >
                <Button
                  type="text"
                  size="small"
                  aria-label={`Thao tác cấu hình #${record.id}`}
                  icon={<MoreOutlined />}
                />
              </Dropdown>
            )
          }
        ]
      : [])
  ];

  const emptyText = page.isError ? (
    <div className="py-6">
      <Alert
        type="error"
        showIcon
        title={getSeatIconErrorMessage(page.error, "Không tải được danh sách cấu hình icon ghế")}
        action={
          <Button size="small" onClick={() => void page.refetch()}>
            Thử lại
          </Button>
        }
      />
    </div>
  ) : hasFilter ? (
    <div className="py-6 text-slate-500 dark:text-slate-400">
      Không có cấu hình phù hợp với bộ lọc.
    </div>
  ) : (
    <div className="py-6 text-slate-500 dark:text-slate-400">
      Chưa có cấu hình nào — sơ đồ ghế đang dùng giao diện mặc định.
      {permissions.canCreate && (
        <div className="mt-2">
          <Button type="primary" onClick={openCreate}>
            Thêm cấu hình đầu tiên
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pt-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          permissions.canRead ? (
            <>
              <Button icon={<Waypoints size={14} />} onClick={() => setIsCheckerOpen(true)}>
                Kiểm tra hiệu lực
              </Button>
              <RefreshButton
                loading={page.isFetching}
                onRefresh={() => Promise.all([page.refetch(), all.refetch()])}
              />
              {permissions.canCreate && (
                <Button type="primary" onClick={openCreate} icon={<Icon component={PlusIcon} />}>
                  Thêm cấu hình
                </Button>
              )}
            </>
          ) : null
        }
      />
      {!permissions.canRead ? (
        <Alert
          type="warning"
          showIcon
          title="Bạn chưa được cấp quyền xem danh sách cấu hình icon ghế"
          description="Liên hệ quản trị viên cấp quyền “Xem DS” hoặc “Chi tiết” của mục Cấu hình icon ghế."
        />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            title="Ảnh thay cho ô ghế đã bán trên sơ đồ bán vé. Ưu tiên: Phim > Phòng chiếu > Toàn rạp > giao diện mặc định. Cấu hình đang tắt không được áp dụng."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<ScopeFilter>
              aria-label="Lọc theo phạm vi"
              // antd 6 biến wrapper thành điểm dừng Tab không có viền focus: Tab thẳng vào từng lựa chọn để
              // thấy viền focus mặc định và dùng phím mũi tên đổi phạm vi.
              tabIndex={-1}
              value={scope}
              onChange={(value) => {
                setScope(value);
                resetPage();
              }}
              classNames={SCOPE_FILTER_CLASS_NAMES}
              options={[
                { value: "ALL", label: "Tất cả" },
                { value: "GLOBAL", label: "Toàn rạp" },
                { value: "ROOM", label: "Phòng chiếu" },
                { value: "FILM", label: "Phim" }
              ]}
            />
            <Select<StatusFilter>
              aria-label="Lọc theo trạng thái"
              value={status}
              onChange={(value) => {
                setStatus(value);
                resetPage();
              }}
              className="w-40"
              options={[
                { value: "ALL", label: "Mọi trạng thái" },
                { value: "ON", label: "Đang áp dụng" },
                { value: "OFF", label: "Đang tắt" }
              ]}
            />
            <Input.Search
              allowClear
              aria-label="Tìm phòng, phim"
              placeholder="Tìm phòng, phim"
              className="max-w-64"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                resetPage();
              }}
              onSearch={(value) => {
                setKeyword(value);
                resetPage();
              }}
            />
          </div>
          <AutoHeightTable<SeatIconConfig>
            rowKey="id"
            dataSource={page.isError ? [] : (page.data?.data ?? [])}
            columns={columns}
            bordered
            size="small"
            loading={page.isFetching}
            locale={{ emptyText }}
            pagination={{
              current,
              pageSize,
              total: page.data?.total ?? 0,
              size: "middle",
              pageSizeOptions: [20, 50, 100],
              showSizeChanger: true,
              onChange: (nextPage, nextPageSize) => {
                setCurrent(nextPageSize !== pageSize ? 1 : nextPage);
                setPageSize(nextPageSize);
              },
              showTotal: (total) => `Tổng ${formatNumber(total)} bản ghi`
            }}
          />
        </>
      )}
      {dialog.open && (
        <SeatIconConfigDialog
          open={dialog.open}
          editing={dialog.editing}
          configs={allConfigs}
          onClose={closeDialog}
          onOpenConfig={(config) => {
            if (permissions.canUpdate) {
              openEdit(config);
              return;
            }
            closeDialog();
            message.warning(
              `Đã có cấu hình #${config.id} cho ${getScopeTargetName(config)}, nhưng bạn không có quyền sửa cấu hình.`
            );
          }}
        />
      )}
      {isCheckerOpen && (
        <SeatIconEffectiveChecker
          open={isCheckerOpen}
          configs={allConfigs}
          onClose={() => setIsCheckerOpen(false)}
        />
      )}
    </div>
  );
};

export default SeatIconConfigsPage;
