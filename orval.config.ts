import { defineConfig } from "orval";

/**
 * 백엔드 OpenAPI 스펙에서 타입과 TanStack Query 훅을 만든다.
 * 실행: OPENAPI_URL=<스펙 주소 또는 경로> pnpm api:generate
 */
export default defineConfig({
  pabom: {
    input: { target: process.env.OPENAPI_URL ?? "./openapi.yaml" },
    output: {
      mode: "tags-split",
      target: "src/shared/api/generated",
      schemas: "src/shared/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: { path: "src/shared/api/client.ts", name: "customFetch" },
        query: { useQuery: true, useSuspenseQuery: true },
      },
    },
  },
});
