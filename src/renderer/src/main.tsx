import "./assets/css/main.css";
import "./assets/css/fonts.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
import AntdProvider from "./providers/AntdProvider";

createRoot(document.getElementById("root")!).render(
  <AntdProvider>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </AntdProvider>
);
