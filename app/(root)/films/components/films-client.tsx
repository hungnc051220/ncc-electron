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
import useGeneralData from "@/hooks/use-general-data";
import { cn } from "@/lib/utils";
import { ApiResponse, FilmProps } from "@/types";
import { PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createColumns } from "./columns";
import DeleteFilmDialog from "./delete-film-dialog";
import FilmDialog from "./film-dialog";
import Filter from "./filter";
import { useMediaQuery } from "react-responsive";

enum TabCode {
  ALL = "ALL",
  FILM_HOME_PAGE = "FILM_HOME_PAGE",
  FILM_ON_PLAN = "FILM_ON_PLAN",
}
interface FilmsClientProps {
  data: ApiResponse<FilmProps>;
  page: number;
}

const FilmsClient = ({ data, page }: FilmsClientProps) => {
  const isTabletOrMobile = useMediaQuery({query: '(max-width: 1024px)'});
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const generalData = useGeneralData((state) => state.data);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<FilmProps | null>(null);
  const [deletingFilm, setDeletingFilm] = useState<FilmProps | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tabCode, setTabCode] = useState<TabCode>(
    (searchParams.get("tabCode") as TabCode) || TabCode.ALL
  );

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

  const onChangeTabCode = useCallback(
    (newTabCode: TabCode) => {
      setTabCode(newTabCode);
      const current = qs.parse(searchParams.toString());
      const query = { ...current, tabCode: newTabCode, page: 1 };
      const url = qs.stringifyUrl(
        { url: window.location.href, query },
        { skipEmptyString: true, skipNull: true }
      );
      startTransition(() => {
        setIsSearching(true);
        router.push(url);
      });
    },
    [setIsSearching, router, searchParams]
  );

  useEffect(() => {
    if (setIsSearching) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSearching(isPending);
    }
  }, [isPending, setIsSearching]);

  return (
    <div className="space-y-3 mt-4">
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
                <BreadcrumbPage className="font-bold">
                  Danh sách phim
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex gap-2 items-center">
          <Filter isTabletOrMobile={isTabletOrMobile}/>
          <Button onClick={handleAdd} size={isTabletOrMobile ? "sm" : "default"}>
            <PlusIcon className={isTabletOrMobile ? "size-3" : "size-4"} />
            Thêm phim mới
          </Button>
        </div>
      </div>

      <div className="flex items-center mb-5 gap-2 border-b">
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary transition-colors",
            tabCode === TabCode.ALL
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.ALL)}
        >
          Danh sách phim
        </div>
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary",
            tabCode === TabCode.FILM_HOME_PAGE
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.FILM_HOME_PAGE)}
        >
          Phim trên trang chủ
        </div>
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary",
            tabCode === TabCode.FILM_ON_PLAN
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.FILM_ON_PLAN)}
        >
          Phim trên kế hoạch
        </div>
      </div>
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
