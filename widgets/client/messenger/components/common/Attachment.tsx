import * as React from "react";
import { readFile, sanitizeAttachmentDownloadBasename } from "../../../utils";
import { IAttachment } from "../../types";

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

function Attachment({ attachment }: { attachment: IAttachment }) {
  const rawDownload = (attachment.name || attachment.url || "").trim();
  const downloadName =
    sanitizeAttachmentDownloadBasename(rawDownload) || "file";

  function renderAtachment() {
    const attachmentName = attachment.url || attachment.name || "";
    const fileExtension = attachmentName.split(".").pop()?.toLowerCase() || "";

    // 이미지 파일인지 확인
    const isImage =
      ["png", "jpeg", "jpg", "gif", "webp", "bmp", "svg"].indexOf(
        fileExtension,
      ) > -1;

    if (isImage) {
      return (
        <img
          role="presentation"
          src={readFile(attachment.url)}
          alt={attachment.name}
          style={{
            maxWidth: "200px",
            maxHeight: "200px",
            objectFit: "contain",
            display: "block",
          }}
        />
      );
    }

    return (
      <div
        className="file-wrapper"
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>
          {getFileIcon(fileExtension)}
        </span>
        <span
          style={{
            fontSize: "12px",
            wordBreak: "break-word",
            lineHeight: 1.35,
          }}
        >
          {downloadName}
        </span>
      </div>
    );
  }
  
  // Add name parameter to URL for proper filename in download
  const downloadUrl = attachment.url && attachment.url.includes('http') 
    ? attachment.url 
    : `${readFile(attachment.url)}&name=${encodeURIComponent(downloadName)}`;

  // 교차 출처에서는 <a download>가 무시되는 경우가 많아, Blob으로 저장하면 실제 바이너리·파일명이 맞음
  const onDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      const res = await fetch(downloadUrl, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const blob = await res.blob();
      if (blob.type && blob.type.includes('text/html')) {
        window.alert('파일을 받을 수 없습니다. 로그인 페이지나 오류 HTML이 반환되었습니다.');
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = downloadName;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <a
      className="download-attachment"
      href={downloadUrl}
      download={downloadName}
      target="_blank"
      title="Download"
      rel="noopener noreferrer"
      onClick={onDownloadClick}
    >
      {renderAtachment()}
    </a>
  );
}

export default Attachment;
