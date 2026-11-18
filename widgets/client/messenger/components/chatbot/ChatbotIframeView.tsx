import * as React from 'react';
import Container from '../common/Container';
import { useRouter } from '../../context/Router';
import { CHATBOT_BACK_EVENT } from './getHrBaseUrl';
import { probeHrSessionAlive } from './menuPermission';
import {
  CHATBOT_HR_IFRAME_SANDBOX,
  IFRAME_SESSION_POLL_MS,
  isPasswordChangeUrl,
  isSessionExpiredIframeLocation,
  shouldReturnForMobileMainFallback,
} from './iframeSessionGuard';

type Props = {
  title: string;
  url: string;
};

const backEventFromUrl = (iframeUrl: string): string => {
  try {
    const parsed = new URL(iframeUrl, 'https://chatbot-iframe.invalid');
    return parsed.searchParams.get('backEvent') || CHATBOT_BACK_EVENT;
  } catch {
    return CHATBOT_BACK_EVENT;
  }
};

const ChatbotIframeView: React.FC<Props> = ({ title, url }) => {
  const { setRoute, setSessionExpiredNotice } = useRouter();
  const [blocked, setBlocked] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const leftRef = React.useRef(false);

  const leaveToChatbot = React.useCallback(
    (expired: boolean) => {
      if (leftRef.current) {
        return;
      }
      leftRef.current = true;
      if (expired) {
        setSessionExpiredNotice(true);
      }
      setRoute('chatbot');
    },
    [setRoute, setSessionExpiredNotice],
  );

  // url이 바뀌면 이전 iframe(MobileMain 등) 잔상을 버리고 다시 연다
  React.useEffect(() => {
    setBlocked(false);
    leftRef.current = false;
  }, [url]);

  React.useEffect(() => {
    const backEvent = backEventFromUrl(url);
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UNAUTHORIZED' || event.data?.status === 401) {
        // 모바일 iframe에 머물지 않고 챗봇으로 돌아가 만료 안내
        leaveToChatbot(true);
        return;
      }
      // 5240 완료 알림 후 postMessage — URL backEvent(기본 CHATBOT_BACK)
      // 이벤트가 오면 C 폴백·세션 폴링보다 먼저 여기서 복귀한다
      if (event.data?.type === backEvent) {
        leaveToChatbot(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [url, leaveToChatbot]);

  // #1: iframe이 열린 뒤에도 세션이 끊기면 만료 안내 후 챗봇으로
  // getMobileMenuList는 로그아웃 후에도 Result:[]라 쓰면 안 됨 — chkLoginSession 사용
  // 비밀번호변경은 세션 없이 열리는 화면이라 폴링하지 않는다
  React.useEffect(() => {
    if (isPasswordChangeUrl(url)) {
      return undefined;
    }

    let cancelled = false;
    const tick = async () => {
      const alive = await probeHrSessionAlive();
      if (cancelled || leftRef.current) {
        return;
      }
      if (!alive) {
        leaveToChatbot(true);
      }
    };

    // 마운트 직후 바로 한 번 보고, 이후 5초 주기로 확인 (로그아웃→챗봇 복귀 지연 완화)
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, IFRAME_SESSION_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [url, leaveToChatbot]);

  const handleIframeLoad = () => {
    // cross-origin이어도 load는 온다(로그아웃→Login 이동 등). 주소는 못 읽어도
    // 공유 쿠키 기준 chkLoginSession으로 바로 만료 여부를 본다.
    void (async () => {
      if (leftRef.current || isPasswordChangeUrl(url)) {
        return;
      }
      const alive = await probeHrSessionAlive();
      if (!alive && !leftRef.current) {
        leaveToChatbot(true);
      }
    })();

    // C 폴백: same-origin일 때만 현재 주소를 볼 수 있다.
    try {
      const href = iframeRef.current?.contentWindow?.location?.href ?? null;
      if (isSessionExpiredIframeLocation(href)) {
        leaveToChatbot(true);
        return;
      }
      if (shouldReturnForMobileMainFallback(url, href)) {
        leaveToChatbot(false);
      }
    } catch {
      // cross-origin — 위 세션 프로브·CHATBOT_BACK에 맡긴다
    }
  };

  const handleOpenPopup = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(
      url,
      '_blank',
      'width=480,height=650,menubar=no,status=no,resizable=yes',
    );
  };

  if (blocked) {
    return (
      <Container
        title={title}
        withBottomNavBar={true}
        onBackButton={() => setRoute('chatbot')}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>
            이 페이지는 보안 정책으로 인해 내부에서 열 수 없습니다.
          </p>
          <button
            type="button"
            onClick={handleOpenPopup}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6f80ff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            새 창으로 열기
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container
      title={title}
      withBottomNavBar={true}
      onBackButton={() => setRoute('chatbot')}
    >
      <div className="erxes-content">
        <iframe
          key={url}
          ref={iframeRef}
          title={title}
          src={url}
          className="websiteApp"
          sandbox={CHATBOT_HR_IFRAME_SANDBOX}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onError={() => setBlocked(true)}
          onLoad={handleIframeLoad}
        />
      </div>
    </Container>
  );
};

export default ChatbotIframeView;
