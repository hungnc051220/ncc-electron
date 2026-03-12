import "./assets/css/main.css";
import "./assets/css/fonts.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
import AntdProvider from "./providers/AntdProvider";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { UpdaterProvider } from "./components/UpdaterContext";
import { useSettingPosStore } from "./store/settingPos.store";
import { useThemeStore } from "./store/theme.store";
import { useAuthStore } from "./store/auth.store";
import { initApi } from "./api/client";
import { connectSocket, initSocket } from "./socket/socket";
import PermissionBootstrap from "./permissions/PermissionBootstrap";

useSettingPosStore.getState();

window.api?.onThemeUpdate((theme) => {
  useThemeStore.getState().setTheme(theme);
});

window.api?.requestTheme();

async function bootstrap() {
  const config = await window.api?.getConfig();
  initApi(config?.apiBaseUrl || "https://testapiv3.chieuphimquocgia.com.vn");
  initSocket(config?.socketUrl || "wss://testapiv3.chieuphimquocgia.com.vn");

  const token = useAuthStore.getState().token;
  if (token) {
    connectSocket(token);
  }

  createRoot(document.getElementById("root")!).render(
    <UpdaterProvider>
      <AntdProvider>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            <PermissionBootstrap>
              <RouterProvider router={router} />
            </PermissionBootstrap>
          </NuqsAdapter>
        </QueryClientProvider>
      </AntdProvider>
    </UpdaterProvider>
  );
}

bootstrap();
