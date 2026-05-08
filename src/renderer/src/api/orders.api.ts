import { api } from "@renderer/api/client";
import {
  ApiResponse,
  OrderDetailProps,
  OrderResponseProps,
  PaymentStatus,
  QrCodeResponseProps,
  RefundStatus
} from "@shared/types";
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
  paymentStatusId?: PaymentStatus;
  refundStatusId?: RefundStatus;
  isRefund?: boolean;
  projectDate?: string;
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
  memberCardCode?: string;
  discountGroups?: DiscountGroup[];
  voucherCode?: string;
  pointCard?: number;
  pointReward?: number;
  note?: string;
  customerId?: number;
  hasManualInvoice?: boolean;
}

export interface DiscountGroup {
  discountId: number;
  chairIndices: string[];
}

export interface CancelOrderDto {
  planScreenId: number;
  orderIds?: number[];
  listChairIndexF1?: string[];
  listChairIndexF2?: string[];
  listChairIndexF3?: string[];
  cancelReasonId: number;
  notes?: string;
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
  planScreenId?: number;
}

export interface OrderCancelReserveDto {
  listChairIndexF1: string[];
  listChairIndexF2: string[];
  listChairIndexF3: string[];
  orderIds: number[];
}

export interface ValidateVoucherDto {
  customerId: number;
  planScreenId: number;
  listChairIndexF1?: string;
  listChairValueF1?: string;
  listChairIndexF2?: string;
  listChairValueF2?: string;
  listChairIndexF3?: string;
  listChairValueF3?: string;
  voucherCode: string;
  memberCardCode: string;
}

export interface ValidateVoucherResponse {
  isValid: boolean;
  discountAmount: number;
  reason?: string;
}

export interface OrderRefundDto {
  id: number;
  refundedAmount: number;
}

export interface OrderRefundQuery {
  id: number;
  RefundStatusId: RefundStatus;
}

export interface CheckTransactionDto {
  orderId: number;
}

export interface CheckTransactionResponse {
  code?: string;
  message?: string;
}

export interface ExportETicketDto {
  orderId: number;
}

export interface OrderPrintedQuery {
  orderId: number;
  posShortName?: string;
}

export interface SelectingChairsDto {
  planScreenId: number;
  posName: string;
  selectingChairIndexF1?: string;
  selectingChairIndexF2?: string;
  selectingChairIndexF3?: string;
}

export interface SelectingChairSnapshot {
  planScreenId: number;
  posName: string;
  selectingChairIndexF1?: string;
  selectingChairIndexF2?: string;
  selectingChairIndexF3?: string;
}

export interface SwapSeatsDto {
  orderId: number;
  planScreenId: number;
  newListChairIndexF1: string;
  newListChairIndexF2: string;
  newListChairIndexF3: string;
  newListChairValueF1: string;
  newListChairValueF2: string;
  newListChairValueF3: string;
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
      orderStatusId,
      paymentStatusId,
      isRefund,
      projectDate
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

    if (isOnline !== undefined) {
      filter.isOnline = isOnline;
      filter.IsInvitation = false;
      filter.IsContract = false;
      filter.Deleted = 0;
    }

    if (isRefund) {
      filter.refundStatusId = { ne: null };
    }

    if (barCode) {
      filter.barCode = barCode;
    }

    if (searchText) {
      filter.keyword = searchText;
    }

    if (fromDate && toDate) {
      filter.createdOnUtc = { between: [fromDate, toDate] };
    }

    if (projectDate) {
      filter.projectDate = { startDate: projectDate, endDate: projectDate };
    }

    if (isInvitation !== undefined) {
      filter.isInvitation = isInvitation;
    }

    if (orderStatusId) {
      filter.orderStatusId = orderStatusId;
    }

    if (paymentStatusId) {
      filter.paymentStatusId = paymentStatusId;
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
  getByScreens: async (id: number): Promise<OrderResponseProps[]> => {
    const res = await api.get(`/api/pos/order/get-by-screens/${id}`);
    return res.data;
  },
  createQr: async (dto: CreateQrOrderDto): Promise<QrCodeResponseProps> => {
    const res = await api.post("/api/pos/order/create-qr", dto);
    return res.data;
  },
  checkTransaction: async (dto: CheckTransactionDto): Promise<CheckTransactionResponse> => {
    const res = await api.post("/api/pos/payment/check-transaction", dto);
    return res.data;
  },
  exportETicket: async (dto: ExportETicketDto) => {
    const res = await api.post("/api/pos/order/export-eticket", dto);
    return res.data;
  },
  create: async (dto: OrderDto) => {
    const res = await api.post("/api/pos/order", dto);
    return res.data;
  },
  update: async (id: number, dto: OrderUpdateStatusDto) => {
    const res = await api.put(`/api/pos/order/${id}/status`, dto);
    return res.data;
  },
  swapSeats: async (dto: SwapSeatsDto) => {
    const res = await api.patch("/api/pos/order/swap-seats", dto);
    return res.data;
  },
  cancelReserve: async (dto: OrderCancelReserveDto) => {
    const res = await api.post("/api/pos/order/cancel/reserve", dto);
    return res.data;
  },
  validateVoucher: async (dto: ValidateVoucherDto): Promise<ValidateVoucherResponse> => {
    const res = await api.post("/api/pos/order/validate-voucher", dto);
    return res.data;
  },
  cancel: async (dto: CancelOrderDto) => {
    const res = await api.post("/api/pos/order/cancel", dto);
    return res.data;
  },
  markPrinted: async (params: OrderPrintedQuery) => {
    const query = queryString.stringify(params, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.patch(`/api/pos/order/print?${query}`);
    return res.data;
  },
  unmarkPrinted: async (params: OrderPrintedQuery) => {
    const query = queryString.stringify(params, {
      skipEmptyString: true,
      skipNull: true
    });

    const res = await api.patch(`/api/pos/order/unmark-print?${query}`);
    return res.data;
  },
  updateRefundStatus: async (params: OrderRefundQuery) => {
    const query = queryString.stringify(params, {
      skipEmptyString: true,
      skipNull: true
    });
    const res = await api.get(`/api/pos/order/refund?${query}`);
    return res.data;
  },
  selectingChairs: async (operation: "add" | "remove", dto: SelectingChairsDto) => {
    const res = await api.post(`/api/pos/seat/selecting-chairs/${operation}`, dto);
    return res.data;
  },
  getSelectingChairs: async (planScreenId: number): Promise<SelectingChairSnapshot[]> => {
    const res = await api.get(`/api/pos/seat/selecting-chairs/${planScreenId}`);
    return res.data;
  }
};
