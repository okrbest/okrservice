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
 *  - endpoint allowlist: 등록된 kiwibox 경로 외 실행 거부
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

// hr-attendance + hr-personnel 이 사용하는 kiwibox 경로 전체 (작업지시서 §1.5)
const ALLOWED_PATHS = [
  "/TAAWrkTimeListMgrByDate.do",
  "/TAAWrkTimeStatusMgr.do",
  "/TAADclzWorkSearchCldr.do",
  "/TAADclzWorkOtSchdul.do",
  "/TAADclzVcatnCldrMgr.do",
  "/getMBLLeavDetailStaff.do",
  "/getMBLHomeLeaveDetail.do",
  "/getMBLPrtEmpCard.do",
  "/getMBLPrtEmpCardPop.do",
  "/getMBLHrBassiemOrgList.do",
  "/getMBLHrBassiemMemberList.do",
  "/getTodoIconCnt.do",
  "/getScheduleDay.do",
  "/getContactList.do",
];

// 게이트 스킵/위험 파라미터 값 차단 (작업지시서 §1.5)
const FORBIDDEN_PARAM_VALUES: Record<string, string[]> = {
  searchType: ["mobile"],
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
 * kiwibox 요청 base URL. hrBaseUrl이 컨텍스트 경로(/kiwibox)를 포함하지 않으면
 * 보정한다 (작업지시서 §4 — 실측 전 안전 기본값: pathname 없으면 /kiwibox 부여).
 * 값이 비거나 파싱 불가면 location.origin 폴백.
 */
function resolveHrBase(hrBaseUrl: string): string {
  let base = String(hrBaseUrl || "").replace(/\/$/, "");
  if (!base) return `${window.location.origin}/kiwibox`;
  try {
    const url = new URL(base);
    if (url.pathname === "" || url.pathname === "/") {
      return `${url.origin}/kiwibox`;
    }
    return base;
  } catch {
    return `${window.location.origin}/kiwibox`;
  }
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

    if (ALLOWED_PATHS.indexOf(spec.path) === -1) {
      reply(callId, { ok: false, status: 0, body: "bridge: path not allowed" });
      return;
    }

    const form = new URLSearchParams();
    const formObj: Record<string, unknown> = spec.form || {};
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
