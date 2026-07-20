/**
 * TeamplGPT HR Bridge — kiwibox 페이지(로더 번들 실행 컨텍스트)에서 동작하는
 * R1 클라이언트 실행 위임 브리지 (TeamplGPT specs/003).
 *
 * chatbot iframe의 HR 도구 실행 요청(postMessage)을 받아 kiwibox 엔드포인트를
 * same-origin fetch(JSESSIONID 자동 동반)로 실행하고 결과를 회신한다.
 * 세션 쿠키는 이 페이지(브라우저) 밖으로 절대 나가지 않는다.
 *
 * 보안 장치:
 *  - event.source(iframe contentWindow) + event.origin(위젯 서버 origin) 이중 검증
 *  - endpoint allowlist: 정적 22개 + YTA 정규식 외 실행 거부
 *  - 범용 endpoint(/CommonCode.do)는 queryId 화이트리스트 병행 — 임의 쿼리 차단
 *  - self 강제: "$SELF_STAFF_ID" 마커를 페이지 DOM의 본인 STAFF_ID로만 치환
 *  - 게이트 스킵 값 차단: searchType=mobile 거부
 *
 * 등록 조건: window.erxesSettings.messenger.hrBaseUrl 존재 시에만
 * (다른 고객사 배포에 무영향).
 */
declare const window: any;

const SELF_MARKER = "$SELF_STAFF_ID";
const REQUEST_TYPE = "teamplgpt:hr-tool-request";
const RESULT_TYPE = "teamplgpt:hr-tool-result";
const FETCH_TIMEOUT_MS = 20000;

// HR 스킬 7종이 사용하는 kiwibox 정적 경로 22개 — 정확 매칭 (작업지시서 §1.5)
const ALLOWED_PATHS = [
  // hr-attendance
  "/TAAWrkTimeListMgrByDate.do",
  "/TAAWrkTimeStatusMgr.do",
  "/TAADclzWorkSearchCldr.do",
  "/TAADclzWorkOtSchdul.do",
  "/TAADclzVcatnCldrMgr.do",
  "/getMBLLeavDetailStaff.do",
  "/getMBLHomeLeaveDetail.do",
  // hr-personnel
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
  "/SALSalaryDtstmnMgr.do",
  "/SALDaylabMgr.do",
  "/CommonCode.do",
  // hr-approval
  "/EAPRequestMgr.do",
  // hr-certificate
  "/CTIMcrtfReqstRefromMgr.do",
  // hr-welfare
  "/LONLoanReqstListMgr.do",
];

// hr-year-end-tax: 연말정산 컨트롤러가 연도별 분리 — endpoint 6개 × 지원연도(2022~2025)만
// 허용. 연도 확장 시 이 정규식과 TeamplGPT 스킬 양쪽 갱신 (작업지시서 §1.5).
const YTA_PATH_RE =
  /^\/YTA(SummaryMgr|YndMedDtlMgr|YtaFamilySttusMgr|YndBefWrkDtlMgr|YndGivPayDtlMgr|InDctMgr)(2022|2023|2024|2025)\.do$/;

// 게이트 스킵/위험 파라미터 값 차단 (작업지시서 §1.5)
const FORBIDDEN_PARAM_VALUES: Record<string, string[]> = {
  searchType: ["mobile"],
};

// 범용 endpoint는 queryId 화이트리스트 병행 — 임의 쿼리 실행 차단 (작업지시서 §1.5).
// 목록에 없는 path는 이 제약을 받지 않음.
const QUERY_ID_ALLOWLIST: Record<string, string[]> = {
  "/CommonCode.do": ["getSalYmdTypeCdList", "getSalYmdTypeCdList2"],
};

interface BridgeReply {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * kiwibox 내부 STAFF_ID 조회 (작업지시서 §1.4).
 * main.jsp에 #searchUserId가 2개 존재(2044 값 있음 / 2176 빈 값) —
 * getElementById가 빈 값을 반환하면 값 있는 input으로 폴백.
 * ⚠️ 사번(#userNo, ssnStaffNo)과 다른 값 — userNo 치환 금지.
 */
function resolveStaffId(): string | null {
  const el = document.getElementById("searchUserId") as HTMLInputElement | null;
  if (el && el.value) return el.value;
  const fallback = document.querySelector(
    'input#searchUserId[value]:not([value=""])'
  ) as HTMLInputElement | null;
  if (fallback && fallback.value) return fallback.value;
  return null;
}

/**
 * kiwibox 요청 base URL — hrBaseUrl 값을 그대로 사용(끝 슬래시만 제거).
 * ⚠️ /kiwibox 자동 보정 금지: ntest.5240.kr은 루트 배포(getContextPath()="")라
 * 보정하면 404 (작업지시서 §4 정정, 2026-07-16 실측). 컨텍스트 경로가 있는
 * 배포는 hrBaseUrl 값에 이미 포함돼 있다. 값이 비면 location.origin 폴백.
 */
function resolveHrBase(hrBaseUrl: string): string {
  const base = String(hrBaseUrl || "").replace(/\/$/, "");
  return base || window.location.origin;
}

export function initHrBridge(iframe: HTMLIFrameElement): void {
  const hrBaseUrl = window.erxesSettings?.messenger?.hrBaseUrl;
  if (!hrBaseUrl) return; // hrBaseUrl 없는 배포에는 브리지 미등록

  let widgetOrigin: string;
  try {
    widgetOrigin = new URL(iframe.src).origin;
  } catch {
    return;
  }

  const hrBase = resolveHrBase(hrBaseUrl);

  const reply = (callId: string, result: BridgeReply) => {
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: RESULT_TYPE, callId, ...result },
      widgetOrigin
    );
  };

  window.addEventListener("message", (event: MessageEvent) => {
    // 이중 검증: chatbot iframe에서 온, 위젯 서버 origin의 메시지만 처리
    if (event.source !== iframe.contentWindow) return;
    if (event.origin !== widgetOrigin) return;

    const msg = event.data;
    if (!msg || msg.type !== REQUEST_TYPE || !msg.callId || !msg.spec) return;

    const { callId, spec } = msg;

    if (
      ALLOWED_PATHS.indexOf(spec.path) === -1 &&
      !YTA_PATH_RE.test(spec.path)
    ) {
      reply(callId, { ok: false, status: 0, body: "bridge: path not allowed" });
      return;
    }

    const form = new URLSearchParams();
    const formObj: Record<string, unknown> = spec.form || {};

    const allowedQueryIds = QUERY_ID_ALLOWLIST[spec.path];
    if (
      allowedQueryIds &&
      allowedQueryIds.indexOf(String(formObj.queryId ?? "")) === -1
    ) {
      reply(callId, {
        ok: false,
        status: 0,
        body: "bridge: queryId not allowed",
      });
      return;
    }

    for (const key of Object.keys(formObj)) {
      let value = String(formObj[key]);
      if (
        FORBIDDEN_PARAM_VALUES[key] &&
        FORBIDDEN_PARAM_VALUES[key].indexOf(value) !== -1
      ) {
        reply(callId, {
          ok: false,
          status: 0,
          body: "bridge: forbidden param value",
        });
        return;
      }
      if (value === SELF_MARKER) {
        const staffId = resolveStaffId();
        if (!staffId) {
          reply(callId, {
            ok: false,
            status: 0,
            body: "bridge: staffId not found",
          });
          return;
        }
        value = staffId; // self 강제 — 페이지 컨텍스트의 본인 STAFF_ID만
      }
      form.append(key, value);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch(hrBase + spec.path, {
      method: "POST",
      credentials: "same-origin", // JSESSIONID 자동 동반 — 세션은 페이지 밖으로 안 나감
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal,
    })
      .then((response) =>
        response.text().then((body) => {
          reply(callId, { ok: response.ok, status: response.status, body });
        })
      )
      .catch((e: Error) => {
        reply(callId, {
          ok: false,
          status: 0,
          body: `bridge: fetch failed - ${e.message}`,
        });
      })
      .then(() => clearTimeout(timer));
  });
}
