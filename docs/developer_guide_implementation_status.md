# 개발자 가이드 구현 현황

> 기준 문서: `docs/02.developer_guide.pdf` (2026-05-22)
> 작성일: 2026-05-28 / 최종 업데이트: 2026-05-28

---

## 개요

개발자 가이드는 **서비스데스크 서버**와 **서비스데스크 웹위젯** 두 컴포넌트 개발을 다룬다.
가이드는 범용 아키텍처 참고문서이고, 우리 프로젝트는 **기존 erxes 플랫폼 위에** 구현했으므로 1:1 매핑이 아닌 부분이 있다.

---

## 8. 개발 진행 순서 (체크리스트)

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

## 2. 서비스데스크 서버 — 기능 및 개발 방법

### 2.1 핵심 책임

| 책임 | 상태 | 구현 위치 |
|---|---|---|
| 5240 서버가 호출할 RPA API 제공 | ✅ 완료 | `packages/core/src/index.ts` |
| 수신한 메시지를 DB에 영구 저장 | ✅ 완료 | `packages/core/src/db/models/RpaMessages.ts` |
| 해당 사용자의 웹위젯으로 메시지 전달 (실시간 푸시) | ✅ 완료 | `packages/core/src/pubsub.ts` |
| 웹위젯과의 양방향 채팅 세션 관리 | ✅ 동등 | erxes `customers`/`conversations` 구조로 대응 |
| 채팅 입력 시 추천단어(intent) 제공 | ✅ 완료 | `packages/core/src/data/resolvers/queries/suggestions.ts` |

### 2.2 RPA API 스펙

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| `POST /chatbot/api/v1/rpa/{chatbotId}/messages` 엔드포인트 | ⚠️ 변경 | `packages/core/src/index.ts` | 경로를 `POST /api/rpa/messages` 로 구현. chatbotId는 URL path 대신 body의 `clientId`로 식별 |
| `clientId + secret` body 인증 | ✅ 완료 | `packages/core/src/middlewares/validateRpaClient.ts` | bcrypt 검증 + IP 화이트리스트 |
| `rpaCode`, `messageCode`, `message`, `loginId`, `overtime` 파싱 | ✅ 완료 | `packages/core/src/index.ts` | |
| `startTime`, `endTime`, `userType` 파싱/저장 | ✅ 완료 | `packages/core/src/index.ts`, `db/models/definitions/rpaMessages.ts` | |
| form-urlencoded Content-Type | ✅ 완료 | `express.urlencoded` 미들웨어 | |
| 응답 `{ "code": "0", "message": "OK" }` | ✅ 완료 | `packages/core/src/index.ts` | |
| rpaCode 별칭 처리 (`HR_GO_TO_WORK` → `HR_RPA_100` 등) | ✅ 완료 | `packages/core/src/index.ts` | |
| HR/근태 배치 rpaCode 7종 (`HR_RPA_090`~`HR_RPA_800`) | ✅ 완료 | `VALID_RPA_CODES` Set | |
| 결재 상시 rpaCode 4종 (`HR_APPROVAL_REQUEST` 등) | ✅ 완료 | `packages/core/src/index.ts`, `data/resolvers/queries/intent.ts` | `VALID_RPA_CODES` + intent 매핑 추가 |
| 알 수 없는 rpaCode → `code: 4001, INVALID_RPA_CODE` | ✅ 완료 | `packages/core/src/index.ts` | |
| 알 수 없는 loginId → `code: 4004, USER_NOT_FOUND` | ✅ 완료 | `packages/core/src/index.ts` | `Customers` 컬렉션 email 조회 후 반환 |
| 중복 호출 → `code: 0` + 기존 messageId 반환 | ⚠️ 부분 | `packages/core/src/index.ts` | 멱등성은 구현됨. 단, 기존 messageId 반환은 안 함 |

### 2.3 권장 모듈 구성 (예시, 참조만)

| 요구사항 | 상태 | 비고 |
|---|---|---|
| 메시지 DB 저장 | ✅ 완료 | `packages/core/src/db/models/RpaMessages.ts`, MongoDB `rpa_messages` 컬렉션 |
| chatbot_id / session 분리 모델 | ✅ 동등 | 가이드는 독립 서버 기준. erxes `customers`/`conversations` 구조가 채팅·세션 관리 담당. RPA 메시지는 이벤트 알림이므로 `rpa_messages` 컬렉션으로 의도적 분리 |
| rpaCode → 버튼 카드 intent 변환 | ✅ 완료 | `packages/core/src/data/resolvers/queries/intent.ts` |

### 2.4 데이터 모델 (예시, 참조만)

| 요구사항 | 상태 | 비고 |
|---|---|---|
| `chat_message` 테이블 | ✅ 동등 | MongoDB `rpa_messages` 컬렉션으로 대응 |
| `widget_session` 테이블 | ✅ 동등 | erxes 내부 WebSocket 세션 관리로 대응 |
| sparse unique 인덱스 (멱등성) | ✅ 완료 | `{ loginId, messageCode }` sparse unique |

### 2.5 RPA → 위젯 푸시 시퀀스 (서버 내부)

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| WebSocket/Pub-Sub 위젯 푸시 | ✅ 완료 | `packages/core/src/pubsub.ts` | `RedisPubSub` (graphql-redis-subscriptions) |
| 멀티노드 Redis fan-out | ✅ 완료 | `packages/core/src/pubsub.ts` | Redis publisher/subscriber 분리 구성 |

### 2.6 권장 기술 스택 (팀 선택지)

| 항목 | 가이드 권장 | 실제 구현 | 비고 |
|---|---|---|---|
| 언어/런타임 | Node.js (NestJS) / Spring Boot | Node.js (Express) | erxes 기존 스택 |
| DB | MySQL / PostgreSQL | MongoDB | erxes 기존 스택 |
| 실시간 채널 | WebSocket (Socket.IO 또는 native) | graphql-ws | erxes 기존 스택 |
| 메시지 브로커 | Redis Pub/Sub | Redis Pub/Sub (graphql-redis-subscriptions) | 동일 |
| 캐시 | Redis | Redis | 동일 |

---

## 3. 서비스데스크 웹위젯 — 기능 및 개발 방법

### 3.1 핵심 책임

| 책임 | 상태 | 구현 위치 |
|---|---|---|
| 5240 웹화면 우하단에 채팅 UI 렌더링 (플로팅 버튼 + 패널) | ✅ 완료 | `widgets/client/messenger/` |
| 서비스데스크 서버와 양방향 연결 유지 (WebSocket 재연결 포함) | ✅ 완료 | `widgets/client/apollo-client.ts`, `WebSocketLink.ts` |
| 서버에서 받은 메시지를 채팅창에 표시 | ✅ 완료 | `widgets/client/messenger/components/chatbot/ChatbotView.tsx` |
| 사용자 입력 시 추천단어(자동완성) 노출 | ✅ 완료 | `widgets/client/messenger/components/chatbot/Suggestions.tsx` |
| 버튼 클릭 시 5240 딥링크 URL 호출 → 위젯 영역에 팝업/iframe으로 5240 화면 표시 | ✅ 완료 | `widgets/client/messenger/components/chatbot/ChatbotIframeView.tsx` |
| 5240 로그인 정보(loginId 등) 자동 획득 | ❌ 미완료 | `widgets/client/messenger/context/RpaMessage.tsx` |

### 3.2 권장 배포 형태 (예시, 참조만)

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| `<script src="...loader.js" data-chatbot-id="...">` 한 줄 임베드 | ⚠️ 배포 시 필요 | `widgets/server/views/widget-messenger-test.ejs` | 현재 `messengerWidget.bundle.js` 직접 로드. 5240 실 임베드 시 loader.js 구현 필요 |

### 3.3 권장 디렉터리 구조 (예시, 참조만)

| 요구사항 | 상태 | 비고 |
|---|---|---|
| `ChatPanel`, `MessageList`, `MessageBubble`, `ButtonCard` | ✅ 완료 | erxes 위젯 컴포넌트 구조로 대응 |
| `Suggestions.tsx` (추천단어 노출) | ✅ 완료 | `widgets/client/messenger/components/chatbot/Suggestions.tsx` |
| `DeepLinkFrame.tsx` (5240 화면 iframe/팝업) | ✅ 완료 | `ChatbotIframeView.tsx`로 구현 |
| `useWebSocket.ts` | ✅ 동등 | erxes `WebSocketLink.ts` + `apollo-client.ts`로 대응 |
| `useAuth.ts` (5240 로그인 정보 획득) | ❌ 미완료 | 쿠키/`window.parent`에서 loginId 읽는 로직 없음 |
| `intent/suggestions.ts` | ✅ 완료 | `widgets/client/messenger/intent/suggestions.ts` |

### 3.4 화면 상태 머신 (간소화)

| 상태 | 상태 | 비고 |
|---|---|---|
| Collapsed → Connecting → Connected | ✅ 완료 | erxes 위젯 연결 라이프사이클로 대응 |
| Connected → Typing → ShowingSuggestions | ✅ 완료 | `useSuggestions` + 입력 상태 관리 |
| Connected → ShowingButtons → DeepLinkOpened | ✅ 완료 | `ChatbotView` → `ChatbotIframeView` 라우팅 |
| Disconnected → 재시도(backoff) | ✅ 완료 | 지수 backoff 1s→2s→4s→최대 30s |

### 3.5 rpaCode → UI 매핑 (예시)

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| `BUTTON_MAP` (rpaCode → 버튼 카드) | ✅ 완료 | `packages/core/src/data/resolvers/queries/intent.ts` | 서버에서 `buttons` 필드로 내려줌 |
| HR_BASE_URL 환경변수로 절대 URL 조합 | ✅ 완료 | `widgets/client/messenger/components/chatbot/getHrBaseUrl.ts` | |
| 위젯 코드에 URL 하드코딩 금지 | ✅ 완료 | — | 서버 응답 `metadata.buttons[].url` 그대로 사용 |

### 3.6 추천단어(자동완성) UX

| 요구사항 | 상태 | 구현 위치 |
|---|---|---|
| 2글자 이상 입력 시 추천단어 목록 표시 | ✅ 완료 | `widgets/client/messenger/components/chatbot/Suggestions.tsx` |
| 추천단어 클릭 → 버튼 카드 채팅창에 추가 | ✅ 완료 | `ChatbotView.tsx` `handleSuggestionSelect` |
| 서버 API로 동적 조회 | ✅ 완료 | `packages/core/src/data/resolvers/queries/suggestions.ts` |

### 3.7 딥링크 화면 띄우기

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| 위젯 내 iframe으로 5240 화면 표시 | ✅ 완료 | `ChatbotIframeView.tsx` | iframe 우선 |
| iframe 차단(CSP) 시 `window.open` 팝업 fallback | ✅ 완료 | `ChatbotIframeView.tsx` | `onError` 시 "새 창으로 열기" 버튼 표시 |

### 3.8 로그인 정보 획득

| 시나리오 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| 위젯이 5240과 동일 origin으로 서빙 → `document.cookie` 직접 접근 | ❌ 미완료 | — | 5240 운영팀과 쿠키 키 이름 협의 후 구현 필요 |
| 위젯이 별도 origin iframe → `postMessage`로 loginId 전달 | ❌ 미완료 | — | 동일 |
| localStorage에 저장된 이전 이메일 재사용 | ✅ 완료 | `widgets/client/messenger/context/RpaMessage.tsx` | 초회 방문 시 수동 입력 후 저장 |

### 3.9 버튼 클릭 동작 흐름 (전체 정리)

| 요구사항 | 상태 | 비고 |
|---|---|---|
| RPA 메시지 동반 버튼 (rpaCode → 버튼 카드 렌더) | ✅ 완료 | 서버가 `buttons` 필드로 내려줌 |
| 추천단어 선택 후 버튼 (키워드 → 버튼 카드 추가) | ✅ 완료 | `handleSuggestionSelect` |
| 버튼 클릭 → 딥링크 호출 | ✅ 완료 | `setChatbotMenu` + `setRoute("chatbot-iframe")` |

---

## 4. 서버 ↔ 웹위젯 통신 구조

### 4.1 통신 채널 선택: WebSocket 권장

| 요구사항 | 상태 | 구현 위치 |
|---|---|---|
| WebSocket 양방향 통신 | ✅ 완료 | `widgets/client/WebSocketLink.ts` (`graphql-ws` 기반) |

### 4.2 연결 라이프사이클

| 요구사항 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| 위젯 인증 + 단기 토큰 발급 | ✅ 동등 | — | erxes `connectToMessenger` GraphQL mutation이 동일 역할 수행 |
| WebSocket 연결 + session 등록 | ✅ 완료 | `widgets/client/apollo-client.ts` | |
| 재연결 후 미수신 메시지 복원 (history fetch) | ✅ 완료 | `widgets/client/messenger/context/RpaMessage.tsx` | GraphQL `rpaMessages` 쿼리, `fetchPolicy: 'network-only'` |

### 4.3 메시지 프로토콜 (예시)

| 요구사항 | 상태 | 비고 |
|---|---|---|
| `{ type, payload }` WebSocket 메시지 프로토콜 | ✅ 동등 | 가이드의 커스텀 타입은 직접 WS 서버 구현 시 필요한 설계. erxes는 GraphQL over WebSocket으로 동일 기능 커버 |

### 4.4 미수신 메시지 처리 (오프라인 보강)

| 요구사항 | 상태 | 구현 위치 |
|---|---|---|
| 오프라인 중 도착한 메시지 재접속 시 복원 | ✅ 완료 | `RpaMessage.tsx` `loadHistory` + `fetchPolicy: 'network-only'` |
| E2E 검증 | ✅ 완료 | `e2e/tests/rpa-offline.spec.ts`, `rpa-reconnect.spec.ts` |

### 4.5 멀티노드 푸시 구조

| 요구사항 | 상태 | 구현 위치 |
|---|---|---|
| Redis Pub/Sub 노드 간 fan-out | ✅ 완료 | `packages/core/src/pubsub.ts` (publisher/subscriber 분리) |
| ping/pong 하트비트 | ✅ 동등 | `graphql-ws` 라이브러리 내부 처리 |

---

## 5. 인증·보안 (반드시 챙길 것)

| 항목 | 상태 | 구현 위치 | 비고 |
|---|---|---|---|
| RPA API 인증 (clientId + secret + IP allowlist) | ✅ 완료 | `packages/core/src/middlewares/validateRpaClient.ts` | bcrypt + `whiteListedIps` 검증 |
| 위젯 WebSocket 인증 (짧은 TTL JWT) | ✅ 동등 | — | erxes `connectToMessenger` mutation으로 대응 |
| CORS | ✅ 완료 | `widgets/server/index.ts` | `cors()` 미들웨어 |
| CSP / X-Frame-Options (5240 frame-ancestors 허용) | ❌ 미구현 | — | 5240 운영팀에 서비스데스크 도메인 허용 요청 필요 (운영 협의) |
| XSS 방지 (`dangerouslySetInnerHTML` 금지) | ✅ 완료 | — | React 기본 이스케이프 사용 |
| 민감정보 로깅 금지 | ✅ 완료 | — | 알 수 없는 rpaCode는 4001 반환, warn 로그 제거 |
| HTTPS 강제 | ❌ 미완료 | — | 인프라 배포 시 적용 (코드 작업 아님) |

---

## 6. 에러 처리 / 운영 시나리오

### 6.1 RPA API 측

| 케이스 | 상태 | 비고 |
|---|---|---|
| 잘못된 rpaCode → `code: 4001, INVALID_RPA_CODE` | ✅ 완료 | |
| 알 수 없는 loginId → `code: 4004, USER_NOT_FOUND` | ✅ 완료 | |
| 중복 호출(idempotency) → `code: 0`, 사이드이펙트 없음 | ✅ 완료 | |
| 내부 오류 → `code: 5000` | ✅ 완료 | `INTERNAL_ERROR` 반환 |

### 6.2 웹위젯 측

| 케이스 | 상태 | 비고 |
|---|---|---|
| WebSocket 끊김 → 지수 backoff 재연결 | ✅ 완료 | 1s→2s→4s→최대 30s |
| 재연결 성공 시 history fetch로 누락 메시지 복원 | ✅ 완료 | |
| 딥링크 호출 후 5240 화면 401 → 사용자 안내 | ❌ 미구현 | — |

---

## 7. 테스트 전략

| 레벨 | 도구 | 필수 케이스 | 상태 |
|---|---|---|---|
| 단위 | Jest | rpaCode → ButtonCard 변환, intent 매핑, 멱등성, 인증 미들웨어 | ✅ 완료 (`intent.test.ts`, `validateRpaClient.test.ts`, `RpaMessages.test.ts`) |
| E2E (위젯) | Playwright | 오프라인 메시지 복원, 멱등성, WebSocket 재연결 | ✅ 완료 (`e2e/tests/` 3종) |
| 통합 | Testcontainers | RPA POST → DB → Redis publish | ❌ 미작성 |
| E2E (서버) | Postman/Newman | 5240 ↔ SD RPA API 계약 검증 | ❌ 미작성 |
| 부하 | k6 / Artillery | WebSocket 1만 동시 연결, RPA POST burst | ❌ 미작성 |

---

## 미구현 항목 요약

### 코드 작업 필요

| 항목 | 우선순위 | 관련 섹션 | 내용 |
|---|---|---|---|
| loginId 자동 획득 (쿠키 파싱) | 상 | §3.8 | 5240 운영팀과 쿠키 키 이름 협의 후 `document.cookie` / `window.parent`에서 loginId 읽는 로직 구현 |
| loader.js 구현 | 중 | §3.2 | 5240 페이지 임베드용. `data-chatbot-id` attribute 읽어 위젯 동적 주입 |
| 딥링크 401 사용자 안내 | 하 | §6.2 | 5240 화면 로그인 만료 시 재로그인 안내 메시지 |
| 통합/부하 테스트 | 하 | §7 | 5240 staging 연동 후 작성 |

### 운영/인프라 협의 사항 (코드 작업 아님)

| 항목 | 관련 섹션 | 내용 |
|---|---|---|
| HTTPS 배포 | §5 | Nginx TLS 설정 |
| 5240 `frame-ancestors` 허용 | §5, §3.7 | 5240 운영팀에 서비스데스크 도메인 화이트리스트 요청 |
| 5240 쿠키 키 이름 확인 | §3.8 | loginId 자동 획득 구현 전제 조건 |
| chatbotId URL path 구조 합의 | §2.2 | 현재 `/api/rpa/messages` vs 문서 `/chatbot/api/v1/rpa/{chatbotId}/messages` |
| 5240 staging 연동 시험 | §8 | IP 목록 수신 후 화이트리스트 등록, 실환경 E2E 검증 |
