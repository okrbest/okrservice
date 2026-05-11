import * as React from "react";
import Container from "../common/Container";
import { useRouter } from "../../context/Router";

type Props = {
  title: string;
  url: string;
};

const ChatbotIframeView: React.FC<Props> = ({ title, url }) => {
  const { setRoute } = useRouter();

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
        />
      </div>
    </Container>
  );
};

export default ChatbotIframeView;
