import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDeletePlanFilm } from "@renderer/hooks/planFilms/useDeletePlanFilm";
import { usePlanFilms } from "@renderer/hooks/planFilms/usePlanCinemas";
import { useUpdatePlanFilm } from "@renderer/hooks/planFilms/useUpdatePlanCinema";
import { ApiError, PlanFilmProps } from "@renderer/types";
import type { TableColumnsType, TableProps } from "antd";
import { Button, message, Table } from "antd";
import { useEffect, useMemo, useState } from "react";
import AddMovies from "./AddMovies";
import axios from "axios";

interface TabFilmProps {
  planCinemaId?: number;
}

const TabFilm = ({ planCinemaId }: TabFilmProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1
      }
    })
  );

  const [dataSource, setDataSource] = useState<PlanFilmProps[]>([]);
  const [selectedFilmIds, setSelectedFilmIds] = useState<number[]>([]);

  const params = useMemo(
    () => ({
      current: 1,
      pageSize: 100,
      planCinemaId
    }),
    [planCinemaId]
  );

  const { data, isFetching } = usePlanFilms(params);

  const updatePlanFilm = useUpdatePlanFilm();
  const deletePlanFilm = useDeletePlanFilm();

  const onDragEnd = ({ active, over }: DragEndEvent) => {
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
            let msg = "Thay đổi thứ tự phim trong kế hoạch thất bại";

            if (axios.isAxiosError<ApiError>(error)) {
              msg = error.response?.data?.message ?? msg;
            }

            message.error(msg);
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
          message.success("Xóa phim trong kế hoạch thành công");
        },
        onError: (error: unknown) => {
          let msg = "Xóa phim trong kế hoạch thất bại";

          if (axios.isAxiosError<ApiError>(error)) {
            msg = error.response?.data?.message ?? msg;
          }

          message.error(msg);
        }
      }
    );
  };

  useEffect(() => {
    if (data?.data) {
      setDataSource(data.data);
    }
  }, [data]);

  interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    "data-row-key": string;
  }

  const Row: React.FC<Readonly<RowProps>> = (props) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: props["data-row-key"]
    });

    const style: React.CSSProperties = {
      ...props.style,
      transform: CSS.Translate.toString(transform),
      transition,
      cursor: "move",
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
    selectedRowKeys: selectedFilmIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedFilmIds(selectedRowKeys as number[]);
    }
  };

  if (!data) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <p className="text-sm">
            Đã chọn <b>{selectedFilmIds.length}</b> phim
          </p>
          <Button
            size="small"
            variant="outlined"
            color="red"
            disabled={selectedFilmIds.length === 0}
            loading={deletePlanFilm.isPending}
            onClick={handleDeleteFilms}
          >
            Xóa
          </Button>
        </div>
        <AddMovies
          planCinemaId={planCinemaId!}
          selectedFilmIds={data.data.map((item) => item.filmId)}
          planFilms={data.data}
        />
      </div>

      <div className="pt-2 z-0">
        <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext
            items={dataSource.map((i) => i.filmId)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              components={{
                body: { row: Row }
              }}
              rowKey="filmId"
              columns={columns}
              dataSource={dataSource}
              size="small"
              bordered
              loading={isFetching}
              pagination={false}
              rowSelection={{ type: "checkbox", ...rowSelection }}
            />
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default TabFilm;
