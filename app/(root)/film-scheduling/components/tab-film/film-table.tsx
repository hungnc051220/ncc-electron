"use client";

import { addPlanFilmAction } from "@/actions/plan-cinema-actions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PlanFilmProps } from "@/types";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { Grip, Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

function SortableRow({
  item,
  isSelected,
  onToggle,
}: {
  item: PlanFilmProps;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.filmId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
    >
      <TableCell className="w-[24px] px-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggle(checked === true)}
        />
      </TableCell>
      <TableCell
        className="cursor-grab px-3 py-2 w-[50px]"
        {...attributes}
        {...listeners}
      >
        <Grip size={18} className="text-trunks mx-auto" />
      </TableCell>
      <TableCell className="w-[70px] px-2">{item.order + 1}</TableCell>
      <TableCell className="px-2">{item.film.filmName}</TableCell>
      <TableCell className="px-2">{item.film.duration} phút</TableCell>
      <TableCell className="px-2">{item.film.versionCode}</TableCell>
    </TableRow>
  );
}

interface FilmTableProps {
  initialData: PlanFilmProps[];
  isPending: boolean;
  selectedFilmIds: number[];
  onSelectedChange: (ids: number[]) => void;
}

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

const FilmTable = ({
  initialData,
  isPending,
  selectedFilmIds,
  onSelectedChange,
}: FilmTableProps) => {
  const queryClient = useQueryClient();
  const [state, action, pending] = useActionState(
    addPlanFilmAction,
    INITIAL_STATE
  );

  const [data, setData] = useState(initialData);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.findIndex((i) => i.filmId === active.id);
    const newIndex = data.findIndex((i) => i.filmId === over.id);
    const result = arrayMove(data, oldIndex, newIndex);
    const sortResult = result.map((i, index) => ({
      ...i,
      order: index,
    }));
    setData(sortResult);

    const formData = new FormData();
    formData.append("selectedFilms", JSON.stringify(sortResult));
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success("Thay đổi thứ tự phim thành công");
      queryClient.invalidateQueries({ queryKey: ["plan-film"] });
    }
  }, [state, queryClient]);

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={data.map((i) => i.filmId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="rounded-md relative flex flex-col h-full max-h-full">
          <div className="relative flex flex-col flex-1 min-h-0">
            <div className="sticky top-0 z-20 bg-goku">
              <Table className="table-fixed w-full border border-b-none rounded-t-lg">
                <TableHeader className="bg-goku">
                  <TableRow>
                    <TableHead className="w-[24px] px-2">
                      <Checkbox
                        checked={
                          selectedFilmIds.length > 0 &&
                          data.every((i) => selectedFilmIds.includes(i.filmId))
                            ? true
                            : selectedFilmIds.length > 0
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onSelectedChange(data.map((i) => i.filmId));
                          } else {
                            onSelectedChange([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[70px]">Thứ tự</TableHead>
                    <TableHead>Tên phim</TableHead>
                    <TableHead>Thời lượng</TableHead>
                    <TableHead>Phiên bản</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            <div className="flex-1 overflow-y-auto relative">
              <Table className="table-fixed w-full border-b border-x">
                <TableBody className={cn(pending && "opacity-50")}>
                  {isPending ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-trunks"
                      >
                        <div className="flex w-full items-center justify-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang tải dữ liệu....
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((item) => (
                      <SortableRow
                        key={item.filmId}
                        item={item}
                        isSelected={selectedFilmIds.includes(item.filmId)}
                        onToggle={(selected) => {
                          if (selected) {
                            onSelectedChange([
                              ...selectedFilmIds,
                              item.filmId,
                            ]);
                          } else {
                            onSelectedChange(
                              selectedFilmIds.filter((id) => id !== item.filmId)
                            );
                          }
                        }}
                      />
                    ))
                  )}
                  {data && data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-trunks"
                      >
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {pending && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-b-md pointer-events-none">
                  <div className="flex items-center gap-2 text-trunks bg-background/90 px-4 py-2 rounded-md shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang cập nhật thứ tự phim...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default FilmTable;
