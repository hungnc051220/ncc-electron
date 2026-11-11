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
  /** Chính sách U22 theo suất (backend V3.2); backend cũ không trả. */
  u22Policy?: PlanScreeningU22Policy;
}

/** Lý do U22 đang bị chặn cho một suất (`GET /api/pos/plan-screenings/:id` → `u22Policy.blockedReasons`). */
export type U22BlockedReason =
  | "U22_DISABLED"
  | "UNIFORM_PRICE"
  | "HOLIDAY"
  | "PROMOTION_EXCLUDED"
  | "UNSUPPORTED_VERSION";

/** Chính sách U22 của một suất (contract V3.2 mục 4.1). Backend luôn áp dụng khi bán, không có flag. */
export interface PlanScreeningU22Policy {
  /** `SCREENING_POLICY` có dòng chính sách; `LEGACY_UNSPECIFIED` suất cũ; `UNAVAILABLE` chưa có bảng/đọc lỗi. */
  source: "SCREENING_POLICY" | "LEGACY_UNSPECIFIED" | "UNAVAILABLE";
  u22Enabled: boolean | null;
  priceMode: PlanScreeningPriceMode | null;
  blockedReasons?: U22BlockedReason[];
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
  positionId?: number;
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
  pricingDate?: string;
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

/**
 * Lý do nhóm giá (`POST /api/pos/pricing/plan-pricing`, V3.2): `HOLIDAY` khi ngày lễ chọn "Giá ngày lễ"
 * (`isHoliday && applyHolidayPrice`), còn lại `BASE` (theo phân loại gốc `DateTypeId`).
 */
export type PricingReason = "BASE" | "HOLIDAY";

/**
 * Giá bảng cho một suất định lập. `dayPartId` + `pricings` có từ trước; các trường còn lại do backend V3.2
 * thêm (backend cũ không trả), nên đều là tùy chọn.
 */
export interface PlanPricingProps {
  dayPartId: number;
  pricings: Record<string, number>;
  dateValue?: string;
  time?: string;
  baseDateTypeId?: number;
  isHoliday?: boolean;
  holidayName?: string | null;
  /** Chế độ giá của ngày lễ: `true` giá ngày lễ, `false` theo ngày trong tuần; `null` khi không phải ngày lễ. */
  applyHolidayPrice?: boolean | null;
  /** Chỉ để hiển thị; `null` khi backend không đọc được cờ. */
  isPromotionExcluded?: boolean | null;
  effectiveDateTypeId?: number;
  pricingReason?: PricingReason;
  dayPartName?: string;
  dayPartFromTime?: string;
  dayPartToTime?: string;
  /** Phiên bản giá FE gửi lại khi lưu suất để backend phát hiện giá đã lỗi thời (409 `PRICING_STALE`). */
  pricingVersion?: string;
}

/** Nguồn giá khi lập suất: theo bảng giá, giá nhập tay (sửa ô giá) hoặc Đồng giá (checkbox Đồng giá). */
export type PlanScreeningPriceMode = "LIST" | "MANUAL" | "UNIFORM";

/**
 * `GET /api/pos/pricing/rules` (contract V3.2 mục 2): năng lực thật của backend, không có feature flag. Backend
 * cũ trả 404 → FE coi là chưa hỗ trợ và ẩn chức năng mới.
 */
export interface PricingRules {
  ruleVersion: string;
  /** Cấu trúc DB backend đọc được. */
  schema: {
    /** Cột `DateInYear.ApplyHolidayPrice` (chế độ giá của ngày lễ). */
    holidayPriceMode: boolean;
    /** Cột `DateInYear.IsPromotionExcluded` (ngày không áp ưu đãi). */
    promotionExclusion: boolean;
    /** Bảng `PlanScreeningPolicy` (U22 theo từng suất). */
    screeningPolicy: boolean;
  };
  /** Đủ cả ba cấu trúc. `false`: FE báo lỗi tương thích và không cho lưu các thao tác mới. */
  ready: boolean;
  /** Ưu đãi backend tự chặn vào ngày lễ / ngày không áp ưu đãi. Bản V3.2 chỉ có `["U22"]`. */
  enforcedPolicies: string[];
}

/** Kết quả `POST /api/pos/plan-screenings` (V3.2 trả thêm `u22Policy` để FE chỉ báo đã lưu khi thật sự lưu). */
export interface CreatePlanScreeningResult {
  id?: number;
  u22Policy?: PlanScreeningU22Policy;
}

/** Body 409 `PRICING_STALE` khi lưu suất bằng giá đã lỗi thời (`details`). */
export interface PricingStaleDetails {
  dateValue?: string;
  time?: string;
  requested?: {
    daypartId?: number | null;
    pricingVersion?: string | null;
    priceMode?: PlanScreeningPriceMode | null;
    priceOfPosition1?: string;
    priceOfPosition2?: string;
    priceOfPosition3?: string;
    priceOfPosition4?: string;
  };
  /** Giá bảng hiện tại, cùng shape với plan-pricing; `null` nếu backend không tính được. */
  current?: PlanPricingProps | null;
}

/** Bốn ô giá snapshot của suất chiếu (`MÃ:giá`, rỗng nếu không dùng). */
export interface PlanScreeningPriceSnapshot {
  priceOfPosition1: string;
  priceOfPosition2: string;
  priceOfPosition3: string;
  priceOfPosition4: string;
}

export type RepricingPriceSource =
  | "LIST"
  | "MANUAL"
  | "UNIFORM"
  | "LEGACY_UNSPECIFIED"
  | "MATCHES_STORED_LIST"
  | "DIFFERS_UNKNOWN"
  | "UNKNOWN";

export interface RepricingBlocker {
  code: string;
  message: string;
}

/**
 * Một suất trong kết quả `POST /api/pos/plan-screenings/repricing/preview` (contract V3.2 mục 6, chỉ đọc).
 * `stored` = "Giá đang lưu" (snapshot đã dùng để bán); `configured` = "Giá theo cấu hình hiện tại".
 */
export interface RepricingPreviewItem {
  planScreenId: number;
  planCinemaId: number | null;
  projectDate: string;
  projectTime: string;
  roomId: number;
  roomName: string | null;
  filmId: number;
  filmName: string | null;
  versionCode: string | null;
  /** Suất đã qua: chỉ tra cứu lịch sử, không bao giờ có đề xuất. */
  isPast: boolean;
  stored: PlanScreeningPriceSnapshot & { daypartId: number | null; dayPartName: string | null };
  configured:
    | (PlanScreeningPriceSnapshot & {
        daypartId: number;
        dayPartName: string | null;
        effectiveDateTypeId: number;
        pricingReason: PricingReason;
        pricingVersion: string;
      })
    | null;
  configuredError: { code: string; message: string } | null;
  priceSource: RepricingPriceSource;
  /** Giá đang lưu khác giá theo cấu hình hiện tại (chỉ là thông tin). */
  differs: boolean;
  /** Thông tin (vé đã bán, ghế đang giữ…); chức năng điều chỉnh đang tạm ngừng. */
  blockers: RepricingBlocker[];
}

/** Đếm suất theo kết quả đối chiếu (`summary` của preview; backend cũ không trả thì FE tự tính từ `items`). */
export interface RepricingPreviewSummary {
  /** Mọi suất backend trả. */
  total: number;
  /** Có giá theo cấu hình và không chênh lệch. */
  matching: number;
  /** Có chênh lệch. */
  differing: number;
  /** Không tính được giá theo cấu hình (`configuredError`). */
  unavailable: number;
  /** Suất đã bắt đầu (chỉ tra cứu). */
  past: number;
}

export interface RepricingPreviewResult {
  generatedAt: string;
  /** Kết quả có gồm suất đã qua (tra cứu) hay không. */
  includePast: boolean;
  total: number;
  summary?: RepricingPreviewSummary;
  items: RepricingPreviewItem[];
}

export type ScreenMode = "normal" | "contract" | "invitation";

/** Giá vé U22 theo thứ của ngày suất chiếu (bảng `U22PriceConfig`, một dòng). */
export interface U22WeekPrices {
  priceMon: number;
  priceTue: number;
  priceWed: number;
  priceThu: number;
  priceFri: number;
  priceSat: number;
  priceSun: number;
}

/** `GET/PUT /api/pos/u22-price-config`. */
export interface U22PriceConfig extends U22WeekPrices {
  version: number;
  updatedUser: string;
  /** ISO 8601 UTC */
  updatedOnUtc: string;
}

/** Body `PUT /api/pos/u22-price-config`: đủ 7 giá + `version` đã đọc. */
export interface UpdateU22PriceConfigDto extends U22WeekPrices {
  version: number;
}
