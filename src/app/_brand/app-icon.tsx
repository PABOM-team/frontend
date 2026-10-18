import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// 앱 아이콘: Figma 'Design | 브랜딩' Logo.03 (파란 그라데이션 + 게코 발자국 P).
// manifest 아이콘(/icons/[size]), favicon(icon.tsx), apple-icon.tsx가 같이 쓴다.
export async function renderAppIcon(px: number) {
  const symbol = await readFile(join(process.cwd(), "public/brand/pabom-symbol.svg"));
  const src = `data:image/svg+xml;base64,${symbol.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #669eff 0%, #2999ff 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={px * 0.5} height={px * 0.636} />
    </div>,
    { width: px, height: px },
  );
}
