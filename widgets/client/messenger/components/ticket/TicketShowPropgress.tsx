import * as React from "react";
import dayjs from "dayjs";
import xss from "xss";

import { IAttachment, ITicketActivityLog, ITicketComment } from "../../types";
import {
  __,
  openReadFileImageInNewTab,
  readFile,
  readFileViewInline,
  sanitizeAttachmentDownloadBasename,
} from "../../../utils";

import Button from "../common/Button";
import Container from "../common/Container";
import Input from "../common/Input";
import FileUploader from "../common/FileUploader";
import Attachment from "../common/Attachment";
import FileTypeIcon from "../common/FileTypeIcon";
import TicketActivity from "./TicketAcitvity";
import { useTicket } from "../../context/Ticket";

interface FileWithUrl extends File {
  url?: string;
}

type Props = {
  activityLogs: ITicketActivityLog[];
  activityLoading?: boolean;
  comment: string;
  comments: ITicketComment[];
  setComment: (comment: string) => void;
  onComment: () => void;
  files?: FileWithUrl[];
  handleFiles?: (files: FileWithUrl[]) => void;
};

const TicketShowProgress: React.FC<Props> = ({
  onComment,
  setComment,
  comment,
  comments,
  activityLogs,
  activityLoading = false,
  files = [],
  handleFiles,
}) => {
  const { ticketData = {} } = useTicket();
  const descriptionRef = React.useRef<HTMLDivElement>(null);

  // description 내 이미지 처리
  React.useEffect(() => {
    if (descriptionRef.current) {
      const images = descriptionRef.current.querySelectorAll('img:not([data-link-added])');
      images.forEach((imgElement) => {
        const img = imgElement as HTMLImageElement;
        // 이미지 크기를 위젯에 맞게 조정
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.cursor = 'pointer';
        img.setAttribute('data-link-added', 'true');
        
        const originalSrc = img.src || img.getAttribute('src');
        if (originalSrc) {
          // 이미지 아래에 링크 추가
          const linkWrapper = document.createElement('div');
          linkWrapper.className = 'image-view-original-link';
          linkWrapper.style.cssText = 'margin-top: 4px; margin-bottom: 8px; text-align: center;';
          
          const link = document.createElement('a');
          link.href = '#';
          link.textContent = __('원본 이미지 보기');
          link.style.cssText = 'font-size: 12px; color: #007bff; text-decoration: none; cursor: pointer;';
          link.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            openReadFileImageInNewTab(originalSrc);
          });
          
          linkWrapper.appendChild(link);
          
          // 이미지 다음에 링크 삽입
          if (img.parentNode) {
            img.parentNode.insertBefore(linkWrapper, img.nextSibling);
          }
        }
      });
    }
  }, [ticketData.description]);

  const renderAttachments = (attachments: IAttachment[]) => {
    return attachments.map((attachment, index) => {
      const attachmentName = attachment.url || attachment.name || "";
      const fileExtension = attachmentName.split(".").pop()?.toLowerCase() || "";
      const isImage = ["png", "jpeg", "jpg", "gif", "webp", "bmp", "svg"].indexOf(fileExtension) > -1;
      
      const rawDownload = (attachment.name || attachment.url || "").trim();
      let downloadName =
        sanitizeAttachmentDownloadBasename(rawDownload) || "file";
      
      // Add name parameter to URL for proper filename in download
      const downloadUrl = attachment.url && attachment.url.includes('http') 
        ? attachment.url 
        : `${readFile(attachment.url)}&name=${encodeURIComponent(downloadName)}`;
      
      const originalViewUrl = readFileViewInline(attachment.url);

      const handleImageClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openReadFileImageInNewTab(originalViewUrl);
      };
      
      return (
        <div
          key={`${attachment.url}-${index}`}
          className="ticket-attachment"
          style={{ width: "100%" }}
        >
          {isImage ? (
            <div style={{ marginBottom: "8px" }}>
              <img
                src={readFile(attachment.url)}
                alt={`ticket-image-${index}`}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  cursor: 'pointer',
                  display: 'block'
                }}
                onClick={handleImageClick}
              />
              <div style={{ marginTop: '4px', marginBottom: '8px', textAlign: 'center' }}>
                <a
                  href="#"
                  onClick={handleImageClick}
                  style={{
                    fontSize: '12px',
                    color: '#007bff',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {__('원본 이미지 보기')}
                </a>
              </div>
            </div>
          ) : (
            <a
              className="ticket-attachment-file-row"
              href={downloadUrl}
              download={downloadName}
              target="_blank"
              rel="noopener noreferrer"
              title={`${downloadName} — ${__("Download")}`}
            >
              <span className="ticket-attachment-file-icon-wrap">
                <FileTypeIcon extension={fileExtension} size={44} />
              </span>
              <span className="ticket-attachment-file-info">
                <span className="ticket-attachment-file-name">
                  {downloadName}
                </span>
                <span className="ticket-attachment-file-hint">
                  {__("Download")}
                </span>
              </span>
              <span className="ticket-attachment-file-action" aria-hidden>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
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
        {description ? (
          <div className="ticket-issue-section ticket-issue-section--description">
            <div className="ticket-issue-section-label">{__("Description")}</div>
            <div
              ref={descriptionRef}
              className="ticket-description-content ticket-issue-section-body"
              dangerouslySetInnerHTML={{
                __html: xss(description.replace(/\n/g, "<br />")),
              }}
            />
          </div>
        ) : null}
        {attachments && attachments.length !== 0 ? (
          <div className="ticket-issue-section ticket-issue-section--attachments">
            <div className="ticket-issue-section-label">{__("Attachments")}</div>
            <div className="ticket-attachments ticket-issue-section-body">
              {renderAttachments(attachments)}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const commentRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // 댓글 내 이미지 처리
  React.useEffect(() => {
    commentRefs.current.forEach((element) => {
      if (element) {
        const images = element.querySelectorAll('img:not([data-link-added])');
        images.forEach((imgElement) => {
          const img = imgElement as HTMLImageElement;
          // 이미지 크기를 위젯에 맞게 조정
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.cursor = 'pointer';
          img.style.maxHeight = '300px';
          img.style.objectFit = 'contain';
          img.setAttribute('data-link-added', 'true');
          
          const originalSrc = img.src || img.getAttribute('src');
          if (originalSrc) {
            // 이미지 아래에 링크 추가
            const linkWrapper = document.createElement('div');
            linkWrapper.className = 'image-view-original-link';
            linkWrapper.style.cssText = 'margin-top: 4px; margin-bottom: 8px; text-align: center;';
            
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = __('원본 이미지 보기');
            link.style.cssText = 'font-size: 11px; color: #007bff; text-decoration: none; cursor: pointer;';
            link.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              openReadFileImageInNewTab(originalSrc);
            });
            
            linkWrapper.appendChild(link);
            
            // 이미지 다음에 링크 삽입
            if (img.parentNode) {
              img.parentNode.insertBefore(linkWrapper, img.nextSibling);
            }
          }
        });
      }
    });
  }, [comments]);

  const setCommentRef = (commentId: string, element: HTMLDivElement | null) => {
    if (element) {
      commentRefs.current.set(commentId, element);
    } else {
      commentRefs.current.delete(commentId);
    }
  };

  const renderComments = () => {
    if (!comments || comments.length === 0) return null;

    return comments.map((comment: ITicketComment) => {
      const { userType, createdUser, createdAt, content, attachments } =
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
              ref={(el) => setCommentRef(comment._id, el)}
              className="comment ticket-comment-content ticket-comment-body"
              dangerouslySetInnerHTML={{
                __html: xss((content || "").replace(/\n/g, "<br />")),
              }}
            />
            {attachments && attachments.length > 0 && (
              <div className="ticket-comment-attachments ticket-comment-files">
                <div className="ticket-comment-files-label">{__("Attachments")}</div>
                <div className="ticket-comment-files-list">
                  {attachments.map((att, idx) => (
                    <Attachment
                      key={idx}
                      attachment={{ name: att.name || "", url: att.url || "" }}
                    />
                  ))}
                </div>
              </div>
            )}
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
        {activityLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div className="loader" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <>
        {activityLogs.map((log, index) => (
          <TicketActivity key={index} activity={log} />
        ))}
          </>
        )}
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
      <div className="ticket-progress-container" style={{ width: "100%", padding: "1.25rem", paddingBottom: "1rem" }}>
        <div className="ticket-progress-main-content" style={{ maxWidth: "95%", paddingRight: 20 }}>{renderContent()}</div>
        <div
          className="ticket-comment-form"
          style={{
            position: "static",
            bottom: "auto",
            borderTop: "1px solid #ddd",
            paddingTop: "1rem",
            paddingBottom: "0.5rem",
            marginTop: "1rem",
            width: "100%",
            maxWidth: "95%",
            background: "#fff",
          }}
        >
          <div className="ticket-form-item">
            <Input
              textArea
              id="comment"
              label={__("Add a comment")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {handleFiles && (
            <div className="ticket-form-item" style={{ marginTop: "12px" }}>
              <label className="ticket-form-label" style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "#666" }}>
                {__("Attach file")}
              </label>
              <FileUploader handleFiles={handleFiles} />
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

export default TicketShowProgress;
