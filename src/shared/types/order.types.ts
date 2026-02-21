import { FilmProps } from "./film.types";
import { RoomProps } from "./room.types";
import { PlanScreeningDetailProps } from "./screening.types";

export interface OrderResponseProps {
  storeId: number;
  customerId: number;
  memberCardCode: string;
  planScreenId: number;
  floorNo: number;
  paymentMethodSystemName: string;
  posName: string;
  posShortName: string;
  listChairIndexF1: string;
  listChairValueF1: string;
  userId: number;
  id: number;
  orderGuid: string;
  orderStatusId: number;
  paymentStatusId: number;
  shippingStatusId: number;
  rewardPointsWereAdded: boolean;
  billingAddressId: number;
  shippingAddressId: string;
  customerCurrencyCode: string;
  currencyRate: number;
  customerTaxDisplayTypeId: number;
  vatNumber: string;
  orderSubtotalInclTax: number;
  orderSubtotalExclTax: number;
  orderSubTotalDiscountInclTax: number;
  orderSubTotalDiscountExclTax: number;
  orderShippingInclTax: number;
  orderShippingExclTax: number;
  paymentMethodAdditionalFeeInclTax: number;
  paymentMethodAdditionalFeeExclTax: number;
  taxRates: string;
  orderTax: number;
  orderDiscount: number;
  orderTotal: number;
  refundedAmount: number;
  checkoutAttributeDescription: string;
  checkoutAttributesXml: string;
  customerLanguageId: number;
  affiliateId: number;
  printingUserId: number;
  inviterId: number;
  customerIp: string;
  allowStoringCreditCardNumber: boolean;
  cardType: string;
  cardName: string;
  cardNumber: string;
  maskedCreditCardNumber: string;
  cardCvv2: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  authorizationTransactionId: string;
  authorizationTransactionCode: string;
  authorizationTransactionResult: string;
  captureTransactionId: string;
  captureTransactionResult: string;
  subscriptionTransactionId: string;
  purchaseOrderNumber: string;
  paidDateUtc: string;
  shippingMethod: string;
  shippingRateComputationMethodSystemName: string;
  deleted: boolean;
  createdOnUtc: string;
  printedOnUtc: string;
  shippingTimeId: number;
  isInvitation: boolean;
  isOnline: boolean;
  isContract: boolean;
  barCode: string;
  barCodeBinary: string;
  vpcTelcoCode: string;
  vpcMerchTxnRef: string;
  isEmailSent: boolean;
  isSmsSent: boolean;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  isAutoBuy: string;
  pointReward: string;
  pointCard: string;
  voucherCode: string;
  campaignId: string;
  discountStatus: string;
  isTicketUsed: boolean;
  checkedInOnUtc: string;
  checkedInUserId: string;
  transactionId: string;
  invNo: string;
  errorStatus: string;
  eTicketUrl: string;
  items: OrderItem[];
}

export interface OrderItem {
  orderId: number;
  orderItemGuid: string;
  planScreenId: number;
  positionId: number;
  quantity: number;
  discountAmountInclTax: number;
  unitPriceInclTax: number;
  priceInclTax: number;
  listChairIndexF1: string;
  listChairIndexF2: string;
  listChairIndexF3: string;
  listChairValueF1: string;
  listChairValueF2: string;
  listChairValueF3: string;
  printedChairIndexF1: string;
  printedChairIndexF2: string;
  printedChairIndexF3: string;
  id: number;
  productId: string;
  unitPriceExclTax: number;
  priceExclTax: number;
  discountAmountExclTax: number;
  originalProductCost: number;
  attributeDescription: string;
  attributesXml: string;
  downloadCount: number;
  isDownloadActivated: boolean;
  licenseDownloadId: number;
  itemWeight: number;
  listChairCheckinIndexF1: string;
  listChairCheckinIndexF2: string;
  listChairCheckinIndexF3: string;
}

export interface OrderDetailProps {
  order: OrderResponseProps;
  planScreening: PlanScreeningDetailProps;
  film: FilmProps;
  room: RoomProps;
}

export interface CancellationTicketProps {
  id: number;
  filmName: string;
  roomName: string;
  projectDate: string;
  projectTime: string;
  quantity: number;
  cancelChairIndexF1: string;
  cancelChairIndexF2: string;
  cancelChairIndexF3: string;
  cancelChairValueF1: string;
  cancelChairValueF2: string;
  cancelChairValueF3: string;
  createdOnUtc: string;
  userName: string;
  reason: string;
}

export interface Item {
  id: number;
  orderItemGuid: string;
  orderId: number;
  productId: number;
  quantity: number;
  unitPriceInclTax: number;
  unitPriceExclTax: number;
  priceInclTax: number;
  priceExclTax: number;
  discountAmountInclTax: number;
  discountAmountExclTax: number;
  originalProductCost: number;
  attributeDescription: string;
  attributesXml: string;
  downloadCount: number;
  isDownloadActivated: boolean;
  licenseDownloadId: number;
  itemWeight: number;
  listChairIndexF1: string;
  listChairIndexF2: string;
  listChairIndexF3: string;
  listChairValueF1: string;
  listChairValueF2: string;
  listChairValueF3: string;
  printedChairIndexF1: string;
  printedChairIndexF2: string;
  printedChairIndexF3: string;
  positionId: number;
  planScreenId: number;
  listChairCheckinIndexF1: string;
  listChairCheckinIndexF2: string;
  listChairCheckinIndexF3: string;
}

export interface QrPayment {
  qrcode: string;
  accountQR: string;
  referenceLabelCode: string;
  error: string;
  message: string;
  timestamp: string;
  accountName: string;
  accountNumber: string;
  accountBankName: string;
}

export enum OrderStatus {
  PENDING = 10,
  PROCESSING = 20,
  COMPLETED = 30,
  CANCELLED = 40,
  FAIL = 60
}

export enum PaymentStatus {
  PENDING = 10,
  AUTHORIZED = 20,
  PAID = 30,
  PARTIALLY_REFUNDED = 35,
  REFUNDED = 40,
  VOIDED = 50,
  FAIL = 60
}

export interface BookingTicketBodyProps {
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
}

export interface UpdateSeatContractTicketSaleBodyProps {
  planScreenId: number;
  floorNo: number;
  listChairIndexF1?: string;
  listChairValueF1?: string;
  listChairIndexF2?: string;
  listChairValueF2?: string;
  listChairIndexF3?: string;
  listChairValueF3?: string;
}

export interface CreateQrCodeBodyProps {
  orderId: number;
  paymentMethod: string;
  shortName: string;
}

export interface QrCodeResponseProps {
  referenceLabelCode: string;
  qrcode: string;
  accountName: string;
  accountNumber: string;
  accountBankName: string;
}

export enum PaymentType {
  POS = "POS",
  VNPAY = "VNPAY",
  VIETQR = "VIETQR"
}

export interface ContractTicketSaleProps {
  id: number;
  orderGuid: string;
  storeId: number;
  customerId: number;
  billingAddressId: number;
  shippingAddressId: number;
  orderStatusId: number;
  shippingStatusId: number;
  paymentStatusId: number;
  paymentMethodSystemName: string;
  customerCurrencyCode: string;
  currencyRate: number;
  customerTaxDisplayTypeId: number;
  vatNumber: string;
  orderSubtotalInclTax: number;
  orderSubtotalExclTax: number;
  orderSubTotalDiscountInclTax: number;
  orderSubTotalDiscountExclTax: number;
  orderShippingInclTax: number;
  orderShippingExclTax: number;
  paymentMethodAdditionalFeeInclTax: number;
  paymentMethodAdditionalFeeExclTax: number;
  taxRates: string;
  orderTax: number;
  orderDiscount: number;
  orderTotal: number;
  refundedAmount: number;
  rewardPointsWereAdded: boolean;
  checkoutAttributeDescription: string;
  checkoutAttributesXml: string;
  customerLanguageId: number;
  affiliateId: number;
  userId: number;
  printingUserId: number;
  inviterId: number;
  customerIp: string;
  allowStoringCreditCardNumber: boolean;
  cardType: string;
  cardName: string;
  cardNumber: string;
  maskedCreditCardNumber: string;
  cardCvv2: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  authorizationTransactionId: string;
  authorizationTransactionCode: string;
  authorizationTransactionResult: string;
  captureTransactionId: string;
  captureTransactionResult: string;
  subscriptionTransactionId: string;
  purchaseOrderNumber: string;
  paidDateUtc: string;
  shippingMethod: string;
  shippingRateComputationMethodSystemName: string;
  deleted: boolean;
  createdOnUtc: string;
  printedOnUtc: string;
  shippingTimeId: number;
  isInvitation: boolean;
  isOnline: boolean;
  isContract: boolean;
  barCode: string;
  barCodeBinary: string;
  vpcTelcoCode: string;
  vpcMerchTxnRef: string;
  isEmailSent: boolean;
  isSmsSent: boolean;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  isAutoBuy: boolean;
  memberCardCode: string;
  pointReward: number;
  pointCard: number;
  voucherCode: string;
  campaignId: number;
  discountStatus: number;
  isTicketUsed: boolean;
  checkedInOnUtc: string;
  checkedInUserId: number;
  transactionId: string;
  invNo: string;
  errorStatus: string;
  eTicketUrl: string;
  items: Item[];
  qrPayment: QrPayment;
  createdBy: string;
}

export interface QrDialogData extends QrCodeResponseProps {
  orderId: number;
  orderTotal: number;
  orderDiscount: number;
  createdOnUtc: string;
  filmName: string;
  roomName: string;
  projectDate: string;
  projectTime: string;
  seats: string;
}
