import type { Metadata } from "next";
import { NotFoundScreen } from "./error-screens";

export const metadata: Metadata = { title: "페이지를 찾을 수 없어요" };

export default function NotFound() {
  return <NotFoundScreen />;
}
