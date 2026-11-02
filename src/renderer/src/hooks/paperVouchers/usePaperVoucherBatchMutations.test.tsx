import { paperVouchersApi } from "@renderer/api/paperVouchers.api";
import type { PaperVoucherBatch } from "@shared/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { paperVoucherKeys } from "./keys";
import {
  useCreatePaperVoucherBatch,
  useDeletePaperVoucherBatch,
  useSetPaperVoucherBatchLocked,
  useUpdatePaperVoucherBatch
} from "./usePaperVoucherBatchMutations";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
};

const httpError = (status: number, code: string) =>
  new AxiosError("Request failed", String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { statusCode: status, code, message: code }
  });

const batch = { id: 3, batchCode: "LÔ-003" } as PaperVoucherBatch;
const dto = { name: "Lô 3", faceValue: 100000, totalQuantity: 200 };

/** Kiểu chung để chạy cùng một kịch bản cho các mutation có biến khác nhau. */
type AnyMutation = { mutate: (variables: never) => void; isSuccess: boolean };

const SUCCESS_CASES: [
  string,
  () => AnyMutation,
  "create" | "update" | "setLocked" | "delete",
  unknown
][] = [
  ["create", useCreatePaperVoucherBatch, "create", dto],
  ["update", useUpdatePaperVoucherBatch, "update", { id: 3, dto }],
  ["lock", useSetPaperVoucherBatchLocked, "setLocked", { id: 3, isLocked: true }],
  ["delete", useDeletePaperVoucherBatch, "delete", 3]
];

describe("paper voucher batch mutations", () => {
  it.each(SUCCESS_CASES)(
    "invalidates every paper voucher query after %s succeeds",
    async (_, useHook, method, variables) => {
      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      vi.spyOn(paperVouchersApi, method).mockResolvedValue(
        method === "delete" ? undefined : (batch as never)
      );

      const { result } = renderHook(useHook, { wrapper });
      result.current.mutate(variables as never);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(paperVouchersApi[method]).toHaveBeenCalledWith(variables, expect.anything());
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paperVoucherKeys.all });
    }
  );

  it.each([
    [404, "PAPER_VOUCHER_BATCH_NOT_FOUND"],
    [409, "PAPER_VOUCHER_BATCH_CHANGED"]
  ])("reloads batches when the server answers %i %s", async (status, code) => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(paperVouchersApi, "update").mockRejectedValue(httpError(status, code));

    const { result } = renderHook(() => useUpdatePaperVoucherBatch(), { wrapper });
    result.current.mutate({ id: 3, dto });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paperVoucherKeys.all });
  });

  it("keeps cached data on validation errors", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(paperVouchersApi, "create").mockRejectedValue(
      httpError(400, "PAPER_VOUCHER_INVALID_DATE_RANGE")
    );

    const { result } = renderHook(() => useCreatePaperVoucherBatch(), { wrapper });
    result.current.mutate(dto);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
