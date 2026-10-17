import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // 브라우저는 같은 주소(/api/v1)로 부르지만, 노드 테스트의 fetch는 절대 주소가 필요하다
    env: { NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000" },
  },
});
