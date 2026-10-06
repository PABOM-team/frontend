import type { Metadata } from "next";

export const metadata: Metadata = { title: "돌봄 인계 카드", robots: { index: false } };

// TODO: 보기 전용 인계 카드. 최근 4주 기록과 일정 기본 포함, 개인정보는 제외 (IA 4번 D안)
export default async function ShareCardPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">돌봄 인계 카드</h1>
      <p className="mt-2 text-sm text-muted-foreground">카드 {token}</p>
    </main>
  );
}
