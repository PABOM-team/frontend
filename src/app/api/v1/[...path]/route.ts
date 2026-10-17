import { forward } from "../_lib/forward";

/** /api/v1/* → 백엔드. 경로·쿼리·본문·쿠키를 그대로 넘긴다 (_lib/forward.ts) */
async function handle(request: Request, ctx: RouteContext<"/api/v1/[...path]">) {
  const { path } = await ctx.params;
  return forward(request, path.map(encodeURIComponent).join("/"));
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
