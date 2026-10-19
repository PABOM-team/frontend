import type { AuthProvider } from "@/shared/domain/user";

/**
 * access 토큰은 메모리에만 둔다 (refresh 토큰은 서버가 httpOnly 쿠키로 관리).
 * 새로고침하면 사라지므로 앱 시작 때·401 때 /auth/refresh로 다시 받는다.
 */
let accessToken: string | null = null;
/** 한 번이라도 로그인했던 세션인지. 처음 온 사람에게 '로그인이 만료됐어요'를 띄우지 않으려고 쓴다 */
let hadSession = false;

type Listener = () => void;
const expiredListeners = new Set<Listener>();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) hadSession = true;
}

export function clearSession() {
  accessToken = null;
  hadSession = false;
  clearSignupSession();
  writeStored(ACCOUNT_KEY, null);
}

export function onSessionExpired(listener: Listener) {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

export function notifySessionExpired() {
  if (!hadSession) return;
  hadSession = false;
  accessToken = null;
  expiredListeners.forEach((listener) => listener());
}

// ── 탭을 닫으면 사라지는 값 (sessionStorage) ─────────────────
// 웹 전용이라 sessionStorage가 없는 곳(서버 렌더, 네이티브)에서는 아무것도 하지 않는다

function readStored<T>(key: string): T | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    if (value === null) globalThis.sessionStorage?.removeItem(key);
    else globalThis.sessionStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 못 쓰면(사생활 보호 모드 등) 메모리 값만으로 이어 간다
  }
}

/** 약관 동의 전 새 회원의 가입 토큰. 약관 화면에서 새로고침해도 이어 가도록 저장해 둔다 */
export type SignupSession = { token: string; expiresAt: number };
const SIGNUP_KEY = "pabom-signup";

export function setSignupSession(token: string, expiresInSeconds: number) {
  writeStored(SIGNUP_KEY, { token, expiresAt: Date.now() + expiresInSeconds * 1000 });
}

export function getSignupSession(): SignupSession | null {
  const session = readStored<SignupSession>(SIGNUP_KEY);
  return session && session.expiresAt > Date.now() ? session : null;
}

export function clearSignupSession() {
  writeStored(SIGNUP_KEY, null);
}

/**
 * 로그인할 때 받은 회원 정보. 내 정보(GET /users/me)에 없는 소셜 종류를 설정 화면에 보여 주고,
 * 목업 API가 진짜 회원의 닉네임을 보여 줄 때 쓴다.
 */
export type StoredAccount = { id: number; nickname?: string; provider: AuthProvider };
const ACCOUNT_KEY = "pabom-account";

export function setStoredAccount(account: StoredAccount) {
  writeStored(ACCOUNT_KEY, account);
}

export function getStoredAccount() {
  return readStored<StoredAccount>(ACCOUNT_KEY);
}
