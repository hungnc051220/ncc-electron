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

export interface ShowtimesProps {
  id: number;
  title: string;
  times: string[];
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
