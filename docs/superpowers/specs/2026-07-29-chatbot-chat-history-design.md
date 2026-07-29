# 챗봇 새 채팅 / 채팅 이력 기능 설계

## 배경 및 문제

메신저 위젯의 챗봇 탭(`widgets/client/messenger/components/chatbot/ChatbotView.tsx`)은 AI 대화(`aiMessages`)를 고객별 고정 `sessionId` 하나에 계속 누적한다. 대화가 길어질수록:

- 화면에 이력이 무한정 쌓여 새 주제로 넘어가기 어렵다.
- 이전 대화를 다시 보거나 여러 대화 주제를 오가며 이용할 방법이 없다 (Claude Code의 대화 전환 UX와 대비).

teamplgpt(AnythingLLM 기반 임베드 API)는 `sessionId`를 키로 대화 맥락을 **서버 측에서 자체 보관**한다 (`widgets/server/index.ts`의 `/ai-chat/stream`은 상태 없는 프록시일 뿐, 실제 대화 기억은 teamplgpt DB에 있음). 별도의 세션 초기화/삭제 API는 존재하지 않는다. 따라서 "새 대화"는 **클라이언트에서 새 UUID `sessionId`를 발급**하는 것으로 충분하다 — teamplgpt 입장에서는 한 번도 본 적 없는 세션이므로 자연히 대화 맥락이 없다.

## 범위

- `widgets/` (메신저 위젯) 클라이언트 코드만 변경. 백엔드/서버(`widgets/server`, teamplgpt) 변경 없음.
- 브라우저 `localStorage`만 사용 (기존과 동일한 저장 범위). 서버 DB에 대화 목록을 별도로 저장하지 않는다.

## 요구사항 요약 (사용자 확정)

1. **새 채팅 버튼**: 누르면 기존 대화는 이력 목록에 남고, 화면은 빈 새 대화로 초기화된다.
2. **이력 목록**: 각 항목은 "첫 메시지 텍스트 + 날짜/시간"으로 표시.
3. **위젯을 닫았다가 다시 열면**: 직전 대화를 이어보는 게 아니라 **항상 새 대화로 시작**한다. 단, 챗봇 탭 안에서 다른 탭(FAQ/티켓 등)으로 갔다가 돌아오는 것은 "닫기"가 아니므로 대화가 유지된다.
4. **이력 삭제**: 목록에서 개별 대화만 삭제 가능 (전체 삭제 없음).

## 데이터 모델 (전부 `localStorage`)

기존에 `ChatbotView.tsx`에 인라인되어 있던 세션/저장 로직을 새 모듈 `widgets/client/messenger/components/chatbot/chatHistory.ts`로 추출한다 (순수 함수 위주 — 단위 테스트 용이).

| localStorage 키 | 내용 | 비고 |
|---|---|---|
| `erxes_ai_sid_${customerId}` / `erxes_ai_anon_sid` | **활성 세션 포인터** (기존 키 재사용) | 값이 바뀔 수 있는 포인터로 의미 변경 (새 채팅/이력 선택/위젯 재오픈 시 교체) |
| `erxes_ai_chat_${sessionId}` | 한 대화의 메시지 배열 | 기존과 동일 포맷, 변경 없음 |
| `erxes_ai_chat_index_${customerId\|\|'anon'}` | **신규** — 대화 목록 인덱스: `{ id: string; firstMessage: string; updatedAt: number }[]`, `updatedAt` 내림차순, 최대 50개 캡 | 메시지가 1개 이상 있는 대화만 등록 |

`chatHistory.ts`가 제공하는 함수 (모두 `customerKey: string` — customerId 또는 `'anon'` — 을 받음):

- `getActiveSessionId(customerKey)` — 포인터 읽기, 없으면 새로 생성해 저장 후 반환 (기존 `ChatbotView`의 UUID 생성/검증 로직 이동).
- `startNewSession(customerKey)` — 새 UUID를 생성해 포인터에 저장하고 반환. (새 채팅 버튼, 위젯 재오픈에서 사용)
- `setActiveSessionId(customerKey, id)` — 특정 대화로 포인터 교체. (이력 목록에서 항목 클릭 시 사용)
- `loadIndex(customerKey)` — 인덱스 배열 로드 (updatedAt 내림차순 정렬해서 반환).
- `upsertIndexEntry(customerKey, { id, firstMessage, updatedAt })` — 메시지 저장 시 인덱스 갱신, 50개 초과 시 가장 오래된 항목부터 제거.
- `deleteIndexEntry(customerKey, id)` — 인덱스에서 항목 제거 + 해당 `erxes_ai_chat_${id}` 메시지 스토리지도 함께 삭제.
- `loadMessages(sessionId)` / `saveMessages(sessionId, messages)` — 기존 메시지 저장/복원 로직 이동.

모든 함수는 기존 코드와 동일하게 try/catch로 감싸 `localStorage` 접근 실패(용량 초과, 프라이빗 모드 등)를 무시하고 빈 값/no-op으로 대체한다.

## UI 변경

### 1. 챗봇 탭 헤더 (`ChatbotView.tsx`)

`Container`의 `title` 슬롯에 아이콘 버튼 2개를 좌측에 추가한다 (기존 줌 버튼은 `marginLeft: auto`로 우측 유지):

- **새 채팅** (연필/plus 아이콘): 현재 대화(`aiMessages`)가 비어 있으면 아무 동작 안 함(빈 대화가 목록에 쌓이는 것 방지). 메시지가 있으면 `startNewSession()` 호출 → `sessionId` state 갱신 → `aiMessages`를 빈 배열로 리셋.
- **이력** (시계/리스트 아이콘): `setRoute("chatbot-history")` 호출.

`ChatbotView`는 `sessionId`를 더 이상 `useMemo`로 마운트 시 한 번만 계산하지 않고, `useState`로 보관하며 `getActiveSessionId()`로 초기화한다 (새 채팅 버튼이 값을 바꿀 수 있어야 하므로). `aiMessages` 복원 로직도 `sessionId`가 바뀔 때마다 다시 로드하도록 `useEffect([sessionId])`로 변경한다 (이력 화면에서 돌아왔을 때는 항상 리마운트되므로 실질적으로는 마운트 시 1회 실행과 동일하지만, 로직을 sessionId에 의존하도록 명확히 한다).

### 2. 신규 `ChatbotHistoryView.tsx`

- `Container`에 `backRoute="chatbot"`, `title="채팅 이력"`.
- 본문: `loadIndex()` 결과를 리스트로 렌더링. 각 행: 첫 메시지 텍스트(최대 약 40자 말줄임) + 날짜/시간(`formatMessageTime` 유사 포맷 재사용/확장), 우측에 삭제(🗑) 아이콘.
- 행 클릭(삭제 아이콘 제외): `setActiveSessionId(customerKey, item.id)` → `setRoute("chatbot")`. `ChatbotView`가 새로 마운트되며 해당 세션의 메시지를 로드한다.
- 삭제 아이콘 클릭: `deleteIndexEntry(customerKey, item.id)`로 목록에서 제거. 삭제 대상이 현재 활성 세션이었다면 `startNewSession()`도 함께 호출해 활성 포인터를 새 대화로 교체한다 (삭제된 대화에 계속 "머물러" 있을 수 없으므로).
- 목록이 비어 있으면 "아직 대화 이력이 없어요" 안내 문구만 표시.

### 3. 라우팅

`widgets/client/messenger/components/Messenger.tsx`의 `renderSwitch`에 `case "chatbot-history": return <ChatbotHistoryView />;` 추가 (기존 `"chatbot-iframe"` 케이스와 동일한 패턴).

## 위젯 열기/닫기 동작

조사 결과, 메신저 위젯은 다음과 같이 동작한다:

- `widgets/client/messenger/components/App.tsx`: `isMessengerVisible`이 `false`가 되면 `MessengerContainer`(→ `Messenger` → `ChatbotView` 포함) 전체가 **언마운트**된다. `Router`/`Conversation` 컨텍스트 프로바이더 자체는 언마운트되지 않고 계속 살아있다.
- `widgets/client/messenger/context/Conversation.tsx`의 `toggle(isVisible?)` (라인 223)가 열기/닫기의 유일한 진입점이다 (런처 클릭, 모바일 닫기 버튼, 부모 창 postMessage 등 모두 이 함수를 거친다).

구현:

- **닫기**: 별도 처리 불필요. 메시지가 도착/변경될 때마다 이미 `upsertIndexEntry`로 이력에 증분 저장되므로, 위젯을 닫는 시점엔 이미 최신 상태가 저장돼 있다.
- **열기**: `toggle()` 내부에 `if (nextVisible) { chatHistory.startNewSession(customerKey); }`를 추가한다. 이 호출은 `setIsMessengerVisible(true)`로 인해 `App`이 `ChatbotView`를 (새로) 마운트하기 *직전*에 동기적으로 실행되므로, 마운트된 `ChatbotView`는 `getActiveSessionId()`를 통해 이미 교체된 새 포인터를 읽게 되어 자연스럽게 빈 새 대화로 시작한다.
- **탭 전환(챗봇 ↔ FAQ/티켓 등)**: `toggle()`을 거치지 않으므로 영향 없음 — 활성 포인터가 그대로라 챗봇 탭으로 돌아오면 대화가 이어진다.
- **예외 케이스**: 딜 모드처럼 페이지 로드 시 위젯이 처음부터 열려 있는 경우(`isMessengerVisible`의 초기 `useState` 값이 `true`), `toggle()`을 거치지 않으므로 직전 대화가 이어진다 (새로고침은 "닫기"가 아니므로 의도된 동작).

## 오류 처리

- `chatHistory.ts`의 모든 `localStorage` 읽기/쓰기는 기존 코드와 동일하게 try/catch로 감싸 실패 시 조용히 무시(빈 배열/no-op 반환).
- 인덱스 JSON 파싱 실패 시 빈 배열로 폴백 (손상된 데이터로 전체 기능이 죽지 않도록).

## 테스트 계획

- **단위 테스트** (`chatHistory.test.ts`): `upsertIndexEntry` 삽입/갱신/50개 캡 트리밍, `deleteIndexEntry`(인덱스+메시지 스토리지 동시 삭제 확인), `startNewSession`/`getActiveSessionId`/`setActiveSessionId` 포인터 동작, localStorage 실패 시 폴백.
- **컴포넌트 테스트** (`ChatbotHistoryView.test.tsx`): 목록 렌더링(첫 메시지+시간), 빈 상태 문구, 행 클릭 시 활성 세션 교체 + 라우팅, 삭제 아이콘 클릭 시 항목 제거(라우팅 없음), 활성 대화 삭제 시 새 세션 발급.
- **`ChatbotView` 추가 테스트**: 새 채팅 버튼이 빈 대화에서 no-op인지, 메시지 있을 때 세션 교체 + 화면 초기화하는지.
- **수동 확인**: 위젯 실제 구동 — 대화 후 위젯 닫기/재오픈 시 새 대화로 시작되는지, 새 채팅/이력 버튼 UX, 이력에서 대화 전환/삭제.

## 파일 변경 목록

- 신규: `widgets/client/messenger/components/chatbot/chatHistory.ts`
- 신규: `widgets/client/messenger/components/chatbot/ChatbotHistoryView.tsx`
- 신규: 위 두 파일에 대한 테스트 파일 (`__tests__/`)
- 수정: `widgets/client/messenger/components/chatbot/ChatbotView.tsx` (세션 관리 로직을 `chatHistory.ts`로 위임, 헤더 버튼 추가)
- 수정: `widgets/client/messenger/components/Messenger.tsx` (`chatbot-history` 라우트 추가)
- 수정: `widgets/client/messenger/context/Conversation.tsx` (`toggle()`에 새 세션 발급 훅 추가)
