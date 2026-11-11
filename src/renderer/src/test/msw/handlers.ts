import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/__test__/health", () => {
    return HttpResponse.json({ ok: true });
  }),
  // Mặc định: backend cũ chưa có `GET /api/pos/pricing/rules` (FE ẩn chức năng mới). Test cần backend V3.2
  // tự `server.use(...)` handler trả năng lực `{ ruleVersion, schema, ready, enforcedPolicies }`.
  http.get("*/api/pos/pricing/rules", () => new HttpResponse(null, { status: 404 }))
];
