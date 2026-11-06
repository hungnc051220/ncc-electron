import type {
  ApiResponse,
  PaperVoucherBatch,
  PaperVoucherBatchDto,
  PaperVoucherBatchFilterQuery,
  PaperVoucherBatchQuery,
  PaperVoucherImageDraft,
  PaperVoucherImageUpload,
  PaperVoucherSummary,
  PaperVoucherUsage,
  SetPaperVoucherBatchLockedDto,
  UpdatePaperVoucherBatchDto
} from "@shared/types";
import axios from "axios";
import { api } from "./client";

const PAPER_VOUCHER_IMAGE_TOO_LARGE_MESSAGE = "Ảnh phải có dung lượng tối đa 5 MB";

const BASE_URL = "/api/pos/paper-vouchers";

interface PaperVoucherApi {
  getAll: () => Promise<PaperVoucherBatch[]>;
  getPage: (query: PaperVoucherBatchQuery) => Promise<ApiResponse<PaperVoucherBatch>>;
  getSummary: (filters?: PaperVoucherBatchFilterQuery) => Promise<PaperVoucherSummary>;
  getById: (id: number) => Promise<PaperVoucherBatch>;
  create: (dto: PaperVoucherBatchDto) => Promise<PaperVoucherBatch>;
  update: (dto: UpdatePaperVoucherBatchDto) => Promise<PaperVoucherBatch>;
  setLocked: (dto: SetPaperVoucherBatchLockedDto) => Promise<PaperVoucherBatch>;
  delete: (id: number) => Promise<void>;
  getUsages: (batchId: number) => Promise<PaperVoucherUsage[]>;
}

const uploadImage = async (file: File): Promise<PaperVoucherImageUpload> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post<PaperVoucherImageUpload>(`${BASE_URL}/images`, formData);
    return res.data;
  } catch (error) {
    // Vượt giới hạn multer có thể trả 413 không kèm message tiếng Việt.
    if (axios.isAxiosError(error) && error.response?.status === 413) {
      throw new Error(PAPER_VOUCHER_IMAGE_TOO_LARGE_MESSAGE);
    }
    throw error;
  }
};

/** Ảnh đã lưu gửi lại nguyên `{ url, fileName }`; file mới upload qua `POST /images` trước. */
const resolveImage = (image: PaperVoucherImageDraft): Promise<PaperVoucherImageUpload> =>
  "file" in image
    ? uploadImage(image.file)
    : Promise.resolve({ url: image.url, fileName: image.fileName ?? null });

/** `undefined` = giữ ảnh (không gửi field); `Promise.all` giữ nguyên thứ tự ảnh. */
const resolveImages = async (images: PaperVoucherImageDraft[] | undefined) =>
  images === undefined ? undefined : Promise.all(images.map(resolveImage));

/**
 * Upload ảnh mới (nếu có) rồi dựng body JSON. Bỏ hẳn field `undefined` để backend giữ nguyên
 * giá trị hiện tại, không chuyển thành `null`.
 */
const toBatchBody = async ({ images, ...fields }: PaperVoucherBatchDto) => {
  const resolvedImages = await resolveImages(images);

  return Object.fromEntries(
    Object.entries({ ...fields, images: resolvedImages }).filter(([, value]) => value !== undefined)
  );
};

export const paperVouchersApi: PaperVoucherApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<PaperVoucherBatch>>(`${BASE_URL}/batches`, {
      params: { pageSize: 0 }
    });
    return res.data.data;
  },
  getPage: async (query) => {
    const res = await api.get<ApiResponse<PaperVoucherBatch>>(`${BASE_URL}/batches`, {
      params: query
    });
    return res.data;
  },
  getSummary: async (filters = {}) => {
    const res = await api.get<PaperVoucherSummary>(`${BASE_URL}/summary`, { params: filters });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get<PaperVoucherBatch>(`${BASE_URL}/batches/${id}`);
    return res.data;
  },
  create: async (dto) => {
    const res = await api.post<PaperVoucherBatch>(`${BASE_URL}/batches`, await toBatchBody(dto));
    return res.data;
  },
  update: async ({ id, dto }) => {
    const res = await api.patch<PaperVoucherBatch>(
      `${BASE_URL}/batches/${id}`,
      await toBatchBody(dto)
    );
    return res.data;
  },
  setLocked: async ({ id, isLocked }) => {
    const res = await api.patch<PaperVoucherBatch>(`${BASE_URL}/batches/${id}/lock`, {
      isLocked
    });
    return res.data;
  },
  delete: async (id) => {
    await api.delete(`${BASE_URL}/batches/${id}`);
  },
  getUsages: async (batchId) => {
    const res = await api.get<ApiResponse<PaperVoucherUsage>>(
      `${BASE_URL}/batches/${batchId}/usages`,
      { params: { pageSize: 0 } }
    );
    return res.data.data;
  }
};
