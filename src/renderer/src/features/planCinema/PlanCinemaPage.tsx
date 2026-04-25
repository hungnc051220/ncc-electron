import { ReloadOutlined } from "@ant-design/icons";
import AppBreadcrumb from "@renderer/components/AppBreadcrumb";
import PageHeader from "@renderer/components/PageHeader";
import { usePlanCinemas } from "@renderer/hooks/planCinemas/usePlanCinemas";
import { rangePresets } from "@renderer/lib/dateRangePresets";
import { cn } from "@renderer/lib/utils";
import { usePermission } from "@renderer/permissions/usePermission";
import { PlanCinemaProps } from "@shared/types";
import type { CollapseProps, PaginationProps } from "antd";
import { Button, Collapse, DatePicker, Empty, Pagination, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import AddPlanCinemaDialog from "./components/AddPlanCinemaDialog";
import DeletePlanDialog from "./components/DeletePlanCinemaDialog";
import ApproveRejectActions from "./components/tabFilm/ApproveRejectActions";
import ArchivedActions from "./components/tabFilm/ArchivedActions";
import RestoreActions from "./components/tabFilm/RestoreActions";
import SendForApproveActions from "./components/tabFilm/SendForApproveActions";
import TabsList from "./components/TabsList";

const { RangePicker } = DatePicker;

const PlanCinemaPage = () => {
  const [activeKey, setActiveKey] = useState<string | string[]>("0");
  const [current, setCurrent] = useState(1);
  const [openDelete, setOpenDelete] = useState(false);
  const [fromDate, setFromDate] = useState<Dayjs | null>(null);
  const [toDate, setToDate] = useState<Dayjs | null>(null);

  const onOpenChange = (open: boolean) => setOpenDelete(open);

  const onRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates) {
      setFromDate(dates[0]);
      setToDate(dates[1]);
    } else {
      setFromDate(null);
      setToDate(null);
    }
  };

  const [selectedPlan, setSelectedPlan] = useState<PlanCinemaProps | undefined>(undefined);
  const currentActiveKey = Array.isArray(activeKey) ? activeKey[0] : activeKey;

  const params = useMemo(
    () => ({
      current,
      pageSize: 20,
      activeKey: currentActiveKey,
      fromDate: currentActiveKey === "4" && fromDate ? dayjs(fromDate).format() : undefined,
      toDate: currentActiveKey === "4" && toDate ? dayjs(toDate).format() : undefined
    }),
    [current, currentActiveKey, fromDate, toDate]
  );

  const { data, isFetching, refetch } = usePlanCinemas(params);
  const { can } = usePermission();
  const canCreate = can("plan_cinema", "create");
  const canUpdate = can("plan_cinema", "update");
  const canDelete = can("plan_cinema", "delete");
  const canApprove = can("plan_cinema", "approve");

  const plans = data?.data;

  const clearSelectedPlan = () => setSelectedPlan(undefined);

  const onChangePage: PaginationProps["onChange"] = (page) => {
    setCurrent(page);
  };

  const planItems = (
    <Spin spinning={isFetching} size="small" className="w-full" classNames={{ root: "w-full" }}>
      <div className="w-full space-y-1.5">
        {plans?.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl text-left transition-colors duration-100",
                "px-3 py-2.5 cursor-pointer select-none",
                !isSelected && "hover:bg-goku/80 dark:hover:bg-app-bg/80",
                isSelected ? "bg-trunks dark:bg-app-bg text-white" : "bg-transparent"
              )}
              onClick={() => setSelectedPlan(plan)}
            >
              <span
                className={cn(
                  "mt-0.5 size-2 shrink-0 rounded-full transition-colors duration-100",
                  isSelected ? "bg-white" : "bg-trunks/35 group-hover:bg-trunks"
                )}
              />

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-sm font-medium leading-5 transition-colors wrap-break-word",
                    isSelected ? "text-white" : "text-app-text"
                  )}
                >
                  {plan.name}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {data && data?.total > 0 ? (
        <div className="mt-3 flex items-center justify-end">
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
      children: (
        <div className="flex h-full min-h-0 flex-col">
          <RangePicker
            defaultValue={[fromDate, toDate]}
            format="DD/MM/YYYY"
            onChange={onRangeChange}
            presets={rangePresets}
            className="mb-3 shrink-0"
          />
          {planItems}
        </div>
      )
    }
  ];

  const onChange = (key: string | string[]) => {
    setActiveKey(key);
    setCurrent(1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden p-4">
      <PageHeader
        left={<AppBreadcrumb />}
        right={
          <div className="flex items-center gap-2">
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Làm mới
            </Button>
            {canCreate && currentActiveKey === "0" ? <AddPlanCinemaDialog /> : undefined}
          </div>
        }
      />
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 gap-5">
          <div className="flex h-full min-h-0 w-74 min-w-74 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Collapse
                activeKey={activeKey}
                items={items}
                onChange={onChange}
                expandIconPlacement="end"
                accordion
                className="w-full"
              />
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-app-border p-4">
            {!selectedPlan ? (
              <div className="flex flex-1 items-center justify-center rounded-lg">
                <span className="text-gray-400">Chưa chọn kế hoạch</span>
              </div>
            ) : (
              <div className="flex h-full min-h-0 min-w-0 flex-col">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <p>Kế hoạch đang chọn:</p>
                    <span className="font-bold text-primary">{selectedPlan.name}</span>{" "}
                    {selectedPlan?.desciption && (
                      <span className="text-gray-500">({selectedPlan.desciption})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canDelete && (
                      <Button variant="outlined" color="danger" onClick={() => setOpenDelete(true)}>
                        Xóa kế hoạch
                      </Button>
                    )}
                    {canApprove &&
                      canUpdate &&
                      ([0, 2].includes(selectedPlan.status) || selectedPlan.status === null) && (
                        <SendForApproveActions
                          planCinemaId={selectedPlan.id}
                          clearSelectedPlan={clearSelectedPlan}
                        />
                      )}
                    {canApprove && selectedPlan.status === 3 && (
                      <ArchivedActions
                        planCinemaId={selectedPlan.id}
                        clearSelectedPlan={clearSelectedPlan}
                      />
                    )}
                    {canApprove && selectedPlan.status === 1 && (
                      <ApproveRejectActions
                        planCinemaId={selectedPlan.id}
                        clearSelectedPlan={clearSelectedPlan}
                      />
                    )}
                    {canApprove && selectedPlan.status === 4 && (
                      <RestoreActions
                        planCinemaId={selectedPlan.id}
                        clearSelectedPlan={clearSelectedPlan}
                      />
                    )}
                  </div>
                </div>

                <div className="bg-goku dark:bg-app-bg-container p-2 rounded-lg mt-4 flex items-center shrink-0">
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

                <div className="flex-1 min-h-0 min-w-0">
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
