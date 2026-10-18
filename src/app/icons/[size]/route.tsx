import { renderAppIcon } from "../../_brand/app-icon";

// PNG 에셋이 나오면 public/icons/*.png로 바꾸고 이 라우트는 지운다.
const SIZES = ["192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 });
  return renderAppIcon(Number(size));
}
