import { Link } from "react-router-dom";
import React from "react";
import dayjs from "dayjs";
import xss from "xss";

import {
  ActivityDate,
  ActivityIcon,
  ActivityRow,
  CenterText,
  Collapse,
  CollapseTrigger,
  ConversationContent,
  Count,
  FlexBody,
  FlexCenterContent,
  Header,
} from "@erxes/ui-log/src/activityLogs/styles";
import {
  Comment,
  PostContainer,
} from "@erxes/ui-inbox/src/inbox/components/conversationDetail/workarea/facebook/styles";
import { IConversation } from "@erxes/ui-inbox/src/inbox/types";
import { __ } from "coreui/utils";
import { renderFullName } from "@erxes/ui/src/utils";
import {
  formatText,
  getIconAndColor,
} from "@erxes/ui-log/src/activityLogs/utils";
import { IIntegration } from "@erxes/ui-inbox/src/settings/integrations/types";
import Icon from "@erxes/ui/src/components/Icon";
import Message from "@erxes/ui-inbox/src/inbox/components/conversationDetail/workarea/conversation/messages/Message";
import Tip from "@erxes/ui/src/components/Tip";
import UserName from "@erxes/ui-inbox/src/inbox/components/conversationDetail/workarea/facebook/UserName";

import { IConversationMessage, IFacebookComment } from "../types";

type Props = {
  activity: any;
  conversation: IConversation;
  messages: IConversationMessage[];
  comments: IFacebookComment[];
};

class ActivityLogs extends React.Component<Props, { toggleMessage: boolean }> {
  constructor(props) {
    super(props);

    this.state = {
      toggleMessage: false,
    };
  }

  onCollapse = () => {
    this.setState({ toggleMessage: !this.state.toggleMessage });
  };

  renderComments() {
    const { comments } = this.props;

    if (!comments || comments.length === 0) {
      return null;
    }

    return comments.map((comment) => (
      <div key={comment.commentId}>
        <Comment>
          <UserName
            username={`${comment.customer.firstName} ${
              comment.customer.lastName || ""
            }`}
          />
          <p
            dangerouslySetInnerHTML={{
              __html: xss(comment.content),
            }}
          />
        </Comment>
      </div>
    ));
  }

  renderMessages() {
    const { conversation, messages } = this.props;

    if (!conversation) {
      return null;
    }

    const { kind } = conversation.integration;

    if (kind === "facebook-post") {
      return (
        <>
          <PostContainer>{conversation.content}</PostContainer>
          {this.renderComments()}
        </>
      );
    }

    const rows: React.ReactNode[] = [];
    let tempId;

    messages.forEach((message) => {
      tempId = message.userId ? message.userId : message.customerId;

      rows.push(
        <Message
          isSameUser={
            message.userId
              ? message.userId === tempId
              : message.customerId === tempId
          }
          message={message}
          key={message._id}
        />
      );
    });

    return (
      <>
        {rows}
        <CenterText>
          <Link to={`/inbox/index?_id=${conversation._id}`}>
            {__("See full conversation")} <Icon icon="angle-double-right" />
          </Link>
        </CenterText>
      </>
    );
  }

  renderAction() {
    const { activity, conversation, comments } = this.props;
    const { _id, integration } = conversation;

    let { customer } = conversation;

    if (!customer) {
      return null;
    }

    let kind = integration ? integration.kind : "conversation";

    const condition =
      activity.contentType === "comment" ? activity.contentType : kind;

    let action = "sent a";
    let item = "message";

    switch (condition) {
      case "comment":
        action = "";
        kind = "commented";
        item = `on ${renderFullName(customer)}'s facebook post`;
        break;
      case "facebook-post":
        action = "wrote a Facebook";
        kind = "Post";
        item = "";
        break;
      case "facebook-messenger":
        kind = "message";
        item = "by Facebook Messenger";
        break;
      default:
        break;
    }

    if (condition === "comment") {
      customer = comments.length > 0 ? comments[0].customer : customer;
    }

    return (
      <FlexBody>
        <b>{renderFullName(customer)}</b> {action}&nbsp;
        <Link to={`/inbox/index?_id=${_id}`}>
          <strong>{kind}</strong>
        </Link>
        &nbsp;{item}
      </FlexBody>
    );
  }

  renderDate(createdAt) {
    return (
      <ActivityDate>{dayjs(createdAt).format("MMM D, h:mm A")}</ActivityDate>
    );
  }

  renderContent() {
    const { conversation, messages } = this.props;

    const { customer, content, createdAt, integration } = conversation;

    if (!this.state.toggleMessage && integration) {
      return (
        <>
          <Header onClick={this.onCollapse}>
            {integration.kind.includes("messenger") ? (
              <span>
                {__("Conversation with")}&nbsp;
                <b>{renderFullName(customer)}</b>
              </span>
            ) : (
              <FlexCenterContent>
                <span>{this.renderAction()}</span>
                {this.renderDate(createdAt)}
              </FlexCenterContent>
            )}
          </Header>
          {this.renderMessages()}
        </>
      );
    }

    return (
      <CollapseTrigger onClick={this.onCollapse}>
        <FlexCenterContent>
          {this.renderAction()}

          <Tip text={dayjs(createdAt).format("llll")}>
            {this.renderDate(createdAt)}
          </Tip>
        </FlexCenterContent>
        {content && (
          <FlexCenterContent>
            <ConversationContent
              dangerouslySetInnerHTML={{ __html: xss(content) }}
            />
            <Count>{messages && messages.length}</Count>
          </FlexCenterContent>
        )}
      </CollapseTrigger>
    );
  }

  render() {
    const { conversation = {} as IConversation, activity } = this.props;

    const integration = conversation.integration || ({} as IIntegration);

    const kind = integration.kind ? integration.kind : "conversation";

    const condition =
      activity.contentType === "comment" ? activity.contentType : kind;

    const iconAndColor = getIconAndColor(condition);

    return (
      <ActivityRow key={Math.random()} isConversation={true}>
        <Tip text={formatText(condition)} placement="top">
          <ActivityIcon color={iconAndColor.color}>
            <Icon icon={iconAndColor.icon} />
          </ActivityIcon>
        </Tip>
        <Collapse>{this.renderContent()}</Collapse>
      </ActivityRow>
    );
  }
}

export default ActivityLogs;
