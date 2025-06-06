import * as React from "react";
import * as classNames from "classnames";

import { IParticipator, IUser } from "../../types";
import { IconCamera, IconMore, IconPhone, iconClose } from "../../icons/Icons";
import { getCallData, getMessengerData, getUiOptions } from "../utils/util";

import Button from "./common/Button";
import Container from "./common/Container";
import ConversationHeadContent from "./ConversationHeadContent";
import Dropdown from "./common/Dropdown";
import { IMessage } from "../types";
import { MESSAGE_TYPES } from "../constants";
import MessageSender from "../containers/MessageSender";
import MessagesList from "../containers/MessagesList";
import { __ } from "../../utils";
import { connection } from "../connection";
import { useConversation } from "../context/Conversation";
import { useMessage } from "../context/Message";
import { useRouter } from "../context/Router";

type Props = {
  messages: IMessage[];
  goToConversationList: () => void;
  supporters: IUser[];
  participators: IParticipator[];
  operatorStatus?: string;
  isOnline: boolean;
  color?: string;
  loading?: boolean;
  refetchConversationDetail?: () => void;
  errorMessage: string;
  showTimezone?: boolean;
  isLoading: boolean;
};

type State = {
  isFocused: boolean;
  expanded: boolean;
  isFullHead: boolean;
  isMinimizeVideoCall: boolean;
};

const ConversationDetail: React.FC<Props> = ({
  messages,
  participators,
  supporters,
  goToConversationList,
  refetchConversationDetail,
  operatorStatus,
  isOnline,
  loading,
  errorMessage,
  showTimezone,
  isLoading,
}) => {
  const { activeConversationId, toggle, endConversation, exportConversation } =
    useConversation();
  const { sendMessage } = useMessage();

  const { color } = getUiOptions();
  const textColor = getUiOptions().textColor || "#fff";
  const isChat = Boolean(!connection.setting.email);

  const [isFocused, setIsFocused] = React.useState(true);
  const [isMinimizeVideoCall, setIsMinimizeVideoCall] = React.useState(true);

  const toggleVideoCall = () => {
    setIsMinimizeVideoCall(!isMinimizeVideoCall);
  };

  const inputFocus = () => {
    setIsFocused(true);
  };

  const onTextInputBlur = () => {
    setIsFocused(false);
  };

  const toggleLauncher = () => {
    toggle(true);
  };

  const renderCallButtons = () => {
    const callData = getCallData();
    const { setActiveRoute } = useRouter();

    if (callData.isReceiveWebCall) {
      return (
        <Button
          title="Audio call"
          icon={<IconPhone size="1.4375rem" />}
          onClick={() => setActiveRoute("call")}
          className="bg-none"
        />
      );
    }

    if (
      !(isOnline && getMessengerData().showVideoCallRequest) ||
      !connection.enabledServices.dailyco
    ) {
      return null;
    }

    return (
      <>
        {/* <Button
          title="Audio call"
          icon={<IconPhone size="1.4375rem" />}
          onClick={() => sendMessage(MESSAGE_TYPES.VIDEO_CALL_REQUEST, "")}
          className="bg-none"
        /> */}

        <Button
          title="Video call"
          icon={<IconCamera size="1.6875rem" />}
          onClick={() => sendMessage(MESSAGE_TYPES.VIDEO_CALL_REQUEST, "")}
          className="bg-none"
        />
      </>
    );
  };

  const renderRightButton = () => {
    if (!isChat) {
      return (
        <Button
          icon={iconClose(textColor)}
          onClick={toggleLauncher}
          title="Close"
        />
      );
    }

    return (
      <div className="conversation-btn-list">
        {renderCallButtons()}
        <Dropdown
          trigger={<IconMore size="1.5rem" />}
          menu={[
            <button onClick={endConversation}>{__("End conversation")}</button>,
            <button onClick={toggleLauncher}>{__("Close")}</button>,
            ...(activeConversationId
              ? [
                  <button onClick={exportConversation}>
                    {__("Export conversation")}
                  </button>,
                ]
              : []),
          ]}
        />
      </div>
    );
  };

  const rootClasses = classNames("erxes-content-wrapper", {
    "mini-video": isMinimizeVideoCall,
  });

  const placeholder = !messages.length
    ? __("Send a message")
    : `${__("Write a reply")}...`;

  // const handleLeftClick = (e: React.FormEvent<HTMLButtonElement>) => {
  //   e.preventDefault();
  //   goToConversationList();

  //   // leave video call if you are in
  //   const videoIframe = document.getElementById("erxes-video-iframe");

  //   if (videoIframe) {
  //     videoIframe.remove();
  //   }
  // };

  return (
    <Container
      withBottomNavBar={false}
      containerStyle={{ padding: "1.12rem 0" }}
      title={
        isLoading ? (
          <div className="loader" />
        ) : (
          <div className="flex flex-1 justify-between">
            <ConversationHeadContent
              supporters={supporters}
              participators={participators}
              showTimezone={showTimezone}
              isOnline={isOnline}
              color={color}
              loading={loading}
            />
            {renderRightButton()}
          </div>
        )
      }
      backRoute="allConversations"
    >
      <div className="erxes-conversation-detail">
        <div className="erxes-conversation-content">
          <div id="page-root" className={rootClasses}>
            <MessagesList
              isOnline={isOnline}
              messages={messages}
              color={color}
              inputFocus={inputFocus}
              toggleVideoCall={toggleVideoCall}
              refetchConversationDetail={refetchConversationDetail}
              operatorStatus={operatorStatus}
              errorMessage={errorMessage}
              isLoading={isLoading}
            />

            <MessageSender
              placeholder={placeholder ? placeholder.toString() : ""}
              isParentFocused={isFocused}
              onTextInputBlur={onTextInputBlur}
              collapseHead={inputFocus}
              isOnline={isOnline}
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ConversationDetail;
