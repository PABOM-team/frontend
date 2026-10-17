import { forward } from "../../../_lib/forward";

/**
 * 카카오·구글이 돌려보내는 주소 (백엔드 Redirect URI가 이 사이트의 이 경로일 때).
 *
 * 백엔드는 이 주소가 /api/v1/auth/{provider}/callback으로 끝나야 하고, 결과를 JSON으로 준다.
 * 브라우저가 직접 열면(카카오·구글에서 돌아오면) 백엔드 결과를 받아 쿠키를 저장한 뒤
 * 로그인 처리 화면(/auth/callback/{provider})으로 보낸다. 화면에서 fetch로 부르면 그대로 넘긴다.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  const path = `auth/${encodeURIComponent(provider)}/callback`;
  if (request.headers.get("sec-fetch-mode") !== "navigate") return forward(request, path);

  const url = new URL(request.url);
  const screen = new URL(`/auth/callback/${encodeURIComponent(provider)}`, url.origin);
  const headers = new Headers();

  if (!url.searchParams.get("code")) {
    // 사용자가 동의 화면에서 취소하면 code 없이 error=access_denied로 돌아온다
    screen.searchParams.set("error", url.searchParams.get("error") ?? "access_denied");
  } else {
    // NextRequest를 그대로 복제하면 undici가 거부해서 주소·헤더로 새로 만든다 (GET이라 본문 없음)
    const upstream = await forward(
      new Request(request.url, { headers: withJsonAccept(request.headers) }),
      path,
    );
    for (const cookie of upstream.headers.getSetCookie()) headers.append("set-cookie", cookie);
    const body = (await upstream.json().catch(() => null)) as CallbackBody | null;

    if (upstream.ok && body?.signupToken) {
      // 가입 토큰은 주소 #에 실어 화면으로만 넘긴다 (#은 서버로 보내지 않는다)
      screen.hash = new URLSearchParams({
        result: "signup",
        token: body.signupToken,
        expiresIn: String(body.expiresIn ?? 600),
        ...account(body),
      }).toString();
    } else if (upstream.ok && body?.accessToken) {
      // access 토큰은 넘기지 않는다. 방금 받은 refresh 쿠키로 화면이 다시 받는다
      screen.hash = new URLSearchParams({ result: "access", ...account(body) }).toString();
    } else {
      screen.searchParams.set("error", body?.error?.code ?? "LOGIN_FAILED");
      if (body?.error?.message) screen.searchParams.set("message", body.error.message);
    }
  }

  headers.set("location", screen.toString());
  headers.set("cache-control", "no-store");
  return new Response(null, { status: 303, headers });
}

type CallbackBody = {
  signupToken?: string;
  accessToken?: string;
  expiresIn?: number;
  user?: { id?: number; nickname?: string };
  error?: { code?: string; message?: string };
};

function account(body: CallbackBody) {
  return { id: String(body.user?.id ?? ""), nickname: body.user?.nickname ?? "" };
}

function withJsonAccept(source: Headers) {
  const headers = new Headers(source);
  headers.set("accept", "application/json");
  return headers;
}
