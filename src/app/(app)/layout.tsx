import type { ReactNode } from "react";
import { RequireAuth } from "@/features/auth";

/** 로그인해야 들어오는 화면 묶음 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
