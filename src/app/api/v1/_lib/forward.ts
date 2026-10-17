/**
 * 같은 주소의 /api/v1 요청을 백엔드(API_PROXY_TARGET)로 그대로 넘긴다.
 *
 * 브라우저가 백엔드를 직접 부르지 않는 까닭
 * - 백엔드 CORS는 배포 웹 주소만 허용해서 localhost에서 부르면 403이다
 * - refresh·state 쿠키가 SameSite=Lax라 다른 사이트에서 부르면 저장도 전송도 안 된다
 * 같은 주소로 부르면 쿠키가 이 사이트 쿠키가 되고 CORS도 생기지 않는다.
 */

/** 백엔드로 넘기는 요청 헤더. Origin·Host는 빼고, 다른 사이트 요청은 여기서 막는다 */
const REQUEST_HEADERS = ["accept", "accept-language", "authorization", "content-type", "cookie"];
const RESPONSE_HEADERS = ["cache-control", "content-type", "location"];

function fail(status: number, code: string, message: string) {
  return Response.json(
    { resultType: "FAIL", success: null, error: { code, message, details: null } },
    { status },
  );
}

/**
 * 쿠키 경로·이름은 백엔드 그대로 둔다 (프록시 경로가 /api/v1로 같아서 Path가 맞는다).
 * http로 연 개발 서버에서는 Secure를 빼야 Safari도 쿠키를 저장한다
 */
function relayCookie(cookie: string, secure: boolean) {
  return secure ? cookie : cookie.replace(/;\s*Secure/gi, "");
}

export async function forward(request: Request, path: string) {
  const target = process.env.API_PROXY_TARGET;
  if (!target) {
    return fail(503, "PROXY_TARGET_MISSING", "API_PROXY_TARGET이 설정되지 않았어요.");
  }

  // 백엔드가 Origin으로 막던 CSRF를 프록시가 대신 막는다 (같은 사이트 요청만 통과)
  const self = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== self.origin) {
    return fail(403, "ORIGIN_NOT_ALLOWED", "허용되지 않은 Origin입니다.");
  }

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(new URL(`/api/v1/${path}${self.search}`, target), {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      cache: "no-store",
      // 요청 본문을 스트림으로 넘길 때 Node fetch가 요구한다
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);
  } catch {
    return fail(502, "UPSTREAM_UNAVAILABLE", "서버에 연결하지 못했어요.");
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", relayCookie(cookie, self.protocol === "https:"));
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
