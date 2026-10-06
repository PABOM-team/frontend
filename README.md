# frontend

파봄 프론트엔드. 크레스티드 게코·레오파드 게코 관리 일정과 기록을 다루는 모바일 우선 웹앱(PWA)이다.

## 시작하기

Node 24, pnpm 11 기준.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`NEXT_PUBLIC_API_MOCKING=enabled`이면 백엔드 없이 MSW 목 응답으로 동작한다 (`src/mocks/handlers.ts`).

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
  app/        라우팅, 레이아웃, 프로바이더  — (tabs)/home · pets · settings, share/[token]
  features/   사용자 행동 단위             — push-notification, (예정) register-pet, care-transfer …
  entities/   도메인 객체 + 조회/표시      — pet, (예정) routine, record
  shared/     어디서나 쓰는 것             — ui, api, domain, config, lib
  mocks/      MSW 핸들러
```

## 앱 전환 대비 규칙

나중에 Expo(React Native)나 Capacitor로 옮길 수 있게 지금부터 지킨다.

1. **데이터는 항상 백엔드 REST API로.** Server Actions와 Route Handler를 비즈니스 API로 쓰지 않는다.
2. **`src/shared/domain`, `src/shared/api`는 React DOM과 Next에 의존하지 않는다.** 나중에 모노레포 `packages/`로 그대로 옮긴다.
3. 주요 화면(홈, 개체)은 클라이언트에서 데이터를 가져온다(TanStack Query). SSR에 의존하는 로직을 늘리지 않는다.
