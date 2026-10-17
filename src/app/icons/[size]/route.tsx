import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// 앱 아이콘: Figma 'Design | 브랜딩' Logo.03 (파란 그라데이션 + 게코 발자국 P).
// PNG 에셋이 나오면 public/icons/*.png로 바꾸고 이 라우트는 지운다.
const SIZES = ["192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 });
  const px = Number(size);
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
