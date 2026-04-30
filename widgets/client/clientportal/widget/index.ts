/**
 * 클라이언트 포털 임베드 스크립트 (메신저 위젯과 같은 방식)
 *
 * 호스트 페이지 예시:
 * <script>
 *   window.erxesSettings = {
 *     clientportal: {
 *       email: "user@example.com",
 *       code: "비밀번호 (선택 없이 이메일만으로도 로그인 가능)",
 *       clientPortalId: "선택, 단일 포털이면 생략 가능",
 *       name: "선택",
 *       exmOrigin: "선택 — 알림 상대경로 링크 열 때 EXM/포털 웹 베이스 URL",
 *     },
 *   };
 * </script>
 * <script src="http://localhost:3200/build/clientportalWidget.bundle.js" async></script>
 */
import { generateIntegrationUrl, listenForCommonRequests } from '../../widgetUtils'
import './index.css'

declare const window: any

const CONTAINER_ID = 'erxes-clientportal-widget'
const IFRAME_ID = 'erxes-clientportal-iframe'
const CLIENTPORTAL_BUNDLE_NEEDLE = '/build/clientportalWidget.bundle.js'

/** file:// 호스트에서는 상대 URL iframe 이 파일 경로로 풀려 보안 오류가 날 수 있어 항상 http(s) 절대 URL 을 씁니다. */
function absoluteClientPortalUrlFromDom(): string {
  const scripts = document.getElementsByTagName('script')
  for (let i = scripts.length - 1; i >= 0; i--) {
    const el = scripts[i]
    if (!(el instanceof HTMLScriptElement) || !el.src) continue
    const base = el.src.split('?')[0]
    const idx = base.indexOf(CLIENTPORTAL_BUNDLE_NEEDLE)
    if (idx !== -1) {
      return base.slice(0, idx) + '/clientportal'
    }
  }
  return ''
}

function resolveClientPortalFrameUrl(): string {
  const fromBundle = absoluteClientPortalUrlFromDom()
  if (fromBundle !== '') return fromBundle

  let u = generateIntegrationUrl('clientportal')
  if (u !== '' && (u.startsWith('http://') || u.startsWith('https://'))) {
    return u
  }
  if (u !== '' && u.startsWith('/')) {
    if (window.location.protocol === 'file:') {
      return 'http://127.0.0.1:3200/clientportal'
    }
    try {
      return new URL(u, window.location.href).href
    } catch {
      return 'http://127.0.0.1:3200/clientportal'
    }
  }
  return 'http://127.0.0.1:3200/clientportal'
}

function getSettings(): any {
  return window.erxesSettings?.clientportal
}

function buildConnectPayload(): Record<string, string> & { type: string } | null {
  const s = getSettings()
  if (!s || !s.email) return null
  const codeRaw =
    s.code != null ? String(s.code) : s.password != null ? String(s.password) : ''
  const code = codeRaw.trim()
  const email = String(s.email).trim()
  const base: Record<string, string> & { type: string } = {
    type: 'connect',
    email,
    code,
    name: s.name != null ? String(s.name) : '',
  }
  const pid = s.clientPortalId != null ? String(s.clientPortalId).trim() : ''
  if (pid !== '') {
    base.clientPortalId = pid
  }
  return base
}

if (document.getElementById(CONTAINER_ID)) {
  console.warn('[erxes clientportal] 위젯이 이미 삽입되어 있습니다.')
} else {
  const container = document.createElement('div')
  container.id = CONTAINER_ID
  container.className = 'erxes-clientportal-root'

  const panel = document.createElement('div')
  panel.className = 'erxes-clientportal-panel'

  const iframe = document.createElement('iframe')
  iframe.id = IFRAME_ID
  iframe.className = 'erxes-clientportal-frame'
  iframe.src = resolveClientPortalFrameUrl()
  iframe.title = 'Client portal'

  const launcher = document.createElement('button')
  launcher.type = 'button'
  launcher.className = 'erxes-clientportal-launcher'
  launcher.setAttribute('aria-label', '고객 포털 열기')
  launcher.textContent = '포털'

  panel.appendChild(iframe)
  container.appendChild(panel)
  container.appendChild(launcher)
  document.body.appendChild(container)

  let iframeReady = false

  /** iframe 문서·번들이 뜨기 전에 보낸 postMessage 는 유실될 수 있어 load 이후에도 재시도 */
  iframe.addEventListener('load', () => {
    if (!isPanelOpen()) return
    const p = buildConnectPayload()
    if (p) {
      sendConnect()
      scheduleConnectRetries()
    }
  })

  function sendConnect() {
    const payload = buildConnectPayload()
    if (!payload || !iframe.contentWindow) return
    iframe.contentWindow.postMessage(payload, '*')
  }

  function isPanelOpen() {
    return panel.classList.contains('erxes-clientportal-panel--open')
  }

  function setPanelOpen(open: boolean) {
    if (open) {
      panel.classList.add('erxes-clientportal-panel--open')
    } else {
      panel.classList.remove('erxes-clientportal-panel--open')
    }
  }

  function scheduleConnectRetries() {
    const payload = buildConnectPayload()
    if (!payload) return
    const delays = [0, 120, 350, 700]
    delays.forEach((ms) => {
      window.setTimeout(() => {
        if (!isPanelOpen() || !iframe.contentWindow) return
        sendConnect()
      }, ms)
    })
  }

  window.addEventListener('message', (event: MessageEvent) => {
    listenForCommonRequests(event, iframe)
    const d = event.data
    if (d && typeof d === 'object') {
      if (d.type === 'clientportal-error' && d.message) {
        console.error('[erxes clientportal iframe]', d.message)
      }
      if (d.type === 'clientportal-ready') {
        iframeReady = true
        if (isPanelOpen()) {
          scheduleConnectRetries()
        }
      }
    }
  })

  launcher.addEventListener('click', () => {
    if (isPanelOpen()) {
      setPanelOpen(false)
      return
    }
    const payload = buildConnectPayload()
    if (!payload) {
      console.warn(
        '[erxes clientportal] 이메일이 없습니다. 테스트 페이지에서 이메일 입력 후 「적용 후 위젯 로드」로 저장하세요.'
      )
    }
    setPanelOpen(true)
    if (payload) {
      sendConnect()
      scheduleConnectRetries()
    }
  })
}
