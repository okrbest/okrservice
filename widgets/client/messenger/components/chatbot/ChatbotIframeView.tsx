import * as React from "react";
import Container from "../common/Container";
import { useRouter } from "../../context/Router";

type Props = {
  title: string;
  url: string;
};

const ChatbotIframeView: React.FC<Props> = ({ title, url }) => {
  const { setRoute } = useRouter();
  const [blocked, setBlocked] = React.useState(false);
  const [authError, setAuthError] = React.useState(false);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UNAUTHORIZED' || event.data?.status === 401) {
        setAuthError(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleOpenPopup = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank', 'width=480,height=650,menubar=no,status=no,resizable=yes');
  };

  if (authError) {
    return (
      <Container
        title={title}
        withBottomNavBar={true}
        onBackButton={() => setRoute("chatbot")}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
            세션이 만료되었습니다.<br />5240 페이지를 새로고침하거나 다시 로그인해주세요.
          </p>
          <button
            onClick={() => window.top?.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6f80ff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            페이지 새로고침
          </button>
        </div>
      </Container>
    );
  }

  if (blocked) {
    return (
      <Container
        title={title}
        withBottomNavBar={true}
        onBackButton={() => setRoute("chatbot")}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>
            이 페이지는 보안 정책으로 인해 내부에서 열 수 없습니다.
          </p>
          <button
            onClick={handleOpenPopup}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6f80ff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
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
      onBackButton={() => setRoute("chatbot")}
    >
      <div className="erxes-content">
        <iframe
          title={title}
          src={url}
          className="websiteApp"
          style={{ width: "100%", height: "100%", border: "none" }}
          onError={() => setBlocked(true)}
        />
      </div>
    </Container>
  );
};

export default ChatbotIframeView;
