// @ts-check
import { serwist } from "@serwist/next/config";

// `next build` 이후 `serwist build`가 .next 산출물을 읽어 public/sw.js를 만든다.
export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});
