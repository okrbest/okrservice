# 작업지시서: AI Chatbot — TeamplGPT HR 스킬 클라이언트 실행 위임(R1) 연동

작성: 2026-07-16 · 검수: 2026-07-20(코드 실측 대조) · 발주 리포: teamplgpt (`specs/003-hr-multiuser-session/`)
대상 리포: okrservice · **kiwibox(5240 HR)는 무수정 전제**

## 구현 현황 (2026-07-20 검수 — 코드 실측)

- ✅ **W1 완료**: `/ai-chat/stream` embed 전환 + `/ai-chat/tool-result` 프록시
  (`widgets/server/index.ts` — 400/413/503 검증, body 상한 2MB 구현됨)
- ✅ **W2 완료**: `clientTools.ts` + `teamplgpt.ts` clientToolRequest 분기 +
  `__tests__/clientTools.test.ts`
- ✅ **W3 완료** (2026-07-20, `widgets/client/messenger/widget/hrBridge.ts`):
  정적 22개 + YTA 정규식 allowlist, CommonCode queryId 화이트리스트,
  `/kiwibox` 자동 보정 제거(§4 정정 반영) — 단위 테스트 포함
- ✅ **W2 후속 완료**: `BRIDGE_TIMEOUT_MS` 25000 상향 (§3.1 타임아웃 중첩 계약)
- ✅ **필수 수정 1 완료** (2026-07-20): `/ai-chat/stream` upstream에
  `Origin: TEAMPLGPT_WIDGET_ORIGIN` 헤더 — env 샘플 3종(.env.sample,
  cli/configs.json.sample, cli-okrservice/configs.json.sample) 문서화 포함
- ✅ **필수 수정 2 완료** (2026-07-20): sessionId UUID 강제 —
  로그인 사용자 customerId(ObjectId) 직접 사용 제거, customerId별 UUID 발급·저장
  (ChatbotView.tsx). `TEAMPLGPT_EMBED_ID`=uuid는 운영 설정 시 확인 사항
- ⏳ 남은 것: §6-3 통합(로컬) · §6-4 실환경(ntest.5240.kr) 검증 ·
  운영 env 설정(TEAMPLGPT_EMBED_ID=uuid, TEAMPLGPT_WIDGET_ORIGIN=allowlist와 동일 값)

## ⚠️ okrservice 필수 수정 (2026-07-20 재검증 — teamplgpt 코드 실측)

TeamplGPT 서버 코드 대조 결과, W1~W3 구현은 정합하나 **아래 2건이 미충족 시 실동작 시
401/무응답**이 된다. teamplgpt는 코드 수정 없음(embed API가 RAG+skill+R1 전부 지원 확인).

### 수정 1 — `/ai-chat/stream` upstream에 `Origin` 헤더 (미설정 시 401)

teamplgpt `canRespond` 미들웨어가 `request.headers.origin`을 embed `allowlist_domains`와
대조한다([server/utils/middleware/embedMiddleware.js:66]). **서버-사이드 fetch는 Origin이
자동으로 안 붙으므로**(host="") allowlist가 설정돼 있으면 401. 프록시가 명시해야 한다:

```ts
// widgets/server/index.ts — /ai-chat/stream upstream fetch
const { TEAMPLGPT_WIDGET_ORIGIN = '' } = process.env;
const upstream = await fetch(upstreamUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(TEAMPLGPT_WIDGET_ORIGIN ? { Origin: TEAMPLGPT_WIDGET_ORIGIN } : {}),
  },
  body: JSON.stringify({ message, sessionId }),
  signal: controller.signal,
});
```

- env 추가: `TEAMPLGPT_WIDGET_ORIGIN` (예: `https://5240help.okrbiz.com`).
- 운영 설정: embed `allowlist_domains`에 **이 값과 동일한 문자열** 등록(§5).
  (브라우저 노출 도메인이 아니라 프록시가 보내는 Origin 값이 매칭 기준.)
- 대안(보안 낮음): embed `allowlist_domains`를 비우면 전체 허용 — 프록시·
  client_tool_execution·브리지 origin 검증이 방어선. 운영은 Origin 명시 권장.

### 수정 2 — `TEAMPLGPT_EMBED_ID`는 embed **uuid** (숫자 id 아님) · sessionId **uuid** 강제

- `TEAMPLGPT_EMBED_ID`: validEmbedConfig가 uuid로 조회([embedMiddleware.js:12]).
  admin이 발급한 embed **uuid**를 넣을 것. (숫자 PK 아님 — 넣으면 404)
- `sessionId`: canRespond가 `validate(sessionId)`로 uuid 검증(미충족 404).
  ⚠️ **정정(2026-07-20 재검수)**: "crypto.randomUUID 사용 중 → 충족"은 익명 경로만
  해당 — **로그인 사용자는 customerId(Mongo ObjectId, UUID 아님)를 그대로 사용해
  전원 404**였다. ChatbotView.tsx에서 customerId별 UUID를 발급·localStorage 저장
  (`erxes_ai_sid_<customerId>`)하는 방식으로 수정 완료. 익명 폴백(`anon-...` 문자열)도
  UUID 형식 보장으로 교체. (부작용: 로그인 사용자의 localStorage 대화 이력 키가
  1회 초기화됨 — sessionId 변경에 따른 의도된 결과.)

### 재검증으로 확인된 정합 사항 (수정 불요)

- 경로 `/api/embed/{uuid}/stream-chat`·`/client-tool-result` ✅ (apiRouter `/api` prefix + embed 라우트)
- body `{message,sessionId}` / `{callId,sessionId,ok,status,body}` ✅
- 인증: embed API는 apiKey 불요(전역 가드 없음, validEmbedConfig만) ✅
- **embed API = workspace 래퍼**: embed.workspace_id로 매핑된 워크스페이스의 벡터
  네임스페이스로 RAG 수행 + 그 워크스페이스 allowed skills 사용([embed.js:53]).
  → 문서 기반 RAG + agent-skill 손실 없음. workspace API(`/v1/workspace/*`)는 R1
  미배선이라 HR 스킬 세션 위임 불가 — **embed API가 정답**(현 방향 유지).

### Swagger 관련 (혼동 방지)

- `/embed/:embedId/stream-chat`·`client-tool-result`는 **위젯 전용 런타임 API** —
  Swagger(openapi.json)에 **미등록이 정상**. 스캔 대상은 `endpoints/api/embed`(관리 API
  `/v1/embed/*`, apiKey 필요)뿐이고 위젯 채팅은 `endpoints/embed`(별도)라 문서화 안 됨.
- **계약 원본은 코드**(`server/endpoints/embed/index.js`) + 이 지시서 §1. openapi에서 embed
  채팅 API를 못 찾아도 정상이며, 코드/지시서를 기준으로 이식할 것.

---

## 0. 배경 (필독)

TeamplGPT에 HR agent skill 7종(hr-attendance, hr-personnel, hr-salary, hr-approval,
hr-certificate, hr-year-end-tax, hr-welfare)이 배포됨. 이 스킬들은
kiwibox HR 데이터를 조회하는데, 사용자별 kiwibox 세션(JSESSIONID)이 필요하다.
세션은 HttpOnly 쿠키라 kiwibox 페이지의 브라우저 컨텍스트에만 존재 — 그래서
**"클라이언트 실행 위임(R1)" 프로토콜**로 동작한다:

```
[kiwibox main.jsp — 무수정, 현행 배포 상태 그대로]
  로더(messengerWidget.bundle.js)가 kiwibox origin에서 실행  ← ★W3: 브리지 역할
    └─ erxes-messenger-iframe (okrbiz origin)
         └─ chatbot 컴포넌트                                  ← ★W2: postMessage 왕복
              └─ 위젯 서버 /ai-chat/stream 프록시              ← ★W1: embed API 전환
                   └─ TeamplGPT /api/embed/:embedId/stream-chat
```

흐름: LLM이 HR 스킬 호출 → TeamplGPT가 SSE로 `clientToolRequest` 이벤트 전송(직접
kiwibox를 호출하지 않음) → chatbot(iframe)이 부모(kiwibox 페이지)의 로더-브리지에
postMessage → 브리지가 same-origin fetch로 kiwibox 호출(JSESSIONID 자동 동반) →
결과를 역방향으로 회신 → TeamplGPT가 LLM 루프 계속 → 최종 답변 스트림.

**세션 쿠키는 절대 kiwibox origin 밖으로 나가지 않는다.** 이것이 설계 목적.

참조 구현(teamplgpt 리포 — 프로토콜 원본, 로직 이식 시 대조):
- 서버: `server/utils/chats/toolCalling/clientToolBroker.js`
- 위젯측 참조: `embed/src/utils/clientTools.js` (anythingllm-embed용 — 이식 원본)
- 브리지 참조: `extras/kiwibox-bridge/teamplgpt-hr-bridge.js` (이식 원본)

---

## 1. 프로토콜 계약 (변경 금지 — TeamplGPT 서버와 합의된 형식)

### 1.1 SSE 이벤트 (TeamplGPT → chatbot, /ai-chat/stream 릴레이로 수신)

```json
{
  "uuid": "<chat-uuid>",
  "sources": [],
  "type": "clientToolRequest",
  "callId": "<uuid — 결과 회신 시 그대로 반환>",
  "spec": {
    "transport": "kiwibox-bridge",
    "path": "/getMBLHomeLeaveDetail.do",
    "method": "POST",
    "form": { "searchType": "1", "cmmSearchStaffId": "$SELF_STAFF_ID" }
  },
  "close": false,
  "error": false
}
```

### 1.2 결과 회신 (chatbot → 위젯 서버 → TeamplGPT)

`POST {TEAMPLGPT_BASE_URL}/api/embed/{TEAMPLGPT_EMBED_ID}/client-tool-result`

```json
{ "callId": "<수신한 callId>", "sessionId": "<대화 sessionId>", "ok": true, "status": 200, "body": "<kiwibox 응답 원문 텍스트>" }
```

- 응답: 200 `{"matched":true}` / 404(callId 불일치·만료) / 403(embed opt-in 꺼짐)
- **실패해도 반드시 회신** (`ok:false` + body에 사유) — 미회신 시 서버가 30초 대기.
- sessionId는 stream-chat에 보낸 것과 동일해야 매칭됨 (위조 주입 차단 검증에 사용).

### 1.3 postMessage 형식 (chatbot iframe ↔ 로더 브리지)

- 요청(iframe→부모): `{ type: "teamplgpt:hr-tool-request", callId, spec }`
- 응답(부모→iframe): `{ type: "teamplgpt:hr-tool-result", callId, ok, status, body }`

### 1.4 self 식별자 마커

`form` 값 중 `"$SELF_STAFF_ID"` 문자열은 브리지가 **kiwibox 내부 STAFF_ID**로 치환.
- 소스: `document.getElementById("searchUserId").value` (main.jsp 2044행에
  `${ssnStaffId}` 렌더됨 — kiwibox 무수정 성립 근거)
- ⚠️ STAFF_ID는 사번(`#userNo`의 ssnStaffNo)과 **다른 값** — 절대 userNo로 치환 금지.
- ⚠️ main.jsp에 `#searchUserId`가 2개 존재(2044 값 있음 / 2176 빈 값). getElementById는
  첫 번째를 반환하지만, 빈 값이면 `document.querySelector('input#searchUserId[value]:not([value=""])')`
  폴백 후 그래도 없으면 요청 거부(`ok:false, body:"bridge: staffId not found"`).

### 1.5 브리지 endpoint allowlist (정적 22개 + YTA 정규식 외 실행 거부)

정적 경로 22개 (정확 매칭):

```
/TAAWrkTimeListMgrByDate.do  /TAAWrkTimeStatusMgr.do  /TAADclzWorkSearchCldr.do
/TAADclzWorkOtSchdul.do      /TAADclzVcatnCldrMgr.do  /getMBLLeavDetailStaff.do
/getMBLHomeLeaveDetail.do    /getMBLPrtEmpCard.do     /getMBLPrtEmpCardPop.do
/getMBLHrBassiemOrgList.do   /getMBLHrBassiemMemberList.do  /getTodoIconCnt.do
/getScheduleDay.do           /getContactList.do
/SALPayslipNewMgr.do         /SALSalaryDtstmnMgr.do   /SALDaylabMgr.do
/CommonCode.do
/EAPRequestMgr.do
/CTIMcrtfReqstRefromMgr.do
/PRCHrBassiemMgrTab220.do
/LONLoanReqstListMgr.do
```

YTA 정규식 (연말정산 — 컨트롤러 연도별 분리, 경로에 연도 박힘):

```
/^\/YTA(SummaryMgr|YndMedDtlMgr|YtaFamilySttusMgr|YndBefWrkDtlMgr|YndGivPayDtlMgr|InDctMgr)(2022|2023|2024|2025)\.do$/
```

path 매칭 로직: 정적 allowlist에 있거나 YTA 정규식에 매치하면 통과, 아니면 거부.

스킬별 경로 매핑:
- hr-attendance: TAA* 5 + getMBLLeavDetailStaff + getMBLHomeLeaveDetail
- hr-personnel: getMBLPrtEmpCard(Pop) + getMBLHrBassiem(Org/Member)List + getTodoIconCnt
  + getScheduleDay + getContactList + **PRCHrBassiemMgrTab220.do(education 교육이력)**
- hr-salary: SAL* 3 + CommonCode.do
- hr-approval: EAPRequestMgr.do
- **hr-certificate: CTIMcrtfReqstRefromMgr.do**
- **hr-year-end-tax: YTA 정규식(6 endpoint × 4연도)**
- **hr-welfare: LONLoanReqstListMgr.do**

민감 데이터 경유 → 응답 body 로그 금지(§2.2) 적용 대상:
SAL*·CommonCode(급여), EAPRequestMgr(결재), CTIMcrtf(증명서), YTA*(연말정산), LONLoan(대출).

- **⚠️ `/CommonCode.do`는 범용 endpoint — queryId form-값 화이트리스트 병행 필수**:
  `queryId` ∈ {`getSalYmdTypeCdList`, `getSalYmdTypeCdList2`}만 허용, 그 외 거부
  (`ok:false, body:"bridge: queryId not allowed"`). 임의 쿼리 실행 차단.
  참조 구현: teamplgpt `extras/kiwibox-bridge/teamplgpt-hr-bridge.js` QUERY_ID_ALLOWLIST.
- **⚠️ YTA 정규식**: endpoint명 + 지원연도(2022~2025) 둘 다 정규식으로 제한. 임의 YTA 경로·
  미지원 연도 차단. 참조: teamplgpt 브리지 `YTA_PATH_RE`. 연도 확장 시 정규식·스킬 양쪽 갱신.
  ⚠️ 원본 브리지 주석에 "5 endpoint"로 오기돼 있으나 정규식 대안은 **6개**가 맞다 —
  이식 시 주석이 아닌 정규식을 기준으로 할 것.
- hr-salary는 2단계 조회다: pay_periods(CommonCode getSalYmdTypeCdList2)로 지급 건 목록의
  `CODE`(=searchItem) 획득 → SALPayslipNewMgr 등에 pay_item으로 전달. 브리지는 경로만
  중계하면 되고 2단계 순서는 TeamplGPT 스킬이 강제한다.
- hr-approval은 결재함 목록만(EAPRequestMgr getEAPRequestMgrList, 순수 self) — 문서 본문
  (getApprovalDetailJson)은 §7 최고 위험이라 미채택. reqNo 체이닝 없음. 브리지 추가 로직 불요.
- 모든 스킬 self 강제: 브리지가 `$SELF_STAFF_ID` 마커를 세션 ssnStaffId로 치환(§1.4).
  hr-welfare(대출)는 미치환 시 전사 노출 위험이라 특히 중요.

추가 보안 규칙: `searchType=mobile` 값이 form에 있으면 거부(권한 게이트 스킵 방지).

---

## 2. W1 — 위젯 서버 프록시 (`widgets/server/index.ts`)

### 2.1 `/ai-chat/stream` upstream 전환

현행(159행~): `POST /api/v1/workspace/${TEAMPLGPT_WORKSPACE}/stream-chat` + API 키.
변경: **embed API**로 전환 — R1 프로토콜은 embed 경로에만 배선돼 있음.

- upstream: `POST ${TEAMPLGPT_BASE_URL}/api/embed/${TEAMPLGPT_EMBED_ID}/stream-chat`
  (`TEAMPLGPT_EMBED_ID`=embed **uuid**)
- body: `{ message, sessionId }` (mode 필드 불필요 — embed 설정의 chat_mode 적용)
- Authorization 헤더 불필요 (embed API는 embedId 기반 공개 endpoint)
- **⚠️ `Origin` 헤더 필수** — 상단 "okrservice 필수 수정 1" 참조(미설정 시 401)
- env 추가: `TEAMPLGPT_EMBED_ID` (미설정 시 503 — 기존 API_KEY 가드와 동일 패턴)
- SSE 릴레이는 현행 바이트 그대로 유지 — `clientToolRequest` 이벤트 자동 통과됨
- `TEAMPLGPT_WORKSPACE`/`TEAMPLGPT_API_KEY`는 다른 용도 없으면 제거하지 말고 유지
  (롤백 대비), stream 경로에서만 미사용 처리

### 2.2 신규 `/ai-chat/tool-result` 프록시

```
POST /ai-chat/tool-result
  body: { callId, sessionId, ok, status, body }  → 그대로 upstream 포워딩
  upstream: POST ${TEAMPLGPT_BASE_URL}/api/embed/${TEAMPLGPT_EMBED_ID}/client-tool-result
  응답: upstream status/json 그대로 반환
```

- 검증: callId·sessionId 문자열 필수(400), body 크기 상한 2MB — 초과 시 413
  (express json limit 2mb와 함께 구현 완료)
- 로그에 body 내용 남기지 말 것 (HR 개인정보)

---

## 3. W2 — chatbot 컴포넌트 (`widgets/client/messenger/components/chatbot/`)

### 3.1 신규 `clientTools.ts`

teamplgpt `embed/src/utils/clientTools.js`를 TS로 이식. 요지:

```ts
const REQUEST_TYPE = "teamplgpt:hr-tool-request";
const RESULT_TYPE = "teamplgpt:hr-tool-result";
const BRIDGE_TIMEOUT_MS = 25000; // ⚠️ 반드시 브리지 fetch(20s)보다 길게 — 아래 중첩 계약

// 부모 origin: 최초 1회 document.referrer로 pin — 이후 송신 대상/수신 검증 동일 값 사용
// (테넌트별 kiwibox 서브도메인 자동 대응)

export async function handleClientToolRequest(chunk, sessionId): Promise<void>
// 1) window.parent에 REQUEST_TYPE postMessage (targetOrigin = pinned origin)
// 2) RESULT_TYPE + callId 일치 message 대기 (origin 검증, 15s 타임아웃)
// 3) 성공/실패 무관 POST {ROOT_URL}/ai-chat/tool-result 로 회신
//    실패 시 { ok:false, status:0, body:"widget: <사유>" }
```

주의: iframe이므로 `window.parent !== window` — anythingllm-embed(스크립트 임베드)와
달리 postMessage 경로가 항상 성립. 단 referrer가 비면(직접 접속 테스트 등) 즉시
`ok:false` 회신.

**⚠️ 타임아웃 중첩 계약 (역전 금지)**: 브리지 fetch **20s** < 위젯 대기 **25s** <
TeamplGPT broker **30s**. 위젯 대기가 브리지 fetch보다 짧으면(예: 15s) kiwibox 응답이
15~20s 걸리는 구간에서 위젯이 먼저 `ok:false`를 회신하고 리스너를 제거 — 직후 도착한
진짜 결과가 유실되고 서버에 거짓 실패가 전달된다. 세 값 중 하나를 바꾸면 나머지도
중첩 순서를 유지하도록 함께 조정할 것.

### 3.2 `teamplgpt.ts` streamChat 분기

`ChatChunk` 파싱 직후:

```ts
if ((chunk as any).type === "clientToolRequest") {
  void handleClientToolRequest(chunk, sessionId); // await 금지 — 스트림 소비 계속
  continue; // UI로 yield하지 않음
}
```

- ChatChunk 인터페이스에 `callId?`, `spec?` 선택 필드 추가.
- 기존 `chunk.close` 종료 로직·오류 처리 무변경.

---

## 4. W3 — 로더 브리지 (messengerWidget 번들의 kiwibox-origin 실행 구간)

erxes 메신저 로더(iframe을 생성하는 부트스트랩 코드 — `erxes-messenger-iframe` 생성부)
에 브리지를 탑재한다. **kiwibox 페이지에서 실행되는 코드**이므로 여기서의 fetch는
JSESSIONID가 자동 동반된다.

teamplgpt `extras/kiwibox-bridge/teamplgpt-hr-bridge.js` 로직 이식. 요지:

```
window.addEventListener("message", handler)
handler(event):
  1) event.source가 erxes-messenger-iframe.contentWindow인지 + event.origin이
     위젯 서버 origin(번들 로드 도메인, 예: https://5240help.okrbiz.com)인지 검증
  2) type === "teamplgpt:hr-tool-request" 만 처리
  3) spec.path 검증: §1.5 정적 allowlist(22개)에 있거나 YTA 정규식에 매치하면 통과, 아니면 거부
  4) form 값 검사:
     - searchType=mobile 거부 (게이트 스킵 방지)
     - CommonCode.do면 queryId ∈ {getSalYmdTypeCdList, getSalYmdTypeCdList2}만 허용, 그 외 거부
     - "$SELF_STAFF_ID" → §1.4 규칙으로 세션 ssnStaffId 치환
  5) fetch(hrBase + spec.path, { method:"POST", credentials:"same-origin",
       headers:{"Content-Type":"application/x-www-form-urlencoded"},
       body: URLSearchParams(form) })   // 타임아웃 20s (AbortController)
  6) iframe.contentWindow.postMessage({type:"teamplgpt:hr-tool-result", callId,
       ok, status, body}, <iframe origin>)
```

- `hrBase`: `window.erxesSettings.messenger.hrBaseUrl` (main.jsp 1368행 `${baseURL}` 전달됨).
  **⚠️ 정정(2026-07-16 실측)**: ntest.5240.kr은 **루트 배포**다 —
  Interceptor.java가 `request.getContextPath() + "/Main.do"`로 리다이렉트하는데 실제 URL이
  `https://ntest.5240.kr/Main.do`(= getContextPath()="")이므로 컨텍스트 경로가 없다.
  **따라서 `/kiwibox` 자동 보정 로직은 넣지 말 것** — `hrBase + path`(예:
  `https://ntest.5240.kr` + `/getMBLHomeLeaveDetail.do`)로 그대로 호출한다.
  `/kiwibox`를 붙이면 404. `hrBaseUrl`이 이미 컨텍스트 경로를 포함한 배포(다른 고객사)라면
  그 값에 이미 포함돼 있으므로 브리지는 추가 조작 없이 `hrBase + path`만 하면 정합.
  값이 비면 `location.origin` 폴백.
- 브리지 등록은 erxesSettings에 `hrBaseUrl`이 있을 때만 (다른 고객사 배포에 무영향).
- 응답 body는 텍스트 그대로 전달 — 세션만료 판정(HTML 감지)은 TeamplGPT 스킬이 수행,
  브리지는 판단하지 않는다.

---

## 5. TeamplGPT 측 준비 (okrservice 작업 아님 — 운영 설정, 참고)

- embed 인스턴스 생성: **대상 워크스페이스(HR agent-skill·RAG 문서가 매핑된 그 워크스페이스)
  에 `workspace_id` 연결** (embed는 이 워크스페이스의 벡터 네임스페이스로 RAG + allowed
  skills 사용 — embed는 공개 창구일 뿐 별도 데이터 공간 아님), `allow_tool_calling=true`,
  `client_tool_execution=true`,
  `allowlist_domains`에 **프록시가 보내는 `TEAMPLGPT_WIDGET_ORIGIN`과 동일한 값** 등록
  (⚠️ 브라우저 노출 도메인이 아니라 서버 프록시 Origin 값이 매칭 기준 — "필수 수정 1" 참조)
  → `TEAMPLGPT_EMBED_ID`(uuid) 확보.
- allowed skills (총 7종 배포, 위험도별 노출 정책):
  - 저위험(self, 즉시 노출 가능): hr-attendance, hr-personnel(교육이력 포함), hr-approval(결재함
    목록만·본문 제외), hr-certificate(증명서 목록·주소 제외)
  - 민감(고객사 정책 승인 후 노출): hr-salary(급여·2단계·계좌 제외), hr-year-end-tax(연말정산
    query_type 9종 — summary/medical/family/previous_employer/donation/credit_card/
    insurance/education/savings, endpoint 6개×4연도와 별개 축·주민번호/계좌 제외),
    hr-welfare(대출·계좌 제외)
  - 미배포: 평가(hr-evaluation) — 보류(§7 최고위험, 조직 평가공개 정책 승인 전 미반영)
- `client_tool_execution` 컬럼은 마이그레이션 필요(이미 리포에 포함, deploy 시 적용).

---

## 6. 테스트 계획

1. **단위(W2)**: clientTools — postMessage 왕복 mock, 타임아웃 시 ok:false 회신,
   origin 불일치 메시지 무시. 기존 `__tests__` 패턴 준수.
2. **단위(W1)**: tool-result 프록시 — 필수 필드 400, body 2MB 초과 413, upstream 상태 전달.
2-1. **단위(W3, hrBridge)**: allowlist 확장 검증 —
   - 정적 22개 경로 통과 / 미등록 경로 거부
   - YTA 정규식: `YTASummaryMgr2024.do` 통과, **연도 경계 거부**(`...2021.do`, `...2026.do`),
     유사 경로 거부(예: `/YTAFakeMgr2024.do`, `/YTASummaryMgr2024.do.jsp`)
   - CommonCode.do queryId: 허용 2종 통과, 그 외 queryId·queryId 부재 시 거부
   - `/kiwibox` 보정 부재 확인: hrBaseUrl이 루트 origin일 때 `hrBase + path` 그대로 호출
3. **통합(로컬)**: mock TeamplGPT(SSE에 clientToolRequest 1건 방출 + tool-result 수신
   검증) + mock kiwibox(form 파라미터·쿠키 assert) + 테스트 페이지(hidden input
   searchUserId 포함)로 전 체인 왕복.
4. **실환경(ntest.5240.kr)**: 챗봇에서 "연차 며칠 남았어?" → 본인 데이터 응답 확인.
   두 계정으로 각자 본인 데이터만 나오는지 교차 확인(다중 사용자 핵심 검증).
   로그아웃 상태에서 "세션 만료" 안내 확인.

## 7. 완료 기준 (Definition of Done)

- [ ] W1·W2·W3 구현 + 단위 테스트 PASS
- [ ] 통합 왕복: clientToolRequest → 브리지 fetch → tool-result → LLM 최종 답변
- [ ] 두 사용자 계정 교차 검증 — 타인 데이터 미노출
- [ ] allowlist 외 경로·searchType=mobile 거부 동작 확인
- [x] CommonCode queryId 화이트리스트 외 거부 + YTA 미지원 연도(2021·2026) 거부 — 단위 테스트 확인(2026-07-20)
- [x] 타임아웃 중첩(브리지 20s < 위젯 25s < broker 30s) — 코드·테스트 반영(2026-07-20)
- [x] hrBridge.ts `/kiwibox` 자동 보정 제거 (§4 정정 반영, 2026-07-20)
- [x] sessionId UUID 강제 — customerId(ObjectId) 직접 사용 제거 (필수 수정 2, 2026-07-20)
- [ ] Origin/allowlist 매칭 — 운영 env(TEAMPLGPT_WIDGET_ORIGIN)와 embed
      allowlist_domains 동일 값 설정 후 401 미발생 확인
- [ ] 로그에 JSESSIONID·HR 응답 body 미기록 확인
- [x] hrBaseUrl 컨텍스트 경로: ntest.5240.kr 루트 배포 확정(§4 정정) — /kiwibox 보정 금지.
      다른 고객사 배포의 baseURL 형태는 배포별 확인(대개 hrBaseUrl에 이미 포함)

## 8. 주의사항

- 브리지·chatbot 코드에 kiwibox 세션 값을 저장·전송하는 코드 금지 — 세션은
  브리지의 same-origin fetch에서 브라우저가 자동 처리하는 것으로 끝.
- TeamplGPT 서버 broker는 인메모리 — TeamplGPT 다중 인스턴스 배포 시 sticky session
  필요(위젯 서버 프록시가 keep-alive로 단일 연결 유지하므로 프록시 측 영향 없음).
- 커밋은 okrservice 컨벤션(Conventional Commits, scope=messenger) 준수.
