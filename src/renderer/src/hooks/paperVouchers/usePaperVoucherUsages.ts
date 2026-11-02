import { paperVouchersApi } from "@renderer/api/paperVouchers.api";
import { useQuery } from "@tanstack/react-query";
import { paperVoucherKeys } from "./keys";

export const usePaperVoucherUsages = (batchId: number, enabled = true) =>
  useQuery({
    queryKey: paperVoucherKeys.usages(batchId),
    queryFn: () => paperVouchersApi.getUsages(batchId),
    enabled
  });
