import { filmsApi } from "@renderer/api/films.api";
import { filmsKey } from "@renderer/hooks/films/keys";
import { useScreeningRooms } from "@renderer/hooks/screeningRooms/useScreeningRooms";
import { useEffectiveSeatIcon } from "@renderer/hooks/seatIconConfigs/useEffectiveSeatIcon";
import { useInfiniteSelectOptions } from "@renderer/hooks/useInfiniteSelectOptions";
import type { FilmProps, SeatIconConfig } from "@shared/types";
import { Modal, Select, Spin } from "antd";
import { useCallback, useState } from "react";
import { getSeatIconErrorMessage, SCOPE_LABEL } from "../seatIconConfig.utils";
import { SoldSeatSamples } from "./SeatIconPreview";

interface SeatIconEffectiveCheckerProps {
  open: boolean;
  configs: SeatIconConfig[];
  onClose: () => void;
}

/**
 * Kiểm tra icon một suất chiếu sẽ dùng: kết quả lấy từ chính `GET /effective` mà sơ đồ bán vé gọi, các bước
 * ưu tiên Phim > Phòng > Toàn rạp dựng từ danh sách cấu hình để giải thích kết quả.
 */
const SeatIconEffectiveChecker = ({ open, configs, onClose }: SeatIconEffectiveCheckerProps) => {
  const [film, setFilm] = useState<{ id: number; name: string } | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const { data: rooms, isFetching: isFetchingRooms } = useScreeningRooms({
    current: 1,
    pageSize: 1000
  });
  const mapOption = useCallback(
    (item: FilmProps) => ({ value: item.id, label: item.filmName }),
    []
  );
  const filmSelect = useInfiniteSelectOptions({
    queryKey: [...filmsKey.all, "seat-icon-config-options"],
    queryFn: ({ pageParam, searchText }) =>
      filmsApi.getAll({ current: pageParam, pageSize: 20, filmName: searchText || undefined }),
    mapOption
  });
  const effective = useEffectiveSeatIcon({ filmId: film?.id, roomId }, open);
  const roomName = rooms?.data.find((room) => room.id === roomId)?.name;

  const steps: { label: string; config?: SeatIconConfig }[] = [
    {
      label: `Phim: ${film?.name ?? "—"}`,
      config: film
        ? configs.find((config) => config.scope === "FILM" && config.scopeId === film.id)
        : undefined
    },
    {
      label: `Phòng: ${roomName ?? "—"}`,
      config: roomId
        ? configs.find((config) => config.scope === "ROOM" && config.scopeId === roomId)
        : undefined
    },
    { label: "Toàn rạp", config: configs.find((config) => config.scope === "GLOBAL") }
  ];
  const appliedId = effective.data?.hasIcon ? effective.data.configId : null;
  const hasQuery = !!film || !!roomId;

  const resultText = !hasQuery
    ? "Chọn phim và/hoặc phòng chiếu để kiểm tra"
    : effective.isError
      ? getSeatIconErrorMessage(effective.error, "Không kiểm tra được icon hiệu lực")
      : effective.data?.hasIcon && effective.data.scope
        ? `Kết quả: ${SCOPE_LABEL[effective.data.scope]} #${effective.data.configId}`
        : "Kết quả: giao diện mặc định";

  return (
    <Modal
      open={open}
      title="Kiểm tra icon hiệu lực theo suất chiếu"
      width={560}
      footer={null}
      onCancel={onClose}
      centered
      destroyOnHidden
    >
      <div className="grid grid-cols-2 gap-3">
        <Select
          allowClear
          placeholder="Phim"
          value={film?.id}
          showSearch={{ filterOption: false, onSearch: filmSelect.onSearch }}
          onPopupScroll={filmSelect.onPopupScroll}
          loading={filmSelect.loading}
          onChange={(value: number | undefined, option) => {
            const picked = Array.isArray(option) ? undefined : option;
            setFilm(value ? { id: value, name: String(picked?.label ?? value) } : null);
          }}
          options={
            film && !filmSelect.options.some((option) => option.value === film.id)
              ? [{ value: film.id, label: film.name }, ...filmSelect.options]
              : filmSelect.options
          }
        />
        <Select
          allowClear
          placeholder="Phòng chiếu"
          value={roomId ?? undefined}
          loading={isFetchingRooms}
          showSearch={{ optionFilterProp: "label" }}
          onChange={(value: number | undefined) => setRoomId(value ?? null)}
          options={(rooms?.data ?? []).map((room) => ({ value: room.id, label: room.name }))}
        />
      </div>
      <ol className="my-4 flex flex-col gap-2 pl-0">
        {steps.map((step, index) => {
          const isApplied = !!step.config && step.config.id === appliedId;
          const state = !step.config
            ? "Không có cấu hình"
            : !step.config.isEnabled
              ? `#${step.config.id} đang tắt → bỏ qua`
              : isApplied
                ? `#${step.config.id} → ÁP DỤNG`
                : `#${step.config.id} (ưu tiên thấp hơn)`;
          return (
            <li
              key={step.label}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${isApplied ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "border-slate-200 dark:border-app-border"}`}
            >
              <span>
                <b>{index + 1}.</b> {step.label}
              </span>
              <span className={isApplied ? "font-semibold text-green-600" : "text-slate-500"}>
                {state}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
        <Spin spinning={hasQuery && effective.isFetching} size="small">
          <span className={`text-sm ${effective.isError ? "text-red-500" : ""}`}>{resultText}</span>
        </Spin>
        <SoldSeatSamples url={hasQuery ? effective.imageUrl : null} />
      </div>
    </Modal>
  );
};

export default SeatIconEffectiveChecker;
