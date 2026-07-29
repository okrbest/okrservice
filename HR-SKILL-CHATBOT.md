# HR 스킬 챗봇 개발 가이드 (teamplgpt × okrservice × kiwibox)

**대상 독자**: okrservice(messenger 위젯) HR 챗봇 기능을 인수받는 개발자
**전제 지식**: TypeScript, React, Express, SSE, postMessage, 브라우저 동일 출처 정책
**최종 검증**: 2026-07-29 (코드 실측 · `yarn jest client/messenger` 76건 PASS)

이 문서는 **HR 스킬을 새로 만들거나 고칠 때 세 리포를 어떤 순서로 건드리고 무엇으로 검증하는지**를 다룬다.
개별 계약의 정본은 각 리포에 있고(§1 표), 이 문서는 **okrservice 관점의 작업·검증 절차**가 본체다.

관련 문서:
- [docs/teamplgpt-hr-client-tools-workorder.md](docs/teamplgpt-hr-client-tools-workorder.md) — R1 프로토콜 최초 지시서(2026-07-16). **프로토콜 계약의 okrservice측 정본**
- [docs/teamplgpt-hr-endpoint-realign-workorder.md](docs/teamplgpt-hr-endpoint-realign-workorder.md) — 신판 카탈로그 재정렬 지시서(2026-07-24)
- [docs/kiwibox-endpoint-test-guide.md](docs/kiwibox-endpoint-test-guide.md) — kiwibox 엔드포인트 직접 호출·검증 절차(curl 하니스)
- [WORKFLOW.md](WORKFLOW.md) — spec-kit × superpowers 작업 라우팅
- [CLAUDE.md](CLAUDE.md) · [.specify/memory/constitution.md](.specify/memory/constitution.md) — 필수 규칙

---

## 1. 세 리포의 관계

| 리포 | 역할 | 이 팀의 수정 권한 | 정본(SSOT) |
|---|---|---|---|
| **kiwibox** (5240 HR, eGov 4.2 / JSP) | 실제 HR 데이터 보유. `.do` 엔드포인트 제공. 세션 = `JSESSIONID` HttpOnly 쿠키 | **무수정 전제** — 현행 배포 그대로 사용 | 엔드포인트 카탈로그: `spec-docs/SYS/CMM/cmmAiAssistantToolEndpoints.md` (파라미터·응답 필드·민감도 전량) |
| **teamplgpt** (AnythingLLM 계열) | HR agent skill 7종 + embed API + client-tool broker. LLM이 스킬을 호출하고 결과를 해석 | 별도 팀/리포 (요청·합의 필요) | 스킬·프로토콜: `specs/003-hr-multiuser-session/`, `specs/011-hr-endpoint-catalog-realign/`. 브로커 코드: `server/utils/chats/toolCalling/clientToolBroker.js` |
| **okrservice** (이 리포) | 메신저 위젯 = 사용자 접점. 위젯 서버 프록시 + chatbot iframe + **kiwibox origin 브리지** | **전권** | 브리지 allowlist·프록시 구현 = 이 리포 코드 |

핵심: **kiwibox 세션 쿠키는 kiwibox origin 밖으로 절대 나가지 않는다.** 이 제약이 전체 아키텍처의 존재 이유다.
teamplgpt 서버가 kiwibox를 직접 호출하면 사용자별 세션이 없어 불가능하므로, **브라우저(kiwibox 페이지)에 실행을 위임**한다. 이것이 R1(클라이언트 실행 위임) 프로토콜이다.

### 1.1 소유권 경계 (분쟁 방지)

- 엔드포인트 **경로·파라미터·응답 스키마** 결정권 → kiwibox 카탈로그
- 어떤 질문에 어떤 엔드포인트를 쓸지(**스킬 로직**) → teamplgpt
- 그 경로를 **실행해도 되는지**(보안 게이트) → okrservice 브리지 allowlist
- 세 축이 어긋나면 **브리지가 거부해 기능이 죽는다**. 어긋남은 항상 위젯 배포에서만 드러난다(§7.2).

---

## 2. 런타임 아키텍처

```
[kiwibox 페이지 — https://ntest.5240.kr/Main.do · 무수정]
│  로그인 세션(JSESSIONID, HttpOnly) 보유
│  window.erxesSettings.messenger.hrBaseUrl 렌더 (main.jsp 1368행 ${baseURL})
│  hidden input #searchUserId = 본인 STAFF_ID (main.jsp 2044행 ${ssnStaffId})
│
├─ messengerWidget.bundle.js  ← kiwibox origin에서 실행 = ★브리지★
│    widgets/client/messenger/widget/hrBridge.ts
│    · postMessage 수신 → allowlist 검증 → same-origin fetch(쿠키 자동) → 결과 회신
│
└─ <iframe id="erxes-messenger-iframe" src="https://5240help.okrbiz.com/...">
     │  okrbiz origin — 여기부터는 kiwibox 쿠키 접근 불가
     │
     └─ chatbot 컴포넌트 (ChatbotView.tsx)
          · teamplgpt.ts    — SSE 스트림 소비, clientToolRequest 분기
          · clientTools.ts  — 부모(브리지)에 postMessage 위임, 결과를 서버로 회신
          │
          └─ 위젯 서버 (widgets/server/index.ts, Express)
               · POST /ai-chat/stream      → upstream SSE 릴레이
               · POST /ai-chat/tool-result → upstream 결과 회신
               │
               └─ TeamplGPT embed API
                    POST /api/embed/{EMBED_ID}/stream-chat
                    POST /api/embed/{EMBED_ID}/client-tool-result
                    · LLM ↔ HR skill ↔ clientToolBroker(인메모리 pending 맵)
```

### 2.1 한 번의 HR 질문이 도는 경로

```
1. 사용자: "연차 얼마 남았어?"
2. chatbot → POST /ai-chat/stream {message, sessionId}
3. 위젯서버 → TeamplGPT /api/embed/{uuid}/stream-chat   (Origin 헤더 필수)
4. LLM이 hr-attendance 스킬 호출 결정
5. TeamplGPT: kiwibox 직접 호출 대신 SSE로 clientToolRequest 이벤트 방출
   { type:"clientToolRequest", callId, spec:{transport:"kiwibox-bridge", path, method, form} }
   → 서버는 broker에 callId를 pending 등록하고 최대 45s 대기
6. 위젯서버가 SSE 바이트 그대로 릴레이 → chatbot의 teamplgpt.ts가 type 감지
7. clientTools.ts → window.parent.postMessage({type:"teamplgpt:hr-tool-request", callId, spec})
8. hrBridge.ts: origin·source 이중 검증 → path allowlist → queryId 화이트리스트
   → $SELF_STAFF_ID 치환 → fetch(hrBase + path, credentials:"same-origin")
   ★ 이 fetch에만 JSESSIONID가 붙는다
9. 브리지 → iframe.postMessage({type:"teamplgpt:hr-tool-result", callId, ok, status, body})
10. clientTools.ts → POST /ai-chat/tool-result → 위젯서버 → TeamplGPT client-tool-result
11. broker가 callId 매칭 → LLM 루프 재개 → 최종 답변이 같은 SSE 스트림으로 흘러옴
12. chatbot이 말풍선 렌더
```

**5번 SSE 연결은 6~11 동안 끊기지 않고 유지된다.** 그래서 스트리밍·버퍼링 이슈가 이 기능의 주요 장애 원인이다(§7.4).

---

## 3. 프로토콜 계약 (변경 시 3자 합의)

정본: [docs/teamplgpt-hr-client-tools-workorder.md](docs/teamplgpt-hr-client-tools-workorder.md) §1. 요약:

### 3.1 SSE 이벤트 (TeamplGPT → chatbot)

```json
{
  "uuid": "<chat-uuid>", "sources": [], "type": "clientToolRequest",
  "callId": "<uuid — 결과 회신 시 그대로 반환>",
  "spec": {
    "transport": "kiwibox-bridge",
    "path": "/TAADclzVcatnList.do",
    "method": "POST",
    "form": { "cmd": "getTAADclzVcatnList1", "cmmSearchStaffId": "$SELF_STAFF_ID", "chkAppYn": "Y" }
  },
  "close": false, "error": false
}
```

### 3.2 결과 회신 (chatbot → 위젯서버 → TeamplGPT)

```
POST {TEAMPLGPT_BASE_URL}/api/embed/{TEAMPLGPT_EMBED_ID}/client-tool-result
{ "callId": "...", "sessionId": "...", "ok": true, "status": 200, "body": "<kiwibox 응답 원문>" }
```

- 응답 200 `{"matched":true}` / 404(callId 불일치·만료) / 403(embed opt-in 꺼짐)
- **실패해도 반드시 회신** (`ok:false` + body에 사유). 미회신 시 broker가 만료까지 대기하고 사용자는 무응답을 본다.
- `sessionId`는 stream-chat에 보낸 값과 동일해야 매칭된다(위조 주입 차단).

### 3.3 postMessage (chatbot iframe ↔ 브리지)

- 요청(iframe→부모): `{ type: "teamplgpt:hr-tool-request", callId, spec }`
- 응답(부모→iframe): `{ type: "teamplgpt:hr-tool-result", callId, ok, status, body }`

### 3.4 `$SELF_STAFF_ID` 마커

`form`의 **값**이 정확히 `"$SELF_STAFF_ID"`면 브리지가 페이지의 본인 STAFF_ID로 치환한다.

- 소스: `document.getElementById("searchUserId").value` → 비면 `input#searchUserId[value]:not([value=""])` 폴백 → 그래도 없으면 거부
- 치환은 **값 단위**라 파라미터 개수와 무관 (`staffId`·`cmmSearchStaffId`·`searchStaffId` 3중 지정도 그대로 동작)
- ⚠️ STAFF_ID는 **OID 형식**(`100:2007:00204:kkHT` — SERVAREA:입사연:일련:솔트)이며 표시 사번(`#userNo`, `20070133`)과 다르다. userNo로 치환하면 조회가 빈다.

### 3.5 타임아웃 중첩 계약 (역전 금지)

```
브리지 fetch 20s  <  위젯 대기 25s  <  TeamplGPT broker 45s
hrBridge.ts:24        clientTools.ts:19    env HR_CLIENT_TOOL_TIMEOUT_MS (teamplgpt)
FETCH_TIMEOUT_MS      BRIDGE_TIMEOUT_MS
```

위젯 대기가 브리지 fetch보다 짧으면, kiwibox가 그 사이에 응답하는 구간에서 위젯이 먼저 `ok:false`를 회신하고 리스너를 제거한다 → 진짜 결과 유실 + 서버에 거짓 실패 전달. **한 값을 바꾸면 나머지도 함께 조정**한다.

> 📌 알려진 문서 불일치: [clientTools.ts:95](widgets/client/messenger/components/chatbot/clientTools.ts#L95)·[:132](widgets/client/messenger/components/chatbot/clientTools.ts#L132) 주석에 broker 대기가 아직 "30초"로 남아 있다(상단 17행은 45s로 정정됨). 동작에는 영향 없음 — 주석만 구판.

---

## 4. okrservice 코드 맵

| 파일 | 책임 | 건드릴 때 주의 |
|---|---|---|
| [widgets/client/messenger/widget/hrBridge.ts](widgets/client/messenger/widget/hrBridge.ts) | **브리지** — kiwibox origin 실행. allowlist·self 강제·same-origin fetch | 보안 경계 그 자체. 규칙 완화는 리뷰 필수 |
| [widgets/client/messenger/widget/index.ts:139](widgets/client/messenger/widget/index.ts#L139) | `initHrBridge(messengerIframe)` 등록 | `hrBaseUrl` 없는 배포에는 미등록(다른 고객사 무영향) |
| [widgets/client/messenger/components/chatbot/clientTools.ts](widgets/client/messenger/components/chatbot/clientTools.ts) | iframe측 위임 — postMessage 왕복, 결과 회신 | 부모 origin은 `document.referrer`로 최초 1회 pin |
| [widgets/client/messenger/components/chatbot/teamplgpt.ts](widgets/client/messenger/components/chatbot/teamplgpt.ts) | SSE 소비 · `clientToolRequest` 분기 | `void handleClientToolRequest(...)` — **await 금지**(스트림 소비가 멈춘다) |
| [widgets/client/messenger/components/chatbot/ChatbotView.tsx:577-607](widgets/client/messenger/components/chatbot/ChatbotView.tsx#L577-L607) | sessionId 발급(UUID 강제) · localStorage 이력 | customerId(ObjectId) 직접 사용 금지 — embed가 uuid 검증 후 404 |
| [widgets/server/index.ts:162-286](widgets/server/index.ts#L162-L286) | `/ai-chat/stream` 프록시 | Origin 헤더, SSE 헤더 3종, 15s 하트비트, abort 처리 |
| [widgets/server/index.ts:294-357](widgets/server/index.ts#L294-L357) | `/ai-chat/tool-result` 프록시 | 필수필드 400 · 2MB 413 · **body 로그 금지** |
| [widgets/client/messenger/components/chatbot/getHrBaseUrl.ts](widgets/client/messenger/components/chatbot/getHrBaseUrl.ts) | **딥링크/RPA용** HR base URL 해석 | 브리지의 hrBase와 **다른 경로**다 — §4.1 |
| [widgets/client/messenger/components/chatbot/rpaButtons.ts](widgets/client/messenger/components/chatbot/rpaButtons.ts) | RPA 코드 → 딥링크 버튼 매핑 | HR 스킬(조회)과 별개 축 |

### 4.1 ⚠️ HR base URL이 두 종류다 (혼동 1순위)

| 용도 | 값 출처 | 코드 |
|---|---|---|
| **브리지 fetch** (조회 실행) | `window.erxesSettings.messenger.hrBaseUrl` — kiwibox 페이지가 렌더. 비면 `location.origin` | [hrBridge.ts:101-104](widgets/client/messenger/widget/hrBridge.ts#L101-L104) |
| **딥링크 버튼** (화면 이동) | `connection.setting.hrBaseUrl` → `browserInfo.hostname`(localhost 제외) → `window.erxesEnv.HR_BASE_URL` → `process.env.HR_BASE_URL` → `https://api.5240.cloud` | [getHrBaseUrl.ts:23-40](widgets/client/messenger/components/chatbot/getHrBaseUrl.ts#L23-L40) |

**`/kiwibox` 자동 보정을 넣지 말 것.** ntest.5240.kr은 루트 배포(`getContextPath()==""`)라 붙이면 404. 컨텍스트 경로가 있는 배포는 `hrBaseUrl` 값에 이미 포함돼 있다.

### 4.2 현행 allowlist (정적 20개 + YTA 정규식)

[hrBridge.ts:28-60](widgets/client/messenger/widget/hrBridge.ts#L28-L60) — 스킬별 매핑:

| 스킬 | 경로 |
|---|---|
| hr-attendance | `/TAAWrkTimeStatusMgr.do` `/TAADclzWorkSearchCldr.do` `/TAADclzWorkOtSchdul.do` `/TAADclzVcatnCldrMgr.do` `/TAADclzVcatnList.do` |
| hr-personnel | `/getMBLPrtEmpCard.do` `/getMBLPrtEmpCardPop.do` `/getMBLHrBassiemOrgList.do` `/getMBLHrBassiemMemberList.do` `/getTodoIconCnt.do` `/getScheduleDay.do` `/getContactList.do` `/PRCHrBassiemMgrTab220.do` |
| hr-salary | `/SALPayslipNewMgr.do` `/SALSalaryBassMgr.do` `/SALDaylabMgr.do` `/CommonCode.do` |
| hr-approval | `/EAPRequestMgr.do` |
| hr-certificate | `/CTIMcrtfReqstRefromMgr.do` |
| hr-welfare | `/LONLoanReqstListMgr.do` |
| hr-year-end-tax | 정규식 `^/YTA(SummaryMgr\|YndMedDtlMgr\|YtaFamilySttusMgr\|YndBefWrkDtlMgr\|YndGivPayDtlMgr\|InDctMgr)(2022\|2023\|2024\|2025)\.do$` |

추가 게이트:
- `/CommonCode.do`는 범용 endpoint → `queryId ∈ {getSalYmdTypeCdList, getSalYmdTypeCdList2}`만 허용
- `searchType=mobile` 값이 있으면 거부(권한 게이트 스킵 방지)
- YTA는 endpoint명 + 연도 둘 다 정규식으로 제한 → 연도 확장 시 **브리지 정규식과 teamplgpt 스킬 양쪽** 갱신

> 📌 알려진 문서 불일치: [재정렬 지시서](docs/teamplgpt-hr-endpoint-realign-workorder.md) §2 W1 본문에 "정적 22개 → **21개**"라고 적혀 있으나 실제 목록은 20개(22 − 4 + 2 = 20)다. **코드가 정본**(`ALLOWED_PATHS.length === 20`). 최초 지시서 §1.5의 "22개"는 구판.

---

## 5. 신규 HR 스킬 개발 절차

새 스킬(또는 기존 스킬의 엔드포인트 변경)은 **kiwibox 실측 → 카탈로그 → 스킬 → 브리지 → 검증** 순서로 간다.
okrservice 담당 구간은 **3~6단계**지만, 0~2단계 결과를 못 받으면 3단계를 시작할 수 없다.

### 0단계 — kiwibox 엔드포인트 실측 (선행 조건)

[docs/kiwibox-endpoint-test-guide.md](docs/kiwibox-endpoint-test-guide.md)의 하니스로 **직접 호출해서 응답을 확인**한다. 카탈로그만 믿지 않는다.

```bash
export HOST="https://ntest.5240.kr"
export CK="JSESSIONID=<브라우저에서 복사>"
export OID="100:2007:00204:kkHT"      # 본인 OID (응답의 staffId 필드에서 획득)

# 세션 유효성 먼저
curl -sS -b "$CK" "$HOST/chkLoginSession.do"     # {"loginInfo":"Login!"} 이어야 함

# 대상 엔드포인트 호출 — Referer 필수(없으면 302 바운스)
curl -sS -b "$CK" -H "Referer: $HOST/Main.do" -H "X-Requested-With: XMLHttpRequest" \
  --data "cmmSearchStaffId=$OID&searchYm=2026-06" \
  "$HOST/<새-엔드포인트>.do?cmd=<cmd>" | jq .
```

기록할 것: **경로 · cmd · 필수 파라미터 · 최상위 키(`DATA`/`Map`/`result`) · 민감 필드 · 빈 응답 조건.**

### 1단계 — kiwibox 카탈로그 갱신 (kiwibox 팀)

`spec-docs/SYS/CMM/cmmAiAssistantToolEndpoints.md`에 0단계 실측 결과 반영. `last_verified` 갱신.

### 2단계 — teamplgpt 스킬 작성 (teamplgpt 팀)

스킬 정의(query_type, 파라미터 조립, `$SELF_STAFF_ID` 마커 사용, 응답 파싱·마스킹) + `specs/NNN-*/contracts/kiwibox-request-bodies.md`에 **to-be 요청 계약** 명시. okrservice는 이 contracts 문서를 받아 3단계를 시작한다.

### 3단계 — okrservice 브리지 allowlist 갱신 ★우리 몫★

작업 규모 판정([WORKFLOW.md](WORKFLOW.md) §3): 경로 추가 정도면 **소규모 수정(≤3파일)** 경로 — 스펙 생략.
프로토콜 자체가 바뀌면 4번(spec-kit) 경로.

1. [hrBridge.ts](widgets/client/messenger/widget/hrBridge.ts) `ALLOWED_PATHS`에 신규 경로 추가 (스킬별 주석 그룹 유지)
2. 폐기 경로는 제거 (최소권한 — 보안 표면 축소)
3. 파일 상단 주석의 개수(`정적 20개`)를 **실제 배열 길이와 동기화**
4. 범용 endpoint면 `QUERY_ID_ALLOWLIST` 병행 추가
5. 새 위험 파라미터가 있으면 `FORBIDDEN_PARAM_VALUES` 추가

```bash
# 개수 검증 원라이너
node -e "const s=require('fs').readFileSync('widgets/client/messenger/widget/hrBridge.ts','utf8');
const m=s.match(/const ALLOWED_PATHS = \[([\s\S]*?)\];/)[1];
console.log('count=',(m.match(/\"\//g)||[]).length)"
```

### 4단계 — 단위 테스트 갱신 (§6.1)

### 5단계 — 로컬 통합 검증 (§6.2)

### 6단계 — 실환경 스모크 (§6.3)

### 7단계 — 배포 순서

**브리지(okrservice) 선배포.** 신 allowlist는 구 스킬과도 호환되지만, 스킬을 먼저 배포하면 브리지 갱신 전까지 해당 query_type이 전부 `bridge: path not allowed`로 실패한다.

```
okrservice 브리지 배포  →  (확인)  →  teamplgpt 스킬 배포
```

---

## 6. 검증 절차

### 6.1 단위 테스트

```bash
cd widgets
npx jest client/messenger                       # 전체 (7 suites / 76 tests)
npx jest client/messenger/widget                # 브리지만
npx jest --coverage client/messenger/widget
```

> `widgets/package.json`에 `test` 스크립트가 없다 — `npx jest`로 직접 실행한다.
> 설정: [widgets/jest.config.js](widgets/jest.config.js) (ts-jest + jsdom, `**/__tests__/**/*.test.(ts|tsx|js)`)

[hrBridge.test.ts](widgets/client/messenger/widget/__tests__/hrBridge.test.ts) — 신규 경로 추가 시 **최소 이 4종**을 넣는다:

| 케이스 | 기대 |
|---|---|
| 신규 경로 요청 | fetch 실행 + `ok:true` 회신 |
| 폐기 경로 요청 | fetch 없이 `"bridge: path not allowed"` (allowlist 축소 회귀 방지) |
| `$SELF_STAFF_ID` 다중 파라미터 | 모든 값이 페이지 STAFF_ID로 치환되어 form에 반영 |
| 경계값 (YTA 미지원 연도, 유사 경로 `/YTAFakeMgr2024.do`·`...\.do.jsp`) | 거부 |

기존 커버 항목(회귀 감시): origin 불일치 무시 · source 불일치 무시 · `searchType=mobile` 거부 · queryId 화이트리스트 · staffId 미발견 거부 · 빈 `#searchUserId` 폴백 · `hrBaseUrl` 없으면 리스너 미등록 · 컨텍스트 경로 미보정.

[clientTools.test.ts](widgets/client/messenger/components/chatbot/__tests__/clientTools.test.ts) — 타임아웃(25s)·origin/callId 불일치·referrer 부재 회신을 커버. `BRIDGE_TIMEOUT_MS`를 만지면 이 테스트가 계약 위반을 잡는다.

### 6.2 로컬 통합 검증

빌드 통과는 검증이 아니다([헌장 III](.specify/memory/constitution.md)). mock 3종으로 전 체인을 돈다:

1. **mock TeamplGPT** — `/api/embed/:id/stream-chat`에서 SSE로 `clientToolRequest` 1건 방출, `/client-tool-result` 수신 시 `{matched:true}` 반환 + callId 일치 assert
2. **mock kiwibox** — form 파라미터와 쿠키 동반 여부 assert
3. **테스트 페이지** — hidden `input#searchUserId`(OID 값) + `window.erxesSettings.messenger.hrBaseUrl` 설정

```bash
cd widgets
cp .env.sample .env      # TEAMPLGPT_BASE_URL을 mock 주소로, TEAMPLGPT_EMBED_ID는 아무 uuid
yarn dev                 # dev-server(nodemon/ts-node) + dev-webpack(watch)
```

확인 포인트: `clientToolRequest` 수신 → 브리지 fetch 발생 → `/ai-chat/tool-result` 200 → 최종 답변 렌더.

### 6.3 실환경 스모크 (ntest.5240.kr)

위젯 배포 후 kiwibox에 로그인한 브라우저에서 챗봇을 연다. **개발자도구 Network 탭을 열고** 확인:

| 질문 | 기대 요청 | 확인 |
|---|---|---|
| "연차 얼마 남았어?" | `POST /TAADclzVcatnList.do` (`cmd=getTAADclzVcatnList1`·`chkAppYn=Y`·`wkareaCd=…`) | 휴가종류별 잔여 응답 |
| "내 휴가 신청 내역" | `POST /TAADclzVcatnList.do` (`cmd=getTAADclzVcatnList2`) | 사용 상세 |
| "월별 급여 이력" | `POST /SALSalaryBassMgr.do` | `salYmd`·`ctotAmt` |
| "출퇴근 기록" | `POST /TAAWrkTimeStatusMgr.do` | 구 `/TAAWrkTimeListMgrByDate.do` **미호출** |

추가 필수 확인:
- 콘솔에 `bridge: path not allowed` **0건**
- 브리지 fetch 요청에 `Cookie: JSESSIONID` 동반, `/ai-chat/*` 요청에는 **미동반**
- **두 계정 교차 검증** — 각자 본인 데이터만 나오는지 (다중 사용자 핵심 검증)
- 로그아웃 상태 → "세션 만료" 안내
- 서버 로그에 JSESSIONID·HR 응답 body **미기록**

### 6.4 회귀 세트 (엔드포인트 변경 시 매번)

결재함 · 증명서 · 대출 · 교육이력 · 연말정산 각 1회 호출 — 기존 경로가 여전히 통과하는지만 확인.

---

## 7. 트러블슈팅

### 7.1 증상 → 원인 표

| 증상 | 1순위 원인 | 확인 위치 |
|---|---|---|
| 챗봇 응답 없음, upstream **401** | `Origin` 헤더 ↔ embed `allowlist_domains` 불일치 | `TEAMPLGPT_WIDGET_ORIGIN` env와 embed 설정이 **같은 문자열**인지. 서버 fetch는 Origin 자동 미전송이라 명시 필수 |
| upstream **404** | `TEAMPLGPT_EMBED_ID`에 숫자 PK를 넣음 / `sessionId`가 UUID 아님 | embed **uuid** 확인. sessionId는 [ChatbotView.tsx:577](widgets/client/messenger/components/chatbot/ChatbotView.tsx#L577)에서 customerId별 UUID 발급 |
| **503** `AI chat is not configured` | `TEAMPLGPT_EMBED_ID` 미설정 | [server/index.ts:169](widgets/server/index.ts#L169) |
| 콘솔 `bridge: path not allowed` | 스킬이 allowlist에 없는 경로 호출 (스킬 선배포) | §4.2 목록 ↔ teamplgpt contracts 대조. 브리지 배포 순서(§5-7) 확인 |
| `bridge: queryId not allowed` | `/CommonCode.do`에 화이트리스트 밖 queryId | [hrBridge.ts:69-71](widgets/client/messenger/widget/hrBridge.ts#L69-L71) |
| `bridge: forbidden param value` | form에 `searchType=mobile` | 스킬이 모바일 게이트 우회를 시도 — teamplgpt 수정 대상 |
| `bridge: staffId not found` | 페이지에 `#searchUserId` 값 없음 (비로그인·다른 페이지) | main.jsp 2044행 렌더 여부. 폴백 셀렉터도 실패한 상태 |
| `bridge: fetch failed` / 20s 초과 | kiwibox 지연·네트워크 | 타임아웃 중첩(§3.5) 확인. 브리지만 늘리면 위젯이 먼저 끊는다 |
| kiwibox 302 → `/Main.do` 바운스 | **Referer 헤더 누락** (직접 curl 테스트 시) | 브리지 fetch는 브라우저가 자동 첨부하므로 정상. curl에는 `-H "Referer: $HOST/Main.do"` 필요 |
| kiwibox 응답이 HTML | 세션 만료 | 브리지는 판정하지 않고 원문 전달 — 판정은 teamplgpt 스킬 몫 |
| `[ai-chat/tool-result] ... matched=false` | callId pending 소실 (broker 타임아웃 초과 or 다른 백엔드 인스턴스) | broker는 **인메모리** — TeamplGPT 다중 인스턴스면 sticky session 필요 |
| 응답이 끊겨 도착 / `ERR_INCOMPLETE_CHUNKED_ENCODING` | SSE 버퍼링 | §7.4 |
| 데이터가 비어 있음(200인데 rows=0) | 필수 파라미터 누락 (휴가: `searchSymdLv/Fy`·`chkAppYn=Y`·`wkareaCd`) | kiwibox 카탈로그 ↔ 스킬 contracts 대조 |
| 타인 데이터가 보임 | `$SELF_STAFF_ID` 마커 미사용 | **최우선 보안 사고.** 스킬 form 정의 확인. hr-welfare(대출)는 `cmmSearchStaffId` 누락 시 전사 노출 |

### 7.2 "TeamplGPT E2E는 통과하는데 위젯에서만 실패"

서버 폴백 모드는 브리지를 타지 않는다. **allowlist 불일치는 위젯 배포에서만 드러나는 회귀**다. teamplgpt 쪽 테스트 통과를 근거로 브리지 검증을 생략하지 말 것.

### 7.3 로그 읽는 법

```
[ai-chat/stream] a1b2c3d4 upstream 200 @142ms         # sessionId 앞 8자만 기록
[ai-chat/stream] a1b2c3d4 heartbeat @15142ms idle     # R1 대기 중 정상 신호
[ai-chat/stream] a1b2c3d4 done @18320ms bytes=4210 chunks=37
[ai-chat/tool-result] callId=9f8e7d6c sid=a1b2c3d4 upstream=404 matched=false ok=true
```

`heartbeat`가 계속 찍히고 `tool-result`가 안 오면 브리지 왕복이 막힌 것(브라우저 콘솔 확인). `matched=false`면 회신이 너무 늦었거나 다른 인스턴스로 갔다.
**message·HR 응답 body는 로그에 남기지 않는다** — 추가하지 말 것.

### 7.4 SSE 버퍼링 (재발 이력 있음)

세 겹의 방어가 이미 들어가 있다. 스트림이 멈추면 이 중 무엇이 빠졌는지 본다:

1. `Cache-Control: no-cache, no-transform` — compression 미들웨어의 gzip 버퍼링 차단
2. `X-Accel-Buffering: no` — nginx 응답 단위 버퍼링 차단
3. 15초 하트비트 `: hb\n\n` — 중간 프록시 idle-timeout 절단 방지 (SSE 주석이라 클라 파서가 무시)

배포 nginx에 `proxy_buffering off`가 없어도 2번으로 무력화된다. 반대로 nginx 설정을 새로 만들 때 이 헤더를 지우면 재발한다.

---

## 8. 환경변수 · 운영 설정

### 8.1 okrservice (위젯 서버)

샘플: [widgets/.env.sample](widgets/.env.sample) · [cli/configs.json.sample](cli/configs.json.sample) · [cli-okrservice/configs.json.sample](cli-okrservice/configs.json.sample) — **3곳 모두 동기화**한다.

| 변수 | 용도 | 주의 |
|---|---|---|
| `TEAMPLGPT_BASE_URL` | upstream 호스트 | 기본 `https://demo.teamplgpt.com` |
| `TEAMPLGPT_EMBED_ID` | embed **uuid** | 숫자 PK 넣으면 404. 미설정 시 503 |
| `TEAMPLGPT_WIDGET_ORIGIN` | 프록시가 보내는 `Origin` | embed `allowlist_domains`와 **문자 단위 동일** |
| `TEAMPLGPT_WORKSPACE`·`TEAMPLGPT_API_KEY` | 롤백 대비 유지, stream 경로 미사용 | 제거하지 말 것 |
| `HR_BASE_URL` | **딥링크용** 폴백 (§4.1) | 브리지 fetch와 무관 |

### 8.2 TeamplGPT (운영 설정 — okrservice 작업 아님)

- embed 인스턴스를 **HR 스킬·RAG 문서가 매핑된 워크스페이스**에 연결
- `allow_tool_calling=true`, `client_tool_execution=true`
- `allowlist_domains` = `TEAMPLGPT_WIDGET_ORIGIN`과 동일 값 (브라우저 노출 도메인이 아니라 **프록시가 보내는 Origin**이 매칭 기준)
- allowed skills 노출 정책:
  - 저위험(즉시): hr-attendance, hr-personnel, hr-approval(결재함 목록만), hr-certificate
  - 민감(고객사 승인 후): hr-salary, hr-year-end-tax, hr-welfare
  - 미배포: hr-evaluation(평가) — 정책 승인 전 보류

### 8.3 kiwibox (호스트 페이지 — 무수정 전제로 이미 충족)

- `window.erxesSettings.messenger.hrBaseUrl` 렌더 (main.jsp 1368행)
- `input#searchUserId` = 본인 STAFF_ID (main.jsp 2044행). 2176행에 빈 값 중복 존재 → 브리지가 폴백 처리

---

## 9. 불변 조건 (깨면 보안 사고)

이 목록은 리뷰 체크리스트다. 완화가 필요하면 **먼저 합의하고 문서를 고친 뒤** 코드를 고친다.

1. **세션 쿠키를 kiwibox origin 밖으로 내보내지 않는다.** 브리지·chatbot 코드에 JSESSIONID를 읽거나 저장·전송하는 코드 금지. 세션은 `credentials:"same-origin"`으로 브라우저가 처리하는 것으로 끝.
2. **allowlist 없는 경로는 실행하지 않는다.** "일단 통과시키고 서버에서 막자" 금지 — 서버는 세션이 없어 막을 수 없다.
3. **`$SELF_STAFF_ID` 치환은 페이지 DOM 값으로만.** 요청 payload에서 온 staffId를 그대로 쓰면 타인 조회가 열린다.
4. **범용 endpoint에는 2차 게이트.** `/CommonCode.do`처럼 queryId로 임의 쿼리가 되는 경로는 값 화이트리스트 병행.
5. **postMessage는 origin·source 이중 검증.** 브리지는 `event.source === iframe.contentWindow` + `event.origin === widgetOrigin`, 위젯은 pin된 부모 origin.
6. **HR 응답 body를 로그에 남기지 않는다.** 급여·연말정산·대출·증명서·주민번호가 지나간다.
7. **결과는 실패해도 반드시 회신.** 미회신은 사용자에게 무응답으로 보이고 broker 슬롯을 점유한다.
8. **타임아웃 중첩 순서 유지** (§3.5).
9. **시크릿 하드코딩 금지** — API 키는 서버 env에만, 클라이언트 번들에 넣지 않는다.

---

## 10. 변경 유형별 영향 범위

| 하려는 일 | okrservice | teamplgpt | kiwibox |
|---|---|---|---|
| 기존 스킬에 **엔드포인트 추가** | `ALLOWED_PATHS` + 테스트 | 스킬 로직 + contracts | 카탈로그 |
| 엔드포인트 **폐기** | allowlist 제거 + 거부 테스트 | 호출 코드 제거 | 카탈로그 |
| **파라미터만** 변경 | 대개 무영향(값 검사는 `searchType`뿐) — 새 위험 값이면 `FORBIDDEN_PARAM_VALUES` | 스킬 | 카탈로그 |
| YTA **연도 확장** | `YTA_PATH_RE` + 경계 테스트 | 스킬 | 카탈로그 |
| **신규 스킬** 추가 | allowlist 그룹 + 테스트 | 스킬 신규 + allowed skills 노출 | 카탈로그 |
| **프로토콜** 변경(이벤트/필드) | clientTools·hrBridge·server 프록시 전부 + 문서 §3 | broker·embed API | — |
| 타임아웃 조정 | `FETCH_TIMEOUT_MS`·`BRIDGE_TIMEOUT_MS` | `HR_CLIENT_TOOL_TIMEOUT_MS` | — |
| 신규 고객사 배포 | `hrBaseUrl` 설정 확인(컨텍스트 경로 포함 여부) | embed 인스턴스·allowlist_domains | 호스트 페이지에 erxesSettings 렌더 |

---

## 11. 인수인계 체크리스트

**접근 권한**
- [ ] kiwibox 테스트 계정 2개 이상 (교차 검증용) — ntest.5240.kr
- [ ] kiwibox 리포 읽기 권한 (`spec-docs/SYS/CMM/cmmAiAssistantToolEndpoints.md`)
- [ ] teamplgpt 리포 읽기 권한 (`specs/003`, `specs/011`, `clientToolBroker.js`)
- [ ] TeamplGPT admin — embed 설정(allowlist_domains, allowed skills) 확인 경로
- [ ] 위젯 서버 배포 로그 접근

**환경 구축 확인**
- [ ] `node -v` = 18.20.4 ([.nvmrc](.nvmrc)), yarn 1.22.22
- [ ] `cd widgets && npx jest client/messenger` → 7 suites / 76 tests PASS
- [ ] `widgets/.env` 작성 (샘플 3종 참조)
- [ ] kiwibox curl 하니스로 `chkLoginSession.do` 200 확인

**이해도 확인 (인수자가 설명할 수 있어야 함)**
- [ ] 왜 teamplgpt가 kiwibox를 직접 호출하지 않는가 (§1)
- [ ] `$SELF_STAFF_ID` 치환이 어디서 일어나고 왜 페이지 DOM 값이어야 하는가 (§3.4, §9-3)
- [ ] 타임아웃 3개의 순서와 역전 시 증상 (§3.5)
- [ ] 브리지 hrBase와 딥링크 HR base가 다른 이유 (§4.1)
- [ ] 배포 순서가 브리지 우선인 이유 (§5-7)

---

## 12. 미완료 항목 (2026-07-29 기준)

최초 지시서 §7 Definition of Done 중 **미완**으로 남은 것:

- [ ] 통합 왕복(로컬 mock) 검증 — §6.2
- [ ] 실환경(ntest.5240.kr) 두 계정 교차 검증 — §6.3
- [ ] 운영 env 설정 후 401 미발생 확인 (`TEAMPLGPT_WIDGET_ORIGIN` ↔ embed `allowlist_domains`)
- [ ] 로그에 JSESSIONID·HR body 미기록 실환경 확인

구현·단위 테스트(W1~W3, 필수 수정 1·2)는 완료 상태다. 인수자는 **위 4건부터** 착수하면 된다.
</content>
