import { api } from "@renderer/api/client";
import { ApiResponse, OrderDetailProps, QrCodeResponseProps } from "@renderer/types";
import queryString from "query-string";

export interface OrdersQuery {
  current?: number;
  pageSize?: number;
  isOnline?: boolean;
  searchText?: string;
  barCode?: string;
  id?: string;
  phoneNumber?: string;
  email?: string;
  fromDate?: string;
  toDate?: string;
  isInvitation?: boolean;
  orderStatusId?: number;
}

export interface OrderDto {
  planScreenId: number;
  floorNo: number;
  paymentMethodSystemName: string;
  posName: string;
  posShortName: string;
  listChairIndexF1?: string;
  listChairValueF1?: string;
  listChairIndexF2?: string;
  listChairValueF2?: string;
  listChairIndexF3?: string;
  listChairValueF3?: string;
  isInvitation?: boolean;
  discountId?: number;
  action?: string;
}

export interface CancelOrderDto {
  planScreenId: number;
  orderIds: number[];
  listChairIndexF1?: string;
  listChairValueF1?: string;
  listChairIndexF2?: string;
  listChairValueF2?: string;
  listChairIndexF3?: string;
  listChairValueF3?: string;
  cancelReasonId: number;
  notes: string;
  isRefund?: boolean;
  cancelReasonMsg?: string;
}

export interface CreateQrOrderDto {
  orderId: number;
  paymentMethod: string;
  shortName: string;
}

export interface OrderCreateQrDto {
  orderId: number;
  paymentMethod: string;
  shortName: string;
}

export interface OrderUpdateStatusDto {
  orderStatusId: number;
  shippingStatusId: number;
  paymentStatusId: number;
}

export interface OrderCancelReserveDto {
  listChairIndexF1: string[];
  listChairIndexF2: string[];
  listChairIndexF3: string[];
  orderIds: number[];
}

export interface OrderRefundDto {
  id: number;
  refundedAmount: number;
}

export const ordersApi = {
  getAll: async (params: OrdersQuery): Promise<ApiResponse<OrderDetailProps>> => {
    const {
      current,
      pageSize,
      searchText,
      isOnline,
      barCode,
      id,
      phoneNumber,
      email,
      fromDate,
      toDate,
      isInvitation,
      orderStatusId
    } = params;

    const filter: Record<string, unknown> = {};

    if (id) {
      filter.id = id;
    }

    if (phoneNumber) {
      filter.customerPhone = phoneNumber;
    }

    if (email) {
      filter.customerEmail = email;
    }

    if (isOnline) {
      filter.isOnline = isOnline;
      filter.IsInvitation = false;
      filter.IsContract = false;
      filter.Deleted = 0;
    }

    if (barCode) {
      filter.barCode = barCode;
    }

    if (filter.searchText) {
      filter.keyword = searchText;
    }

    if (fromDate && toDate) {
      filter.createdOnUtc = { between: [fromDate, toDate] };
    }

    if (isInvitation !== undefined) {
      filter.isInvitation = isInvitation;
    }

    if (orderStatusId) {
      filter.orderStatusId = orderStatusId;
    }

    const queryObject: Record<string, unknown> = {
      current,
      pageSize
    };

    if (Object.keys(filter).length > 0) {
      queryObject.filter = JSON.stringify(filter);
    }

    const query = queryString.stringify(queryObject, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.get(`/api/pos/order?${query}`);

    return res.data;
  },
  getDetail: async (id: number): Promise<OrderDetailProps> => {
    const res = await api.get(`/api/pos/order/${id}`);
    return res.data;
  },
  getByScreens: async (id: number): Promise<OrderDetailProps[]> => {
    const res = await api.get(`/api/pos/get-by-screens/${id}`);
    return res.data;
  },
  createQr: async (dto: CreateQrOrderDto): Promise<QrCodeResponseProps> => {
    const res = await api.post("/api/pos/order/create-qr", dto);
    return res.data;
  },
  create: async (dto: OrderDto) => {
    const res = await api.post("/api/pos/order", dto);
    return res.data;
  },
  update: async (id: number, dto: OrderUpdateStatusDto) => {
    const res = await api.patch(`/api/pos/order/${id}/status`, dto);
    return res.data;
  },
  cancelReserve: async (dto: OrderCancelReserveDto) => {
    const res = await api.put("/api/pos/order/cancel/reserve", dto);
    return res.data;
  },
  cancel: async (dto: CancelOrderDto) => {
    const res = await api.post("/api/pos/order/cancel", dto);
    return res.data;
  },
  print: async (dto: OrderDto) => {
    const res = await api.patch("/api/pos/order/print", dto);
    return res.data;
  },
  refund: async (dto: OrderRefundDto[]) => {
    const res = await api.patch("/api/pos/order/refund", dto);
    return res.data;
  }
};
