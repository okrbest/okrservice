import {
  AvatarSection,
  Content,
  CreatedDate,
  CreatedUser,
  InfoSection,
} from "./styles";

import { INotification } from "../types";
import { IUser } from "@erxes/ui/src/auth/types";
import NameCard from "@erxes/ui/src/components/nameCard/NameCard";
import React from "react";
import RoundedBackgroundIcon from "@erxes/ui/src/components/RoundedBackgroundIcon";
import classNames from "classnames";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import xss from "xss";

type Props = {
  notification: INotification;
  markAsRead: (notificationIds?: string[]) => void;
  createdUser?: IUser;
  isList?: boolean;
};

const NotificationRow = (props: Props) => {
  const navigate = useNavigate();
  const { notification, isList, markAsRead } = props;
  const { isRead, createdUser, notifType } = notification;
  const classes = classNames({ unread: !isRead });

  const getIcon = () => {
    let icon = "user-check";

    if (notifType?.includes("conversation")) {
      icon = "comment-1";
    }

    if (notifType?.includes("deal")) {
      icon = "dollar-alt";
    }

    if (notifType?.includes("ticket")) {
      icon = "postcard";
    }

    if (notifType?.includes("task")) {
      icon = "file-check";
    }
    if (notifType?.includes("purchase")) {
      icon = "dollar-alt";
    }

    return icon;
  };

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      markAsRead([notification._id]);
    }

    const params = notification.link.split("?");

    navigate(
      {
        pathname: params[0],
        search: `?${params[1]}`,
      },
      { state: { from: "notification" }, replace: true }
    );
  };

  const stripHtmlTags = (html: string): string => {
    if (!html) return "";
    // HTML 태그 제거 및 HTML 엔티티 디코딩
    return html
      .replace(/<[^>]*>/g, "") // HTML 태그 제거
      .replace(/&nbsp;/g, " ") // &nbsp;를 공백으로
      .replace(/&amp;/g, "&") // &amp;를 &로
      .replace(/&lt;/g, "<") // &lt;를 <로
      .replace(/&gt;/g, ">") // &gt;를 >로
      .replace(/&quot;/g, '"') // &quot;를 "로
      .replace(/&#39;/g, "'") // &#39;를 '로
      .trim();
  };

  const renderContent = (content: string, type: string, action?: string) => {
    // conversation 타입인 경우 HTML 렌더링
    if (type?.includes("conversation")) {
      return (
        <Content
          dangerouslySetInnerHTML={{ __html: xss(content) }}
          isList={isList}
        />
      );
    }

    // 멘션 알림이거나 HTML이 포함된 경우 HTML 태그 제거
    const hasHtmlTags = content && /<[^>]+>/.test(content);
    const isMentionNotification = action?.includes("멘션");
    
    if (hasHtmlTags || isMentionNotification) {
      const plainText = stripHtmlTags(content);
      return <b> {plainText}</b>;
    }

    return <b> {content}</b>;
  };

  const renderCreatedUser = () => {
    let name = "system";

    if (createdUser) {
      name = createdUser.details
        ? createdUser.details.fullName || ""
        : createdUser.username || createdUser.email;
    }

    return (
      <CreatedUser isList={isList}>
        {name}
        <span>
          {notification.action}
          {renderContent(notification.content, notification.notifType, notification.action)}
        </span>
      </CreatedUser>
    );
  };

  return (
    <li className={classes} onClick={handleMarkAsRead}>
      <AvatarSection>
        <NameCard.Avatar
          user={createdUser}
          size={30}
          icon={<RoundedBackgroundIcon icon={getIcon()} />}
        />
      </AvatarSection>
      <InfoSection>
        {renderCreatedUser()}
        <CreatedDate isList={isList}>
          {dayjs(notification.date).format("DD MMM YYYY, HH:mm")}
        </CreatedDate>
      </InfoSection>
    </li>
  );
};

export default NotificationRow;
