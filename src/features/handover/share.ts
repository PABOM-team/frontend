import { toast } from "@/shared/ui/toast";

export async function copyText(text: string, message = "복사했어요") {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast("복사하지 못했어요. 길게 눌러 복사해 주세요.");
  }
}

/** 휴대폰 공유 창. 지원하지 않으면 링크 복사 */
export async function shareLink(url: string) {
  if (navigator.share) {
    await navigator.share({ title: "파봄 인계 카드", url }).catch(() => undefined);
    return;
  }
  await copyText(url, "링크를 복사했어요");
}

/** QR을 SVG 파일로 저장 */
export function downloadQr(container: HTMLElement | null, filename: string) {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
