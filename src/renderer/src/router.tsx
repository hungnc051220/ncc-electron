import { createBrowserRouter, Navigate } from "react-router";
import Dashboard from "./features/Dashboard";
import Login from "./features/Login";
import MachineSerialsPage from "./features/machineSerials/MachineSerialsPage";
import UsersPage from "./features/users/UsersPage";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";
import FilmsPage from "./features/films/FilmsPage";

export const router = createBrowserRouter([
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
