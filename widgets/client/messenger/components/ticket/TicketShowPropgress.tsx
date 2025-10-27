import * as React from "react";
import * as dayjs from "dayjs";
import xss from "xss";

import { IAttachment, ITicketActivityLog, ITicketComment } from "../../types";
import { __, readFile } from "../../../utils";

import Button from "../common/Button";
import Container from "../common/Container";
import Input from "../common/Input";
import TicketActivity from "./TicketAcitvity";
import { useTicket } from "../../context/Ticket";

// 파일 타입별 아이콘
const getFileIcon = (extension: string): string => {
  const iconMap: { [key: string]: string } = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "📊",
    pptx: "📊",
    txt: "📃",
    zip: "🗜️",
    rar: "🗜️",
    csv: "📈",
  };
  
  return iconMap[extension.toLowerCase()] || "📎";
};

type Props = {
  activityLogs: ITicketActivityLog[];
  comment: string;
  comments: ITicketComment[];
  setComment: (comment: string) => void;
  onComment: () => void;
};

const TicketShowProgress: React.FC<Props> = ({
  onComment,
  setComment,
  comment,
  comments,
  activityLogs,
}) => {
  const { ticketData = {} } = useTicket();

  const renderAttachments = (attachments: IAttachment[]) => {
    return attachments.map((attachment, index) => {
      const attachmentName = attachment.url || attachment.name || "";
      const fileExtension = attachmentName.split(".").pop()?.toLowerCase() || "";
      const isImage = ["png", "jpeg", "jpg", "gif", "webp", "bmp", "svg"].indexOf(fileExtension) > -1;
      
      // If name exists, use it. Otherwise extract from URL by removing random ID prefix (21 characters)
      let downloadName = attachment.name;
      if (!downloadName && attachment.url) {
        const urlFileName = attachment.url;
        downloadName = urlFileName.length > 21 ? urlFileName.substring(21) : urlFileName;
      }
      downloadName = downloadName || "file";
      
      // Add name parameter to URL for proper filename in download
      const downloadUrl = attachment.url && attachment.url.includes('http') 
        ? attachment.url 
        : `${readFile(attachment.url)}&name=${encodeURIComponent(downloadName)}`;
      
      return (
        <div key={attachment.url} className="ticket-attachment">
          {isImage ? (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={readFile(attachment.url)}
                alt={`ticket-image-${index}`}
                onLoad={() => {
                  URL.revokeObjectURL(attachment.name);
                }}
              />
            </a>
          ) : (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ textAlign: "center", padding: "10px", cursor: "pointer" }}>
                <span style={{ fontSize: "48px" }}>{getFileIcon(fileExtension)}</span>
                <div style={{ fontSize: "12px", marginTop: "5px" }}>{attachment.name}</div>
              </div>
            </a>
          )}
        </div>
      );
    });
  };

  const renderTicketIssue = () => {
    const { name, type, requestType, description, attachments } = ticketData;

    return (
      <div className="ticket-progress-content">
        <div className="content-header">
          <b>{name} </b>
          <span>{__(requestType || type)}</span>
        </div>
        {description && (
          <div
            dangerouslySetInnerHTML={{
              __html: xss(description.replace(/\n/g, "<br />")),
            }}
          />
        )}
        {attachments && attachments.length !== 0 && (
          <div className="ticket-attachments">
            {renderAttachments(attachments)}
          </div>
        )}
      </div>
    );
  };

  const renderComments = () => {
    if (!comments || comments.length === 0) return null;

    return comments.map((comment: ITicketComment) => {
      const { userType, createdUser, createdAt, content } =
        comment || ({} as ITicketComment);
      const { firstName, lastName, email, emails, phone, phones, avatar } =
        createdUser || ({} as any);

      let renderName = "Visitor";

      renderName =
        firstName || lastName
          ? `${firstName} ${lastName}`
          : email
            ? email
            : emails && emails.length !== 0
              ? emails?.[0]
              : phone
                ? phone
                : phones && phones.length !== 0
                  ? phones?.[0]
                  : "Unknown";

      return (
        <div key={comment._id} className={`ticket-progress-log ${userType}`}>
          <div className="user">
            <img
              src={
                avatar
                  ? avatar.includes("read-file")
                    ? avatar
                    : readFile(avatar)
                  : ""
              }
              alt=""
            />
          </div>
          <span>
            <strong>{renderName}</strong>
            <span
              dangerouslySetInnerHTML={{ __html: __("added <b>comment</b>") }}
            />
            <div
              className="comment"
              dangerouslySetInnerHTML={{
                __html: xss(content.replace(/\n/g, "<br />")),
              }}
            />
            <div className="date">
              {dayjs(createdAt).format("YYYY-MM-DD, LT")}
            </div>
          </span>
        </div>
      );
    });
  };

  const renderTicketLogs = () => {
    return (
      <div className="ticket-progress-logs">
        <span>{__("Ticket log")}</span>
        {activityLogs.map((log, index) => (
          <TicketActivity key={index} activity={log} />
        ))}
        {renderComments()}
      </div>
    );
  };

  const renderContent = () => {
    const { number, stage } = ticketData;

    return (
      <>
        <div className="ticket-lbl">
          <label>{__("Ticket number")}:</label>
          <span>{number}</span>
        </div>
        <div className="ticket-lbl">
          <label>{__("Ticket status")}:</label>
          <span className="lbl">{stage?.name}</span>
        </div>
        {renderTicketIssue()}
        {renderTicketLogs()}
      </>
    );
  };

  return (
    <Container
      withBottomNavBar={true}
      title={__("Ticket progress")}
      backRoute="ticket"
      persistentFooter={
        <Button full onClick={() => onComment()}>
          <span className="font-semibold">{__("Send comment")}</span>
        </Button>
      }
    >
      <div className="ticket-progress-container">
        <div className="ticket-progress-main-content">{renderContent()}</div>
        <div className="ticket-comment-form">
          <div className="ticket-form-item">
            <Input
              textArea
              id="comment"
              label={__("Add a comment")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default TicketShowProgress;
