import { forward } from "../../../_lib/forward";

/**
 * 카카오·구글이 돌려보내는 주소 (백엔드 Redirect URI가 이 웹의 이 경로일 때).
 * 백엔드는 Redirect URI가 /api/v1/auth/{provider}/callback으로 끝나야 해서 화면 주소 대신 이 경로를 쓴다.
 *
 * - 카카오·구글에서 돌아온 브라우저(페이지 이동): code·state를 그대로 붙여 로그인 처리 화면으로 보낸다.
 *   그 화면이 백엔드 콜백 API를 불러 결과를 받는다. 배포에서도 이 이동만은 한다.
 * - 화면이 fetch로 부른 요청: 로컬 개발에서만 백엔드로 넘긴다 (배포에서는 화면이 백엔드를 바로 부른다)
 */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/auth/[provider]/callback">) {
  const { provider } = await ctx.params;

  if (isPageNavigation(request)) {
    const url = new URL(request.url);
    const screen = new URL(`/auth/callback/${encodeURIComponent(provider)}`, url.origin);
    screen.search = url.search;
    return new Response(null, {
      status: 303,
      headers: { location: screen.toString(), "cache-control": "no-store" },
    });
  }

  return forward(request, `auth/${encodeURIComponent(provider)}/callback`);
}

/** Sec-Fetch-Mode를 안 보내는 옛 브라우저는 HTML을 원하는지로 가린다 */
function isPageNavigation(request: Request) {
  const mode = request.headers.get("sec-fetch-mode");
  if (mode) return mode === "navigate";
  return (request.headers.get("accept") ?? "").includes("text/html");
}
