# frontend

파봄 프론트엔드. 크레스티드 게코·레오파드 게코 관리 일정과 기록을 다루는 모바일 우선 웹앱(PWA)이다.

## 시작하기

Node 24, pnpm 11 기준.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

기본 설정은 **로그인·약관 동의만 개발 서버(`dev.api.pabom.app`)로, 나머지는 MSW 목업**이다.

| 변수                       | 뜻                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `API_PROXY_TARGET`         | 백엔드 주소. 브라우저는 같은 주소의 `/api/v1`을 부르고 Next가 여기로 넘긴다 (서버 전용) |
| `NEXT_PUBLIC_API_BASE_URL` | 비우면 같은 주소(프록시). 백엔드를 직접 부를 때만 넣는다                                |
| `NEXT_PUBLIC_API_MOCKING`  | `enabled`면 백엔드에 아직 없는 API를 MSW가 답한다 (`src/mocks/handlers.ts`)             |
| `NEXT_PUBLIC_API_LIVE`     | 목업 모드에서도 진짜로 보낼 API 묶음. `auth` = 로그인·약관 동의. 비우면 로그인도 목업   |

- 목업 로그인(`NEXT_PUBLIC_API_LIVE` 비움): **카카오 = 기록이 쌓인 기존 회원(유나)**, **구글 = 처음 가입하는 회원**(약관 → 개체 등록 흐름)
- 목업 데이터는 브라우저 localStorage(`pabom-mock-db`)에 저장된다. 설정 화면 맨 아래 '목업 데이터 처음으로 되돌리기'로 초기화
- 진짜로 로그인한 회원은 목업에서 빈 계정으로 시작한다 (access 토큰의 회원 번호로 목업 계정을 만든다)
- 인계 카드 예시: `/share/DEMO2026`
- 화면 흐름과 API 연결표: [docs/screen-flow.md](docs/screen-flow.md)

## 로그인 (백엔드 연동)

1. 버튼을 누르면 `GET /auth/{provider}/login-url`로 카카오·구글 주소를 받는다. 이때 state 쿠키가 같이 온다
2. 카카오·구글이 백엔드에 설정된 Redirect URI로 돌려보낸다
3. Redirect URI가 이 앱의 `/api/v1/auth/{provider}/callback`이면 `src/app/api/v1/auth/[provider]/callback/route.ts`가
   백엔드 콜백을 부르고(refresh 쿠키 저장) `/auth/callback/{provider}`로 결과를 넘긴다
4. 기존 회원은 refresh 쿠키로 access 토큰을 받아 홈으로, 새 회원은 가입 토큰으로 약관 동의(`POST /me/agreements`) 뒤 개체 등록으로

브라우저가 백엔드를 직접 부르지 않고 Next 프록시(`src/app/api/v1`)를 거치는 까닭: 백엔드 CORS가 배포 웹 주소만
허용하고, refresh·state 쿠키가 `SameSite=Lax`라 다른 사이트에서는 저장되지 않는다. 프록시는 같은 사이트 요청만 넘긴다.

**백엔드 설정이 필요하다.** 지금 dev 서버의 Redirect URI는 `https://dev.api.pabom.app/api/v1/auth/{provider}/callback`이라
카카오·구글 로그인 뒤 백엔드 JSON 화면에서 멈춘다. 로컬에서 끝까지 하려면 dev 서버의 `KAKAO_REDIRECT_URI`·`GOOGLE_REDIRECT_URI`를
`http://localhost:3000/api/v1/auth/{provider}/callback`으로 바꾸고 카카오 디벨로퍼스·Google Cloud 콘솔에 같은 주소를 등록해야 한다.

## 스크립트

| 명령                | 설명                                                    |
| ------------------- | ------------------------------------------------------- |
| `pnpm dev`          | 개발 서버 (서비스 워커 비활성, MSW 사용 가능)           |
| `pnpm dev:https`    | 로컬 HTTPS. 웹 푸시 테스트용                            |
| `pnpm build`        | `next build` 후 `serwist build`로 `public/sw.js` 생성   |
| `pnpm typecheck`    | 라우트 타입 생성 + `tsc`                                |
| `pnpm lint`         | ESLint                                                  |
| `pnpm format`       | Prettier (Tailwind 클래스 정렬 포함)                    |
| `pnpm test`         | Vitest (watch). CI에서는 `pnpm test:run`                |
| `pnpm test:e2e`     | Playwright (모바일 Chrome / Safari 뷰포트)              |
| `pnpm api:generate` | OpenAPI → 타입·TanStack Query 훅 생성 (`OPENAPI_URL=…`) |

## 스택

- **Next.js 16** (App Router, Turbopack) + TypeScript strict
- **Tailwind CSS v4 + shadcn/ui** (Radix). 컴포넌트는 `pnpm dlx shadcn@latest add <name>` → `src/shared/ui`
- **TanStack Query** (서버 상태) / **Zustand** (필요할 때만 클라이언트 상태)
- **React Hook Form + Zod** (폼, 스키마 검증)
- **ky** (HTTP) + **orval** (OpenAPI 코드 생성) + **MSW** (API 목)
- **date-fns** (날짜, 루틴 주기 계산)
- **Serwist** (서비스 워커, 오프라인, 웹 푸시)
- **Vitest + Testing Library**, **Playwright**
- 폰트: Pretendard Variable (`next/font/local`)

## 폴더 구조

FSD(Feature-Sliced Design)를 간소화해서 쓴다. 위 레이어는 아래 레이어만 import할 수 있다.

```
src/
  app/        라우팅, 레이아웃, 화면 조립  — (public) 로그인 전, (app) 로그인 후, (app)/(tabs) 오늘·개체·설정
  features/   사용자 행동 단위             — auth, pet-form, task-actions, record-editor, routine-editor, pet-lifecycle, handover
  entities/   도메인 객체 + 조회/표시      — pet, routine, record, task, species, session, handover
  shared/     어디서나 쓰는 것             — ui, api(client·endpoints·query-keys), domain(zod), config, lib
  mocks/      MSW 핸들러 + 목업 DB(db.ts) + 업무 규칙 흉내(logic.ts)
```

## 앱 전환 대비 규칙

나중에 Expo(React Native)나 Capacitor로 옮길 수 있게 지금부터 지킨다.

1. **데이터는 항상 백엔드 REST API로.** Server Actions와 Route Handler를 비즈니스 API로 쓰지 않는다.
   `src/app/api/v1`은 요청을 백엔드로 그대로 넘기는 프록시일 뿐이다.
2. **`src/shared/domain`, `src/shared/api`는 React DOM과 Next에 의존하지 않는다.** 나중에 모노레포 `packages/`로 그대로 옮긴다.
3. 주요 화면(홈, 개체)은 클라이언트에서 데이터를 가져온다(TanStack Query). SSR에 의존하는 로직을 늘리지 않는다.

## 화면 틀

모바일 웹앱이라 화면 틀(`src/shared/ui/app-shell.tsx`)이 최대 430px로 고정된다. 768px 이상에서는 가운데 정렬,
1024px 이상에서는 왼쪽에 파봄 소개와 QR을 띄운다. 시트·창·토스트는 화면 틀 안에서만 뜬다(`PortalContainerContext`).
