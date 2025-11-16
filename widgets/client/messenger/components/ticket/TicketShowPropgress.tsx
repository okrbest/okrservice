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
            
            // URL에서 name 파라미터 제거하여 다운로드 방지
            let viewUrl = originalSrc;
            if (viewUrl.includes('&name=')) {
              viewUrl = viewUrl.split('&name=')[0];
            }
            
            // fetch로 이미지를 가져와서 blob URL로 변환하여 새 탭에서 열기
            try {
              const response = await fetch(viewUrl, { mode: 'cors' });
              if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
                if (newWindow) {
                  // 창이 열린 후 blob URL 정리
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                }
              } else {
                // fetch 실패 시 직접 열기 (CORS 문제 등)
                window.open(viewUrl, '_blank', 'noopener,noreferrer');
              }
            } catch (error) {
              // 오류 발생 시 직접 열기
              console.warn('Failed to fetch image:', error);
              window.open(viewUrl, '_blank', 'noopener,noreferrer');
            }
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
            ref={descriptionRef}
            className="ticket-description-content"
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
            link.addEventListener('click', async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // URL에서 name 파라미터 제거하여 다운로드 방지
              let viewUrl = originalSrc;
              if (viewUrl.includes('&name=')) {
                viewUrl = viewUrl.split('&name=')[0];
              }
              
              // fetch로 이미지를 가져와서 blob URL로 변환하여 새 탭에서 열기
              try {
                const response = await fetch(viewUrl, { mode: 'cors' });
                if (response.ok) {
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
                  if (newWindow) {
                    // 창이 열린 후 blob URL 정리
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                  }
                } else {
                  // fetch 실패 시 직접 열기 (CORS 문제 등)
                  window.open(viewUrl, '_blank', 'noopener,noreferrer');
                }
              } catch (error) {
                // 오류 발생 시 직접 열기
                console.warn('Failed to fetch image:', error);
                window.open(viewUrl, '_blank', 'noopener,noreferrer');
              }
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
              ref={(el) => setCommentRef(comment._id, el)}
              className="comment ticket-comment-content"
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
