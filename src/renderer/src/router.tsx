import { createHashRouter, Navigate } from "react-router";
import Dashboard from "./features/Dashboard";
import FilmsPage from "./features/films/FilmsPage";
import Login from "./features/Login";
import MachineSerialsPage from "./features/machineSerials/MachineSerialsPage";
import UsersPage from "./features/users/UsersPage";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";
import ManufacturersPage from "./features/manufacturers/ManufacturersPage";
import SeatTypesPage from "./features/seatTypes/SeatTypesPage";
import ScreeningRoomsPage from "./features/screeningRooms/ScreeningRoomsPage";
import HolidaysPage from "./features/holidays/HolidaysPage";
import CancellationReasonsPage from "./features/cancellationReasons/CancellationReasonsPage";
import ShowTimeSlotsPage from "./features/showTimeSlots/ShowTimeSlotsPage";
import TicketPricesPage from "./features/ticketPrices/TicketPricesPage";
import PlanCinemaPage from "./features/planCinema/PlanCinemaPage";
import ShowtimeSchedulePage from "./features/showtimeSchedule/ShowtimeSchedulePage";
import OnlineShowtimeBookingPage from "./features/onlineShowtimeBooking/OnlineShowtimeBookingPage";
import DiscountSettingsPage from "./features/discountSettings/DiscountSettingsPage";
import PrintOnlineTicketsPage from "./features/printOnlineTickets/PrintOnlineTicketsPage";
import FindOnlineTicketsPage from "./features/findOnlineTickets/FindOnlineTicketsPage";
import CancellationTicketsPage from "./features/cancellationTickets/CancellationTicketsPage";
import AccessHistoryPage from "./features/accessHistory/AccessHistoryPage";
import OrderHistoryPage from "./features/orderHistory/OrderHistoryPage";
import StaffRevenueReportPage from "./features/staffRevenueReport/StaffRevenueReportPage";

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
            path: "/machine-serials",
            element: <MachineSerialsPage />
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
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" />
  }
]);
