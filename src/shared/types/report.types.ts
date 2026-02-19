import { UserProps } from "./user.types";

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
