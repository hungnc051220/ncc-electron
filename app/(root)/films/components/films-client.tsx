"use client";

import { DataTable } from "@/components/data-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ApiResponse, FilmProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { createColumns } from "./columns";
import DeleteFilmDialog from "./delete-film-dialog";
import FilmDialog from "./film-dialog";
import Filter from "./filter";
import useGeneralData from "@/hooks/use-general-data";
interface FilmsClientProps {
  data: ApiResponse<FilmProps>;
  page: number;
}

const FilmsClient = ({ data, page }: FilmsClientProps) => {
  const generalData = useGeneralData((state) => state.data);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<FilmProps | null>(null);
  const [deletingFilm, setDeletingFilm] = useState<FilmProps | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleAdd = useCallback(() => {
    setEditingFilm(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((film: FilmProps) => {
    setEditingFilm(film);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((film: FilmProps) => {
    setDeletingFilm(film);
    setDeleteDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingFilm(null);
    }
  }, []);

  const handleDeleteDialogClose = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeletingFilm(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        page,
        manufactures: generalData?.manufacturers || [],
      }),
    [handleEdit, handleDelete, page, generalData]
  );

  return (
    <div className="space-y-6 xl:space-y-8 mt-4 xl:mt-10">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lý danh sách</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Danh sách phim</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h3 className="font-bold text-2xl mt-1">Danh sách phim</h3>
        </div>

        <Button onClick={handleAdd}>
          <PlusIcon className="size-6" />
          Thêm phim mới
        </Button>
      </div>

      <Filter onSearchingChange={setIsSearching} />
      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        loading={isSearching}
      />
      {dialogOpen && (
        <FilmDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingFilm={editingFilm}
        />
      )}
      {deletingFilm && (
        <DeleteFilmDialog
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogClose}
          filmId={deletingFilm.id}
          filmName={deletingFilm.filmName}
        />
      )}
    </div>
  );
};

export default FilmsClient;
