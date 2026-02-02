"use client";

import { getFilmScheduling } from "@/data/loaders";
import { cn } from "@/lib/utils";
import { PlanCinemaProps } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CollapseProps, PaginationProps } from "antd";
import { Breadcrumb, Collapse, Pagination, Spin } from "antd";
import { format } from "date-fns";
import { Trash } from "lucide-react";
import qs from "query-string";
import { useState } from "react";
import AddPlanDialog from "./add-plan-dialog";
import DeletePlanDialog from "./delete-plan-dialog";
import ApproveRejectActions from "./tab-film/approve-reject-actions";
import ArchivedActions from "./tab-film/archived-actions";
import SendForApproveActions from "./tab-film/send-for-approve-actions";
import TabsList from "./tabs-list";

const PlanCinemaClient = () => {
  const [activeKey, setActiveKey] = useState<string | string[]>("0");
  const [current, setCurrent] = useState(1);
  const [openDelete, setOpenDelete] = useState(false);

  const onOpenChange = (open: boolean) => setOpenDelete(open);

  const [selectedPlan, setSelectedPlan] = useState<PlanCinemaProps | undefined>(
    undefined,
  );

  const { data, isFetching } = useQuery({
    queryKey: ["plan-cinema", { current, activeKey }],
    queryFn: () => {
      const queryObject: Record<string, unknown> = {
        current,
        pageSize: 20,
        sort: "createdOnUtc.desc",
        filter: JSON.stringify(
          activeKey[0] === "0"
            ? { or: [{ status: { in: [0, 2] } }, { status: null }] }
            : {
                status: activeKey[0],
              },
        ),
      };

      const body = qs.stringify(queryObject, {
        skipEmptyString: true,
        skipNull: true,
      });

      return getFilmScheduling(body).then((res) => res);
    },
    placeholderData: keepPreviousData,
  });

  const plans = data?.data;

  const clearSelectedPlan = () => setSelectedPlan(undefined);

  const onChangePage: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  const planItems = (
    <div>
      <Spin spinning={isFetching} size="small">
        <div className="max-h-[500px] overflow-y-auto">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex items-center justify-between px-2 py-3 pl-4 rounded-lg cursor-pointer gap-1",
                selectedPlan?.id === plan.id && "bg-trunks text-white",
              )}
              onClick={() => setSelectedPlan(plan)}
            >
              <p>{plan.name}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end mt-3">
          <Pagination
            current={data?.current || 1}
            onChange={onChangePage}
            pageSize={20}
            total={data?.total || 0}
            showSizeChanger={false}
            simple
            size="small"
          />
        </div>
      </Spin>
    </div>
  );

  const items: CollapseProps["items"] = [
    {
      key: "0",
      label: (
        <div className="text-sm font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-krillin" />
          Kế hoạch đang cập nhật
        </div>
      ),
      children: planItems,
    },
    {
      key: "1",
      label: (
        <div className="text-sm font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-whis" />
          Kế hoạch chờ duyệt
        </div>
      ),
      children: planItems,
    },
    {
      key: "3",
      label: (
        <div className="text-sm font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-hit" />
          Kế hoạch đã duyệt
        </div>
      ),
      children: planItems,
    },
    {
      key: "4",
      label: (
        <div className="text-sm font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-chichi" />
          Kế hoạch lưu trữ
        </div>
      ),
      children: planItems,
    },
  ];

  const onChange = (key: string | string[]) => {
    setActiveKey(key);
    setCurrent(1);
  };

  return (
    <div className="mt-4 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: "Trang chủ",
              href: "/",
            },
            {
              title: "Kế hoạch chiếu phim",
            },
            {
              title: "Lập kế hoạch chiếu phim",
            },
          ]}
        />

        <div className="flex gap-2 items-center">
          <AddPlanDialog />
        </div>
      </div>
      <div className="h-full flex flex-col">
        <div className="flex gap-5 flex-1 min-h-0">
          <div className="w-[296px] min-w-[296px]">
            <Collapse
              activeKey={activeKey}
              items={items}
              onChange={onChange}
              expandIconPlacement="end"
              accordion
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {!selectedPlan ? (
              <div className="bg-white border border-muted rounded-lg">
                <div className="flex items-center justify-center py-20 rounded-lg">
                  <span className="text-muted-foreground">
                    Chưa chọn kế hoạch
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <p>Kế hoạch đang chọn:</p>
                    <span className="font-bold text-primary">
                      {selectedPlan.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="text-dodoria font-bold text-xs flex items-center gap-1 py-1 px-2 hover:opacity-85"
                      onClick={() => setOpenDelete(true)}
                    >
                      <Trash className="size-3" /> Xóa kế hoạch
                    </button>
                    {([0, 2].includes(selectedPlan.status) ||
                      selectedPlan.status === null) && (
                      <SendForApproveActions
                        planCinemaId={selectedPlan.id}
                        clearSelectedPlan={clearSelectedPlan}
                      />
                    )}
                    {selectedPlan.status === 3 && (
                      <ArchivedActions
                        planCinemaId={selectedPlan.id}
                        clearSelectedPlan={clearSelectedPlan}
                      />
                    )}
                    {selectedPlan.status === 1 && (
                      <ApproveRejectActions
                        planCinemaId={selectedPlan.id}
                        clearSelectedPlan={clearSelectedPlan}
                      />
                    )}
                  </div>
                </div>

                <div className="bg-goku p-2 rounded-lg mt-4 flex items-center shrink-0">
                  <div className="py-3 px-4 w-[177px]">
                    <p className="text-trunks text-xs">Người tạo</p>
                    <p className="mt-1 text-base">{selectedPlan.createdUser}</p>
                  </div>

                  <div className="py-3 px-4 w-[177px]">
                    <p className="text-trunks text-xs">Ngày lập</p>
                    <p className="mt-1 text-base">
                      {format(
                        new Date(selectedPlan.createdOnUtc),
                        "dd/MM/yyyy",
                      )}
                    </p>
                  </div>

                  <div className="py-3 px-4">
                    <p className="text-trunks text-xs">Rạp chiếu</p>
                    <p className="mt-1 text-base">
                      Trung tâm chiếu phim Quốc gia
                    </p>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <TabsList planCinemaId={selectedPlan?.id} />
                </div>
              </div>
            )}
          </div>

          {selectedPlan && openDelete && (
            <DeletePlanDialog
              open={openDelete}
              onOpenChange={onOpenChange}
              id={selectedPlan.id}
              name={selectedPlan.name}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanCinemaClient;
