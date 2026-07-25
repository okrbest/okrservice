# 작업지시서: HR 스킬 엔드포인트 재정렬(specs/011)에 따른 messenger 브리지 갱신

작성: 2026-07-24 · 발주 리포: teamplgpt (`specs/011-hr-endpoint-catalog-realign/`, 커밋 `9955b527`)
대상 리포: okrservice (`widgets/client/messenger`) · 선행 지시서: `teamplgpt-hr-client-tools-workorder.md`(2026-07-16)

## 0. 배경 — 무엇이 바뀌었나

TeamplGPT HR 스킬 6종이 kiwibox 신판 엔드포인트 카탈로그
(`cmmAiAssistantToolEndpoints.md`, last_verified 2026-07-24)에 맞춰 재정렬됐다:

| 변경 | 구 endpoint | 신 endpoint |
|---|---|---|
| 연차 잔여 (annual_leave_balance) | `/getMBLHomeLeaveDetail.do` (폐기) | **`/TAADclzVcatnList.do`** (cmd=getTAADclzVcatnList1) |
| 휴가 신청 상세 (leave_requests) | `/getMBLLeavDetailStaff.do` (폐기) | **`/TAADclzVcatnList.do`** (cmd=getTAADclzVcatnList2) |
| 출퇴근 기록 (timesheet) | `/TAAWrkTimeListMgrByDate.do` (폐기) | `/TAAWrkTimeStatusMgr.do` (기존 allowlist에 있음) |
| 월별 지급내역 (salary_statement) | `/SALSalaryDtstmnMgr.do` (폐기) | **`/SALSalaryBassMgr.do`** (cmd=getSALSalaryBassMgrTab110List) |
| 그 외 (근태·급여·결재·증명서·대출·교육) | 경로 동일 | BODY 파라미터만 보강 |

전체 to-be 요청 계약: teamplgpt `specs/011-hr-endpoint-catalog-realign/contracts/kiwibox-request-bodies.md`.

## 1. 영향 분석 결과 (2026-07-24 코드 실측 — hrBridge.ts / clientTools.ts / hrBridge.test.ts)

### 🔴 영향 1 — 브리지 path allowlist 미포함으로 신규 endpoint 즉시 차단 (필수 수정)

`widgets/client/messenger/widget/hrBridge.ts`의 `ALLOWED_PATHS`(정적 22개)에
**`/TAADclzVcatnList.do`·`/SALSalaryBassMgr.do`가 없다.**
브리지는 allowlist 외 경로를 `"bridge: path not allowed"`로 거부하므로(hrBridge.ts:138-144),
클라이언트 위임(embed) 모드에서 아래 3개 query_type이 **전부 실패**한다:

- `annual_leave_balance` — "연차 얼마 남았어?" (**skill description상 기본 폴백 query_type — 최다 빈도**)
- `leave_requests` — "내 휴가 신청 내역"
- `salary_statement` — "월별 급여 이력"

서버 폴백 모드(TeamplGPT 단독 테스트)는 브리지를 안 타므로 무영향 — **위젯 배포에서만 터지는 회귀**라
TeamplGPT 쪽 E2E로는 잡히지 않는다. 반드시 브리지 수정 필요.

### 🟡 영향 2 — 폐기 endpoint 4종이 allowlist에 잔존 (권장 정리)

스킬이 더는 호출하지 않는(TeamplGPT specs/011 SC-004: 호출 코드 0건) 4종이 allowlist에 남아 있다.
최소권한 원칙상 제거 권장 (기능 영향 없음 — 보안 표면 축소):

- `/TAAWrkTimeListMgrByDate.do` (TAA-0360 관리자형)
- `/getMBLLeavDetailStaff.do`
- `/getMBLHomeLeaveDetail.do`
- `/SALSalaryDtstmnMgr.do` (SAL-0220 폐기)

⚠️ `getMBLPrtEmpCard.do`/`getMBLPrtEmpCardPop.do` 등 hr-personnel 계열 모바일 경로는
**유지** — profile 교체는 TeamplGPT specs/011 D6에서 보류(별도 스펙)라 여전히 호출된다.

### 🟢 무영향 확인 (수정 불요 — 검증 완료 항목)

| 항목 | 판정 근거 |
|---|---|
| 신규 BODY 파라미터(§3 휴가 공통 BODY, searchType=web/2, searchYm, 기간, 사번 3중 지정) | 브리지는 파라미터 allowlist가 없고 `FORBIDDEN_PARAM_VALUES`는 `searchType=mobile`만 차단 — `web`·`2` 통과 |
| `$SELF_STAFF_ID` 다중 파라미터 치환(staffId+cmmSearchStaffId+searchStaffId) | 브리지가 **값 단위**로 마커를 검사·치환(hrBridge.ts:175-186) — 파라미터 개수 무관, 기존 로직 그대로 동작 |
| `/CommonCode.do` queryId 화이트리스트 | 스킬은 여전히 `getSalYmdTypeCdList2`만 사용 — 이미 허용 목록에 있음. searchYm 형식 변경(YYYY-MM 하이픈)은 값이라 무관 |
| YTA 정규식 | hr-year-end-tax 스킬 무변경 — `YTA_PATH_RE` 유지 |
| `clientTools.ts` (iframe 측) | path 무검증 통과 프로토콜 — 수정 불요 |
| 타임아웃 중첩 계약(브리지 20s < 위젯 25s < broker 30s) | 스킬 타임아웃 무변경 — 유지 |
| Referer 게이트(신판 카탈로그 §0: Referer 부재 시 302 바운스) | 브리지 same-origin fetch는 브라우저가 페이지 URL을 Referer로 자동 첨부 — 통과 |
| 위젯 서버 프록시(`/ai-chat/stream`·`/ai-chat/tool-result`) | 경로·프로토콜 무변경 |

## 2. 작업 지시

### W1 (필수) — `hrBridge.ts` ALLOWED_PATHS 갱신

```ts
// widgets/client/messenger/widget/hrBridge.ts
const ALLOWED_PATHS = [
  // hr-attendance
  "/TAAWrkTimeStatusMgr.do",       // timesheet·work_status (TAA-1410 정본)
  "/TAADclzWorkSearchCldr.do",
  "/TAADclzWorkOtSchdul.do",
  "/TAADclzVcatnCldrMgr.do",
  "/TAADclzVcatnList.do",          // ★ 추가: 연차잔여(List1)·휴가상세(List2) — specs/011 D2
  // hr-personnel (D6 보류로 모바일 경로 유지)
  "/getMBLPrtEmpCard.do",
  "/getMBLPrtEmpCardPop.do",
  "/getMBLHrBassiemOrgList.do",
  "/getMBLHrBassiemMemberList.do",
  "/getTodoIconCnt.do",
  "/getScheduleDay.do",
  "/getContactList.do",
  "/PRCHrBassiemMgrTab220.do",
  // hr-salary
  "/SALPayslipNewMgr.do",
  "/SALSalaryBassMgr.do",          // ★ 추가: 월별지급내역(SAL-0050) — specs/011 D5
  "/SALDaylabMgr.do",
  "/CommonCode.do",
  // hr-approval
  "/EAPRequestMgr.do",
  // hr-certificate
  "/CTIMcrtfReqstRefromMgr.do",
  // hr-welfare
  "/LONLoanReqstListMgr.do",
];
// 제거 4종(폐기): /TAAWrkTimeListMgrByDate.do, /getMBLLeavDetailStaff.do,
//                /getMBLHomeLeaveDetail.do, /SALSalaryDtstmnMgr.do
```

정적 22개 → **21개** (2 추가, 4 제거). 주석의 "정적 22개" 문구(파일 상단 보안 장치 설명 포함)도 동기화할 것.

### W2 (필수) — `hrBridge.test.ts` 갱신

- 기존 테스트가 `/getMBLHomeLeaveDetail.do`를 대표 허용 경로로 사용(9개소) — 제거 대상이므로
  대표 경로를 `/TAADclzVcatnList.do`로 교체.
- 추가 케이스:
  1. `/TAADclzVcatnList.do`·`/SALSalaryBassMgr.do` → 통과(fetch 실행)
  2. 폐기 4종 각각 → `"bridge: path not allowed"` 거부 (allowlist 축소 회귀 방지)
  3. 마커 3중 파라미터(`staffId`·`cmmSearchStaffId`·`searchStaffId` 모두 `$SELF_STAFF_ID`) →
     세 값 모두 페이지 STAFF_ID로 치환되어 form에 반영
- 기존 통과 유지: searchType=mobile 거부, queryId 화이트리스트, origin 이중 검증.

### W3 (선택·후속) — 선행 지시서 §1.5 문구 갱신

`teamplgpt-hr-client-tools-workorder.md` §1.5의 "정적 22개" 목록이 구판 기준 —
본 지시서를 참조하도록 각주 추가 또는 목록 교체.

## 3. 검증

1. **단위**: `hrBridge.test.ts` 전건 PASS (신규 케이스 포함).
2. **실환경 스모크** (ntest.5240.kr에 위젯 배포 후, TeamplGPT embed 위임 모드):
   - "연차 얼마 남았어?" → 브리지 Network 탭에서 `POST /TAADclzVcatnList.do`
     (body에 `cmd=getTAADclzVcatnList1`·`chkAppYn=Y`·`wkareaCd=…`) 확인, 휴가종류별 잔여 테이블 응답.
   - "내 휴가 신청 내역" → 동일 경로 `cmd=getTAADclzVcatnList2`.
   - "월별 급여 이력" → `POST /SALSalaryBassMgr.do`.
   - "출퇴근 기록" → `POST /TAAWrkTimeStatusMgr.do` (구 `/TAAWrkTimeListMgrByDate.do` 미호출 확인).
   - 콘솔에 `bridge: path not allowed` 0건.
3. **회귀**: 결재함·증명서·대출·교육이력·연말정산 각 1회 — 기존 경로 정상(파라미터 보강은 브리지 통과 확인만).

## 4. 배포 순서 주의

브리지(okrservice)와 스킬(teamplgpt)은 **브리지 선배포가 안전**:
신 allowlist는 구 스킬과도 호환(구 경로 4종 제거 전까지는 완전 호환, 제거 후에도 구 스킬의 폐기 경로
호출은 이미 신 스킬 배포로 소멸). 역순(스킬 선배포) 시 브리지 갱신 전까지 연차/휴가/월별지급 3종이
embed에서 실패하므로, 동시 배포 불가하면 **W1 먼저**.
