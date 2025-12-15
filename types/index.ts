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
  film: FilmInfo;
}

export interface FilmProps {
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
  isFree: string;
  categories: Category[];
  filmStatus: FilmStatus;
  filmVersion: FilmVersion;
  filmLanguage: FilmLanguage;
}

export interface Category {
  id: number;
  filmId: number;
  categoryId: number;
  createdOnUtc: string;
  createdUser: string;
}

export interface FilmStatus {
  id: number;
  statusCode: string;
  statusName: string;
  deleted: boolean;
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
  VIETQR = "VIETQR",
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
