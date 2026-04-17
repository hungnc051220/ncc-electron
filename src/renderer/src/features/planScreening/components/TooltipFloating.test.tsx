import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListSeat, OrderResponseProps, OrderStatus, PaymentStatus } from "@shared/types";
import TooltipFloating from "./TooltipFloating";

const createSeat = (overrides: Partial<ListSeat> = {}): ListSeat => ({
  seat: "1",
  rows: 1,
  column: 1,
  y: 1,
  code: "A1",
  type: 0,
  status: 1,
  floor: 1,
  price: 100000,
  checkinStatus: 0,
  isInvitation: 0,
  isContract: 0,
  isHold: 0,
  positionId: 1,
  positionName: "Ghế thường",
  ...overrides
});

const createOrder = (overrides: Partial<OrderResponseProps> = {}): OrderResponseProps =>
  ({
    storeId: 1,
    customerId: 1,
    memberCardCode: "",
    planScreenId: 1,
    floorNo: 1,
    paymentMethodSystemName: "Payments.VietQR",
    posName: "POS-01",
    posShortName: "P1",
    listChairIndexF1: "1",
    listChairValueF1: "A1",
    userId: 1,
    id: 1,
    orderGuid: "guid-1",
    orderStatusId: OrderStatus.PENDING,
    paymentStatusId: PaymentStatus.PENDING,
    shippingStatusId: 0,
    rewardPointsWereAdded: false,
    billingAddressId: 0,
    shippingAddressId: "",
    customerCurrencyCode: "VND",
    currencyRate: 1,
    customerTaxDisplayTypeId: 0,
    vatNumber: "",
    orderSubtotalInclTax: 100000,
    orderSubtotalExclTax: 100000,
    orderSubTotalDiscountInclTax: 0,
    orderSubTotalDiscountExclTax: 0,
    orderShippingInclTax: 0,
    orderShippingExclTax: 0,
    paymentMethodAdditionalFeeInclTax: 0,
    paymentMethodAdditionalFeeExclTax: 0,
    taxRates: "",
    orderTax: 0,
    orderDiscount: 0,
    orderTotal: 100000,
    refundedAmount: 0,
    checkoutAttributeDescription: "",
    checkoutAttributesXml: "",
    customerLanguageId: 0,
    affiliateId: 0,
    printingUserId: 0,
    inviterId: 0,
    customerIp: "",
    allowStoringCreditCardNumber: false,
    cardType: "",
    cardName: "",
    cardNumber: "",
    maskedCreditCardNumber: "",
    cardCvv2: "",
    cardExpirationMonth: "",
    cardExpirationYear: "",
    authorizationTransactionId: "",
    authorizationTransactionCode: "",
    authorizationTransactionResult: "",
    captureTransactionId: "",
    captureTransactionResult: "",
    subscriptionTransactionId: "",
    purchaseOrderNumber: "",
    paidDateUtc: "",
    shippingMethod: "",
    shippingRateComputationMethodSystemName: "",
    deleted: false,
    createdOnUtc: "2026-04-17T10:00:00.000Z",
    printedOnUtc: "",
    shippingTimeId: 0,
    isInvitation: false,
    isOnline: true,
    isContract: false,
    barCode: "",
    barCodeBinary: "",
    vpcTelcoCode: "",
    vpcMerchTxnRef: "",
    isEmailSent: false,
    isSmsSent: false,
    customerFirstName: "",
    customerLastName: "",
    customerEmail: "",
    customerPhone: "",
    isAutoBuy: "",
    pointReward: "",
    pointCard: "",
    voucherCode: "",
    campaignId: "",
    discountStatus: "",
    isTicketUsed: false,
    checkedInOnUtc: "",
    checkedInUserId: "",
    transactionId: "",
    invNo: "",
    errorStatus: "",
    eTicketUrl: "",
    items: [
      {
        orderId: 1,
        orderItemGuid: "item-guid-1",
        planScreenId: 1,
        positionId: 1,
        quantity: 1,
        discountAmountInclTax: 0,
        unitPriceInclTax: 100000,
        priceInclTax: 100000,
        listChairIndexF1: "1",
        listChairIndexF2: "",
        listChairIndexF3: "",
        listChairValueF1: "A1",
        listChairValueF2: "",
        listChairValueF3: "",
        printedChairIndexF1: "",
        printedChairIndexF2: "",
        printedChairIndexF3: "",
        id: 1,
        productId: "1",
        unitPriceExclTax: 100000,
        priceExclTax: 100000,
        discountAmountExclTax: 0,
        originalProductCost: 0,
        attributeDescription: "",
        attributesXml: "",
        downloadCount: 0,
        isDownloadActivated: false,
        licenseDownloadId: 0,
        itemWeight: 0,
        listChairCheckinIndexF1: "",
        listChairCheckinIndexF2: "",
        listChairCheckinIndexF3: "",
        discount: {
          id: 0,
          discountName: "",
          discountType: "",
          discountAmount: 0,
          discountRate: 0,
          deleted: false,
          createdOnUtc: "",
          createdUser: "",
          updatedOnUtc: "",
          updatedUser: ""
        }
      }
    ],
    invitationTickets: {
      id: 0,
      orderId: 1,
      receivedEmail: "",
      createdAt: "",
      status: "",
      urlTicket: "",
      createdBy: ""
    },
    ...overrides
  }) as OrderResponseProps;

describe("TooltipFloating", () => {
  it("shows pending payment label for pending orders", () => {
    render(
      <TooltipFloating
        seat={createSeat()}
        order={createOrder()}
        currentPlanScreeningId={1}
        position={{ x: 100, y: 100 }}
        visible
        isPendingPayment
      />
    );

    expect(screen.getByText("Vé đang chờ thanh toán")).toBeInTheDocument();
    expect(screen.queryByText("Vé đã bán")).not.toBeInTheDocument();
  });
});
