import type { Metadata } from "next";
import { AcceptHandoverScreen } from "./accept-handover-screen";

export const metadata: Metadata = { title: "인계 카드로 등록하기", robots: { index: false } };

export default async function AcceptHandoverPage({ params }: PageProps<"/share/[token]/register">) {
  const { token } = await params;
  return <AcceptHandoverScreen code={token} />;
}
