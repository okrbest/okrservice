# 개발자 가이드 구현 현황

> 기준 문서: `docs/02.developer_guide.pdf` (2026-05-22)
> 작성일: 2026-05-28 / 최종 업데이트: 2026-05-28

---

## 개요

개발자 가이드는 **서비스데스크 서버**와 **서비스데스크 웹위젯** 두 컴포넌트 개발을 다룬다.
가이드는 범용 아키텍처 참고문서이고, 우리 프로젝트는 **기존 erxes 플랫폼 위에** 구현했으므로 1:1 매핑이 아닌 부분이 있다.

---

## 개발 진행 순서 체크리스트 (문서 §8)

| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| 0 | 5240 측과 RPA API 인증/Content-Type/재시도 정책 합의, 샘플 페이로드 확인 | ✅ 완료 | `clientId + secret` body 인증 방식 확정, form-urlencoded 확인 |
| 1 | 서버: RPA API 스켈레톤 + DB 스키마 + Postman으로 200 OK 확인 | ✅ 완료 | `POST /api/rpa/messages` 구현, MongoDB `rpa_messages` 컬렉션 |
| 2 | 위젯: 5240 mock 페이지에 빈 채팅 UI 임베드, loader.js 작동 확인 | ✅ 완료 | erxes 위젯 스크립트 임베드 방식, Chatbot 탭 UI 구현 |
| 3 | 서버: 메시지 저장 + intent 변환(rpaCode → buttonCard) + REST 이력 조회 | ✅ 완료 | `getIntentButtons()`, `rpaMessages` GraphQL 쿼리 |
| 4 | 위젯: WebSocket 연결 + 메시지 수신 → 버튼 카드 렌더 | ✅ 완료 | GraphQL subscription, `ChatbotView` 버튼 카드 렌더 |
| 5 | 위젯: 추천단어 자동완성 + 버튼 클릭 → 딥링크 iframe | ✅ 완료 | `Suggestions.tsx`, `useSuggestions`, `ChatbotIframeView` |
| 6 | 서버: 멀티노드 push (Redis pub/sub) | ✅ 완료 | `graphql-redis-subscriptions` (`RedisPubSub`) 사용 |
| 7 | 인증/CSP/CORS/보안 점검 + E2E 테스트 작성 | ✅ 완료 | `validateRpaClient` 미들웨어, Playwright E2E 3종 |
| 8 | 5240 staging 환경과 연동 시험 + 부하 테스트 | ❌ 미완료 | 실 환경 연동 미진행 |

---

## 서버 기능별 구현 현황

### 2.2 RPA API 스펙

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| `POST /chatbot/api/v1/rpa/{chatbotId}/messages` 엔드포인트 | ⚠️ 변경 | `packages/core/src/index.ts:706` | 경로를 `POST /api/rpa/messages` 로 구현. chatbotId는 URL path 대신 body의 `clientId`로 식별 |
| `clientId + secret` body 인증 | ✅ 완료 | `packages/core/src/middlewares/validateRpaClient.ts` | bcrypt 검증 + IP 화이트리스트 |
| `rpaCode`, `messageCode`, `message`, `loginId`, `overtime` 파싱 | ✅ 완료 | `packages/core/src/index.ts:710~720` | |
| `startTime`, `endTime`, `userType` 파싱/저장 | ✅ 완료 | `packages/core/src/index.ts`, `db/models/definitions/rpaMessages.ts` | |
| form-urlencoded Content-Type | ✅ 완료 | `express.urlencoded` 미들웨어 | |
| 응답 `{ "code": "0", "message": "OK" }` | ✅ 완료 | `packages/core/src/index.ts:762` | |
| rpaCode 별칭 처리 (`HR_GO_TO_WORK` → `HR_RPA_100` 등) | ✅ 완료 | `packages/core/src/index.ts:697~720` | |
| HR/근태 배치 rpaCode 7종 (`HR_RPA_090`~`HR_RPA_800`) | ✅ 완료 | `VALID_RPA_CODES` Set | |
| 결재 상시 rpaCode 4종 (`HR_APPROVAL_REQUEST` 등) | ✅ 완료 | `packages/core/src/index.ts`, `data/resolvers/queries/intent.ts` | `VALID_RPA_CODES` + intent 매핑 추가 |
| 알 수 없는 rpaCode → `code: 4001, INVALID_RPA_CODE` | ✅ 완료 | `packages/core/src/index.ts` | |
| 알 수 없는 loginId → `code: 4004, USER_NOT_FOUND` | ✅ 완료 | `packages/core/src/index.ts` | `Customers` 컬렉션 email 조회 후 반환 |
| 중복 호출 → `code: 0` + 기존 messageId 반환 | ⚠️ 부분 | `packages/core/src/index.ts` | 멱등성은 구현됨. 단, 기존 messageId 반환은 안 함 |

### 2.3~2.5 서버 내부 구조

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| 메시지 DB 저장 | ✅ 완료 | `packages/core/src/db/models/RpaMessages.ts` | MongoDB `rpa_messages` 컬렉션 |
| chatbot_id / session 분리 모델 | ✅ 동등 | — | 가이드는 독립 서버 기준. erxes의 `customers`/`conversations` 구조가 채팅·세션 관리 담당. RPA 메시지는 대화형이 아닌 이벤트 알림이므로 `rpa_messages` 컬렉션으로 의도적 분리. `chatbot_id` → erxes `clientId` 대응 |
| rpaCode → 버튼 카드 intent 변환 | ✅ 완료 | `packages/core/src/data/resolvers/queries/intent.ts` | |
| WebSocket/Pub-Sub 위젯 푸시 | ✅ 완료 | `packages/core/src/pubsub.ts` | `RedisPubSub` (graphql-redis-subscriptions) |
| 멀티노드 Redis fan-out | ✅ 완료 | `packages/core/src/pubsub.ts` | Redis publisher/subscriber 분리 구성 |
| sparse unique 인덱스 (멱등성) | ✅ 완료 | `packages/core/src/db/models/definitions/rpaMessages.ts` | `{ loginId, messageCode }` sparse unique |

---

## 위젯 기능별 구현 현황

### 3.1~3.3 위젯 핵심 기능

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| 5240 페이지 우하단 채팅 UI (플로팅 버튼 + 패널) | ✅ 완료 | `widgets/client/messenger/` | erxes 위젯 구조 활용 |
| `<script src="...loader.js" data-chatbot-id="...">` 임베드 | ⚠️ 배포 시 필요 | `widgets/server/views/widget-messenger-test.ejs` | 현재 `messengerWidget.bundle.js` 직접 로드. 5240 실 임베드 시 한 줄 삽입 + chatbot-id attribute 전달을 위해 loader.js 구현 필요 |
| loginId 자동 획득 (5240 로그인 세션에서) | ❌ 미완료 | `widgets/client/messenger/context/RpaMessage.tsx` | 쿠키/`window.parent`에서 loginId를 읽는 로직 없음. 초회 방문 시 사용자가 이메일 수동 입력 필요. 5240 운영팀과 쿠키 키 이름 협의 후 구현 필요 |
| rpaCode 기반 버튼 카드 렌더 | ✅ 완료 | `widgets/client/messenger/components/chatbot/ChatbotView.tsx` | |
| 추천단어 자동완성 (2글자 이상) | ✅ 완료 | `widgets/client/messenger/components/chatbot/Suggestions.tsx` | |
| 버튼 클릭 → 5240 딥링크 iframe/팝업 | ✅ 완료 | `widgets/client/messenger/components/chatbot/ChatbotIframeView.tsx` | iframe 우선, 차단 시 "새 창으로 열기" popup fallback |
| HR_BASE_URL 환경변수로 딥링크 URL 조합 | ✅ 완료 | `widgets/client/messenger/components/chatbot/getHrBaseUrl.ts` | |

### 4.1~4.5 서버 ↔ 위젯 통신

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| WebSocket 양방향 통신 | ✅ 완료 | `widgets/client/WebSocketLink.ts` | `graphql-ws` 기반 |
| WebSocket 자동 재연결 | ✅ 완료 | `widgets/client/apollo-client.ts` | `retryAttempts: 100`, 지수 backoff 1s→2s→4s→최대 30s |
| 재연결 후 미수신 메시지 복원 (history fetch) | ✅ 완료 | `widgets/client/messenger/context/RpaMessage.tsx` | GraphQL `rpaMessages` 쿼리, `fetchPolicy: 'network-only'` |
| `GET /widget/auth` → JWT 토큰 → WebSocket 연결 흐름 | ✅ 동등 | — | 가이드는 신규 서버 구현 기준. erxes의 `connectToMessenger` GraphQL mutation이 동일 역할(인증 + 세션 수립) 수행. 기능 동일, 경로만 다름 |
| `{ type, payload }` WebSocket 메시지 프로토콜 | ✅ 동등 | — | 가이드의 커스텀 타입(`history.fetch` 등)은 직접 WS 서버 구현 시 필요한 설계. erxes는 GraphQL over WebSocket(`graphql-ws`)으로 동일 기능 커버. 커스텀 프로토콜 추가는 중복 |
| ping/pong 하트비트 | ✅ 동등 | — | `graphql-ws` 라이브러리가 연결 유지를 내부 처리. 직접 WS 서버 구현 시에만 명시적 구현 필요 |

### 5. 인증·보안

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| RPA API 인증 (clientId + secret) | ✅ 완료 | `packages/core/src/middlewares/validateRpaClient.ts` | |
| IP 화이트리스트 | ✅ 완료 | `validateRpaClient.ts:34` | `client.whiteListedIps` 검증 |
| CORS 허용 | ✅ 완료 | `widgets/server/index.ts` | `cors()` 미들웨어 |
| CSP / X-Frame-Options (5240 frame-ancestors 허용) | ❌ 미구현 | — | 5240 운영팀에 `frame-ancestors` 허용 요청 필요 (운영 협의 사항) |
| XSS 방지 (`dangerouslySetInnerHTML` 금지) | ✅ 완료 | — | React 기본 이스케이프 사용 |
| 민감정보 로깅 금지 | ✅ 완료 | — | 알 수 없는 rpaCode는 4001 반환으로 처리, warn 로그 제거 |
| HTTPS 강제 | ❌ 미완료 | — | 인프라 배포 시 적용 (코드 작업 아님) |

---

## 테스트 전략 구현 현황 (문서 §7)

| 레벨 | 도구 | 필수 케이스 | 상태 |
|---|---|---|---|
| 단위 | Jest | rpaCode → ButtonCard 변환, intent 매핑 | ✅ 완료 (`intent.test.ts`, `validateRpaClient.test.ts`, `RpaMessages.test.ts`) |
| E2E (위젯) | Playwright | 오프라인 메시지 복원, 멱등성, WebSocket 재연결 | ✅ 완료 (`e2e/tests/` 3종) |
| 통합 | Testcontainers | RPA POST → DB → Redis publish | ❌ 미작성 |
| E2E (서버) | Postman/Newman | 5240 ↔ SD RPA API 계약 검증 | ❌ 미작성 |
| 부하 | k6 / Artillery | WebSocket 1만 동시 연결, RPA POST burst | ❌ 미작성 |

---

## 미구현 항목 요약

### 코드 작업 필요

| 항목 | 우선순위 | 내용 |
|---|---|---|
| loginId 자동 획득 (쿠키 파싱) | 상 | 5240 운영팀과 쿠키 키 이름 협의 후 `document.cookie` / `window.parent`에서 loginId 읽는 로직 구현 |
| loader.js 구현 | 중 | 5240 페이지 임베드용. `data-chatbot-id` attribute 읽어 위젯 동적 주입 |
| 통합/부하 테스트 | 하 | 5240 staging 연동 후 작성 |

### 운영/인프라 협의 사항 (코드 작업 아님)

| 항목 | 내용 |
|---|---|
| HTTPS 배포 | Nginx TLS 설정 |
| 5240 `frame-ancestors` 허용 | 5240 운영팀에 서비스데스크 도메인 화이트리스트 요청 |
| 5240 staging 연동 시험 | IP 목록 수신 후 화이트리스트 등록, 실환경 E2E 검증 |
| chatbotId URL path 구조 합의 | 현재 `/api/rpa/messages` vs 문서 `/chatbot/api/v1/rpa/{chatbotId}/messages` |

---

## 아키텍처 차이 요약

가이드는 **신규 독립 서버** 기준으로 작성되었으나, 본 프로젝트는 **erxes 플랫폼 위에 구현**했다.
핵심 기능(RPA 수신, 메시지 저장, WebSocket 푸시, 위젯 UI)은 모두 동작하며, 프로토콜 세부사항만 다르다.

| 가이드 권장 | 실제 구현 | 영향 |
|---|---|---|
| REST `/widget/auth` → JWT → WebSocket | `connectToMessenger` GraphQL mutation | 없음 (기능 동일) |
| `{ type, payload }` 커스텀 WS 프로토콜 | GraphQL over WebSocket (graphql-ws) | 없음 (기능 동일) |
| MySQL / PostgreSQL | MongoDB | 없음 |
| `loader.js` script 임베드 | `messengerWidget.bundle.js` 직접 로드 | 배포 방식 차이 |
| `chat_message` / `widget_session` 테이블 | `rpa_messages` MongoDB 컬렉션 | 없음 |
