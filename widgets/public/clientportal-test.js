/**
 * 클라이언트 포털 위젯(/clientportal) iframe + postMessage(connect) 테스트 도구.
 *
 * 사용: 위젯 서버 실행 후 브라우저에서 (포트는 환경에 맞게)
 *   http://localhost:3200/static/clientportal-test.html  ← 정식 경로
 *   http://localhost:3200/clientportal-test
 *   http://localhost:3200/clientportal-test.html  (둘 다 /static/… 로 리다이렉트)
 *
 * URL 쿼리 예: ?autoconnect=1&email=a@b.com&code=xxx&clientPortalId=yyy&name=test&root=http://localhost:3200
 */
(function () {
  "use strict";

  /** iframe 안 번들이 message 리스너을 달고 나서 보내는 신호 */
  var iframeBundleReady = false;
  var pendingConnect = false;

  function $(id) {
    return document.getElementById(id);
  }

  function log(msg) {
    var el = $("log");
    if (!el) return;
    var line = document.createElement("div");
    line.textContent = new Date().toISOString().slice(11, 19) + " " + msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  /** 위젯 베이스 URL만 (예: http://localhost:3200). 끝에 /clientportal 을 붙이므로 입력에 경로가 있으면 제거 */
  function normalizeWidgetRoot(raw) {
    var v = String(raw || "")
      .trim()
      .replace(/\/+$/, "");
    var suffix = "/clientportal";
    var lower = v.toLowerCase();
    while (lower.endsWith(suffix)) {
      v = v.slice(0, -suffix.length).replace(/\/+$/, "");
      lower = v.toLowerCase();
    }
    return v;
  }

  function currentRoot() {
    var v = ($("root-url") && $("root-url").value) || "";
    return normalizeWidgetRoot(v);
  }

  function resetIframeReady() {
    iframeBundleReady = false;
  }

  function checkBundleFromParent(widgetRoot) {
    if (!widgetRoot) {
      log("번들 확인 생략: Widget root URL이 비어 있습니다.");
      return;
    }
    if (window.location.protocol === "file:") {
      log(
        "⚠ 테스트 HTML을 file:// 로 여셨습니다. fetch가 막혀 번들 HEAD를 확인할 수 없고, postMessage도 불안정할 수 있습니다. " +
          "브라우저 주소창에 http://localhost:3200/static/clientportal-test.html 입력(위젯 서버 포트에 맞게)으로 다시 여세요."
      );
      return;
    }
    var url = widgetRoot + "/build/clientportal.bundle.js";
    fetch(url, { method: "HEAD", mode: "cors", cache: "no-store" })
      .then(function (res) {
        log("번들 HEAD " + res.status + " — " + url);
        if (!res.ok) {
          log("→ 200이 아니면: widgets 에서 yarn dev-webpack, static/clientportal.bundle.js 확인");
        }
      })
      .catch(function (err) {
        log(
          "번들 HEAD 실패: " +
            (err && err.message ? err.message : String(err)) +
            " — 테스트 페이지를 " +
            widgetRoot +
            " 과 **같은 출처(http)** 로 열었는지 확인하세요. (예: " +
            widgetRoot +
            "/static/clientportal-test.html )"
        );
      });
  }

  function setIframeSrc() {
    var iframe = $("cp-iframe");
    var raw = ($("root-url") && $("root-url").value) || "";
    var trimmed = String(raw).trim().replace(/\/+$/, "");
    var root = normalizeWidgetRoot(raw);
    if (!iframe || !root) return;
    resetIframeReady();
    iframe.src = root + "/clientportal";
    if (trimmed !== root) {
      log("(Widget root 정리: /clientportal 중복 제거 → 베이스 " + root + ")");
    }
    log("iframe src → " + iframe.src + " (번들이 clientportal-ready 를 보낼 때까지 연결 대기)");
  }

  function sendConnect(iframe) {
    var payload = {
      type: "connect",
      email: ($("email") && $("email").value.trim()) || "",
      code: ($("code") && $("code").value) || "",
      clientPortalId: ($("clientPortalId") && $("clientPortalId").value.trim()) || "",
      name: ($("name") && $("name").value.trim()) || "",
    };
    if (!payload.email) {
      alert("email은 필수입니다.");
      return;
    }
    if (!payload.code) {
      alert("비밀번호(code)는 필수입니다. (clientPortal 로그인)");
      return;
    }
    if (payload.clientPortalId && payload.clientPortalId.indexOf("@") >= 0) {
      log("⚠ clientPortalId는 MongoDB _id여야 합니다. 비워 두면 서버에 포털이 하나일 때 자동 선택됩니다.");
    }
    iframe.contentWindow.postMessage(payload, "*");
    log("postMessage connect → " + payload.email + " / portalId " + payload.clientPortalId);
  }

  function connect() {
    var iframe = $("cp-iframe");
    if (!iframe || !iframe.contentWindow) {
      alert("iframe이 없습니다.");
      return;
    }
    if (!iframeBundleReady) {
      pendingConnect = true;
      log("아직 iframe 번들 준비 전입니다. clientportal-ready 수신 후 자동으로 연결합니다.");
      return;
    }
    pendingConnect = false;
    sendConnect(iframe);
  }

  window.clientPortalTest = {
    connect: connect,
    reloadIframe: setIframeSrc,
  };

  /** iframe load마다 예전 5초 타이머 제거 */
  var loadDiagTimer = null;

  document.addEventListener("DOMContentLoaded", function () {
    var params = new URLSearchParams(window.location.search);
    var defaultRoot =
      params.get("root") ||
      (typeof window.__CP_TEST_DEFAULT_ROOT__ === "string"
        ? window.__CP_TEST_DEFAULT_ROOT__
        : "") ||
      (window.location.protocol === "file:" ? "" : window.location.origin);
    if (!defaultRoot) {
      defaultRoot = "http://localhost:3200";
    }
    var rootInput = $("root-url");
    if (rootInput) rootInput.value = normalizeWidgetRoot(defaultRoot);

    var btnIframe = $("btn-reload-iframe");
    if (btnIframe) btnIframe.addEventListener("click", setIframeSrc);
    var btnConnect = $("btn-connect");
    if (btnConnect) btnConnect.addEventListener("click", connect);

    /** 반드시 iframe 로드/번들보다 먼저: 그래야 clientportal-ready 를 놓치지 않음 */
    window.addEventListener("message", function (ev) {
      var d = ev.data;
      if (!d || typeof d !== "object") return;

      if (d.type === "widget-bundle-error") {
        log(
          "← 위젯 번들 로드 실패: " +
            (d.widgetType || "") +
            " → " +
            (d.src || "/build/…") +
            " (widgets에서 yarn dev 또는 yarn build-webpack 로 static 번들 생성 여부 확인)"
        );
        return;
      }
      if (d.type === "clientportal-ready") {
        iframeBundleReady = true;
        log("← clientportal-ready (이제 postMessage connect 가능)");
        if (pendingConnect) {
          pendingConnect = false;
          var iframe = $("cp-iframe");
          if (iframe && iframe.contentWindow) sendConnect(iframe);
        }
        return;
      }
      if (d.type === "clientportal-error") {
        log("← 오류(iframe): " + (d.message || JSON.stringify(d)));
        return;
      }
      if (d.type === "clientportal-connected") {
        log("← 연결 성공(clientportal-connected). 위젯 UI 확인.");
        return;
      }
      if (d.type === "clientportal-info") {
        log("← " + (d.message || ""));
        return;
      }
      log("← message " + JSON.stringify(d).slice(0, 200));
    });

    var iframeEl = $("cp-iframe");
    if (iframeEl) {
      iframeEl.addEventListener("load", function () {
        log("iframe load 이벤트 (/clientportal HTML 로드됨)");
        checkBundleFromParent(currentRoot());
        if (loadDiagTimer) {
          clearTimeout(loadDiagTimer);
          loadDiagTimer = null;
        }
        loadDiagTimer = setTimeout(function () {
          loadDiagTimer = null;
          if (!iframeBundleReady) {
            log(
              "⚠ 5초 내 clientportal-ready 없음 → /clientportal 을 새 탭으로 열고 Console 오류 확인. 테스트는 http://…/static/clientportal-test.html 로 여세요(file:// 금지)."
            );
          }
        }, 5000);
      });
    }

    setIframeSrc();

    if (params.get("autoconnect") === "1" || params.get("autoconnect") === "true") {
      if ($("email")) $("email").value = params.get("email") || "";
      if ($("code")) $("code").value = params.get("code") || "";
      if ($("clientPortalId")) {
        $("clientPortalId").value =
          params.get("clientPortalId") || params.get("client_portal_id") || "";
      }
      if ($("name")) $("name").value = params.get("name") || "";
      pendingConnect = true;
    }

    if (window.location.protocol === "file:") {
      log(
        "⚠ file:// 로 연 파일입니다. clientportal-ready/postMessage가 막힐 수 있습니다. http://localhost:3200/static/clientportal-test.html 처럼 위젯 HTTP 주소로 여세요."
      );
    }
    log(
      "준비됨. 테스트 URL: " +
        window.location.href +
        " — 번들 " +
        currentRoot() +
        "/build/clientportal.bundle.js"
    );
  });
})();
