import * as React from 'react';
import Container from '../common/Container';
import { useRouter } from '../../context/Router';
import { CHATBOT_BACK_EVENT } from './getHrBaseUrl';

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

  // url이 바뀌면 이전 iframe(MobileMain 등) 잔상을 버리고 다시 연다
  React.useEffect(() => {
    setBlocked(false);
  }, [url]);

  React.useEffect(() => {
    const backEvent = backEventFromUrl(url);
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UNAUTHORIZED' || event.data?.status === 401) {
        // 모바일 iframe에 머물지 않고 챗봇으로 돌아가 만료 안내
        setSessionExpiredNotice(true);
        setRoute('chatbot');
        return;
      }
      // 5240 완료 알림 후 postMessage — URL backEvent(기본 CHATBOT_BACK)
      if (event.data?.type === backEvent) {
        setRoute('chatbot');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [url, setRoute, setSessionExpiredNotice]);

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
          title={title}
          src={url}
          className="websiteApp"
          style={{ width: '100%', height: '100%', border: 'none' }}
          onError={() => setBlocked(true)}
        />
      </div>
    </Container>
  );
};

export default ChatbotIframeView;
