"use client";

import { usePlanCinemas } from "@renderer/hooks/planCinemas/usePlanCinemas";
import { cn } from "@renderer/lib/utils";
import { PlanCinemaProps } from "@renderer/types";
import type { CollapseProps, PaginationProps } from "antd";
import { Breadcrumb, Button, Collapse, Empty, Pagination, Spin } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import DeletePlanDialog from "./components/DeletePlanCinemaDialog";
import ApproveRejectActions from "./components/tabFilm/ApproveRejectActions";
// import ArchivedActions from "./components/tabFilm/ArchivedActions";
import SendForApproveActions from "./components/tabFilm/SendForApproveActions";
import { Link } from "react-router";
import AddPlanCinemaDialog from "./components/AddPlanCinemaDialog";
import ArchivedActions from "./components/tabFilm/ArchivedActions";
import TabsList from "./components/TabsList";

const PlanCinemaPage = () => {
  const [activeKey, setActiveKey] = useState<string | string[]>("0");
  const [current, setCurrent] = useState(1);
  const [openDelete, setOpenDelete] = useState(false);

  const onOpenChange = (open: boolean) => setOpenDelete(open);

  const [selectedPlan, setSelectedPlan] = useState<PlanCinemaProps | undefined>(undefined);

  const params = useMemo(
    () => ({
      current,
      pageSize: 20,
      activeKey: activeKey[0]
    }),
    [current, activeKey]
  );

  const { data, isFetching } = usePlanCinemas(params);

  const plans = data?.data;

  const clearSelectedPlan = () => setSelectedPlan(undefined);

  const onChangePage: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  const planItems = (
    <div>
      <Spin spinning={isFetching} size="small">
        <div className="max-h-125 overflow-y-auto">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex items-center justify-between px-2 py-3 pl-4 rounded-lg cursor-pointer gap-1",
                selectedPlan?.id === plan.id && "bg-trunks text-white"
              )}
              onClick={() => setSelectedPlan(plan)}
            >
              <p>{plan.name}</p>
            </div>
          ))}
        </div>
        {data && data?.total > 0 ? (
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
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
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
      children: planItems
    },
    {
      key: "1",
      label: (
        <div className="text-sm font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-whis" />
          Kế hoạch chờ duyệt
        </div>
      ),
      children: planItems
    },
    {
      key: "3",
      label: (
        <div className="text-sm font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-hit" />
          Kế hoạch đã duyệt
        </div>
      ),
      children: planItems
    },
    {
      key: "4",
      label: (
        <div className="text-sm font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-chichi" />
          Kế hoạch lưu trữ
        </div>
      ),
      children: planItems
    }
  ];

  const onChange = (key: string | string[]) => {
    setActiveKey(key);
    setCurrent(1);
  };

  return (
    <div className="mt-4 px-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            {
              title: <Link to="/">Trang chủ</Link>
            },
            {
              title: "Kế hoạch chiếu phim"
            },
            {
              title: "Lập kế hoạch chiếu phim"
            }
          ]}
        />

        <div className="flex gap-2 items-center">
          <AddPlanCinemaDialog />
        </div>
      </div>
      <div className="h-full flex flex-col">
        <div className="flex gap-5 flex-1 min-h-0">
          <div className="w-74 min-w-74">
            <Collapse
              activeKey={activeKey}
              items={items}
              onChange={onChange}
              expandIconPlacement="end"
              accordion
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0 border border-[#D9D9D9] p-4 rounded-lg">
            {!selectedPlan ? (
              <div className="flex items-center justify-center py-20 rounded-lg">
                <span className="text-gray-400">Chưa chọn kế hoạch</span>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <p>Kế hoạch đang chọn:</p>
                    <span className="font-bold text-primary">{selectedPlan.name}</span>{" "}
                    {selectedPlan?.desciption && (
                      <span className="text-gray-500">({selectedPlan.desciption})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outlined" color="danger" onClick={() => setOpenDelete(true)}>
                      Xóa kế hoạch
                    </Button>
                    {([0, 2].includes(selectedPlan.status) || selectedPlan.status === null) && (
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
                  <div className="py-3 px-4 w-44.25">
                    <p className="text-trunks text-xs">Người tạo</p>
                    <p className="mt-1 text-base">{selectedPlan.createdUser}</p>
                  </div>

                  <div className="py-3 px-4 w-44.25">
                    <p className="text-trunks text-xs">Ngày lập</p>
                    <p className="mt-1 text-base">
                      {dayjs(selectedPlan.createdOnUtc).format("DD/MM/YYYY")}
                    </p>
                  </div>

                  <div className="py-3 px-4">
                    <p className="text-trunks text-xs">Rạp chiếu</p>
                    <p className="mt-1 text-base">Trung tâm chiếu phim Quốc gia</p>
                  </div>
                  <div className="py-3 px-4">
                    <p className="text-trunks text-xs">Mô tả</p>
                    <p className="mt-1 text-base">{selectedPlan?.desciption || "-"}</p>
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
              setSelectedPlan={setSelectedPlan}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanCinemaPage;
