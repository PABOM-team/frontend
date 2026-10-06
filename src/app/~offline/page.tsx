import type { Metadata } from "next";

export const metadata: Metadata = { title: "오프라인" };

export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">인터넷 연결이 끊겼어요</h1>
      <p className="mt-2 text-sm text-muted-foreground">연결되면 다시 시도해 주세요.</p>
    </main>
  );
}
