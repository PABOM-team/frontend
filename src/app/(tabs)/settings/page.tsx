import type { Metadata } from "next";
import { NotificationSetting } from "./notification-setting";

export const metadata: Metadata = { title: "설정" };

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">설정</h1>
      <NotificationSetting />
    </section>
  );
}
