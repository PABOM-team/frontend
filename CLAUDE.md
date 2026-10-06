@AGENTS.md

# 프로젝트 규칙

- 패키지 매니저는 pnpm. 스크립트와 구조는 README.md 참고.
- 레이어: `app → features → entities → shared`. 아래 레이어에서 위 레이어를 import하지 않는다.
- `src/shared/domain`, `src/shared/api`에는 React DOM이나 `next/*`를 import하지 않는다 (네이티브 앱과 공유할 예정).
- 데이터는 백엔드 REST API(`src/shared/api/client.ts`)로만 주고받는다. Server Actions를 비즈니스 API로 쓰지 않는다.
- API 응답은 zod 스키마(`src/shared/domain`)로 검증한다. orval 생성물(`src/shared/api/generated`)은 직접 고치지 않는다.
- shadcn 컴포넌트는 `src/shared/ui`에 추가된다 (`components.json`).
- MVP 지원 종은 크레스티드 게코, 레오파드 게코 두 가지다. 볼파이톤은 제외.
- 커밋 전에 `pnpm typecheck && pnpm lint && pnpm test:run`을 통과시킨다.
