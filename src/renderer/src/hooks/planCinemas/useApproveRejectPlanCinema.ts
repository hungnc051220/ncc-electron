import { ApproveRejectPlanCinemaDto, planCinemasApi } from "@renderer/api/planCinemas.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planCinemasKeys } from "./keys";

export const useApproveRejectPlanCinema = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dto }: { dto: ApproveRejectPlanCinemaDto }) => planCinemasApi.approveReject(dto),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planCinemasKeys.all
      });
    }
  });
};
