import { ImageResponse } from "next/og";

// 임시 앱 아이콘. 디자인 에셋이 나오면 public/icons/*.png로 바꾸고 이 라우트는 지운다.
const SIZES = ["192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 });
  const px = Number(size);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#3f7d4e",
        color: "white",
        fontSize: px * 0.5,
        fontWeight: 700,
      }}
    >
      P
    </div>,
    { width: px, height: px },
  );
}
