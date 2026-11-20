import { filmsApi } from "@renderer/api/films.api";
import { seatIconConfigsApi } from "@renderer/api/seatIconConfigs.api";
import { filmsKey } from "@renderer/hooks/films/keys";
import { useScreeningRooms } from "@renderer/hooks/screeningRooms/useScreeningRooms";
import { seatIconConfigKeys } from "@renderer/hooks/seatIconConfigs/keys";
import {
  useCreateSeatIconConfig,
  useUpdateSeatIconConfig
} from "@renderer/hooks/seatIconConfigs/useSeatIconConfigMutations";
import { useAntdApp } from "@renderer/hooks/useAntdApp";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import type { FilmProps, SeatIconConfig, SeatIconConfigDto, SeatIconScope } from "@shared/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  Modal,
  Radio,
  Select,
  Switch,
  Tag,
  Tooltip,
  type FormInstance
} from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  classifySeatIconSaveError,
  getScopeTargetName,
  getSeatIconErrorMessage,
  SCOPE_LABEL,
  SCOPE_ORDER,
  type SeatIconSaveError
} from "../seatIconConfig.utils";
import { SeatIconPreviewPanel } from "./SeatIconPreview";
import SeatIconUploadField, { type SeatIconImageValue } from "./SeatIconUploadField";

export interface SeatIconFormValues {
  targetType: "SOLD";
  scope: SeatIconScope;
  scopeId?: number;
  image: SeatIconImageValue | null;
  isEnabled: boolean;
}

export const toFormValues = (config?: SeatIconConfig | null): SeatIconFormValues =>
  config
    ? {
        targetType: "SOLD",
        scope: config.scope,
        scopeId: config.scopeId ?? undefined,
        image: { url: config.imageUrl },
        isEnabled: config.isEnabled
      }
    : { targetType: "SOLD", scope: "ROOM", scopeId: undefined, image: null, isEnabled: true };

export const toSeatIconDto = (values: SeatIconFormValues): SeatIconConfigDto => ({
  targetType: "SOLD",
  scope: values.scope,
  scopeId: values.scope === "GLOBAL" ? null : (values.scopeId ?? null),
  imageUrl: values.image?.url ?? "",
  isEnabled: values.isEnabled
});

type TargetOption = { value: number; title: string; disabled: boolean; label: ReactNode };

const buildTargetOption = (id: number, name: string, owner?: SeatIconConfig): TargetOption => ({
  value: id,
  title: name,
  disabled: !!owner,
  label: (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate">{name}</span>
      {owner && (
        <Tag className="m-0!" color="default">
          Đã có cấu hình #{owner.id}
        </Tag>
      )}
    </div>
  )
});

interface TargetSelectProps {
  value?: number;
  onChange?: (value: number) => void;
  ownerOf: (id: number) => SeatIconConfig | undefined;
  editing?: SeatIconConfig | null;
}

/** Danh sách phòng chiếu (kể cả phòng ẩn; backend chỉ từ chối phòng đã xóa). */
const RoomSelect = ({ value, onChange, ownerOf }: TargetSelectProps) => {
  const { data, isFetching, isError } = useScreeningRooms({ current: 1, pageSize: 1000 });
  const options = useMemo(
    () => (data?.data ?? []).map((room) => buildTargetOption(room.id, room.name, ownerOf(room.id))),
    [data, ownerOf]
  );

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder="Chọn phòng chiếu"
      showSearch={{ optionFilterProp: "title" }}
      loading={isFetching}
      options={options}
      notFoundContent={isError ? "Không tải được danh sách phòng chiếu" : "Không tìm thấy"}
    />
  );
};

/** Tìm phim phía server theo tên; luôn giữ phim đang chọn trong danh sách để hiển thị đúng tên. */
const FilmSelect = ({ value, onChange, ownerOf, editing }: TargetSelectProps) => {
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(
    editing?.scope === "FILM" && editing.scopeId
      ? { id: editing.scopeId, name: getScopeTargetName(editing) }
      : null
  );
  const mapOption = useCallback(
    (film: FilmProps) => ({ value: film.id, label: film.filmName }),
    []
  );
  const filmSelect = useInfiniteSelectOptions({
    queryKey: [...filmsKey.all, "seat-icon-config-options"],
    queryFn: ({ pageParam, searchText }) =>
      filmsApi.getAll({ current: pageParam, pageSize: 20, filmName: searchText || undefined }),
    mapOption
  });

  const options = useMemo(() => {
    const items = filmSelect.options.map((option) =>
      buildTargetOption(Number(option.value), option.label, ownerOf(Number(option.value)))
    );
    if (selected && !items.some((item) => item.value === selected.id)) {
      items.unshift(buildTargetOption(selected.id, selected.name, ownerOf(selected.id)));
    }
    return items;
  }, [filmSelect.options, ownerOf, selected]);

  return (
    <Select
      value={value}
      onChange={(next: number, option) => {
        const picked = Array.isArray(option) ? undefined : option;
        setSelected({ id: next, name: String(picked?.title ?? next) });
        onChange?.(next);
      }}
      placeholder="Tìm phim theo tên"
      showSearch={{ filterOption: false, onSearch: filmSelect.onSearch }}
      onPopupScroll={filmSelect.onPopupScroll}
      loading={filmSelect.loading}
      options={options}
      notFoundContent={filmSelect.loading ? "Đang tải…" : "Không tìm thấy"}
    />
  );
};

interface SeatIconConfigFormProps {
  form: FormInstance<SeatIconFormValues>;
  editing?: SeatIconConfig | null;
  configs: SeatIconConfig[];
  saveError: SeatIconSaveError | null;
  onOpenExisting: (id: number | null) => void;
  onReloadLatest: () => void;
  onUploadingChange: (isUploading: boolean) => void;
  onFinish: (values: SeatIconFormValues) => void;
}

const SeatIconConfigForm = ({
  form,
  editing,
  configs,
  saveError,
  onOpenExisting,
  onReloadLatest,
  onUploadingChange,
  onFinish
}: SeatIconConfigFormProps) => {
  const scope = Form.useWatch("scope", form) as SeatIconScope | undefined;
  const others = useMemo(
    () => configs.filter((config) => config.id !== editing?.id),
    [configs, editing]
  );
  const globalOwner = others.find((config) => config.scope === "GLOBAL");
  const ownerOf = useCallback(
    (id: number) => others.find((config) => config.scope === scope && config.scopeId === id),
    [others, scope]
  );

  const scopeOptions = SCOPE_ORDER.map((value) => {
    const isTaken = value === "GLOBAL" && !!globalOwner;
    return {
      value,
      disabled: isTaken,
      label: isTaken ? (
        <Tooltip title={`Toàn rạp đã có cấu hình #${globalOwner?.id}. Hãy sửa cấu hình đó.`}>
          {SCOPE_LABEL[value]}
        </Tooltip>
      ) : (
        SCOPE_LABEL[value]
      )
    };
  });

  const duplicateOwner =
    saveError?.kind === "duplicate" && saveError.existingId
      ? configs.find((config) => config.id === saveError.existingId)
      : undefined;

  return (
    <Form<SeatIconFormValues>
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={toFormValues(editing)}
      requiredMark
    >
      {saveError?.kind === "duplicate" && (
        <Alert
          className="mb-3!"
          type="error"
          showIcon
          title={`${duplicateOwner ? getScopeTargetName(duplicateOwner) : "Phạm vi này"} đã có cấu hình icon ghế${saveError.existingId ? ` (#${saveError.existingId})` : ""}`}
          description="Mỗi phạm vi chỉ có một cấu hình, kể cả khi đang tắt. Có thể người khác vừa tạo cấu hình này."
          action={
            <Button size="small" onClick={() => onOpenExisting(saveError.existingId)}>
              {saveError.existingId ? `Mở cấu hình #${saveError.existingId}` : "Mở cấu hình đã có"}
            </Button>
          }
        />
      )}
      {saveError?.kind === "changed" && (
        <Alert
          className="mb-3!"
          type="warning"
          showIcon
          title="Cấu hình đã được người khác cập nhật"
          description={`Bạn đang sửa phiên bản ${editing?.version ?? "cũ"}${saveError.current ? `, bản mới nhất là ${saveError.current.version}` : ""}. Tải bản mới nhất rồi chỉnh sửa lại để không ghi đè thay đổi của người khác.`}
          action={
            <Button size="small" onClick={onReloadLatest}>
              Tải bản mới nhất
            </Button>
          }
        />
      )}
      {saveError?.kind === "other" && (
        <Alert className="mb-3!" type="error" showIcon title={saveError.message} />
      )}
      <div className="grid grid-cols-2 gap-x-4">
        <Form.Item<SeatIconFormValues> name="targetType" label="Đối tượng" className="mb-3!">
          <Select
            options={[
              { value: "SOLD", label: "Ghế đã bán" },
              { value: "VIP_SOLD", label: "Ghế VIP đã bán (giai đoạn sau)", disabled: true },
              { value: "COUPLE_SOLD", label: "Ghế đôi đã bán (giai đoạn sau)", disabled: true }
            ]}
          />
        </Form.Item>
        <Form.Item<SeatIconFormValues>
          name="isEnabled"
          label="Trạng thái"
          valuePropName="checked"
          className="mb-3!"
        >
          <Switch checkedChildren="Đang bật" unCheckedChildren="Đang tắt" />
        </Form.Item>
      </div>
      <Form.Item<SeatIconFormValues>
        name="scope"
        label="Phạm vi áp dụng"
        className="mb-3!"
        extra="Ưu tiên khi hiển thị: Phim > Phòng chiếu > Toàn rạp."
      >
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          options={scopeOptions}
          onChange={() => form.setFieldValue("scopeId", undefined)}
        />
      </Form.Item>
      {scope && scope !== "GLOBAL" && (
        <Form.Item<SeatIconFormValues>
          name="scopeId"
          label={scope === "ROOM" ? "Phòng chiếu" : "Phim"}
          rules={[{ required: true, message: scope === "ROOM" ? "Chọn phòng chiếu" : "Chọn phim" }]}
          className="mb-3!"
          extra="Phòng/phim đã có cấu hình bị khóa trong danh sách: hãy sửa cấu hình hiện có."
        >
          {scope === "ROOM" ? (
            <RoomSelect ownerOf={ownerOf} editing={editing} />
          ) : (
            <FilmSelect key={editing?.id ?? "new"} ownerOf={ownerOf} editing={editing} />
          )}
        </Form.Item>
      )}
      <Form.Item<SeatIconFormValues>
        name="image"
        label="Ảnh icon"
        rules={[{ required: true, message: "Vui lòng tải ảnh icon lên" }]}
        className="mb-3!"
      >
        <SeatIconUploadField onUploadingChange={onUploadingChange} />
      </Form.Item>
    </Form>
  );
};

interface SeatIconConfigDialogProps {
  open: boolean;
  editing: SeatIconConfig | null;
  configs: SeatIconConfig[];
  onClose: () => void;
  /** Chuyển modal sang sửa một cấu hình khác (cấu hình đã có khi trùng, hoặc bản mới nhất khi xung đột). */
  onOpenConfig: (config: SeatIconConfig) => void;
}

const MODAL_CLASS_NAMES = {
  wrapper: "py-4",
  container: "overflow-hidden p-0!",
  header:
    "mb-0! border-b border-slate-200 px-5 py-3 dark:border-app-border dark:bg-app-bg-container",
  body: "max-h-[calc(100vh-144px)] overflow-y-auto px-5! py-4! dark:bg-app-bg-container",
  footer:
    "mt-0! border-t border-slate-200 px-5 py-2.5 dark:border-app-border dark:bg-app-bg-container"
};

const SeatIconConfigDialog = ({
  open,
  editing,
  configs,
  onClose,
  onOpenConfig
}: SeatIconConfigDialogProps) => {
  const [form] = Form.useForm<SeatIconFormValues>();
  const { message } = useAntdApp();
  const queryClient = useQueryClient();
  const image = Form.useWatch("image", form);
  const createConfig = useCreateSeatIconConfig();
  const updateConfig = useUpdateSeatIconConfig();
  const [saveError, setSaveError] = useState<SeatIconSaveError | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpeningOther, setIsOpeningOther] = useState(false);
  const isSaving = createConfig.isPending || updateConfig.isPending;

  useEffect(() => {
    if (!open) return;
    setSaveError(null);
    form.resetFields();
    form.setFieldsValue(toFormValues(editing));
  }, [editing, form, open]);

  const title = editing
    ? `Sửa cấu hình icon ghế #${editing.id} · ${getScopeTargetName(editing)}`
    : "Thêm cấu hình icon ghế";

  const openConfigById = async (id: number) => {
    setIsOpeningOther(true);
    try {
      const config = await queryClient.fetchQuery({
        queryKey: seatIconConfigKeys.detail(id),
        queryFn: () => seatIconConfigsApi.getById(id),
        staleTime: 0
      });
      onOpenConfig(config);
    } catch (error) {
      message.error(getSeatIconErrorMessage(error, `Không mở được cấu hình #${id}`));
    } finally {
      setIsOpeningOther(false);
    }
  };

  const handleOpenExisting = (existingId: number | null) => {
    const values = form.getFieldsValue();
    const id =
      existingId ??
      configs.find(
        (config) =>
          config.scope === values.scope &&
          (values.scope === "GLOBAL" || config.scopeId === values.scopeId)
      )?.id;
    if (id) void openConfigById(id);
  };

  const handleReloadLatest = () => {
    if (saveError?.kind === "changed" && saveError.current) {
      onOpenConfig(saveError.current);
      return;
    }
    if (editing) void openConfigById(editing.id);
  };

  const handleFinish = async (values: SeatIconFormValues) => {
    setSaveError(null);
    const dto = toSeatIconDto(values);

    try {
      if (editing) {
        await updateConfig.mutateAsync({
          id: editing.id,
          dto: { ...dto, version: editing.version }
        });
        message.success("Đã lưu cấu hình icon ghế");
      } else {
        await createConfig.mutateAsync(dto);
        message.success("Đã thêm cấu hình icon ghế");
      }
      onClose();
    } catch (error) {
      const result = classifySeatIconSaveError(
        error,
        editing ? "Không lưu được cấu hình icon ghế" : "Không tạo được cấu hình icon ghế"
      );
      if (result.kind === "notFound") {
        message.error(result.message);
        onClose();
        return;
      }
      setSaveError(result);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      width="min(1080px, calc(100vw - 48px))"
      onCancel={onClose}
      destroyOnHidden
      centered
      mask={{ closable: !isSaving }}
      classNames={MODAL_CLASS_NAMES}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button
            type="primary"
            loading={isSaving}
            disabled={isUploading || isOpeningOther}
            onClick={() => form.submit()}
          >
            {editing ? "Lưu thay đổi" : "Tạo cấu hình"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0">
          <SeatIconConfigForm
            form={form}
            editing={editing}
            configs={configs}
            saveError={saveError}
            onOpenExisting={handleOpenExisting}
            onReloadLatest={handleReloadLatest}
            onUploadingChange={setIsUploading}
            onFinish={handleFinish}
          />
        </section>
        <SeatIconPreviewPanel imageUrl={image?.url} />
      </div>
    </Modal>
  );
};

export default SeatIconConfigDialog;
