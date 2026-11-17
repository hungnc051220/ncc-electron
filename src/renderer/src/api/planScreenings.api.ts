import { api } from "@renderer/api/client";
import {
  ApiResponse,
  CreatePlanScreeningResult,
  PlanScreeningDetailProps,
  PlanScreeningPriceMode,
  PlanScreeningProps,
  RepricingPreviewResult
} from "@shared/types";
import queryString from "query-string";

/**
 * Body "Đối chiếu giá suất chiếu" (chỉ đọc): theo khoảng ngày (tối đa 62 ngày) hoặc danh sách suất. Mặc định
 * backend chỉ trả suất tương lai; `includePast` để tra cứu lịch sử (không bao giờ có đề xuất).
 */
export type RepricingPreviewQuery = (
  | { fromDate: string; toDate: string; ids?: never }
  | { ids: number[]; fromDate?: never; toDate?: never }
) & { includePast: boolean };

export interface PlanScreeningsQuery {
  current?: number;
  pageSize?: number;
  planCinemaId?: number;
  fromDate?: string;
  toDate?: string;
  roomId?: number;
  filmId?: number;
  sort?: string;
}

export interface PlanScreeningDto {
  filmId: number;
  roomId: number;
  projectDate: string;
  projectTime: string;
  daypartId?: number;
  priceOfPosition1: string;
  priceOfPosition2: string;
  priceOfPosition3: string;
  priceOfPosition4: string;
  isOnlineSelling?: number;
  noOnlineChairF1?: string;
  noOnlineChairF2?: string;
  noOnlineChairF3?: string;
  /** `LIST` = giá bảng, `MANUAL` = giá nhập tay, `UNIFORM` = Đồng giá. Backend cũ bỏ qua. */
  priceMode?: PlanScreeningPriceMode;
  /** Phiên bản giá của lần tra giá FE đã dùng; lệch → 409 `PRICING_STALE`. */
  pricingVersion?: string;
  /** Checkbox "Áp dụng ưu đãi U22" của suất; chỉ gửi khi DB có bảng `PlanScreeningPolicy`. */
  u22Enabled?: boolean;
}

export type PlanScreeningOnlineSellingDto = Required<Pick<PlanScreeningDto, "isOnlineSelling">>;
/** Chỉ đổi quyền U22 của suất đã có. */
export type PlanScreeningU22Dto = { u22Enabled: boolean };
export type PlanScreeningUpdateDto =
  | PlanScreeningDto
  | PlanScreeningOnlineSellingDto
  | PlanScreeningU22Dto;

export const planScreeningsApi = {
  getAll: async (params: PlanScreeningsQuery): Promise<ApiResponse<PlanScreeningDetailProps>> => {
    const { current, pageSize, planCinemaId, fromDate, toDate, roomId, filmId, sort } = params;

    const filter: Record<string, unknown> = {};

    if (planCinemaId) {
      filter.planCinemaId = planCinemaId;
    }

    if (roomId) {
      filter.roomId = roomId;
    }

    if (filmId) {
      filter.filmId = filmId;
    }

    if (fromDate && toDate) {
      filter.projectDate = { between: [fromDate, toDate] };
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize,
      sort
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/plan-screenings?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<PlanScreeningDetailProps> => {
    const res = await api.get(`/api/pos/plan-screenings/${id}`);
    return res.data;
  },
  getByDate: async (date: string): Promise<PlanScreeningProps[]> => {
    const res = await api.get(`/api/pos/plan-screenings/get-by-date?date=${date}`);
    return res.data;
  },
  getAvailableDates: async (fromDate: string, toDate: string): Promise<string[]> => {
    const res = await api.get(
      `/api/pos/plan-screenings/available-dates?fromDate=${fromDate}&toDate=${toDate}`
    );
    return res.data;
  },
  create: async (dto: PlanScreeningDto): Promise<CreatePlanScreeningResult> => {
    const res = await api.post("/api/pos/plan-screenings", dto);
    return res.data;
  },
  update: async (id: number, dto: PlanScreeningUpdateDto) => {
    const res = await api.patch(`/api/pos/plan-screenings/${id}`, dto);
    return res.data;
  },
  /** "Đối chiếu giá suất chiếu": giá đang lưu và giá theo cấu hình hiện tại (chỉ đọc, không ghi). */
  previewRepricing: async (query: RepricingPreviewQuery): Promise<RepricingPreviewResult> => {
    const res = await api.post("/api/pos/plan-screenings/repricing/preview", query);
    return res.data;
  },
  delete: async (ids: number[]) => {
    const results = await Promise.all(
      ids?.map((id: number) => api.delete(`/api/pos/plan-screenings/${id}`))
    );

    return results;
  }
};
