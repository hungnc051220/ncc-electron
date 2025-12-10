"use client";

import { createFilmAction, updateFilmAction } from "@/actions/film-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { FilmFormInput } from "@/lib/schemas/film-schema";
import { FilmProps } from "@/types";
import { format } from "date-fns";
import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import FilmForm from "./film-form";

const INITIAL_STATE = {
  formData: null,
  fieldErrors: null,
  success: false,
  error: null,
};

interface FilmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFilm?: FilmProps | null;
}

const FilmDialog = ({ open, onOpenChange, editingFilm }: FilmDialogProps) => {
  const isEdit = !!editingFilm;
  const [state, action, pending] = useActionState(
    isEdit ? updateFilmAction : createFilmAction,
    INITIAL_STATE
  );

  const onSubmit = (values: FilmFormInput) => {
    const formData = new FormData();
    if (isEdit && editingFilm) {
      formData.append("id", editingFilm.id.toString());
    }
    Object.entries(values).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (key === "premieredDay" && value) {
        formData.append("premieredDay", format(value, "yyyy-MM-dd") as string);
        return;
      }
      if (key === "categoryIds" && value.length > 0) {
        formData.append("categoryIds", JSON.stringify(value));
        return;
      }
      formData.append(key, value as string);
    });
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(
        isEdit ? "Cập nhật phim thành công" : "Thêm phim thành công"
      );
      onOpenChange(false);
    }
  }, [state, isEdit, onOpenChange]);

  const getDefaultValues = (): Partial<FilmFormInput> | undefined => {
    if (!editingFilm) return undefined;
    return {
      filmName: editingFilm.filmName || "",
      filmNameEn: editingFilm.filmNameEn || "",
      videoUrl: editingFilm.videoUrl || "",
      duration: editingFilm.duration || 0,
      director: editingFilm.director || "",
      actors: editingFilm.actors || "",
      introduction: editingFilm.introduction || "",
      manufacturerId: editingFilm.manufacturerId,
      versionCode: editingFilm.versionCode,
      statusCode: editingFilm.statusCode,
      languageCode: editingFilm.languageCode,
      description: editingFilm.description || "",
      sellOnline: editingFilm.sellOnline || false,
      published: editingFilm.published || false,
      premieredDay: editingFilm.premieredDay,
      showOnHomePage: editingFilm.showOnHomePage || false,
      isHot: editingFilm.isHot || 0,
      ageAbove: editingFilm.ageAbove || 0,
      proposedPrice: editingFilm.proposedPrice || 0,
      trailerOnHomePage: editingFilm.trailerOnHomePage,
      orderNo: editingFilm.orderNo || 0,
      sellOnlineBefore: editingFilm.sellOnlineBefore || 0,
      isFree: editingFilm.isFree || false,
      categoryIds: editingFilm.categories.map((item) => item.categoryId) || [],
      filmStatus: editingFilm.filmStatus,
      filmVersion: editingFilm.filmVersion,
      filmLanguage: editingFilm.filmLanguage,
      imageUrl: editingFilm.imageUrl || "",
      countryId: editingFilm.countryId,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px]">
        <DialogHeader className="border-b">
          <DialogTitle>
            {isEdit ? "Cập nhật phim" : "Thêm mới phim"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          <FilmForm onSubmit={onSubmit} defaultValues={getDefaultValues()} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={pending}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="film-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Cập nhật" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilmDialog;
