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
