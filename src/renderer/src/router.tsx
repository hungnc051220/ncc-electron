import { createHashRouter, Navigate } from "react-router";
import AccessHistoryPage from "./features/accessHistory/AccessHistoryPage";
import CancellationReasonsPage from "./features/cancellationReasons/CancellationReasonsPage";
import CancellationTicketsPage from "./features/cancellationTickets/CancellationTicketsPage";
import ContractTicketSalesDetailPage from "./features/contractTicketSales/ContractTicketSalesDetailPage";
import ContractTicketSalesPage from "./features/contractTicketSales/ContractTicketSalesPage";
import Dashboard from "./features/Dashboard";
import DiscountSettingsPage from "./features/discountSettings/DiscountSettingsPage";
import FilmsPage from "./features/films/FilmsPage";
import FindOnlineTicketsPage from "./features/findOnlineTickets/FindOnlineTicketsPage";
import HolidaysPage from "./features/holidays/HolidaysPage";
import InvitationTicketsDetailPage from "./features/invitationTickets/InvitationTicketsDetailPage";
import InvitationTicketsPage from "./features/invitationTickets/InvitationTicketsPage";
import InvoicesPage from "./features/invoices/InvoicesPage";
import Login from "./features/Login";
import MachineSerialsPage from "./features/machineSerials/MachineSerialsPage";
import ManufacturersPage from "./features/manufacturers/ManufacturersPage";
import MonthlyReportPage from "./features/monthlyReport/MonthlyReportPage";
import OnlineSeatBookingDetailPage from "./features/onlineSeatBooking/OnlineSeatBookingDetailPage";
import OnlineShowtimeBookingPage from "./features/onlineShowtimeBooking/OnlineShowtimeBookingPage";
import OrderHistoryPage from "./features/orderHistory/OrderHistoryPage";
import PlanCinemaPage from "./features/planCinema/PlanCinemaPage";
import PlanScreeningPage from "./features/planScreening/PlanScreeningPage";
import PrintOnlineTicketsPage from "./features/printOnlineTickets/PrintOnlineTicketsPage";
import QuarterlyReportPage from "./features/quarterlyReport/QuarterlyReportPage";
import RefundsPage from "./features/refunds/RefundsPage";
import ScreeningRoomSeatMapPage from "./features/screeningRooms/ScreeningRoomSeatMapPage";
import ScreeningRoomsPage from "./features/screeningRooms/ScreeningRoomsPage";
import SeatTypesPage from "./features/seatTypes/SeatTypesPage";
import SettingPage from "./features/settings/SettingPage";
import ShowtimesPage from "./features/showtimes/ShowtimesPage";
import ShowtimeSchedulePage from "./features/showtimeSchedule/ShowtimeSchedulePage";
import ShowTimeSlotsPage from "./features/showTimeSlots/ShowTimeSlotsPage";
import StaffRevenueReportPage from "./features/staffRevenueReport/StaffRevenueReportPage";
import TicketPricesPage from "./features/ticketPrices/TicketPricesPage";
import TicketSalesDiagramPage from "./features/TicketSalesDiagramPage";
import TicketSalesRevenuePage from "./features/ticketSalesRevenue/TicketSalesRevenuePage";
import UserRolesPage from "./features/userRoles/UserRolesPage";
import UsersPage from "./features/users/UsersPage";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";
import VouchersPage from "./features/vouchers/VouchersPage";

export const router = createHashRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />
          },
          {
            path: "/users",
            element: <UsersPage />
          },
          {
            path: "/user-roles",
            element: <UserRolesPage />
          },
          {
            path: "/machine-serials",
            element: <MachineSerialsPage />
          },
          {
            path: "/settings",
            element: <SettingPage />
          },
          {
            path: "/films",
            element: <FilmsPage />
          },
          {
            path: "/manufacturers",
            element: <ManufacturersPage />
          },
          {
            path: "/invoices",
            element: <InvoicesPage />
          },
          {
            path: "/seat-types",
            element: <SeatTypesPage />
          },
          {
            path: "/screening-rooms",
            element: <ScreeningRoomsPage />
          },
          {
            path: "/holidays",
            element: <HolidaysPage />
          },
          {
            path: "/showtime-slots",
            element: <ShowTimeSlotsPage />
          },
          {
            path: "/cancellation-reasons",
            element: <CancellationReasonsPage />
          },
          {
            path: "/ticket-prices",
            element: <TicketPricesPage />
          },
          {
            path: "/vouchers",
            element: <VouchersPage />
          },
          {
            path: "/plan-cinema",
            element: <PlanCinemaPage />
          },
          {
            path: "/showtime-schedule",
            element: <ShowtimeSchedulePage />
          },
          {
            path: "/online-showtime-booking",
            element: <OnlineShowtimeBookingPage />
          },
          {
            path: "/discount-settings",
            element: <DiscountSettingsPage />
          },
          {
            path: "/print-online-tickets",
            element: <PrintOnlineTicketsPage />
          },
          {
            path: "/find-online-tickets",
            element: <FindOnlineTicketsPage />
          },
          {
            path: "/cancellation-tickets",
            element: <CancellationTicketsPage />
          },
          {
            path: "/refunds",
            element: <RefundsPage />
          },
          {
            path: "/access-history",
            element: <AccessHistoryPage />
          },
          {
            path: "/order-history",
            element: <OrderHistoryPage />
          },
          {
            path: "/staff-revenue-report",
            element: <StaffRevenueReportPage />
          },
          {
            path: "/monthly-report",
            element: <MonthlyReportPage />
          },
          {
            path: "/quarterly-report",
            element: <QuarterlyReportPage />
          },
          {
            path: "/ticket-sales-revenue",
            element: <TicketSalesRevenuePage />
          },
          {
            path: "/contract-ticket-sales",
            element: <ContractTicketSalesPage />
          },
          {
            path: "/invitation-tickets",
            element: <InvitationTicketsPage />
          }
        ]
      },
      {
        path: "/showtimes",
        element: <ShowtimesPage />
      },
      {
        path: "/plan-screening/:id",
        element: <PlanScreeningPage />
      },
      {
        path: "/contract-ticket-sales/:id",
        element: <ContractTicketSalesDetailPage />
      },
      {
        path: "/invitation-tickets/create",
        element: <InvitationTicketsDetailPage />
      },
      {
        path: "/online-seat-booking/create",
        element: <OnlineSeatBookingDetailPage />
      },
      {
        path: "/ticket-sales-diagram/view",
        element: <TicketSalesDiagramPage />
      },
      {
        path: "/screening-rooms/:id/seat-map",
        element: <ScreeningRoomSeatMapPage />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" />
  }
]);
