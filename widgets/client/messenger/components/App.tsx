import * as React from "react";

import MessengerContainer from "../containers/Messenger";
import { useConversation } from "../context/Conversation";

type Props = {
  showLauncher: boolean;
};

// check is mobile
const isMobile =
  navigator.userAgent.match(/iPhone/i) ||
  navigator.userAgent.match(/iPad/i) ||
  navigator.userAgent.match(/Android/i);

const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const App: React.FC<Props> = ({ showLauncher }) => {
  const { isMessengerVisible, toggle } = useConversation();

  const handleHideWidget = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    toggle(true);
  };
  
  return isMessengerVisible ? (
    <div className="erxes-messenger">
      {isMobile && (
        <button 
          className="mobile-close-button"
          onClick={handleHideWidget}
          aria-label="닫기"
          dangerouslySetInnerHTML={{ __html: CLOSE_ICON_SVG }}
        />
      )}
      <MessengerContainer />
    </div>
  ) : null;
};

export default App;
