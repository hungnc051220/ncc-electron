import { createHashRouter, Navigate } from "react-router";
import AccessHistoryPage from "./features/accessHistory/AccessHistoryPage";
import CancellationReasonsPage from "./features/cancellationReasons/CancellationReasonsPage";
import CancellationTicketsPage from "./features/cancellationTickets/CancellationTicketsPage";
import ContractTicketSalesDetailPage from "./features/contractTicketSales/ContractTicketSalesDetailPage";
import ContractTicketSalesPage from "./features/contractTicketSales/ContractTicketSalesPage";
import CustomerRolesPage from "./features/customerRoles/CustomerRolesPage";
import Dashboard from "./features/Dashboard";
import DiscountSettingsPage from "./features/discountSettings/DiscountSettingsPage";
import FilmsPage from "./features/films/FilmsPage";
import FindOnlineTicketsPage from "./features/findOnlineTickets/FindOnlineTicketsPage";
import ForbiddenPage from "./features/ForbiddenPage";
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
import OrderHistorySwapSeatsPage from "./features/orderHistory/OrderHistorySwapSeatsPage";
import PlanCinemaPage from "./features/planCinema/PlanCinemaPage";
import PlanScreeningPage from "./features/planScreening/PlanScreeningPage";
import PrintOnlineTicketsPage from "./features/printOnlineTickets/PrintOnlineTicketsPage";
import QuarterlyReportPage from "./features/quarterlyReport/QuarterlyReportPage";
import RevenueSharingPage from "./features/revenueSharing/RevenueSharingPage";
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
import YearlyReportPage from "./features/yearlyReport/YearlyReportPage";
import PermissionGuard from "./permissions/PermissionGuard";
import RouteErrorPage from "./components/RouteErrorPage";

const withAccess = (permissionKey: string, element: React.ReactNode) => (
  <PermissionGuard permissionKey={permissionKey} fallbackPath="/403">
    {element}
  </PermissionGuard>
);

export const router = createHashRouter([
  {
    path: "/login",
    element: <Login />,
    errorElement: <RouteErrorPage />
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <DashboardLayout />,
        errorElement: <RouteErrorPage />,
        children: [
          {
            index: true,
            element: <Dashboard />
          },
          {
            path: "/403",
            element: <ForbiddenPage />
          },
          {
            path: "/users",
            element: withAccess("users", <UsersPage />)
          },
          {
            path: "/customer-roles",
            element: withAccess("user_roles", <CustomerRolesPage />)
          },
          {
            path: "/user-roles",
            element: withAccess("user_roles", <UserRolesPage />)
          },
          {
            path: "/machine-serials",
            element: withAccess("machine_serials", <MachineSerialsPage />)
          },
          {
            path: "/settings",
            element: withAccess("settings", <SettingPage />)
          },
          {
            path: "/films",
            element: withAccess("films", <FilmsPage />)
          },
          {
            path: "/manufacturers",
            element: withAccess("manufacturers", <ManufacturersPage />)
          },
          {
            path: "/invoices",
            element: withAccess("invoices", <InvoicesPage />)
          },
          {
            path: "/seat-types",
            element: withAccess("seat_types", <SeatTypesPage />)
          },
          {
            path: "/revenue-sharing",
            element: withAccess("revenue_sharing", <RevenueSharingPage />)
          },
          {
            path: "/screening-rooms",
            element: withAccess("screening_rooms", <ScreeningRoomsPage />)
          },
          {
            path: "/holidays",
            element: withAccess("holidays", <HolidaysPage />)
          },
          {
            path: "/showtime-slots",
            element: withAccess("showtime_slots", <ShowTimeSlotsPage />)
          },
          {
            path: "/cancellation-reasons",
            element: withAccess("cancellation_reasons", <CancellationReasonsPage />)
          },
          {
            path: "/ticket-prices",
            element: withAccess("ticket_prices", <TicketPricesPage />)
          },
          {
            path: "/vouchers",
            element: withAccess("vouchers", <VouchersPage />)
          },
          {
            path: "/plan-cinema",
            element: withAccess("plan_cinema", <PlanCinemaPage />)
          },
          {
            path: "/showtime-schedule",
            element: withAccess("showtime_schedule", <ShowtimeSchedulePage />)
          },
          {
            path: "/online-showtime-booking",
            element: withAccess("online_showtime_booking", <OnlineShowtimeBookingPage />)
          },
          {
            path: "/discount-settings",
            element: withAccess("discount_settings", <DiscountSettingsPage />)
          },
          {
            path: "/print-online-tickets",
            element: withAccess("print_online_tickets", <PrintOnlineTicketsPage />)
          },
          {
            path: "/find-online-tickets",
            element: withAccess("find_online_tickets", <FindOnlineTicketsPage />)
          },
          {
            path: "/cancellation-tickets",
            element: withAccess("cancellation_tickets", <CancellationTicketsPage />)
          },
          {
            path: "/refunds",
            element: withAccess("refunds", <RefundsPage />)
          },
          {
            path: "/access-history",
            element: withAccess("access_history", <AccessHistoryPage />)
          },
          {
            path: "/order-history",
            element: withAccess("order_history", <OrderHistoryPage />)
          },
          {
            path: "/staff-revenue-report",
            element: withAccess("staff_revenue_report", <StaffRevenueReportPage />)
          },
          {
            path: "/monthly-report",
            element: withAccess("monthly_report", <MonthlyReportPage />)
          },
          {
            path: "/quarterly-report",
            element: withAccess("quarterly_report", <QuarterlyReportPage />)
          },
          {
            path: "/yearly-report",
            element: withAccess("yearly_report", <YearlyReportPage />)
          },
          {
            path: "/ticket-sales-revenue",
            element: withAccess("ticket_sales_revenue", <TicketSalesRevenuePage />)
          },
          {
            path: "/contract-ticket-sales",
            element: withAccess("contract_ticket_sales", <ContractTicketSalesPage />)
          },
          {
            path: "/invitation-tickets",
            element: withAccess("invitation_tickets", <InvitationTicketsPage />)
          }
        ]
      },
      {
        path: "/showtimes",
        element: withAccess("showtimes", <ShowtimesPage />)
      },
      {
        path: "/plan-screening/:id",
        element: (
          <PermissionGuard
            permissionKey="plan_screening"
            alternatePermissions={[{ permissionKey: "showtimes" }]}
            fallbackPath="/403"
            allowInCustomerMode
          >
            <PlanScreeningPage />
          </PermissionGuard>
        )
      },
      {
        path: "/contract-ticket-sales/:id",
        element: withAccess("contract_ticket_sales", <ContractTicketSalesDetailPage />)
      },
      {
        path: "/invitation-tickets/create",
        element: withAccess("invitation_tickets", <InvitationTicketsDetailPage />)
      },
      {
        path: "/online-seat-booking/create",
        element: withAccess("online_seat_booking", <OnlineSeatBookingDetailPage />)
      },
      {
        path: "/order-history/swap-seats/:id",
        element: withAccess("order_history", <OrderHistorySwapSeatsPage />)
      },
      {
        path: "/ticket-sales-diagram/view",
        element: withAccess("ticket_sales_revenue", <TicketSalesDiagramPage />)
      },
      {
        path: "/screening-rooms/:id/seat-map",
        element: withAccess("screening_rooms", <ScreeningRoomSeatMapPage />)
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" />,
    errorElement: <RouteErrorPage />
  }
]);
