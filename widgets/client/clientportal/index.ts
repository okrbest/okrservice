/**
 * 엔트리: 정적 import를 최소화하고, 리스너 설치 후 clientportal-ready 를 보냅니다.
 * webpackMode: "eager" 로 bootstrap-logic 을 같은 번들에 묶어 추가 chunk 404 를 피합니다.
 */
function announce(payload: object) {
  try {
    if (window.parent !== window) {
      window.parent.postMessage(payload, '*')
    }
  } catch {
    /* ignore */
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function showRootDiagnostic(message: string) {
  const el = document.getElementById('root')
  if (!el) return
  el.innerHTML =
    '<div style="padding:24px;font:14px system-ui,sans-serif;max-width:480px;margin:24px auto;color:#b00020;line-height:1.5">' +
    '<strong>클라이언트 포털 번들 오류</strong><p style="margin:12px 0 0">' +
    escapeHtml(message) +
    '</p><p style="margin:12px 0 0;color:#444;font-size:13px">Network에서 <code>/build/clientportal.bundle.js</code> 가 200인지, Console에 빨간 오류가 있는지 확인하세요.</p></div>'
}

import(/* webpackChunkName: "clientportal-app", webpackMode: "eager" */ './bootstrap-logic')
  .then((mod) => {
    try {
      mod.installClientPortalListeners(announce)
      announce({ type: 'clientportal-ready', version: 1 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      showRootDiagnostic('위젯 리스너 설치 실패: ' + message)
      announce({
        type: 'clientportal-error',
        message: '위젯 리스너 설치 실패: ' + message,
      })
    }
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    showRootDiagnostic('위젯 모듈 로드 실패: ' + message)
    announce({
      type: 'clientportal-error',
      message: '위젯 모듈 로드 실패: ' + message,
    })
  })
