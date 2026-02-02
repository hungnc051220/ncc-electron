"use client";

import { getPlanFilms } from "@/data/loaders";
import { PlanFilmProps } from "@/types";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType, TableProps } from "antd";
import { Button, Table } from "antd";
import axios from "axios";
import queryString from "query-string";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AddMovies from "./add-movies";

interface TabFilmProps {
  planCinemaId?: number;
}

const TabFilm = ({ planCinemaId }: TabFilmProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
  );

  const queryClient = useQueryClient();
  const [dataSource, setDataSource] = useState<PlanFilmProps[]>([]);
  const [selectedFilmIds, setSelectedFilmIds] = useState<number[]>([]);

  const { data, isFetching } = useQuery({
    queryKey: ["plan-films", planCinemaId],
    queryFn: () => {
      const query = queryString.stringify(
        {
          filter: JSON.stringify({ planCinemaId }),
          current: 1,
          pageSize: 100,
          sort: "order",
        },
        { skipEmptyString: true, skipNull: true },
      );
      return getPlanFilms(query);
    },
    enabled: !!planCinemaId,
  });

  const changeOrderPlanFilmMutation = useMutation({
    mutationFn: (data: PlanFilmProps[]) => {
      return axios.post("/api/plan-films/update", { data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-films"] });
      toast.success("Thay đổi thứ tự phim trong kế hoạch thành công");
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  const deleteFilmOnPlanMutation = useMutation({
    mutationFn: (data: number[]) => {
      const payload = data.map((filmId) => ({
        planCinemaId,
        filmId,
      }));
      return axios.post("/api/plan-films/delete", { data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-films"] });
      setSelectedFilmIds([]);
      toast.success("Xóa phim trong kế hoạch thành công");
    },
    onError: (error) => {
      toast.error(error?.message || "Có lỗi bất thường xảy ra");
    },
  });

  useEffect(() => {
    if (data?.data) {
      setDataSource(data.data);
    }
  }, [data]);

  const handleDeleteFilms = () => {
    deleteFilmOnPlanMutation.mutate(selectedFilmIds);
  };

  interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    "data-row-key": string;
  }

  const Row: React.FC<Readonly<RowProps>> = (props) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: props["data-row-key"],
    });

    const style: React.CSSProperties = {
      ...props.style,
      transform: CSS.Translate.toString(transform),
      transition,
      cursor: "move",
      ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
    };

    return (
      <tr
        {...props}
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
      />
    );
  };

  const columns: TableColumnsType<PlanFilmProps> = [
    {
      title: "Thứ tự",
      key: "order",
      dataIndex: "order",
      width: 70,
      align: "center",
      render: (v) => (typeof v === "number" ? v + 1 : null),
    },
    {
      title: "Tên phim",
      key: "filmName",
      dataIndex: "filmName",
      render: (_, record) => record.film?.filmName,
    },
    {
      title: "Thời lượng",
      key: "duration",
      dataIndex: "duration",
      render: (_, record) => `${record.film?.duration} phút`,
    },
    {
      title: "Phiên bản",
      key: "versionCode",
      render: (_, record) => record.film?.versionCode,
    },
  ];

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      const activeIndex = dataSource.findIndex((i) => i.filmId === active.id);
      const overIndex = dataSource.findIndex((i) => i.filmId === over?.id);
      const result = arrayMove(dataSource, activeIndex, overIndex);
      const sortResult = result.map((i, index) => ({
        ...i,
        order: index,
      }));
      setDataSource(sortResult);
      changeOrderPlanFilmMutation.mutate(sortResult);
    }
  };

  if (!data) return null;

  const rowSelection: TableProps<PlanFilmProps>["rowSelection"] = {
    selectedRowKeys: selectedFilmIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedFilmIds(selectedRowKeys as number[]);
    },
  };

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
            loading={deleteFilmOnPlanMutation.isPending}
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

      <div className="pt-2 pb-6 z-0">
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={dataSource.map((i) => i.filmId)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              components={{
                body: { row: Row },
              }}
              rowKey="filmId"
              columns={columns}
              dataSource={dataSource}
              size="small"
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
