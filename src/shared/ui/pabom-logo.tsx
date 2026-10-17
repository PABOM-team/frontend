import { cn } from "@/shared/lib/utils";

/** 워드마크 가로세로 비 (Figma 브랜딩 Logo.01 · Group 14193, 697×144) */
const WORDMARK_RATIO = 697 / 144;

const HEIGHT = { sm: 18, md: 28, lg: 44 } as const;

/**
 * PABOM 워드마크 (Figma 'Design | 브랜딩' Logo.01).
 * 원본 SVG는 흰색이라 마스크로 써서 글자색(currentColor)을 입힌다. 기본은 브랜드 파랑.
 */
export function PabomLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof HEIGHT;
}) {
  const height = HEIGHT[size];
  return (
    <span
      role="img"
      aria-label="PABOM 파봄"
      className={cn("inline-block shrink-0 bg-current text-brand", className)}
      style={{
        height,
        width: Math.round(height * WORDMARK_RATIO),
        maskImage: "url(/brand/pabom-wordmark.svg)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}

/** 앱 아이콘 (Figma 브랜딩 Logo.03): 파란 그라데이션 위 게코 발자국 P */
export function PabomAppIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-linear-to-b from-brand-from to-brand",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/pabom-symbol.svg"
        alt=""
        style={{ height: size * 0.636, width: size * 0.5 }}
        className="translate-x-[1%]"
      />
    </span>
  );
}
