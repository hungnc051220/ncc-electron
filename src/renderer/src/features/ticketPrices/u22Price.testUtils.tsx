import { initApi } from "@renderer/api/client";
import { queryClient } from "@renderer/lib/queryClient";
import { server } from "@renderer/test/msw/server";
import type { U22PriceConfig, UpdateU22PriceConfigDto } from "@shared/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";

export const U22_TEST_API = "http://u22-price.test";
export const U22_CONFIG_URL = `${U22_TEST_API}/api/pos/u22-price-config`;

export const SEED_U22_CONFIG: U22PriceConfig = {
  priceMon: 55000,
  priceTue: 55000,
  priceWed: 55000,
  priceThu: 55000,
  priceFri: 70000,
  priceSat: 70000,
  priceSun: 70000,
  version: 1,
  updatedUser: "migration",
  updatedOnUtc: "2026-11-08T02:00:00.000Z"
};

type ErrorReply = { status: number; body: Record<string, unknown> };

type U22ServerOptions = {
  config?: U22PriceConfig;
  /** Lỗi trả cho mọi GET (vd. 503 `U22_PRICE_CONFIG_UNAVAILABLE`). */
  getError?: ErrorReply;
  /** Lỗi trả cho lần PUT tiếp theo (vd. 409 `U22_PRICE_CONFIG_CHANGED`). */
  putError?: ErrorReply;
};

/** MSW cho `GET/PUT /api/pos/u22-price-config` như backend: PUT đúng `version` thì tăng `version`. */
export const setupU22Server = async ({
  config = SEED_U22_CONFIG,
  getError,
  putError
}: U22ServerOptions = {}) => {
  await initApi(U22_TEST_API);
  const state = { config: { ...config }, getCount: 0, putBodies: [] as UpdateU22PriceConfigDto[] };
  let pendingPutError = putError;

  server.use(
    http.get(U22_CONFIG_URL, () => {
      state.getCount += 1;
      if (getError) return HttpResponse.json(getError.body, { status: getError.status });
      return HttpResponse.json(state.config);
    }),
    http.put(U22_CONFIG_URL, async ({ request }) => {
      const body = (await request.json()) as UpdateU22PriceConfigDto;
      state.putBodies.push(body);
      if (pendingPutError) {
        const reply = pendingPutError;
        pendingPutError = undefined;
        return HttpResponse.json(reply.body, { status: reply.status });
      }
      const { version, ...prices } = body;
      state.config = {
        ...state.config,
        ...prices,
        version: version + 1,
        updatedUser: "admin",
        updatedOnUtc: "2026-11-08T04:00:00.000Z"
      };
      return HttpResponse.json(state.config);
    })
  );

  return state;
};

export const U22TestProviders = ({
  children,
  route = "/ticket-prices"
}: {
  children: ReactNode;
  route?: string;
}) => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </App>
    </ConfigProvider>
  </QueryClientProvider>
);
