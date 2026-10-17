import type { Metadata } from "next";
import { HandoverPreviewScreen } from "./handover-preview-screen";

export const metadata: Metadata = { title: "인계 카드", robots: { index: false } };

/** SCR-T02 인계 카드 미리보기. 로그인 없이 열린다 */
export default async function ShareCardPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  return <HandoverPreviewScreen code={token} />;
}
