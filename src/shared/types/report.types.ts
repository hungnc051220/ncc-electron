import { UserProps } from "./user.types";

export interface AuditLogProps {
  id: number;
  userId?: number | null;
  username?: string | null;
  model?: string | null;
  user?: UserProps | null;
  entityId?: string | number | null;
  action?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  changedFields?: unknown;
  timestamp?: string | null;
}

export interface RevenueByEmployeeProps {
  userId: number;
  userName: string;
  fullName?: string;
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
  onSaleTotal: number | null;
}

export interface TotalRevenueProps {
  onQuantity: number;
  offQuantity: number;
  totalQuantity: number;
  offSaleVietQr: number;
  offSaleVnPayQr: number;
  actualOffSale: number;
  totalSale: number;
  totalPlanCount: number;
  onSaleTotal: number | null;
  crmDiscount: TotalRevenueDiscountProps;
  internalDiscount: TotalRevenueDiscountProps;
}

export interface TotalRevenueDiscountProps {
  discountOffline?: number;
  discountOnline?: number;
  discountPartner?: number;
  discountTotal?: number;
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
  crmDiscount?: TotalRevenueDiscountProps;
  internalDiscount?: TotalRevenueDiscountProps;
  discountOffline?: number;
  discountOnline?: number;
  discountPartner?: number;
  discountTotal?: number;
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
  crmDiscount: TotalRevenueDiscountProps;
  internalDiscount: TotalRevenueDiscountProps;
  discountOffline?: number;
  discountOnline?: number;
  discountPartner?: number;
  discountTotal?: number;
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
  crmDiscount?: TotalRevenueDiscountProps;
  internalDiscount?: TotalRevenueDiscountProps;
  discountOffline?: number;
  discountOnline?: number;
  discountPartner?: number;
  discountTotal?: number;
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

export type YearlyReportType = "PLAN" | "REVENUE_VIET" | "REVENUE_PARTNER" | "SUMMARY";

export interface YearlyReportQuarterDetail {
  screenings?: number;
  tickets?: number;
  revenue?: number;
  partnerRevenue?: number;
  totalRevenue?: number;
}

export interface YearlyReportFilmDetail {
  filmName: string;
  quarters: Partial<Record<1 | 2 | 3 | 4, YearlyReportQuarterDetail>>;
  totalScreenings?: number;
  totalTicketsSold?: number;
  totalRevenue: number;
  totalPartnerRevenue?: number;
}

export interface YearlyReportManufacturerDetail {
  manufacturerName: string;
  films: YearlyReportFilmDetail[];
}

export interface YearlyReportDetailResponse {
  data: YearlyReportManufacturerDetail[];
}

export interface YearlyReportSummaryItem {
  manufacturerId: number;
  manufacturerName: string;
  totalFilms: number;
  totalPlans: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalSharedRevenue: number;
}

export interface ReportRevenueSharingProps {
  id: number;
  sharingRateId: number;
  manufacturerId: number;
  filmId: number;
  fromDate: string;
  toDate: string;
  rate: number;
  totalRevenue: number;
  sharedRevenue: number;
  totalTickets: number;
  createdOnUtc: string;
  updatedOnUtc: string;
  manufacturerName: string;
  filmName: string;
  VersionCode: string;
  premieredDay: string;
}

export interface RevenueSharingDetailPriceItem {
  price: number;
  totalQuantity: number;
}

export interface RevenueSharingDetailPlanScreen {
  planScreenId: number;
  projectDate: string;
  projectTime: string;
  roomName: string;
  isOnline: boolean;
  totalQuantity: number;
  totalInvitationQuantity: number;
  totalContractQuantity: number;
  totalSale: number;
  actualSale: number;
  prices: RevenueSharingDetailPriceItem[];
}

export interface RevenueSharingDetailSummaryItem {
  isOnline?: boolean | null;
  totalQuantity?: number | null;
  totalInvitationQuantity?: number | null;
  totalContractQuantity?: number | null;
  totalSale?: number | null;
  actualSale?: number | null;
  prices?: RevenueSharingDetailPriceItem[] | null;
}

export interface RevenueSharingPreviousMonthSummary {
  monthLabel?: string | null;
  totalTickets?: number | null;
  totalRevenue?: number | null;
}

export interface RevenueSharingCancellationItem {
  date: string;
  quantity: number;
  totalValue: number;
}

export interface RevenueSharingPeriodItem {
  periodLabel?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalQuantity?: number | null;
  totalSale?: number | null;
  sharingRate?: number | null;
  sharedRevenue?: number | null;
  contractQuantity?: number | null;
  contractSale?: number | null;
  cancellations?: RevenueSharingCancellationItem[] | null;
}

export interface ReportRevenueSharingDetailResponse {
  filmId: number;
  filmName?: string | null;
  versionCode?: string | null;
  manufacturerId: number;
  manufacturerName?: string | null;
  premieredDate?: string | null;
  detail?: {
    planScreens?: RevenueSharingDetailPlanScreen[] | null;
    priceHeaders?: number[] | null;
    totalRevenueOnline?: RevenueSharingDetailSummaryItem | null;
    totalRevenueOffline?: RevenueSharingDetailSummaryItem | null;
    totalRevenue?: RevenueSharingDetailSummaryItem | null;
  } | null;
  previousMonthSummary?: RevenueSharingPreviousMonthSummary | null;
  revenueSharingPeriods?: RevenueSharingPeriodItem[] | null;
  revenueSharingWeeks?: RevenueSharingPeriodItem[] | null;
}

export interface PaymentMethodRevenueReportItem {
  paymentMethodSystemName?: string | null;
  sourceName?: string | null;
  isOnline?: boolean | null;
  terminalId?: number | null;
  name?: string | null;
  countEticket?: number | null;
  countOrder?: number | null;
  totalPrice?: number | null;
  totalChair?: number | null;
  exportedTicketCount?: number | null;
  totalElectronicTicket?: number | null;
  totalElectronicTickets?: number | null;
}

export interface PaymentMethodRevenueReportResponse {
  data: PaymentMethodRevenueReportItem[];
}

export interface DiscountOfflineUsageReportResponse {
  data: DiscountOfflineUsageReportItem[];
}

export interface DiscountOfflineUsageReportItem {
  discountId: number;
  discountName: string;
  discountType: string;
  discountRate: number;
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalQuantity: number;
  totalDiscountAmount: number;
  totalPriceInclTax: number;
  orders: DiscountOfflineOrderProps[];
  promotionType: number; //1: giảm giá, 2: khuyến mãi
}

export interface DiscountOfflineOrderProps {
  orderId: number;
  orderGuid: string;
  printedOnUtc: string;
  paidDateUtc: string;
  paymentMethodSystemName: string;
  isOnline: boolean;
  customerPhone: string;
  sellerUsername: string;
  totalQuantity: number;
  discountAmount: number;
  priceInclTax: number;
  orderTotal: number;
}
