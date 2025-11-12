"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ApiResponse, PlanCinemaProps } from "@/types";
import { format } from "date-fns";
import { Trash } from "lucide-react";
import { useState } from "react";
import DeletePlanDialog from "./delete-plan-dialog";
import ApproveRejectActions from "./tab-film/approve-reject-actions";
import ArchivedActions from "./tab-film/archived-actions";
import SendForApproveActions from "./tab-film/send-for-approve-actions";
import TabsList from "./tabs-list";

interface FilmSchedulingClientProps {
  data: ApiResponse<PlanCinemaProps>;
}

const FilmSchedulingClient = ({ data }: FilmSchedulingClientProps) => {
  const [openDelete, setOpenDelete] = useState(false);

  const onOpenChange = (open: boolean) => setOpenDelete(open);

  const [selectedPlan, setSelectedPlan] = useState<PlanCinemaProps | undefined>(
    undefined
  );

  const plans = data?.data;
  const createdOrRejectedPlans = plans?.filter(
    (x) => [0, 2].includes(x.status) || x.status === null
  );
  const waitingForApprovalPlans = plans?.filter((x) => x.status === 1);
  const approvedPlans = plans?.filter((x) => x.status === 3);
  const archivedPlans = plans?.filter((x) => x.status === 4);

  return (
    <div className="mt-8">
      <div className="flex gap-5">
        <div className="w-[296px] min-w-[296px] p-4 rounded-xl bg-goku max-h-[calc(100vh-240px)] overflow-y-auto">
          <Accordion
            type="single"
            collapsible
            className="w-full space-y-[10px]"
            defaultValue="item-1"
          >
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="text-base font-bold flex items-center gap-2">
                  <span className="size-2 rounded-full bg-krillin" />
                  Kế hoạch đang cập nhật
                </div>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col text-balance pl-4 pb-0">
                {createdOrRejectedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "flex items-center justify-between p-2 pl-4 rounded-lg cursor-pointer gap-1",
                      selectedPlan?.id === plan.id && "bg-trunks text-white"
                    )}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <p>{plan.name}</p>

                    <div className="bg-white text-black rounded-md p-2 size-6 flex items-center justify-center text-[10px] font-semibold">
                      99
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                <div className="text-base font-bold flex items-center gap-2">
                  <span className="size-2 rounded-full bg-whis" />
                  Kế hoạch chờ duyệt
                </div>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col text-balance pl-4 pb-0">
                {waitingForApprovalPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "flex items-center justify-between p-2 pl-4 rounded-lg cursor-pointer gap-1",
                      selectedPlan?.id === plan.id && "bg-trunks text-white"
                    )}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <p>{plan.name}</p>

                    <div className="bg-white text-black rounded-md p-2 size-6 flex items-center justify-center text-[10px] font-semibold">
                      99
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>
                <div className="text-base font-bold flex items-center gap-2">
                  <span className="size-2 rounded-full bg-hit" />
                  Kế hoạch đã duyệt
                </div>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col text-balance pb-0">
                {approvedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "flex items-center justify-between p-2 pl-4 rounded-lg cursor-pointer gap-1",
                      selectedPlan?.id === plan.id && "bg-trunks text-white"
                    )}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <p>{plan.name}</p>

                    <div className="bg-white text-black rounded-sm p-2 size-6 flex items-center justify-center text-[10px] font-semibold">
                      99
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>
                <div className="text-base font-bold flex items-center gap-2">
                  <span className="size-2 rounded-full bg-chichi" />
                  Kế hoạch lưu trữ
                </div>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col text-balance pb-0">
                {archivedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "flex items-center justify-between p-2 pl-4 rounded-lg cursor-pointer",
                      selectedPlan?.id === plan.id && "bg-trunks text-white"
                    )}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <p>{plan.name}</p>

                    <div className="bg-white rounded-sm p-2 size-6 flex items-center justify-center text-[10px] font-semibold text-black">
                      99
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="flex-1">
          {!selectedPlan ? (
            <div className="bg-white border border-muted rounded-lg">
              <div className="flex items-center justify-center py-20 rounded-lg">
                <span className="text-muted-foreground">
                  Chưa chọn kế hoạch
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
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
                    <SendForApproveActions planCinemaId={selectedPlan.id} />
                  )}
                  {selectedPlan.status === 3 && (
                    <ArchivedActions planCinemaId={selectedPlan.id} />
                  )}
                  {selectedPlan.status === 1 && (
                    <ApproveRejectActions planCinemaId={selectedPlan.id} />
                  )}
                </div>
              </div>

              <div className="bg-goku p-2 rounded-lg mt-4 flex items-center">
                <div className="py-3 px-4 w-[177px]">
                  <p className="text-trunks text-xs">Người tạo</p>
                  <p className="mt-1 text-base">{selectedPlan.createdUser}</p>
                </div>

                <div className="py-3 px-4 w-[177px]">
                  <p className="text-trunks text-xs">Ngày lập</p>
                  <p className="mt-1 text-base">
                    {format(new Date(selectedPlan.createdOnUtc), "dd/MM/yyyy")}
                  </p>
                </div>

                <div className="py-3 px-4">
                  <p className="text-trunks text-xs">Rạp chiếu</p>
                  <p className="mt-1 text-base">
                    Trung tâm chiếu phim Quốc gia
                  </p>
                </div>
              </div>

              <TabsList planCinemaId={selectedPlan?.id} />
            </div>
          )}
        </div>

        {selectedPlan && openDelete && (
          <DeletePlanDialog
            open={openDelete}
            onOpenChange={onOpenChange}
            name={selectedPlan.name}
            planCinemaId={selectedPlan.id}
          />
        )}
      </div>
    </div>
  );
};

export default FilmSchedulingClient;
