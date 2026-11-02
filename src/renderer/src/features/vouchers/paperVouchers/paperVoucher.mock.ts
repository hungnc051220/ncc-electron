import { compareNaturalText, compareNumber, compareText } from "@renderer/lib/utils";
import type {
  ApiResponse,
  PaperVoucherBatch,
  PaperVoucherBatchDto,
  PaperVoucherBatchFilterQuery,
  PaperVoucherBatchQuery,
  PaperVoucherImage,
  PaperVoucherImageDraft,
  PaperVoucherSortField,
  PaperVoucherSummary,
  PaperVoucherUsage,
  SimulatePaperVoucherRedemptionDto
} from "@shared/types";
import dayjs from "dayjs";
import {
  comparePaperVoucherDate,
  filterPaperVoucherBatches,
  getPaperVoucherAmounts,
  getPaperVoucherStatus,
  getVietnamBusinessDate,
  PAPER_VOUCHER_STATUS_OPTIONS,
  summarizePaperVoucherBatches,
  validatePaperVoucherBatchDto
} from "./paperVoucher.utils";
import {
  calculatePaperVoucherPreview,
  validatePaperVoucherSelection
} from "./paperVoucherRedemption";

/**
 * Dữ liệu mẫu cho giai đoạn chưa có backend voucher giấy.
 * Lưu in-memory, reset khi reload ứng dụng. Không gọi endpoint Mediasoft.
 */
export const PAPER_VOUCHER_SEED: PaperVoucherBatch[] = [
  {
    id: 1,
    batchCode: "LÔ-001",
    name: "Voucher giấy 100.000đ - 2025",
    faceValue: 100000,
    totalQuantity: 500,
    usedCount: 468,
    validFrom: "2025-01-01",
    expiresAt: "2025-12-31",
    isLocked: false,
    note: "Phát hành cho đối tác doanh nghiệp năm 2025",
    createdAt: "2024-12-20T02:00:00.000Z",
    updatedAt: "2025-12-31T09:30:00.000Z"
  },
  {
    id: 2,
    batchCode: "LÔ-002",
    name: "Voucher giấy 50.000đ - 2025",
    faceValue: 50000,
    totalQuantity: 100,
    usedCount: 100,
    validFrom: null,
    expiresAt: "2025-12-31",
    isLocked: false,
    note: null,
    createdAt: "2025-03-05T03:15:00.000Z",
    updatedAt: "2025-11-18T07:45:00.000Z"
  },
  {
    id: 3,
    batchCode: "LÔ-003",
    name: "Voucher giấy 100.000đ - 2026",
    faceValue: 100000,
    totalQuantity: 200,
    usedCount: 86,
    validFrom: "2026-01-01",
    expiresAt: "2026-12-31",
    isLocked: false,
    note: null,
    createdAt: "2025-12-15T04:00:00.000Z",
    updatedAt: "2026-10-12T08:20:00.000Z"
  },
  {
    id: 4,
    batchCode: "LÔ-004",
    name: "Voucher giấy 95.000đ - 2026",
    faceValue: 95000,
    totalQuantity: 300,
    usedCount: 0,
    validFrom: "2026-01-01",
    expiresAt: "2026-12-31",
    isLocked: false,
    note: "Chưa phân phối",
    createdAt: "2025-12-15T04:10:00.000Z",
    updatedAt: "2025-12-15T04:10:00.000Z"
  }
];

const BATCH_CODE_PREFIX = "LÔ-";

const formatBatchCode = (sequence: number) =>
  `${BATCH_CODE_PREFIX}${sequence.toString().padStart(3, "0")}`;

const parseBatchSequence = (batchCode: string) =>
  Number(batchCode.replace(BATCH_CODE_PREFIX, "")) || 0;

const normalizeDto = (dto: PaperVoucherBatchDto): PaperVoucherBatchDto => ({
  name: dto.name.trim(),
  faceValue: dto.faceValue,
  totalQuantity: dto.totalQuantity,
  validFrom: dto.validFrom || null,
  expiresAt: dto.expiresAt || null,
  note: dto.note?.trim() || null
});

const clone = (batch: PaperVoucherBatch): PaperVoucherBatch => ({ ...batch });

type BatchComparator = (left: PaperVoucherBatch, right: PaperVoucherBatch) => number;

/** Cùng ngữ nghĩa sort của API: `expiresAt` trống = không thời hạn, xếp cuối khi tăng dần. */
const SORT_COMPARATORS: Record<PaperVoucherSortField, BatchComparator> = {
  batchCode: (left, right) => compareNaturalText(left.batchCode, right.batchCode),
  name: (left, right) => compareText(left.name, right.name),
  faceValue: (left, right) => compareNumber(left.faceValue, right.faceValue),
  totalQuantity: (left, right) => compareNumber(left.totalQuantity, right.totalQuantity),
  usedCount: (left, right) => compareNumber(left.usedCount, right.usedCount),
  remainingQuantity: (left, right) =>
    getPaperVoucherAmounts(left).remainingQuantity -
    getPaperVoucherAmounts(right).remainingQuantity,
  validFrom: (left, right) => comparePaperVoucherDate(left.validFrom, right.validFrom),
  expiresAt: (left, right) => comparePaperVoucherDate(left.expiresAt, right.expiresAt, "max")
};

const parseSort = (sort?: string): BatchComparator[] =>
  (sort ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [field, direction = "asc"] = part.split(".");
      const comparator = SORT_COMPARATORS[field as PaperVoucherSortField];
      if (!comparator || !["asc", "desc"].includes(direction)) {
        throw new Error(`Giá trị sort không hợp lệ: ${part}`);
      }
      return direction === "desc"
        ? (left: PaperVoucherBatch, right: PaperVoucherBatch) => comparator(right, left)
        : comparator;
    });

const sortBatches = (batches: PaperVoucherBatch[], sort?: string) => {
  // API luôn thêm `id.desc` cuối cùng: lô mới nhất trước khi các field sort bằng nhau.
  const comparators = [
    ...parseSort(sort),
    (left: PaperVoucherBatch, right: PaperVoucherBatch) => right.id - left.id
  ];

  return [...batches].sort((left, right) => {
    for (const comparator of comparators) {
      const result = comparator(left, right);
      if (result) return result;
    }
    return 0;
  });
};

const summarize = (batches: PaperVoucherBatch[], today: string): PaperVoucherSummary => {
  const countByStatus = Object.fromEntries(
    PAPER_VOUCHER_STATUS_OPTIONS.map(({ value }) => [value, 0])
  ) as PaperVoucherSummary["countByStatus"];
  batches.forEach((batch) => {
    countByStatus[getPaperVoucherStatus(batch, today)] += 1;
  });

  return { ...summarizePaperVoucherBatches(batches), countByStatus, businessDate: today };
};

const isObjectUrl = (url?: string) => !!url?.startsWith("blob:");

export const createPaperVoucherMockRepository = (
  seed: PaperVoucherBatch[] = PAPER_VOUCHER_SEED,
  now: () => string = () => dayjs().toISOString()
) => {
  let batches: PaperVoucherBatch[] = [];
  let nextId = 1;
  let nextSequence = 1;
  // Ảnh mock là object URL trong phiên. URL bị thay/xóa chưa revoke ngay vì UI có thể vẫn đang
  // hiển thị dữ liệu cũ; chỉ revoke ở lần `list()` kế tiếp, khi UI nhận dữ liệu mới.
  let retiredUrls: string[] = [];
  // Lịch sử sử dụng mô phỏng; không liên kết đơn hàng thật.
  let usages: PaperVoucherUsage[] = [];
  let nextUsageId = 1;

  const retireImages = (images: PaperVoucherImage[] = []) => {
    images.forEach((image) => {
      if (isObjectUrl(image.url)) retiredUrls.push(image.url);
    });
  };

  const revokeRetiredUrls = () => {
    retiredUrls.forEach((url) => URL.revokeObjectURL(url));
    retiredUrls = [];
  };

  /** Cùng ngữ nghĩa API: `undefined` giữ nguyên, mảng thay toàn bộ danh sách theo thứ tự gửi. */
  const applyImagesChange = (
    current: PaperVoucherImage[] = [],
    drafts: PaperVoucherImageDraft[] | undefined
  ): PaperVoucherImage[] => {
    if (drafts === undefined) return current;

    const next = drafts.map((draft) =>
      "file" in draft
        ? { url: URL.createObjectURL(draft.file), fileName: draft.file.name }
        : { url: draft.url, fileName: draft.fileName ?? null }
    );
    const keptUrls = new Set(next.map((image) => image.url));
    retireImages(current.filter((image) => !keptUrls.has(image.url)));
    return next;
  };

  const reset = () => {
    batches.forEach((batch) => retireImages(batch.images));
    revokeRetiredUrls();
    batches = seed.map(clone);
    usages = [];
    nextUsageId = 1;
    nextId = Math.max(0, ...batches.map((batch) => batch.id)) + 1;
    // Sequence chỉ tăng, không tái sử dụng mã của lô đã xóa.
    nextSequence = Math.max(0, ...batches.map((batch) => parseBatchSequence(batch.batchCode))) + 1;
  };

  const findOrThrow = (id: number) => {
    const batch = batches.find((item) => item.id === id);
    if (!batch) throw new Error("Không tìm thấy lô voucher");
    return batch;
  };

  const replace = (next: PaperVoucherBatch) => {
    batches = batches.map((item) => (item.id === next.id ? next : item));
    return clone(next);
  };

  reset();

  return {
    reset,
    list: async (): Promise<PaperVoucherBatch[]> => {
      revokeRetiredUrls();
      return batches.map(clone);
    },
    /** Phân trang/lọc/sắp xếp giống `GET /batches`; `pageSize = 0` trả toàn bộ. */
    listPage: async ({
      current,
      pageSize,
      sort,
      ...filters
    }: PaperVoucherBatchQuery): Promise<ApiResponse<PaperVoucherBatch>> => {
      revokeRetiredUrls();
      const today = getVietnamBusinessDate(now());
      const matched = sortBatches(filterPaperVoucherBatches(batches, filters, today), sort);
      const data = pageSize ? matched.slice((current - 1) * pageSize, current * pageSize) : matched;

      return {
        data: data.map(clone),
        total: matched.length,
        current: pageSize ? current : 1,
        pageCount: pageSize ? Math.ceil(matched.length / pageSize) : 1,
        pageSize
      };
    },
    summary: async (filters: PaperVoucherBatchFilterQuery = {}): Promise<PaperVoucherSummary> => {
      const today = getVietnamBusinessDate(now());
      return summarize(filterPaperVoucherBatches(batches, filters, today), today);
    },
    get: async (id: number): Promise<PaperVoucherBatch> => clone(findOrThrow(id)),
    create: async (dto: PaperVoucherBatchDto): Promise<PaperVoucherBatch> => {
      const error = validatePaperVoucherBatchDto(dto);
      if (error) throw new Error(error);

      const batchCode = formatBatchCode(nextSequence);
      if (batches.some((item) => item.batchCode === batchCode)) {
        throw new Error(`Mã lô ${batchCode} đã tồn tại`);
      }

      const timestamp = now();
      const batch: PaperVoucherBatch = {
        ...normalizeDto(dto),
        id: nextId,
        batchCode,
        usedCount: 0,
        isLocked: false,
        images: applyImagesChange([], dto.images),
        createdAt: timestamp,
        updatedAt: timestamp
      };

      nextId += 1;
      nextSequence += 1;
      batches = [batch, ...batches];
      return clone(batch);
    },
    update: async ({
      id,
      dto
    }: {
      id: number;
      dto: PaperVoucherBatchDto;
    }): Promise<PaperVoucherBatch> => {
      const current = findOrThrow(id);
      const error = validatePaperVoucherBatchDto(dto, current);
      if (error) throw new Error(error);

      return replace({
        ...current,
        ...normalizeDto(dto),
        images: applyImagesChange(current.images, dto.images),
        updatedAt: now()
      });
    },
    setLocked: async ({
      id,
      isLocked
    }: {
      id: number;
      isLocked: boolean;
    }): Promise<PaperVoucherBatch> => {
      const current = findOrThrow(id);
      return replace({ ...current, isLocked, updatedAt: now() });
    },
    remove: async (id: number): Promise<void> => {
      const current = findOrThrow(id);
      if (current.usedCount > 0) {
        throw new Error(
          "Lô đã có lượt sử dụng, không thể xóa. Hãy khóa lô để giữ lịch sử đối soát"
        );
      }

      retireImages(current.images);
      batches = batches.filter((item) => item.id !== id);
    },
    listUsages: async (batchId: number): Promise<PaperVoucherUsage[]> =>
      usages
        .filter((usage) => usage.batchId === batchId)
        .map((usage) => ({ ...usage }))
        .reverse(),
    /**
     * Ghi nhận giao dịch mô phỏng: kiểm tra lại toàn bộ dòng rồi mới cộng `usedCount`
     * (không ghi một phần). Mỗi `transactionId` chỉ được ghi nhận một lần.
     */
    simulateRedemption: async (
      dto: SimulatePaperVoucherRedemptionDto
    ): Promise<PaperVoucherUsage[]> => {
      if (!dto.transactionId) throw new Error("Thiếu mã giao dịch mô phỏng");
      if (usages.some((usage) => usage.transactionId === dto.transactionId)) {
        throw new Error("Giao dịch mô phỏng này đã được ghi nhận trước đó");
      }
      if (!dto.lines.length) throw new Error("Chưa chọn voucher giấy");

      const timestamp = now();
      const errors = validatePaperVoucherSelection({
        lines: dto.lines,
        batches,
        ticketCount: dto.ticketCount,
        today: getVietnamBusinessDate(timestamp)
      });
      if (errors.length) throw new Error(errors[0]);

      const preview = calculatePaperVoucherPreview({
        lines: dto.lines,
        eligibleAmount: dto.eligibleAmount
      });
      const created = preview.lines.map((line): PaperVoucherUsage => {
        const batch = findOrThrow(line.batchId);
        replace({ ...batch, usedCount: batch.usedCount + line.quantity, updatedAt: timestamp });

        return {
          id: nextUsageId++,
          transactionId: dto.transactionId,
          batchId: batch.id,
          batchCode: batch.batchCode,
          quantity: line.quantity,
          faceValue: line.faceValue,
          appliedAmount: line.appliedAmount,
          staffName: dto.staffName ?? null,
          createdAt: timestamp,
          status: "simulated"
        };
      });

      usages = [...usages, ...created];
      return created.map((usage) => ({ ...usage }));
    }
  };
};

export type PaperVoucherMockRepository = ReturnType<typeof createPaperVoucherMockRepository>;

export const paperVoucherMockRepository = createPaperVoucherMockRepository();
