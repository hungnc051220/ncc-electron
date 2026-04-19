import type { DragEndEvent } from "@dnd-kit/core";
import { getApiErrorMessage } from "@renderer/lib/apiError";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AutoHeightTable from "@renderer/components/AutoHeightTable";
import { planFilmsApi } from "@renderer/api/planFilm.api";
import { useDeletePlanFilm } from "@renderer/hooks/planFilms/useDeletePlanFilm";
import { planFilmsKeys } from "@renderer/hooks/planFilms/keys";
import { useUpdatePlanFilm } from "@renderer/hooks/planFilms/useUpdatePlanCinema";
import { usePermission } from "@renderer/permissions/usePermission";
import { PlanFilmProps } from "@shared/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TableColumnsType, TableProps } from "antd";
import { Button, Modal } from "antd";
import { useEffect, useMemo, useState } from "react";
import AddMovies from "./AddMovies";
import { useAntdApp } from "@renderer/hooks/useAntdApp";

interface TabFilmProps {
  planCinemaId?: number;
}

const TabFilm = ({ planCinemaId }: TabFilmProps) => {
  const { message } = useAntdApp();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1
      }
    })
  );

  const [dataSource, setDataSource] = useState<PlanFilmProps[]>([]);
  const [selectedFilmIds, setSelectedFilmIds] = useState<number[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const params = useMemo(
    () => ({
      planCinemaId
    }),
    [planCinemaId]
  );

  const {
    data: filmPages,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: [...planFilmsKeys.all, "all-pages", params],
    queryFn: ({ pageParam = 1 }) =>
      planFilmsApi.getAll({
        current: pageParam,
        pageSize: 100,
        planCinemaId
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current < lastPage.pageCount ? lastPage.current + 1 : undefined,
    enabled: !!planCinemaId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always"
  });
  const { can } = usePermission();
  const canUpdate = can("plan_cinema", "update");
  const canDelete = can("plan_cinema", "delete");

  const updatePlanFilm = useUpdatePlanFilm();
  const deletePlanFilm = useDeletePlanFilm();
  const films = useMemo(() => filmPages?.pages.flatMap((page) => page.data) ?? [], [filmPages]);
  const selectedFilms = useMemo(
    () => dataSource.filter((film) => selectedFilmIds.includes(film.filmId)),
    [dataSource, selectedFilmIds]
  );

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    setSelectedFilmIds([]);
    setConfirmDeleteOpen(false);
    setDataSource([]);
  }, [planCinemaId]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!canUpdate) return;
    if (active.id !== over?.id) {
      const activeIndex = dataSource.findIndex((i) => i.filmId === active.id);
      const overIndex = dataSource.findIndex((i) => i.filmId === over?.id);
      const result = arrayMove(dataSource, activeIndex, overIndex);
      const sortResult = result.map((i, index) => ({
        ...i,
        order: index
      }));
      setDataSource(sortResult);

      updatePlanFilm.mutate(
        { dto: sortResult },
        {
          onSuccess: () => {
            message.success("Thay đổi thứ tự phim trong kế hoạch thành công");
          },
          onError: (error: unknown) => {
            message.error(
              getApiErrorMessage(error, "Thay đổi thứ tự phim trong kế hoạch thất bại")
            );
          }
        }
      );
    }
  };

  const handleDeleteFilms = () => {
    if (!planCinemaId) return;

    const payload = selectedFilmIds.map((filmId) => ({
      planCinemaId: planCinemaId,
      filmId,
      order: 0
    }));

    deletePlanFilm.mutate(
      { dto: payload },
      {
        onSuccess: () => {
          setSelectedFilmIds([]);
          setConfirmDeleteOpen(false);
          message.success("Xóa phim trong kế hoạch thành công");
        },
        onError: (error: unknown) => {
          message.error(getApiErrorMessage(error, "Xóa phim trong kế hoạch thất bại"));
        }
      }
    );
  };

  useEffect(() => {
    setDataSource(films);
  }, [films]);

  interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    "data-row-key": string;
  }

  const Row: React.FC<Readonly<RowProps>> = (props) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: props["data-row-key"],
      disabled: !canUpdate
    });

    const style: React.CSSProperties = {
      ...props.style,
      transform: CSS.Translate.toString(transform),
      transition,
      cursor: canUpdate ? "move" : "default",
      ...(isDragging ? { position: "relative", zIndex: 9999 } : {})
    };

    return <tr {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} />;
  };

  const columns: TableColumnsType<PlanFilmProps> = [
    {
      title: "Thứ tự",
      key: "order",
      dataIndex: "order",
      width: 70,
      align: "center",
      render: (v) => (typeof v === "number" ? v + 1 : null)
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.film?.filmName
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (_, record) => `${record.film?.duration} phút`
    },
    {
      title: "Phiên bản",
      key: "versionCode",
      render: (_, record) => record.film?.versionCode
    }
  ];

  const rowSelection: TableProps<PlanFilmProps>["rowSelection"] = {
    hideSelectAll: true,
    selectedRowKeys: selectedFilmIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedFilmIds(selectedRowKeys as number[]);
    }
  };

  if (!filmPages) return null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <p className="text-sm">
            Đã chọn <b>{selectedFilmIds.length}</b> phim
          </p>
          <Button
            size="small"
            variant="outlined"
            color="red"
            disabled={selectedFilmIds.length === 0 || !canDelete}
            loading={deletePlanFilm.isPending}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Xóa
          </Button>
        </div>
        {canUpdate && (
          <AddMovies
            planCinemaId={planCinemaId!}
            selectedFilmIds={films.map((item) => item.filmId)}
            planFilms={films}
          />
        )}
      </div>

      <div className="z-0 flex min-h-0 min-w-0 flex-1 flex-col pt-2">
        <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext
            items={dataSource.map((i) => i.filmId)}
            strategy={verticalListSortingStrategy}
          >
            <AutoHeightTable
              containerClassName="min-w-0"
              components={{
                body: { row: Row }
              }}
              rowKey="filmId"
              columns={columns}
              dataSource={dataSource}
              size="small"
              bordered
              loading={isFetching || isFetchingNextPage}
              pagination={false}
              rowSelection={canDelete ? { type: "checkbox", ...rowSelection } : undefined}
            />
          </SortableContext>
        </DndContext>
      </div>

      <Modal
        open={confirmDeleteOpen}
        title="Xác nhận xóa phim"
        onOk={handleDeleteFilms}
        onCancel={() => setConfirmDeleteOpen(false)}
        okButtonProps={{
          danger: true
        }}
        confirmLoading={deletePlanFilm.isPending}
        destroyOnHidden
      >
        {selectedFilms.length <= 1 ? (
          <div className="space-y-3">
            Bạn có chắc chắn muốn xóa phim này khỏi kế hoạch không?
            {selectedFilms[0] && (
              <div className="mt-3 rounded-md border border-(--ant-color-border-secondary) bg-(--ant-color-fill-tertiary) px-3 py-2">
                <div>
                  <strong>Tên phim:</strong> {selectedFilms[0].film?.filmName}
                </div>
                <div>
                  <strong>Phiên bản:</strong> {selectedFilms[0].film?.versionCode}
                </div>
              </div>
            )}
            <div>Thao tác không thể thu hồi.</div>
          </div>
        ) : (
          <div className="space-y-3">
            Bạn có chắc chắn muốn xóa <strong>{selectedFilms.length}</strong> phim sau khỏi kế hoạch
            không?
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto rounded-md border border-(--ant-color-border-secondary) p-2">
              {selectedFilms.map((film) => (
                <div
                  key={film.filmId}
                  className="rounded-md border border-(--ant-color-border-secondary) bg-(--ant-color-fill-tertiary) px-3 py-2"
                >
                  <div>
                    <strong>Tên phim:</strong> {film.film?.filmName}
                  </div>
                  <div>
                    <strong>Phiên bản:</strong> {film.film?.versionCode}
                  </div>
                </div>
              ))}
            </div>
            <div>Thao tác không thể thu hồi.</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TabFilm;
