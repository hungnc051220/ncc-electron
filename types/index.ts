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
  categories: number[];
}
