import type { ReactNode } from "react";
import { BottomTabBar } from "@/shared/ui/bottom-tab-bar";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-6 pb-24">{children}</main>
      <BottomTabBar />
    </>
  );
}
