import * as React from "react";

import { getCallData, getMessengerData } from "../utils/util";

import AccquireInformationContainer from "../containers/AccquireInformation";
import ArticleDetailContainer from "../containers/faq/ArticleDetail";
import CallContainer from "../containers/call/CallContainer";
import CategoryDetail from "../containers/faq/CategoryDetail";
import ConversationDetailContainer from "../containers/ConversationDetail";
import ConversationListContainer from "../containers/ConversationList";
import FaqCategories from "./faq/FaqCategories";
import Home from "../containers/Home";
import { IUser } from "../../types";
import TicketContainer from "../containers/ticket/TicketContainer";
import TicketForget from "./ticket/TicketForget";
import TicketListContainer from "../containers/ticket/TicketListContainer";
import TicketShowProgressContainer from "../containers/ticket/TicketShowProgress";
import TicketSubmitContainer from "../containers/ticket/TicketSubmitForm";
import WebsiteAppDetailContainer from "../containers/websiteApp/WebsiteAppDetail";

type Props = {
  activeRoute: string | "";
  supporters: IUser[];
  loading: boolean;
  isOnline?: boolean;
};

function Messenger({
  activeRoute,
  isOnline = false,
  supporters,
  loading,
}: Props) {
  const messengerData = getMessengerData();
  const topicId = messengerData.knowledgeBaseTopicId;

  const WithSupporters = (Component: any) => {
    return (
      <Component
        supporters={supporters}
        loading={loading}
        isOnline={isOnline}
      />
    );
  };

  const renderSwitch = () => {
    switch (activeRoute) {
      case "allConversations":
        return <ConversationListContainer loading={loading} />;
      case "conversationDetail":
      case "conversationCreate":
        return WithSupporters(ConversationDetailContainer);

      // get user's contact information
      case "accquireInformation":
        return <AccquireInformationContainer loading={loading} />;

      case "faqCategory":
        return <CategoryDetail loading={loading} />;

      case "faqArticle":
        return <ArticleDetailContainer loading={loading} />;

      case "websiteApp":
        return <WebsiteAppDetailContainer loading={loading} />;

      case "faqCategories":
        return <FaqCategories topicId={topicId} loading={loading} />;
      case "ticket":
        return <TicketContainer loading={loading} />;
      case "ticket-submit":
        return <TicketSubmitContainer loading={loading} />;
      case "ticket-forget":
        return <TicketForget />;
      case "ticket-progress":
        return <TicketShowProgressContainer loading={loading} />;
      case "ticket-list":
        return <TicketListContainer loading={loading} />;

      case "call":
        const callData = getCallData();
        return callData && <CallContainer />;

      default:
        return WithSupporters(Home);
    }
  };
  return renderSwitch();
}

export default Messenger;
