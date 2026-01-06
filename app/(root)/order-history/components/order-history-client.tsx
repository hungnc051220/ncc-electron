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
import { ApiResponse, OrderDetailProps } from "@/types";
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
import Filter from "./filter";
import { cn, formatMoney } from "@/lib/utils";
import OrderDialog from "./order-dialog";
import { Button } from "@/components/ui/button";
import { RowSelectionState } from "@tanstack/react-table";

enum TabCode {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
}

interface OrderHistoryClientProps {
  data: ApiResponse<OrderDetailProps>;
  page: number;
}

const OrderHistoryClient = ({ data, page }: OrderHistoryClientProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tabCode, setTabCode] = useState<TabCode>(
    (searchParams.get("tabCode") as TabCode) || TabCode.ONLINE
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderDetailProps | null>(
    null
  );

  const handleViewDetail = useCallback((item: OrderDetailProps) => {
    setSelectedItem(item);
    setDialogOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      createColumns({
        onViewDetail: handleViewDetail,
        page,
        options: {
          isRowPreselected: (item) => rowSelection[item.order.id],
        },
      }),
    [page, handleViewDetail, rowSelection]
  );

  const totalPrice = useMemo(() => {
    const selectedOrders = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((rowId) => {
        const order = data.data.find(
          (item) => item.order.id.toString() === rowId
        );
        return order ? order?.order?.orderTotal : null;
      })
      .filter(Boolean) as number[];
    return selectedOrders.reduce((total, order) => total + order, 0);
  }, [data.data, rowSelection]);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const onChangeTabCode = useCallback(
    (newTabCode: TabCode) => {
      setTabCode(newTabCode);
      const current = qs.parse(searchParams.toString());
      const query = { ...current, isOnline: newTabCode, page: 1 };
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
    <div className="space-y-3 mt-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tra cứu</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold">
                  Lịch sử bán vé
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs">
              Số lượng vé xuất:{" "}
              <span className="font-semibold">
                {Object.keys(rowSelection).length}
              </span>
            </p>
            <p className="text-xs">
              Tổng tiền:{" "}
              <span className="font-semibold">{formatMoney(totalPrice)}</span>
            </p>
          </div>
          <Filter onSearchingChange={setIsSearching} />
          <Button
            disabled={Object.keys(rowSelection).length === 0}
            onClick={() => {}}
          >
            Xuất vé điện tử
          </Button>
        </div>
      </div>

      <div className="flex items-center mb-5 gap-2 border-b">
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary",
            tabCode === TabCode.ONLINE
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.ONLINE)}
        >
          Vé online
        </div>
        <div
          className={cn(
            "p-2 text-sm font-bold border-b-3 cursor-pointer hover:text-primary",
            tabCode === TabCode.OFFLINE
              ? "border-primary text-primary"
              : "border-transparent"
          )}
          onClick={() => onChangeTabCode(TabCode.OFFLINE)}
        >
          Vé offline
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        loading={isSearching}
        className="max-h-[calc(100vh-260px)]"
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.order.id.toString()}
      />

      {dialogOpen && (
        <OrderDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default OrderHistoryClient;
