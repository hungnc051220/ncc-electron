import { api } from "@renderer/api/client";
import {
  BatchProps,
  BatchVoucherProps,
  ConfigExchangePointsProps,
  MediasoftApiResponse
} from "@shared/types";

export interface VoucherDto {
  url: string;
  method: string;
  data: {
    pageIndex: number;
    pageSize: number;
    status: number;
  };
}

export interface ConfigExchangePointsDto {
  url: string;
  method: string;
}

export interface AvailableForPosDto {
  customerId: number;
  planScreenId: number;
  listChairIndexF1?: string;
  listChairIndexF2?: string;
  listChairIndexF3?: string;
  listChairValueF1?: string;
  listChairValueF2?: string;
  listChairValueF3?: string;
}

export const vouchersApi = {
  getAll: async (dto: VoucherDto): Promise<MediasoftApiResponse<BatchVoucherProps>> => {
    const res = await api.post("/api/v1/proxy/to-mediasoft", dto);
    return res.data;
  },
  getConfigExchangePoints: async (
    dto: ConfigExchangePointsDto
  ): Promise<{ data: ConfigExchangePointsProps }> => {
    const res = await api.post("/api/v1/proxy/to-mediasoft", dto);
    return res.data;
  },
  getAvailableForPos: async (dto: AvailableForPosDto): Promise<{ items: BatchProps[] }> => {
    const res = await api.post("/api/pos/order/GetAvailableVouchersForPos", dto);
    return res.data;
  }
};
