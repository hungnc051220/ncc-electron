export interface ShowtimesProps {
  id: number;
  title: string;
  times: string[];
}

export interface ApiResponse<T> {
  data: T[];
  total: number;
  current: number;
  pageCount: number;
  pageSize: number;
}

export interface UserProps {
  id: number;
  username: string;
  email: string;
  manufacturerId: number;
  customerFirstName: string;
  customerLastName: string;
  address: string;
  mobile: string;
  roleIds: string;
  isHidden: boolean;
  fullname: string;
}

export interface ChangePasswordProps {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordProps {
  userId: string;
  newPassword: string;
}

export interface CustomerRoleProps {
  id: number;
  name: string;
  freeShipping: boolean;
  taxExempt: boolean;
  active: boolean;
  isSystemRole: boolean;
  systemName: string;
}

export interface PlanScreeningProps {
  filmName: string;
  details: DetailPlanScreeningProps[];
}

export interface DetailPlanScreeningProps {
  planCinemaId: number;
  planScreeningsId: number;
  projectTime: string;
  roomId: string;
  roomName: string;
}

export interface PlanScreeningDetailProps {
  id: number;
  planCinemaId: number;
  projectDate: string;
  projectTime: string;
  filmId: number;
  roomId: number;
  daypartId: number;
  deleted: boolean;
  noOnlineChairF1: string;
  noOnlineChairF2: string;
  noOnlineChairF3: string;
  isSelling: number;
  isOnlineSelling: number;
  priceOfPosition1: string;
  priceOfPosition2: string;
  priceOfPosition3: string;
  priceOfPosition4: string;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
  roomInfo: RoomInfo;
  filmInfo: FilmInfo;
  orders: string[];
  listSeats: ListSeat[][];
}

export interface RoomInfo {
  id: number;
  name: string;
  wideSizeF1: number;
  deepSizeF1: number;
  wideSizeF2: number;
  deepSizeF2: number;
  wideSizeF3: number;
  deepSizeF3: number;
  ruleOrder: string;
  noBreak: boolean;
  numberOfFloor: number;
  pictureId: number;
  deleted: boolean;
  subjectToAcl: boolean;
  limitedToStores: boolean;
  orderNo: number;
  floor: string;
}

export interface FilmInfo {
  id: number;
  filmNameEn: string;
  filmName: string;
  countryId: number;
  duration: number;
  director: string;
  actors: string;
  introduction: string;
  manufacturerId: number;
  versionCode: string;
  statusCode: string;
  languageCode: string;
  holding: string;
  description: string;
  sellOnline: boolean;
  metaDescription: string;
  metaKeyword: string;
  metaTitle: string;
  limitedToStores: boolean;
  subjectToAcl: boolean;
  createdOnUtc: string;
  updatedOnUtc: string;
  published: boolean;
  deleted: boolean;
  pictureId: number;
  imageUrl: string;
  premieredDay: string;
  videoUrl: string;
  showOnHomePage: boolean;
  tags: string;
  allowCustomerReviews: boolean;
  approvedRatingSum: number;
  notApprovedRatingSum: number;
  approvedTotalReviews: number;
  notApprovedTotalReviews: number;
  totalLike: number;
  numberOfViews: number;
  isHot: number;
  ageAbove: number;
  proposedPrice: number;
  trailerOnHomePage: boolean;
  orderNo: number;
  sellOnlineBefore: number;
  createdUser: string;
  updatedUser: string;
}

export interface ListSeat {
  seat: string;
  rows: number;
  column: number;
  y: number;
  code: string;
  type: number;
  status: number;
  floor: number;
  price: number;
  checkinStatus: number;
  isInvitation: number;
  isContract: number;
  isHold: number;
  positionName: string;
}

export interface SeatProps {
  seat: string;
  rows: number;
  column: number;
  y: number;
  code: string;
  type: number;
  status: number;
  floor: number;
  price: number;
  checkinStatus: number;
  isInvitation: number;
  isContract: number;
  isHold: number;
  positionName: string;
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

export interface PlanCinemaProps {
  id: number;
  name: string;
  customerId: number;
  dateOfIssue: string;
  storeId: number;
  limitedToStores: boolean;
  desciption: string;
  subjectToAcl: boolean;
  status: number;
  deleted: boolean;
  userId: number;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
  startDate: string;
  endDate: string;
}

export interface PlanFilmProps {
  filmId: number;
  planCinemaId: number;
  createdOnUtc: string;
  createdUser: string;
  order: number;
  film: FilmInfo;
}

export interface FilmProps {
  id: number;
  filmNameEn: string;
  filmName: string;
  countryId: number;
  country: {
    id: number;
    name: string;
  };
  duration: number;
  director: string;
  actors: string;
  introduction: string;
  manufacturerId: number;
  versionCode: string;
  statusCode: string;
  languageCode: string;
  holding: string;
  description: string;
  sellOnline: boolean;
  metaDescription: string;
  metaKeyword: string;
  metaTitle: string;
  limitedToStores: boolean;
  subjectToAcl: boolean;
  createdOnUtc: string;
  updatedOnUtc: string;
  published: boolean;
  deleted: boolean;
  pictureId: number;
  imageUrl: string;
  premieredDay: string;
  videoUrl: string;
  showOnHomePage: boolean;
  tags: string;
  allowCustomerReviews: boolean;
  approvedRatingSum: number;
  notApprovedRatingSum: number;
  approvedTotalReviews: number;
  notApprovedTotalReviews: number;
  totalLike: number;
  numberOfViews: number;
  isHot: number;
  ageAbove: number;
  proposedPrice: number;
  trailerOnHomePage: boolean;
  orderNo: number;
  sellOnlineBefore: number;
  createdUser: string;
  updatedUser: string;
  isFree: boolean;
  categories: Category[];
  filmStatus: FilmStatusProps;
  filmVersion: FilmVersion;
  filmLanguage: FilmLanguage;
}

export interface Category {
  id: number;
  name: string;
  filmId: number;
  categoryId: number;
  createdOnUtc: string;
  createdUser: string;
}

export interface FilmVersion {
  id: number;
  versionCode: string;
  versionName: string;
  deleted: boolean;
}

export interface FilmLanguage {
  id: number;
  languageCode: string;
  languageName: string;
  deleted: boolean;
}

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

export enum PaymentType {
  POS = "POS",
  VNPAY = "VNPAY",
  VIETQR = "VIETQR"
}

export interface FilmVersionProps {
  id: number;
  versionCode: string;
  versionName: string;
  deleted: boolean;
}

export interface CountryProps {
  id: number;
  name: string;
  allowsBilling: boolean;
  allowsShipping: boolean;
  twoLetterIsoCode: string;
  threeLetterIsoCode: string;
  numericIsoCode: number;
  subjectToVat: boolean;
  published: boolean;
  displayOrder: number;
}

export interface ManufacturerProps {
  id: number;
  name: string;
  description: string;
  manufacturerTemplateId: number;
  metaKeywords: string;
  metaDescription: string;
  metaTitle: string;
  pictureId: number;
  pageSize: number;
  allowCustomersToSelectPageSize: boolean;
  pageSizeOptions: string;
  priceRanges: string;
  subjectToAcl: boolean;
  limitedToStores: boolean;
  published: boolean;
  deleted: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
  fullName: string;
  address: string;
  acountBank: string;
  bankName: string;
  addressBank: string;
  phoneNumber: string;
  fax: string;
  url: string;
  createdUser: string;
  updatedUser: string;
}

export interface LanguageProps {
  id: number;
  languageCode: string;
  languageName: string;
  deleted: boolean;
}

export interface FilmStatusProps {
  id: number;
  statusCode: string;
  statusName: string;
  deleted: boolean;
}

export interface GeneralDataProps {
  filmVersions: FilmVersionProps[];
  countries: CountryProps[];
  manufacturers: ManufacturerProps[];
  languages: LanguageProps[];
  filmStatuses: FilmStatusProps[];
}

export interface FilmCategoryProps {
  id: number;
  name: string;
  description: string;
}

export interface CustomerRoleMenuProps {
  id: number;
  customerRoleId: number;
  menu: string;
  menuName: string;
  edit: boolean;
  readOnly: boolean;
}

export interface MachineSerialProps {
  shortName: string;
  activeYear: number;
  posName: string;
  printTimes: number;
  cancelTimes: number;
  updatedOnUtc: string;
}

export interface DiscountProps {
  id: number;
  discountName: string;
  discountType: string;
  discountAmount: number;
  discountRate: number;
  deleted: boolean;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
}

export interface CancellationReasonProps {
  id: number;
  reason: string;
  deleted: boolean;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
}

export interface RoomProps {
  id: number;
  name: string;
  wideSizeF1: number;
  deepSizeF1: number;
  wideSizeF2: number;
  deepSizeF2: number;
  wideSizeF3: number;
  deepSizeF3: number;
  ruleOrder: string;
  noBreak: boolean;
  numberOfFloor: number;
  pictureId: number;
  deleted: boolean;
  subjectToAcl: boolean;
  limitedToStores: boolean;
  orderNo: number;
  floor: string;
}

export interface SeatTypeProps {
  id: number;
  positionCode: string;
  name: string;
  color: string;
  pictureId: number;
  isSeat: boolean;
  isDefault: boolean;
  deleted: boolean;
  createdOnUtc: string;
  updatedOnUtc: string;
  pictureUrl?: string;
}

export interface TicketPriceProps {
  id: number;
  versionCode: string;
  daypartId: number;
  positionId: number;
  price: number;
  deleted: boolean;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
  daypart: DayPartProps;
  position: SeatTypeProps;
}

export interface DayPartProps {
  id: number;
  dateTypeId: number;
  name: string;
  fromTime: string;
  toTime: string;
  createdOnUtc: string;
  createdUser: string;
  updatedOnUtc: string;
  updatedUser: string;
  deleted: boolean;
  CreatedOnUtc: string;
  UpdatedOnUtc: string;
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

export interface HolidayProps {
  dateValue: string;
  dateTypeId: number;
  createdOnUtc: string;
  createdUser: string;
  CreatedOnUtc: string;
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

export interface BackgroundProps {
  id: string;
  name: string;
  urlImage: string;
}

export interface AuditLogProps {
  id: number;
  userId: number;
  model: string;
  user: UserProps;
  entityId: string;
  action: string;
  oldValues: string;
  newValues: string;
  changedFields: string;
  timestamp: string;
}

export interface RevenueByEmployeeProps {
  userId: number;
  userName: string;
  onQuantity: number | null;
  offQuantity: number | null;
  totalQuantity: number | null;
  offSaleVietQr: number | null;
  offSaleVnPayQr: number | null;
  actualOffSale: number | null;
  totalSale: number | null;
}

export interface RevenueByFilmProps {
  filmId: number;
  filmName: string;
  onQuantity: number | null;
  offQuantity: number | null;
  totalQuantity: number | null;
  offSaleVietQr: number | null;
  offSaleVnPayQr: number | null;
  actualOffSale: number | null;
  totalSale: number | null;
}

export interface TotalRevenueProps {
  onQuantity: number;
  offQuantity: number;
  totalQuantity: number;
  offSaleVietQr: number;
  offSaleVnPayQr: number;
  actualOffSale: number;
  totalSale: number;
}

export interface TotalRevenue2Props {
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  actualSale: number;
  prices: Price2[];
}

export interface ReportRevenueStaffProps {
  revenueByEmployee: RevenueByEmployeeProps[];
  totalByEmployee: TotalRevenueProps;
}

export interface ReportRevenueFilmProps {
  revenueByFilm: RevenueByFilmProps[];
  totalByFilm: TotalRevenueProps;
}

export interface ReportRevenueFilmByStaffProps {
  revenuesByFilm: RevenuesByFilmProps[];
  priceHeaders: number[];
  totalRevenue: TotalRevenueProps;
  totalRevenueOnline: TotalRevenueOnlineProps;
  totalRevenueOffline: TotalRevenueOnlineProps;
}

export interface ReportMonthlyRevenueTicketByStaffProps {
  revenuesByDay: RevenuesByDayProps[];
  priceHeaders: number[];
  totalRevenue: TotalRevenue2Props;
  totalRevenueOnline: TotalRevenueOnlineProps;
  totalRevenueOffline: TotalRevenueOnlineProps;
}

export interface RevenuesByDayProps {
  projectDate: string;
  isOnline: boolean;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  actualSale: number;
  prices: Price2[];
}

export interface Price2 {
  price: number;
  totalQuantity: number;
}

export interface RevenuesByFilmProps {
  filmId: number;
  filmName: string;
  filmOrderNo: number;
  planScreens: PlanScreen[];
  actualSale: number;
  totalSale: number;
  totalContractQuantity: number;
  totalInvitationQuantity: number;
  totalQuantity: number;
  saleVietQr: number;
  saleVnPayQr: number;
}

export interface PlanScreen {
  planScreenId: number;
  projectDate: string;
  projectTime: string;
  roomName: string;
  isOnline: boolean;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
  prices: PriceProps[];
}

export interface PriceProps {
  price: number;
  totalQuantity: number;
}

export interface TotalRevenueProps {
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
}

export interface TotalRevenueOnlineProps {
  isOnline: boolean;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalQuantity: number;
  totalSale: number;
  saleVnPayQr: number;
  saleVietQr: number;
  actualSale: number;
}

export interface ExamineTicketByPlanProps {
  examineTicketsByFilm: ExamineTicketsByFilmProps[];
  total: ExamineTicketTotalProps;
  totalOnline: ExamineTicketTotalOnlineProps;
  totalOffline: ExamineTicketTotalOnlineProps;
}

export interface ExamineTicketsByFilmProps {
  filmId: number;
  filmName: string;
  filmOrderNo: number;
  planScreens: PlanScreenExamineTicket[];
  totalVipQuantity: number;
  totalRegularQuantity: number;
  totalContractQuantity: number;
  totalVipCIQuantity: number;
  totalRegularCIQuantity: number;
  totalContractCIQuantity: number;
  totalInvitationQuantity: number;
  totalQuantity: number;
  totalNotCIQuantity: number;
  totalCIQuantity: number;
}

export interface PlanScreenExamineTicket {
  planScreenId: number;
  projectDate: string;
  projectTime: string;
  roomName: string;
  isOnline: boolean;
  vipQuantity: number;
  regularQuantity: number;
  contractQuantity: number;
  vipCIQuantity: number;
  regularCIQuantity: number;
  contractCIQuantity: number;
  invitationQuantity: number;
  totalQuantity: number;
  totalNotCIQuantity: number;
  totalCIQuantity: number;
}

export interface ExamineTicketTotalProps {
  totalVipQuantity: number;
  totalRegularQuantity: number;
  totalContractQuantity: number;
  totalVipCIQuantity: number;
  totalRegularCIQuantity: number;
  totalContractCIQuantity: number;
  totalInvitationQuantity: number;
  totalQuantity: number;
  totalNotCIQuantity: number;
  totalCIQuantity: number;
}

export interface ExamineTicketTotalOnlineProps {
  isOnline: boolean;
  totalVipQuantity: number;
  totalRegularQuantity: number;
  totalContractQuantity: number;
  totalVipCIQuantity: number;
  totalRegularCIQuantity: number;
  totalContractCIQuantity: number;
  totalInvitationQuantity: number;
  totalQuantity: number;
  totalNotCIQuantity: number;
  totalCIQuantity: number;
}

export interface ReportVoucherUsageProps {
  voucherUsages: VoucherUsageProps[];
  totalOrders: number;
}

export interface VoucherUsageProps {
  printedOnUtcDateOnly: string;
  voucherCode: string;
  numOrders: number;
}

export interface ReportU22UsageProps {
  data: U22UsageProps[];
  totalUsage: {
    totalOrders: number;
    totalAmount: number;
  };
}

export interface U22UsageProps {
  fullName: string;
  memberCardCode: string;
  paidDate: string;
  numOrders: number;
  totalAmount: number;
}

export interface MonthlyReportPlanProps {
  data: Manufacturer[];
}

export interface Manufacturer {
  manufacturerName: string;
  films: Film[];
}

export interface Room {
  roomName: string;
  total: number;
}

export interface Film {
  filmName: string;
  rooms: Room[];
}

export interface MonthlyReportTicketProps {
  data: Manufacturer2[];
}

export interface Manufacturer2 {
  manufacturerId: number;
  manufacturerName: string;
  films: Film2[];
}

export interface Film2 {
  filmId: string;
  filmName: string;
  projects: Project[];
}

export interface Project {
  projectDate: string;
  projectTime: string;
  versions: Version[];
}

export interface Version {
  versionCode: string;
  prices: Price[];
}

export interface Price {
  isOnline: boolean;
  isInvitation: boolean;
  isContract: boolean;
  unitPriceInclTax: number;
  totalTickets: number;
  totalRevenue: number;
}

export interface Detail {
  isOnline: boolean;
  orderTotal: number;
  quantityV: number;
  quantityT: number;
  conQuantity: number;
}

export interface ProjectTime {
  projectTime: string;
  details: Detail[];
}

export interface ProjectDate {
  projectDate: string;
  projectTimes: ProjectTime[];
}

export interface RoomReport {
  roomName: string;
  projectDates: ProjectDate[];
}

export interface MonthlyReportRoomProps {
  data: RoomReport[];
}

export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
  timestamp: string;
}

export interface UpdateInfo {
  version: string;
}

export interface UpdaterContextType {
  version: string;
  progress: number;
  manualCheck: () => Promise<void>;
}

export interface JwtPayload {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  aud: string[];
  sub: string;
  typ: string;
  azp: string;
  sid: string;
  acr: string;
  "allowed-origins": string[];
  realm_access: RealmAccess;
  resource_access: ResourceAccess;
  scope: string;
  store_id: string;
  email_verified: boolean;
  user_id: string;
  preferred_username: string;
}

export interface RealmAccess {
  roles: string[];
}

export interface ResourceAccess {
  "realm-management": RealmManagement;
  account: Account;
}

export interface RealmManagement {
  roles: string[];
}

export interface Account {
  roles: string[];
}

export type PrintTicketPayload = {
  cinemaName: string;
  address: string;
  movieName: string;
  showTime: string;
  date: string;
  seat: string;
  room: string;
  floor: string;
  price: string;
  ticketCode: string;
  qrData: string;
};
